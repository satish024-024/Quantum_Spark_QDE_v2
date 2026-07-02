from flask import Blueprint, jsonify, request, session
from helpers import get_user_quantum_credentials, provider_credentials, quantum_manager_singleton, ProviderRegistry
import inspect
import time
import threading

backends_bp = Blueprint('backends', __name__)

@backends_bp.route('/api/backends', methods=['GET'])
def get_all_backends_aggregated():
    """
    Aggregate backends from all providers for dashboard metrics.
    Returns flat list of backends to satisfy dashboard_metrics.js
    """
    try:
        user_id = session.get('user_id')
        all_backends = []
        
        # Get providers
        providers = ProviderRegistry.list_providers()
        
        for pid, pdata in providers.items():
            if pid == 'ibm':
                token, crn = get_user_quantum_credentials()
                creds = token if token else None
            else:
                creds_key = f"{user_id}_{pid}"
                creds = provider_credentials.get(creds_key)
            
            try:
                provider_inst = ProviderRegistry.get(pid)
                if hasattr(provider_inst, 'get_available_backends'):
                    sig = inspect.signature(provider_inst.get_available_backends)
                    backends = []
                    if 'credentials' in sig.parameters:
                        backends = provider_inst.get_available_backends(credentials=creds)
                    else:
                        backends = provider_inst.get_available_backends()
                        
                    for b in backends:
                        if isinstance(b, dict):
                            if 'provider' not in b:
                                b['provider'] = pid
                            all_backends.append(b)
                        else:
                            all_backends.append({'name': str(b), 'provider': pid, 'status': 'active'})
            except Exception as ex:
                print(f"⚠️ Failed to fetch backends for {pid}: {ex}")
                continue
                
        return jsonify(all_backends), 200
    except Exception as e:
        print(f"❌ Error in get_all_backends: {e}")
        return jsonify([]), 500

@backends_bp.route('/api/providers', methods=['GET'])
def get_quantum_providers():
    """Get available quantum providers and backends."""
    try:
        user_id = session.get('user_id')
        providers = ProviderRegistry.list_providers()
        result = {}
        
        for name, provider in providers.items():
            creds_key = f"{user_id}_{name}"
            creds = provider_credentials.get(creds_key)
            
            # Sync with database/session stored credentials for IBM Quantum
            if name == 'ibm' and not creds:
                token, crn = get_user_quantum_credentials()
                if token:
                    creds = {'api_token': token, 'crn': crn}
                    provider_credentials[creds_key] = creds
            
            try:
                if hasattr(provider, 'get_available_backends'):
                    sig = inspect.signature(provider.get_available_backends)
                    if 'credentials' in sig.parameters:
                        backends = provider.get_available_backends(credentials=creds)
                    else:
                        backends = provider.get_available_backends()
                else:
                    backends = []
                    
                result[name] = {
                    "name": name,
                    "backends": backends,
                    "status": "authenticated" if creds or name != 'ibm' else "unauthenticated"
                }
            except Exception as e:
                result[name] = {
                    "name": name,
                    "backends": [],
                    "error": str(e),
                    "status": "error"
                }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backends_bp.route('/api/providers/<provider_id>', methods=['GET'])
def get_single_quantum_provider(provider_id):
    """Get ONLY the requested provider's data."""
    from helpers import get_db_path
    from routes.jobs import get_provider_jobs, get_provider_results
    import datetime
    try:
        all_providers = ProviderRegistry.list_providers()
        if provider_id not in all_providers:
            return jsonify({
                'error': f'Unknown provider: {provider_id}',
                'available_providers': list(all_providers.keys())
            }), 404
        
        user_id = session.get('user_id')
        creds_key = f"{user_id}_{provider_id}"
        creds = provider_credentials.get(creds_key)
        
        # Sync with database/session stored credentials for IBM Quantum
        if provider_id == 'ibm' and not creds:
            token, crn = get_user_quantum_credentials()
            if token:
                creds = {'api_token': token, 'crn': crn}
                provider_credentials[creds_key] = creds
        
        provider_data = all_providers[provider_id].copy()
        
        try:
            provider_inst = ProviderRegistry.get(provider_id)
            if hasattr(provider_inst, 'get_available_backends'):
                sig = inspect.signature(provider_inst.get_available_backends)
                if 'credentials' in sig.parameters:
                    live_backends = provider_inst.get_available_backends(credentials=creds)
                else:
                    live_backends = provider_inst.get_available_backends()
                provider_data['backends'] = live_backends
                if creds or provider_id != 'ibm':
                    provider_data['status'] = 'authenticated'
        except Exception as ex:
            print(f"⚠️ Failed live fetch for {provider_id}: {ex}")
            provider_data['error'] = str(ex)
            
        try:
            provider_data['jobs'] = get_provider_jobs(provider_id, user_id)
            provider_data['results'] = get_provider_results(provider_id, user_id)
        except Exception as ex:
            print(f"⚠️ Failed to fetch jobs/results for {provider_id}: {ex}")
            provider_data['jobs'] = []
            provider_data['results'] = []
            
        backends_count = len(provider_data.get('backends', []))
        jobs_count = len(provider_data.get('jobs', []))
        results_count = len(provider_data.get('results', []))
        
        print(f"📡 [SCOPED] Returning ONLY {provider_id.upper()}: {backends_count} backends, {jobs_count} jobs, {results_count} results")
        
        return jsonify({
            'id': provider_id,
            'provider': provider_data,
            'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
            'version': 'v1'
        }), 200
    except Exception as e:
        print(f"❌ Error fetching provider {provider_id}: {e}")
        return jsonify({'error': str(e)}), 500

@backends_bp.route('/api/backends/detailed')
def api_get_detailed_backends():
    """API endpoint to get detailed QPU backend metrics from IBM Quantum"""
    try:
        print("🔍 Fetching detailed backend metrics from IBM Quantum API...")
        quantum_token, quantum_crn = get_user_quantum_credentials()
        
        ibm_quantum_backends = [
            {
                "qpu_name": "ibm_boston",
                "instance": None,
                "qubits": 156,
                "status": "Online",
                "pending_jobs": 4,
                "type": "Heron r3",
                "two_q_error_median": "1.28E-3",
                "two_q_error_layered": "1.91E-3",
                "readout_error_median": "4.883E-3",
                "clops": "340K"
            },
            {
                "qpu_name": "ibm_kingston",
                "instance": None,
                "qubits": 156,
                "status": "Online",
                "pending_jobs": 46,
                "type": "Heron r2",
                "two_q_error_median": "1.97E-3",
                "two_q_error_layered": "3.94E-3",
                "readout_error_median": "1.038E-2",
                "clops": "340K"
            },
            {
                "qpu_name": "ibm_pittsburgh",
                "instance": None,
                "qubits": 156,
                "status": "Online",
                "pending_jobs": 840,
                "type": "Heron r3",
                "two_q_error_median": "1.56E-3",
                "two_q_error_layered": "2.96E-3",
                "readout_error_median": "4.028E-3",
                "clops": "330K"
            },
            {
                "qpu_name": "ibm_fez",
                "instance": "open-instance",
                "qubits": 156,
                "status": "Online",
                "pending_jobs": 0,
                "type": "Heron r2",
                "two_q_error_median": "2.61E-3",
                "two_q_error_layered": "4.23E-3",
                "readout_error_median": "1.007E-2",
                "clops": "320K"
            },
            {
                "qpu_name": "ibm_marrakesh",
                "instance": "open-instance",
                "qubits": 156,
                "status": "Online",
                "pending_jobs": 20459,
                "type": "Heron r2",
                "two_q_error_median": "2.68E-3",
                "two_q_error_layered": "4.01E-3",
                "readout_error_median": "9.949E-3",
                "clops": "300K"
            },
            {
                "qpu_name": "ibm_torino",
                "instance": "open-instance",
                "qubits": 133,
                "status": "Online",
                "pending_jobs": 0,
                "type": "Heron r1",
                "two_q_error_median": "2.56E-3",
                "two_q_error_layered": "8.00E-3",
                "readout_error_median": "2.832E-2",
                "clops": "290K"
            }
        ]
        
        if not quantum_token:
            return jsonify({
                "backends": ibm_quantum_backends,
                "total": len(ibm_quantum_backends),
                "data_source": "ibm_quantum_static",
                "last_updated": time.time(),
                "region": "us-east"
            })
            
        quantum_manager = quantum_manager_singleton.get_manager(quantum_token, quantum_crn)
        if quantum_manager and hasattr(quantum_manager, 'provider') and quantum_manager.provider:
            try:
                detailed_backends = []
                api_error = None
                
                def get_detailed_backend_info():
                    nonlocal detailed_backends, api_error
                    try:
                        backends = quantum_manager.provider.backends()
                        ibm_metrics_lookup = {sb['qpu_name']: sb for sb in ibm_quantum_backends}
                        
                        for backend in backends:
                            try:
                                name = getattr(backend, 'name', 'unknown')
                                num_qubits = getattr(backend, 'num_qubits', 0)
                                status = "Online"
                                pending_jobs = 0
                                
                                if hasattr(backend, 'status'):
                                    status_obj = backend.status()
                                    status = "Online" if getattr(status_obj, 'operational', True) else "Offline"
                                    pending_jobs = getattr(status_obj, 'pending_jobs', 0)
                                    
                                backend_version = f"v{backend.backend_version}" if hasattr(backend, 'backend_version') else "Unknown"
                                instance = "open-instance" if any(x in name for x in ['fez', 'marrakesh', 'torino']) else None
                                
                                if name in ibm_metrics_lookup:
                                    static_data = ibm_metrics_lookup[name]
                                    detailed_backends.append({
                                        "qpu_name": name,
                                        "instance": instance,
                                        "qubits": num_qubits,
                                        "status": status,
                                        "pending_jobs": pending_jobs,
                                        "type": static_data['type'],
                                        "two_q_error_median": static_data['two_q_error_median'],
                                        "two_q_error_layered": static_data['two_q_error_layered'],
                                        "readout_error_median": static_data['readout_error_median'],
                                        "clops": static_data['clops']
                                    })
                                else:
                                    detailed_backends.append({
                                        "qpu_name": name,
                                        "instance": instance,
                                        "qubits": num_qubits,
                                        "status": status,
                                        "pending_jobs": pending_jobs,
                                        "type": backend_version,
                                        "two_q_error_median": "N/A",
                                        "two_q_error_layered": "N/A",
                                        "readout_error_median": "N/A",
                                        "clops": "N/A"
                                    })
                            except Exception as be:
                                print(f"Error backend detail: {be}")
                                
                        # Add static ones
                        api_names = [b['qpu_name'] for b in detailed_backends]
                        for sb in ibm_quantum_backends:
                            if sb['qpu_name'] not in api_names:
                                detailed_backends.append(sb)
                    except Exception as e:
                        api_error = e
                        
                thread = threading.Thread(target=get_detailed_backend_info)
                thread.daemon = True
                thread.start()
                thread.join(timeout=10)
                
                if not thread.is_alive() and not api_error and detailed_backends:
                    return jsonify({
                        "backends": detailed_backends,
                        "total": len(detailed_backends),
                        "data_source": "ibm_quantum_api",
                        "last_updated": time.time()
                    })
            except Exception as e:
                print(f"Error accessing IBM API: {e}")
                
        return jsonify({
            "backends": ibm_quantum_backends,
            "total": len(ibm_quantum_backends),
            "data_source": "ibm_quantum_static",
            "last_updated": time.time()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
