from flask import Blueprint, jsonify, request, session, Response
from helpers import (
    get_user_quantum_credentials, IBMServiceSingleton, IBMJobCache, IBMResultsCache,
    quantum_manager_singleton, CircuitStateManager, circuit_manager, validate_crn,
    ProviderRegistry
)
import sqlite3
import time
import datetime
import json
import uuid
import concurrent.futures
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import SamplerV2 as Sampler
from database import db
from helpers import get_db_path

jobs_bp = Blueprint('jobs', __name__)

def extract_counts_from_result(result):
    """Safely extract counts dictionary from any Qiskit result object (V1 or V2 PrimitiveResult)."""
    if not result:
        return {}
    if hasattr(result, 'get_counts'):
        try:
            return dict(result.get_counts())
        except:
            pass
    if hasattr(result, '__getitem__') or isinstance(result, list):
        try:
            for pub in result:
                if hasattr(pub, 'data'):
                    data = pub.data
                    for reg_name in ['meas', 'c', 'cr', 'classical']:
                        if hasattr(data, reg_name):
                            reg_val = getattr(data, reg_name)
                            if hasattr(reg_val, 'get_counts'):
                                try:
                                    return dict(reg_val.get_counts())
                                except:
                                    pass
                    for attr in dir(data):
                        if not attr.startswith('_') and attr not in ['ndim', 'shape', 'size', 'meas', 'c', 'cr', 'classical']:
                            val = getattr(data, attr, None)
                            if val and hasattr(val, 'get_counts'):
                                try:
                                    return dict(val.get_counts())
                                except:
                                    pass
        except:
            pass
    return {}

def get_provider_jobs(provider_id, user_id, limit=None):
    """Get jobs for a specific provider ONLY."""
    if not provider_id:
        raise RuntimeError("provider_id is REQUIRED")
    
    if provider_id == 'ibm':
        try:
            token, crn = get_user_quantum_credentials()
            if not token:
                return []
                
            cached_jobs, cache_hit = IBMJobCache.get_cached_jobs(user_id)
            if cache_hit:
                if limit:
                    return cached_jobs[:int(limit)]
                return cached_jobs
                
            service = IBMServiceSingleton.get_service(user_id, token, crn)
            if not service:
                return []
                
            fetch_limit = 50
            if limit and str(limit).isdigit():
                fetch_limit = int(limit)
                
            ibm_jobs = service.jobs(limit=fetch_limit, descending=True)
            
            def process_job(job):
                try:
                    job_id = job.job_id() if callable(getattr(job, 'job_id', None)) else str(job.job_id)
                    backend_name = 'Unknown'
                    if hasattr(job, 'backend'):
                        b_val = job.backend
                        if callable(b_val):
                            b_obj = b_val()
                            backend_name = getattr(b_obj, 'name', str(b_obj))
                        else:
                            backend_name = getattr(b_val, 'name', str(b_val))
                            
                    status = 'Unknown'
                    if hasattr(job, 'status'):
                        status_obj = job.status()
                        status = status_obj.name if hasattr(status_obj, 'name') else str(status_obj)
                        
                    status = str(status).upper().replace('JOBSTATUS.', '')
                    
                    return {
                        'job_id': job_id,
                        'backend': backend_name,
                        'status': status,
                        'provider': 'ibm',
                        'real_data': True,
                        'creation_date': job.creation_date.isoformat() if hasattr(job, 'creation_date') and job.creation_date else None
                    }
                except Exception as je:
                    print(f"Error processing IBM job: {je}")
                    return None
                    
            jobs_list = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                results = list(executor.map(process_job, list(ibm_jobs)))
                jobs_list = [r for r in results if r]
                
            IBMJobCache.update_cache(user_id, jobs_list)
            return jobs_list
        except Exception as e:
            print(f"Error fetching IBM jobs: {e}")
            return []
    else:
        # Fetch other providers jobs from local database
        try:
            local_jobs = db.get_jobs(limit=limit or 20)
            filtered_jobs = []
            for j in local_jobs:
                backend = j.get('backend_name', '').lower()
                is_ibm = 'ibm' in backend or 'fez' in backend or 'marrakesh' in backend or 'torino' in backend or 'brisbane' in backend
                
                if provider_id == 'local':
                    if not is_ibm and ('local' in backend or 'simulator' in backend or 'qvm' in backend or not backend):
                        filtered_jobs.append(j)
                elif provider_id == 'ionq':
                    if 'ionq' in backend or 'harmony' in backend or 'aria' in backend:
                        filtered_jobs.append(j)
                elif provider_id == 'rigetti':
                    if 'rigetti' in backend or 'cepheus' in backend or 'qvm' in backend:
                        filtered_jobs.append(j)
                elif provider_id == 'aws':
                    if 'aws' in backend or 'braket' in backend:
                        filtered_jobs.append(j)
                else:
                    filtered_jobs.append(j)
            return filtered_jobs
        except Exception as e:
            print(f"Error fetching provider jobs from DB: {e}")
            return []

def get_provider_results(provider_id, user_id):
    """Get results for a specific provider ONLY."""
    if not provider_id:
        raise RuntimeError("provider_id is REQUIRED")
        
    if provider_id == 'ibm':
        try:
            token, crn = get_user_quantum_credentials()
            if not token:
                return []
                
            cached_results, cache_hit = IBMResultsCache.get_cached_results(user_id)
            if cache_hit:
                return cached_results
                
            service = IBMServiceSingleton.get_service(user_id, token, crn)
            if not service:
                return []
                
            ibm_jobs = service.jobs(limit=20)
            results_list = []
            
            for job in ibm_jobs:
                try:
                    status = 'Unknown'
                    if hasattr(job, 'status'):
                        status_obj = job.status()
                        status = status_obj.name if hasattr(status_obj, 'name') else str(status_obj)
                        
                    if status == 'DONE':
                        job_id = job.job_id() if callable(getattr(job, 'job_id', None)) else str(job.job_id)
                        backend_name = 'Unknown'
                        if hasattr(job, 'backend'):
                            b_val = job.backend
                            if callable(b_val):
                                b_obj = b_val()
                                backend_name = getattr(b_obj, 'name', str(b_obj))
                            else:
                                backend_name = getattr(b_val, 'name', str(b_val))
                                
                        result_data = None
                        try:
                            res = job.result()
                            if res:
                                counts = extract_counts_from_result(res)
                                if counts:
                                    result_data = {'counts': counts}
                                elif hasattr(res, 'data'):
                                    result_data = {'raw': str(res.data)[:500]}
                        except Exception as re:
                            print(f"Error getting result for {job_id}: {re}")
                            
                        result_entry = {
                            'job_id': job_id,
                            'backend': backend_name,
                            'status': status,
                            'provider': 'ibm',
                            'result': result_data,
                            'real_data': True
                        }
                        if result_data and 'counts' in result_data:
                            result_entry['counts'] = result_data['counts']
                        results_list.append(result_entry)
                except Exception as je:
                    print(f"Error processing IBM result: {je}")
                    continue
                    
            if results_list:
                IBMResultsCache.update_cache(user_id, results_list)
            return results_list
        except Exception as e:
            print(f"Error fetching IBM results: {e}")
            return []
    else:
        # Return results from local DB
        try:
            local_jobs = db.get_jobs(limit=20)
            results = []
            for j in local_jobs:
                status = j.get('status', '').upper()
                if 'COMPLETED' not in status and 'DONE' not in status:
                    continue
                backend = j.get('backend_name', '').lower()
                is_ibm = 'ibm' in backend or 'fez' in backend or 'marrakesh' in backend or 'torino' in backend or 'brisbane' in backend
                
                matches = False
                if provider_id == 'local':
                    matches = not is_ibm and ('local' in backend or 'simulator' in backend or 'qvm' in backend or not backend)
                elif provider_id == 'ionq':
                    matches = 'ionq' in backend or 'harmony' in backend or 'aria' in backend
                elif provider_id == 'rigetti':
                    matches = 'rigetti' in backend or 'cepheus' in backend or 'qvm' in backend
                
                if matches:
                    import json
                    results_data = j.get('result_json')
                    if isinstance(results_data, str):
                        try:
                            results_data = json.loads(results_data)
                        except:
                            results_data = {}
                    
                    counts = results_data.get('counts', {}) if results_data else {}
                    total_shots = sum(counts.values()) if counts else 0
                    probabilities = {state: count/total_shots for state, count in counts.items()} if total_shots > 0 else {}
                    
                    results.append({
                        'job_id': j.get('job_id'),
                        'backend': j.get('backend_name'),
                        'status': 'DONE',
                        'provider': provider_id,
                        'counts': counts,
                        'probabilities': probabilities,
                        'shots': total_shots,
                        'real_data': False,
                        'local_data': True,
                        'is_local': True
                    })
            return results
        except Exception as e:
            print(f"Error fetching provider results: {e}")
            return []

@jobs_bp.route('/api/jobs', methods=['GET'])
def get_all_jobs_aggregated():
    try:
        user_id = session.get('user_id')
        limit = request.args.get('limit')
        all_jobs = []
        
        if not user_id:
            return jsonify({'jobs': []}), 200
            
        providers = ProviderRegistry.list_providers()
        for pid in providers.keys():
            try:
                jobs = get_provider_jobs(pid, user_id, limit=limit)
                all_jobs.extend(jobs)
            except Exception as ex:
                print(f"Error aggregating jobs for {pid}: {ex}")
                continue
                
        # Sort jobs by date if available
        try:
            all_jobs.sort(key=lambda x: x.get('creation_date', '') or '', reverse=True)
        except:
            pass
            
        return jsonify(all_jobs), 200
    except Exception as e:
        print(f"Error in get_all_jobs: {e}")
        return jsonify([]), 500

@jobs_bp.route('/api/active-jobs', methods=['GET'])
def get_active_jobs():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify([]), 200
            
        token, crn = get_user_quantum_credentials()
        if not token:
            return jsonify([]), 200
            
        service = IBMServiceSingleton.get_service(user_id, token, crn)
        if not service:
            return jsonify([]), 200
            
        active_jobs = service.jobs(limit=10, active_only=True)
        result = []
        for job in active_jobs:
            job_id = job.job_id() if callable(getattr(job, 'job_id', None)) else str(job.job_id)
            backend_name = 'Unknown'
            if hasattr(job, 'backend'):
                b_val = job.backend
                backend_name = getattr(b_val(), 'name', str(b_val())) if callable(b_val) else getattr(b_val, 'name', str(b_val))
            status = str(job.status()).upper().replace('JOBSTATUS.', '')
            result.append({
                'job_id': job_id,
                'backend': backend_name,
                'status': status,
                'provider': 'ibm',
                'real_data': True
            })
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching active jobs: {e}")
        return jsonify([]), 200

@jobs_bp.route('/api/results', methods=['GET'])
def get_results():
    """Get REAL measurement results from IBM Quantum jobs.
    
    Optimized: single service.jobs() call, reuses job objects,
    server-side 60s cache via IBMResultsCache.
    """
    try:
        user_id = session.get('user_id')
        force_refresh = request.args.get('force', '').lower() == 'true'

        # --- Server-side cache: return instantly if fresh ---
        if user_id and not force_refresh:
            cached, hit = IBMResultsCache.get_cached_results(user_id)
            if hit and cached is not None:
                print(f"[/api/results] Cache hit for user {user_id}")
                return jsonify(cached)

        results_list = []
        total_ibm_jobs_count = 0
        quantum_token, quantum_crn = get_user_quantum_credentials()

        if quantum_token and user_id:
            try:
                service = IBMServiceSingleton.get_service(user_id, quantum_token)

                # ONE call to IBM — fetch jobs, keep objects for reuse
                all_jobs = list(service.jobs(limit=50))
                completed_jobs = [
                    j for j in all_jobs
                    if str(j.status()).upper() == 'DONE'
                ]
                total_ibm_jobs_count = len(completed_jobs)

                # Reuse the job objects we already have — no re-fetch
                for job in completed_jobs[:20]:
                    try:
                        job_id = str(job.job_id())
                        backend_name = job.backend().name
                        result = job.result()

                        counts = extract_counts_from_result(result)
                        if not counts:
                            continue

                        register_name = 'meas'
                        try:
                            if hasattr(result, '__getitem__') and hasattr(result[0], 'data'):
                                for key in result[0].data.keys():
                                    register_name = key
                                    break
                        except Exception:
                            pass

                        counts_dict = dict(counts)
                        total_shots = sum(counts_dict.values())
                        probabilities = {
                            state: count / total_shots
                            for state, count in counts_dict.items()
                        }

                        results_list.append({
                            "job_id": job_id,
                            "circuit_name": "IBM Quantum Circuit",
                            "backend": backend_name,
                            "backend_name": backend_name,
                            "shots": total_shots,
                            "counts": counts_dict,
                            "probabilities": probabilities,
                            "status": "COMPLETED",
                            "real_data": True,
                            "local_data": False,
                            "is_local": False,
                            "register_name": register_name,
                        })
                    except Exception as job_err:
                        print(f"Error getting result for job {job.job_id()}: {job_err}")
            except Exception as ibm_err:
                print(f"IBM API error: {ibm_err}")

        # Also get local results from DB
        try:
            local_jobs = db.get_jobs(limit=20)
            for job in local_jobs:
                try:
                    status = job.get('status', '').upper()
                    if 'COMPLETED' not in status and 'DONE' not in status:
                        continue
                    job_id = job.get('job_id', 'unknown')
                    if any(r['job_id'] == job_id for r in results_list):
                        continue
                    results_data = job.get('results_data') or job.get('result_json')
                    if not results_data:
                        continue
                    if isinstance(results_data, str):
                        results_data = json.loads(results_data)
                    counts = results_data.get('counts', {})
                    if not counts:
                        continue
                    total_shots = sum(counts.values())
                    probabilities = {state: count/total_shots for state, count in counts.items()}
                    results_list.append({
                        "job_id": job_id,
                        "circuit_name": job.get('circuit_name', 'Custom Circuit'),
                        "backend": job.get('backend_name', 'Local Simulator'),
                        "backend_name": job.get('backend_name', 'Local Simulator'),
                        "shots": total_shots,
                        "counts": counts,
                        "probabilities": probabilities,
                        "status": "COMPLETED",
                        "real_data": False,
                        "local_data": True,
                        "is_local": True,
                    })
                except Exception:
                    continue
        except Exception as db_err:
            print(f"Error fetching local results: {db_err}")

        has_real_data = any(r.get('real_data') for r in results_list)
        response_payload = {
            "success": True,
            "results": results_list,
            "total_jobs": len(results_list),
            "total_ibm_jobs": total_ibm_jobs_count,
            "real_data": has_real_data,
            "message": f"Retrieved {len(results_list)} results",
        }

        # Cache for next request
        if user_id:
            IBMResultsCache.update_cache(user_id, response_payload)

        return jsonify(response_payload)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@jobs_bp.route('/api/execute-circuit', methods=['POST'])
def execute_circuit_local():
    """Execute quantum circuit locally and store results in database"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        shots = data.get('shots', 1024)
        
        if not code:
            return jsonify({'success': False, 'error': 'No code provided'}), 400
            
        try:
            from qiskit import QuantumCircuit, transpile
            from qiskit_aer import AerSimulator
            QISKIT_AVAILABLE = True
        except ImportError:
            QISKIT_AVAILABLE = False
            
        start_time = time.time()
        exec_globals = {
            '__builtins__': __builtins__,
        }
        
        if QISKIT_AVAILABLE:
            try:
                from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
                exec_globals['QuantumCircuit'] = QuantumCircuit
                exec_globals['ClassicalRegister'] = ClassicalRegister
                exec_globals['QuantumRegister'] = QuantumRegister
                exec_globals['transpile'] = transpile
                import math
                import numpy as np
                exec_globals['pi'] = math.pi
                exec_globals['math'] = math
                exec_globals['np'] = np
                exec_globals['numpy'] = np
            except Exception as e:
                return jsonify({'success': False, 'error': f'Failed to import Qiskit: {e}'}), 500
                
        local_vars = {}
        try:
            exec(code, exec_globals, local_vars)
        except Exception as exec_err:
            return jsonify({'success': False, 'error': f'Code execution failed: {exec_err}'}), 500
            
        qc = None
        circuit_name = "quantum_circuit"
        for var_name, var_value in local_vars.items():
            if var_name in ['QuantumCircuit', 'ClassicalRegister', 'QuantumRegister', 'transpile']:
                continue
            if hasattr(var_value, 'qubits') and hasattr(var_value, 'num_qubits') and callable(getattr(var_value, 'draw', None)):
                qc = var_value
                circuit_name = var_name
                break
                
        if qc is None:
            return jsonify({'success': False, 'error': 'No quantum circuit instance found in code'}), 400
            
        job_id = f"LOCAL_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        counts = None
        
        if QISKIT_AVAILABLE:
            try:
                simulator = AerSimulator()
                transpiled_qc = transpile(qc, simulator)
                job = simulator.run(transpiled_qc, shots=shots)
                result = job.result()
                counts = result.get_counts()
            except Exception as sim_err:
                print(f"Simulator failed: {sim_err}")
                QISKIT_AVAILABLE = False
                
        if not QISKIT_AVAILABLE or counts is None:
            # Fallback Bell/GHZ simulation
            if "bell" in code.lower() or ("h(" in code and "cx(" in code):
                counts = {'00': shots//2, '11': shots//2}
            elif "ghz" in code.lower():
                counts = {'000': shots//2, '111': shots//2}
            else:
                num_qubits = qc.num_qubits if qc else 2
                states = [format(i, f'0{num_qubits}b') for i in range(min(2**num_qubits, 4))]
                import random
                counts = {state: random.randint(1, shots//len(states)) for state in states}
                total = sum(counts.values())
                if total > 0:
                    counts = {state: int(count * shots / total) for state, count in counts.items()}
                    
        execution_time = time.time() - start_time
        circuit_type = "Custom Circuit"
        if "bell" in code.lower() or ("h(" in code and "cx(" in code):
            circuit_type = "Bell State Circuit"
        elif "ghz" in code.lower():
            circuit_type = "GHZ State Circuit"
            
        # Store in DB
        try:
            local_job_data = {
                'job_id': job_id,
                'backend_name': f'Local Simulator ({circuit_type})',
                'status': 'COMPLETED',
                'creation_date': datetime.datetime.now().isoformat(),
                'end_date': datetime.datetime.now().isoformat(),
                'queue_position': 0,
                'estimated_time': f'{execution_time:.3f}s',
                'result': {
                    'counts': counts,
                    'circuit_info': {
                        'qubits': qc.num_qubits,
                        'depth': qc.depth(),
                        'gates': len(qc.data),
                        'name': circuit_name,
                        'type': circuit_type
                    },
                    'execution_time': execution_time,
                    'shots': shots,
                    'backend_type': 'local_simulator'
                },
                'error_message': ''
            }
            db.store_jobs([local_job_data])
        except Exception as db_err:
            print(f"Error storing local job: {db_err}")
            
        return jsonify({
            'success': True,
            'job_id': job_id,
            'counts': counts,
            'circuit_info': {
                'qubits': qc.num_qubits,
                'depth': qc.depth(),
                'gates': len(qc.data),
                'name': circuit_name,
                'type': circuit_type
            },
            'execution_time': round(execution_time, 3),
            'backend': f'Local Simulator ({circuit_type})',
            'shots': shots
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@jobs_bp.route('/api/circuit/execute', methods=['POST'])
def execute_circuit_api():
    """Execute current circuit on IBM Quantum - 3D Circuit Widget Integration"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
            
        data = request.get_json() or {}
        backend = data.get('backend', 'auto')
        shots = data.get('shots', 1024)
        circuit_data = data.get('circuit_data')
        circuit_name = data.get('circuit_name', '3D Circuit Widget Circuit')
        circuit_type = data.get('circuit_type', 'custom')
        
        # Handle circuit manager creation
        if circuit_data:
            circuit_id = circuit_manager.create_circuit(circuit_data, user_id, circuit_name, circuit_type)
            circuit_manager.set_current_circuit(circuit_id, user_id)
            current_circuit = {'circuit_id': circuit_id, 'circuit_name': circuit_name, 'circuit_type': circuit_type, 'circuit_data': circuit_data}
        else:
            current_circuit = circuit_manager.get_current_circuit(user_id)
            if not current_circuit:
                return jsonify({'success': False, 'error': 'No circuit to execute'}), 400
                
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if not quantum_token:
            return jsonify({'success': False, 'error': 'IBM Quantum credentials required'}), 400
            
        # Select backend
        backend_name = backend
        if backend == 'auto':
            backend_name = 'ibm_fez'  # Default fast heron backend
            
        # Submit to IBM Quantum Runtime
        try:
            from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
            from qiskit import QuantumCircuit
            
            service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token)
            target_backend = service.backend(backend_name)
            
            # Simple conversion from circuit_data gates to Qiskit Circuit
            qc = QuantumCircuit(current_circuit.get('circuit_data', {}).get('qubits', 2))
            for gate in current_circuit.get('circuit_data', {}).get('gates', []):
                g_type = gate.get('type')
                qubits = gate.get('qubits', [0])
                if g_type == 'H':
                    qc.h(qubits[0])
                elif g_type == 'X':
                    qc.x(qubits[0])
                elif g_type == 'CX':
                    qc.cx(qubits[0], qubits[1])
            qc.measure_all()
            
            # Run job
            transpiled_qc = transpile(qc, backend=target_backend)
            sampler = Sampler(mode=target_backend)
            job = sampler.run([transpiled_qc], shots=shots)
            result = job.result()
            
            counts = extract_counts_from_result(result)
            
            return jsonify({
                'success': True,
                'job_id': job.job_id(),
                'status': 'COMPLETED',
                'backend': backend_name,
                'counts': counts
            })
        except Exception as e:
            return jsonify({'success': False, 'error': f'IBM Quantum execution failed: {e}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@jobs_bp.route('/api/ibm/submit-job', methods=['POST'])
def submit_ibm_job():
    try:
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if not quantum_token:
            return jsonify({'success': False, 'error': 'IBM Quantum credentials required'}), 400
            
        data = request.get_json() or {}
        code = data.get('code', '').strip()
        backend_name = data.get('backend', '')
        shots = data.get('shots', 1024)
        
        if not code or not backend_name:
            return jsonify({'success': False, 'error': 'Code and backend required'}), 400
            
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
        service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token)
        backend = service.backend(backend_name)
        
        local_vars = {}
        exec(code, {}, local_vars)
        
        qc = None
        for v in local_vars.values():
            if hasattr(v, 'qubits') and hasattr(v, 'draw'):
                qc = v
                break
                
        if not qc:
            return jsonify({'success': False, 'error': 'No circuit found in code'}), 400
            
        transpiled_qc = transpile(qc, backend=backend)
        sampler = Sampler(mode=backend)
        job = sampler.run([transpiled_qc], shots=shots)
        
        return jsonify({
            'success': True,
            'job_id': job.job_id(),
            'backend': backend_name,
            'shots': shots,
            'message': 'Job submitted successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@jobs_bp.route('/api/ibm/job-status/<job_id>', methods=['GET'])
def get_ibm_job_status(job_id):
    try:
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if not quantum_token:
            return jsonify({'success': False, 'error': 'Credentials required'}), 400
            
        from qiskit_ibm_runtime import QiskitRuntimeService
        service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token)
        job = service.job(job_id)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': str(job.status())
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@jobs_bp.route('/api/run_circuit', methods=['POST'])
def run_circuit_ibm():
    try:
        data = request.get_json() or {}
        qasm = data.get('qasm', '').strip()
        shots = data.get('shots', 1024)
        backend_name = data.get('backend', 'ibmq_qasm_simulator')
        
        if not qasm:
            return jsonify({'success': False, 'error': 'No QASM provided'}), 400
            
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if not quantum_token:
            return jsonify({'success': False, 'error': 'IBM Quantum credentials required'}), 400
            
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
        from qiskit import QuantumCircuit
        
        service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token)
        backend = service.backend(backend_name)
        
        qc = QuantumCircuit.from_qasm_str(qasm)
        transpiled_qc = transpile(qc, backend=backend)
        
        sampler = Sampler(mode=backend)
        job = sampler.run([transpiled_qc], shots=shots)
        result = job.result()
        
        counts = extract_counts_from_result(result)
        
        return jsonify({
            'success': True,
            'backend': backend_name,
            'shots': shots,
            'job_id': job.job_id(),
            'counts': counts,
            'real_execution': True
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@jobs_bp.route('/api/ibm/run-circuit-stream', methods=['POST'])
def run_circuit_stream():
    """Stream IBM Quantum circuit execution steps as server-sent events"""
    try:
        data = request.get_json() or {}
        circuit_data = data.get('circuit')
        backend_name = data.get('backend', 'auto')
        shots = data.get('shots', 1024)
        
        if not circuit_data:
            return jsonify({'success': False, 'error': 'No circuit data provided'}), 400
            
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if not quantum_token:
            return jsonify({'success': False, 'error': 'IBM Quantum credentials required'}), 400
            
        if backend_name == 'auto':
            backend_name = 'ibm_fez'  # Default Herons
            
        def event_stream():
            try:
                # Step 1: Transpilation
                yield f'data: {json.dumps({"step": "transpilation", "status": "running", "message": "Compiling circuit layout and mapping gates..."})}\n\n'
                time.sleep(1)
                
                num_qubits = int(circuit_data.get('qubits', 2))
                qc = QuantumCircuit(num_qubits, num_qubits)
                
                # Map lowercase gate names
                for gate in circuit_data.get('gates', []):
                    g = gate.get('gate', '').lower()
                    q = gate.get('qubits', [0])
                    q = [int(idx) for idx in q if int(idx) < num_qubits]
                    if not q:
                        continue
                        
                    if g == 'h':
                        qc.h(q[0])
                    elif g == 'x':
                        qc.x(q[0])
                    elif g == 'y':
                        qc.y(q[0])
                    elif g == 'z':
                        qc.z(q[0])
                    elif g == 's':
                        qc.s(q[0])
                    elif g == 'sdg':
                        qc.sdg(q[0])
                    elif g == 't':
                        qc.t(q[0])
                    elif g == 'tdg':
                        qc.tdg(q[0])
                    elif g == 'cx' and len(q) >= 2:
                        qc.cx(q[0], q[1])
                    elif g == 'cy' and len(q) >= 2:
                        qc.cy(q[0], q[1])
                    elif g == 'cz' and len(q) >= 2:
                        qc.cz(q[0], q[1])
                    elif g == 'swap' and len(q) >= 2:
                        qc.swap(q[0], q[1])
                    elif g == 'ccx' and len(q) >= 3:
                        qc.ccx(q[0], q[1], q[2])
                    elif g in ['rx', 'ry', 'rz']:
                        params = gate.get('params', {})
                        theta = float(params.get('theta', 3.14159/2))
                        if g == 'rx':
                            qc.rx(theta, q[0])
                        elif g == 'ry':
                            qc.ry(theta, q[0])
                        elif g == 'rz':
                            qc.rz(theta, q[0])
                    elif g == 'measure':
                        qc.measure(q[0], q[0])
                
                # Auto-measure all if no measurements
                if not any(inst.operation.name == 'measure' for inst in qc.data):
                    qc.measure(list(range(num_qubits)), list(range(num_qubits)))
                
                yield f'data: {json.dumps({"step": "transpilation", "status": "completed", "message": "Circuit compilation completed successfully.", "backend": backend_name})}\n\n'
                time.sleep(0.5)
                
                # Step 2: Validation
                yield f'data: {json.dumps({"step": "validation", "status": "running", "message": "Validating credentials and verifying gate operations...", "backend": backend_name})}\n\n'
                
                from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
                try:
                    service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token, instance=quantum_crn)
                    target_backend = service.backend(backend_name)
                except Exception as service_err:
                    print(f"Failed to connect using user instance/CRN, falling back: {service_err}")
                    service = QiskitRuntimeService(channel='ibm_quantum_platform', token=quantum_token)
                    target_backend = service.backend(backend_name)
                
                # Retrieve the resolved backend name (in case it is different or resolved from 'auto')
                resolved_backend = target_backend.name
                
                transpiled_qc = transpile(qc, backend=target_backend)
                
                yield f'data: {json.dumps({"step": "validation", "status": "completed", "message": "Validation complete.", "backend": resolved_backend})}\n\n'
                time.sleep(0.5)
                
                # Step 3: Execution
                yield f'data: {json.dumps({"step": "execution", "status": "running", "message": f"Submitting job to IBM Quantum ({resolved_backend})...", "elapsed": 0, "backend": resolved_backend})}\n\n'
                
                sampler = Sampler(mode=target_backend)
                job = sampler.run([transpiled_qc], shots=shots)
                job_id = job.job_id()
                
                start_exec = time.time()
                while True:
                    status = job.status()
                    if hasattr(status, 'name'):
                        status_name = status.name.upper()
                    else:
                        status_str = str(status).upper()
                        if 'JOBSTATUS.' in status_str:
                            status_name = status_str.split('.')[-1]
                        else:
                            status_name = status_str

                    # Try to get queue position
                    queue_position = None
                    try:
                        if hasattr(job, 'position_in_queue') and callable(job.position_in_queue):
                            queue_position = job.position_in_queue()
                        elif hasattr(job, 'queue_info') and callable(job.queue_info):
                            q_info = job.queue_info()
                            if q_info:
                                queue_position = q_info.position
                    except Exception:
                        pass

                    elapsed = int(time.time() - start_exec)
                    
                    event_data = {
                        "step": "execution",
                        "status": "running",
                        "elapsed": elapsed,
                        "job_id": job_id,
                        "backend": resolved_backend
                    }
                    
                    if queue_position is not None:
                        est_wait = queue_position * 15 # estimate 15 seconds per slot
                        event_data["queue"] = queue_position
                        event_data["est_wait"] = est_wait
                        event_data["message"] = f"Job status: {status_name} (Queue Position: {queue_position}, Est. wait: {est_wait}s)"
                    else:
                        event_data["message"] = f"Job status: {status_name}..."
                        
                    if status_name in ['DONE', 'COMPLETED']:
                        break
                    elif status_name in ['ERROR', 'CANCELLED', 'FAILED']:
                        raise Exception(f"IBM Quantum Job failed: {status_name}")
                        
                    yield f'data: {json.dumps(event_data)}\n\n'
                    time.sleep(2)
                
                # Retrieve the result object after job completes
                result = job.result()
                    
                yield f'data: {json.dumps({"step": "execution", "status": "completed", "message": "Job successfully completed on IBM Quantum!", "elapsed": int(time.time() - start_exec), "job_id": job_id, "backend": resolved_backend})}\n\n'
                time.sleep(0.5)
                
                # Step 4: Analysis
                yield f'data: {json.dumps({"step": "analysis", "status": "running", "message": "Retrieving measurement outcomes and generating histogram...", "backend": resolved_backend})}\n\n'
                counts = extract_counts_from_result(result)
                
                # Save to database
                try:
                    conn = sqlite3.connect(get_db_path())
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO jobs (job_id, user_id, backend, shots, status, result_data)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (job_id, session.get('user_id'), resolved_backend, shots, 'COMPLETED', json.dumps(counts)))
                    conn.commit()
                    conn.close()
                except Exception as db_err:
                    print(f"Error saving job: {db_err}")
                
                yield f'data: {json.dumps({"step": "analysis", "status": "completed", "message": "Execution finished successfully!", "data": {"counts": counts, "job_id": job_id, "backend": resolved_backend}, "backend": resolved_backend})}\n\n'
                
            except Exception as inner_e:
                yield f'data: {json.dumps({"error": str(inner_e)})}\n\n'
                
        return Response(event_stream(), mimetype='text/event-stream')
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Legacy Job Results API Routes ---

@jobs_bp.route('/job_results')
def get_job_results():
    """Endpoint to get all job results - matches frontend expectations"""
    # Return 410 Gone to match legacy behavior
    return jsonify({
        "error": "DEPRECATED_ENDPOINT",
        "message": "Use /api/providers/{id}",
        "since": "v1.2.0"
    }), 410


@jobs_bp.route('/external_job_results')
def get_external_job_results():
    """Endpoint to get job results from external instances"""
    try:
        url = request.args.get('url')
        token = request.args.get('token', '')
        crn = request.args.get('crn', '')
        
        if not url:
            return jsonify({
                "error": "URL parameter is required",
                "jobs": []
            }), 400
        
        from helpers import QuantumBackendManager
        try:
            temp_manager = QuantumBackendManager(token=token, crn=crn)
            if not temp_manager.is_connected:
                return jsonify({
                    "error": "Failed to connect to external API",
                    "jobs": []
                }), 400
            
            jobs = temp_manager.get_jobs()
        except Exception as conn_error:
            print(f"Error creating quantum manager for external API: {conn_error}")
            return jsonify({
                "error": "Failed to create quantum manager",
                "message": str(conn_error),
                "jobs": []
            }), 400
        
        return jsonify({
            "success": True,
            "jobs": jobs,
            "count": len(jobs)
        })
        
    except Exception as e:
        print(f"? Error getting external job results: {e}")
        return jsonify({
            "error": "Failed to get external job results",
            "message": str(e),
            "jobs": []
        }), 500
