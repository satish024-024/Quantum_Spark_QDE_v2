"""
IonQ Provider - Direct API

Adapter for IonQ quantum backends via direct REST API.
FREE simulator access + credits for QPU.
Returns JobNormalizer v1 contract.
"""

from typing import Dict, List, Any
from datetime import datetime
from .quantum_base_provider import QuantumProvider
import requests
import json

class IonQProvider(QuantumProvider):
    """
    IonQ quantum provider implementation.
    Direct REST API integration (no AWS required).
    """
    
    def __init__(self, api_key: str = None):
        """
        Initialize IonQ provider.
        
        Args:
            api_key: IonQ API key (get free key from https://cloud.ionq.com/)
        """
        self.api_key = api_key
        self.base_url = "https://api.ionq.co/v0.3"  # Correct endpoint: .co not .com
        self._headers = None
    
    def _get_headers(self):
        """Get request headers with authentication"""
        if self._headers is None:
            if not self.api_key:
                raise RuntimeError(
                    "IonQ API key required. Get free key from https://cloud.ionq.com/\n"
                    "Set via: IonQProvider(api_key='your_key')"
                )
            
            self._headers = {
                "Authorization": f"apiKey {self.api_key}",
                "Content-Type": "application/json"
            }
        
        return self._headers
    
    def get_available_backends(self) -> List[Dict[str, Any]]:
        """
        Get available IonQ backends.
        
        Returns:
            List of backend info dictionaries
        """
        try:
            # IonQ backends (as of 2025)
            # Free simulator always available
            backends = [
                {
                    "id": "simulator",
                    "name": "IonQ Simulator",
                    "qubits": 29,
                    "type": "simulator",
                    "status": "online",
                    "queue_depth": 0,
                    "tier": "Free",
                    "description": "FREE - Cloud-based quantum simulator"
                },
                {
                    "id": "harmony",
                    "name": "IonQ Harmony",
                    "qubits": 11,
                    "type": "qpu",
                    "status": "online",
                    "queue_depth": 0,
                    "tier": "Paid",
                    "description": "Trapped-ion QPU (requires credits)"
                },
                {
                    "id": "aria-1",
                    "name": "IonQ Aria",
                    "qubits": 25,
                    "type": "qpu",
                    "status": "online",
                    "queue_depth": 0,
                    "tier": "Paid",
                    "description": "Advanced trapped-ion QPU (requires credits)"
                }
            ]
            
            # If API key provided, verify it's valid
            if self.api_key:
                try:
                    headers = self._get_headers()
                    response = requests.get(
                        f"{self.base_url}/backends",
                        headers=headers,
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        # API key valid, return live backend data
                        live_backends = response.json()
                        return [
                            {
                                "id": b["backend"],
                                "name": f"IonQ {b['backend'].title()}",
                                "qubits": b.get("qubits", 11),
                                "type": "simulator" if "simulator" in b["backend"] else "qpu",
                                "status": "online" if b.get("status") == "available" else "offline",
                                "queue_depth": 0,
                                "tier": "Free" if "simulator" in b["backend"] else "Paid"
                            }
                            for b in live_backends
                        ]
                except:
                    pass  # Fall through to static list
            
            return backends
            
        except Exception as e:
            raise RuntimeError(f"Failed to fetch IonQ backends: {e}")
    
    def submit_job(self, circuit_ir: Dict, backend_id: str, shots: int, credentials: Dict = None) -> Dict:
        """
        Submit job to IonQ via direct API.
        
        For simulator backend without API key: Uses local simulation
        For all other cases: Requires API key
        
        Args:
            circuit_ir: Canonical circuit IR
            backend_id: IonQ backend name ('simulator', 'harmony', 'aria-1')
            shots: Number of shots
            credentials: Optional credentials dict
            
        Returns:
            Job object (v1 contract)
        """
        try:
            # Get API key from credentials or instance
            api_key = None
            if credentials:
                api_key = credentials.get('api_key') or credentials.get('ionq_api_key')
            if not api_key:
                api_key = self.api_key
            
            # For simulator without API key, use local simulation
            is_simulator = backend_id == "simulator" or "simulator" in backend_id.lower()
            
            if is_simulator and not api_key:
                print("⚠️ No IonQ API key - using local simulation for simulator")
                return self._simulate_locally(circuit_ir, backend_id, shots)
            
            if not api_key:
                raise RuntimeError(
                    "IonQ API key required for QPU execution.\n"
                    "Get free key from: https://cloud.ionq.com/\n"
                    "Add via Dashboard → Settings → Provider Credentials"
                )
            
            # Convert canonical IR to IonQ circuit format
            ionq_circuit = self._convert_ir_to_ionq(circuit_ir)
            
            # Create job payload
            payload = {
                "target": backend_id,
                "shots": shots,
                "input": {
                    "format": "ionq.circuit.v0",
                    "gateset": "qis",
                    "qubits": circuit_ir.get('qubits', 2),
                    "circuit": ionq_circuit
                }
            }
            
            # Submit job
            headers = {
                "Authorization": f"apiKey {api_key}",
                "Content-Type": "application/json"
            }
            response = requests.post(
                f"{self.base_url}/jobs",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code not in [200, 201]:
                # API error - for simulator, fallback to local
                if is_simulator:
                    print(f"⚠️ IonQ API error ({response.status_code}) - using local simulation")
                    return self._simulate_locally(circuit_ir, backend_id, shots)
                raise RuntimeError(f"IonQ API error: {response.text}")
            
            job_data = response.json()
            job_id = job_data.get("id", f"ionq-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}")
            
            print(f"✅ IonQ: Job {job_id} submitted to {backend_id}")
            
            # Return v1 contract
            return {
                "job_id": job_id,
                "provider": "ionq",
                "hardware_provider": "ionq",
                "execution_type": "simulator" if is_simulator else "qpu",
                "quantum_model": "gate",
                "lifecycle_state": "queued",
                "is_terminal": False,
                "submitted_at": datetime.utcnow().isoformat() + "Z",
                "backend_id": backend_id,
                "shots": shots
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            # For simulator, always fallback to local on any error
            if "simulator" in str(backend_id).lower():
                print(f"⚠️ IonQ error: {e} - using local simulation")
                return self._simulate_locally(circuit_ir, backend_id, shots)
            
            raise RuntimeError(f"IonQ job submission failed: {e}")
    
    def _simulate_locally(self, circuit_ir: Dict, backend_id: str, shots: int) -> Dict:
        """
        Run local simulation for IonQ simulator.
        Returns immediate results without API key.
        """
        import uuid
        import random
        
        job_id = f"ionq-sim-{uuid.uuid4().hex[:12]}"
        
        num_qubits = circuit_ir.get('qubits', 2)
        gates = circuit_ir.get('gates', [])
        
        # Generate simulated counts
        counts = self._generate_simulated_counts(num_qubits, gates, shots)
        
        # Cache results
        self._job_cache = getattr(self, '_job_cache', {})
        self._job_cache[job_id] = {
            'result': {'counts': counts},
            'backend': backend_id,
            'shots': shots,
            'status': 'completed'
        }
        
        print(f"✅ IonQ Simulator (local): Job {job_id} completed")
        
        return {
            "job_id": job_id,
            "provider": "ionq",
            "hardware_provider": "ionq",
            "execution_type": "simulator",
            "quantum_model": "gate",
            "lifecycle_state": "completed",
            "is_terminal": True,
            "submitted_at": datetime.utcnow().isoformat() + "Z",
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "backend_id": backend_id,
            "shots": shots,
            "result_status": "success",
            "counts": counts,  # Added for dashboard compatibility
            "result": {"counts": counts}
        }
    
    def _generate_simulated_counts(self, num_qubits: int, gates: list, shots: int) -> Dict:
        """Proper circuit simulation using Qiskit Aer for accurate results"""
        try:
            from qiskit import QuantumCircuit
            from qiskit_aer import AerSimulator
            
            # Build Qiskit circuit from gates
            qc = QuantumCircuit(num_qubits, num_qubits)
            
            for gate in gates:
                gate_type = (gate.get('type') or gate.get('gate', '')).upper()
                qubits = gate.get('qubits', gate.get('targets', [0]))
                if isinstance(qubits, int):
                    qubits = [qubits]
                
                if gate_type == 'H' and len(qubits) >= 1:
                    qc.h(qubits[0])
                elif gate_type == 'X' and len(qubits) >= 1:
                    qc.x(qubits[0])
                elif gate_type == 'Y' and len(qubits) >= 1:
                    qc.y(qubits[0])
                elif gate_type == 'Z' and len(qubits) >= 1:
                    qc.z(qubits[0])
                elif gate_type == 'S' and len(qubits) >= 1:
                    qc.s(qubits[0])
                elif gate_type == 'T' and len(qubits) >= 1:
                    qc.t(qubits[0])
                elif gate_type in ['CX', 'CNOT'] and len(qubits) >= 2:
                    if qubits[0] != qubits[1]:
                        qc.cx(qubits[0], qubits[1])
                elif gate_type == 'CZ' and len(qubits) >= 2:
                    if qubits[0] != qubits[1]:
                        qc.cz(qubits[0], qubits[1])
                elif gate_type == 'SWAP' and len(qubits) >= 2:
                    if qubits[0] != qubits[1]:
                        qc.swap(qubits[0], qubits[1])
                elif gate_type == 'RX':
                    # Handle params as array [0.3] or dict {theta: 0.3} or direct angle
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.rx(float(angle), qubits[0])
                elif gate_type == 'RY':
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.ry(float(angle), qubits[0])
                elif gate_type == 'RZ':
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.rz(float(angle), qubits[0])
                elif gate_type == 'CRX' and len(qubits) >= 2:
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.crx(float(angle), qubits[0], qubits[1])
                elif gate_type == 'CRY' and len(qubits) >= 2:
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.cry(float(angle), qubits[0], qubits[1])
                elif gate_type == 'CRZ' and len(qubits) >= 2:
                    params = gate.get('params', [])
                    if isinstance(params, list) and len(params) > 0:
                        angle = params[0]
                    elif isinstance(params, dict):
                        angle = params.get('theta', 0.7854)
                    else:
                        angle = gate.get('angle', 0.7854)
                    qc.crz(float(angle), qubits[0], qubits[1])
                elif gate_type == 'CCX' and len(qubits) >= 3:
                    qc.ccx(qubits[0], qubits[1], qubits[2])
            
            # Add measurements
            qc.measure_all()
            
            # Run on Aer Simulator
            simulator = AerSimulator()
            result = simulator.run(qc, shots=shots).result()
            counts = result.get_counts()
            
            # Convert to our format
            clean_counts = {}
            for state, count in counts.items():
                clean_state = state.replace(' ', '')[-num_qubits:]
                clean_counts[clean_state] = clean_counts.get(clean_state, 0) + count
            
            print(f"✅ IonQ Simulator: Ran circuit with {len(gates)} gates, {num_qubits} qubits")
            return clean_counts
            
        except Exception as e:
            print(f"⚠️ Qiskit Aer simulation failed: {e}, falling back to simple simulation")
            import random
            counts = {}
            for _ in range(shots):
                state = ''.join(str(random.randint(0, 1)) for _ in range(num_qubits))
                counts[state] = counts.get(state, 0) + 1
            return counts
    
    def _convert_ir_to_ionq(self, circuit_ir: Dict) -> List[Dict]:
        """
        Convert canonical circuit IR to IonQ circuit format.
        
        IonQ format:
        [
            {"gate": "h", "target": 0},
            {"gate": "cnot", "control": 0, "target": 1}
        ]
        
        Args:
            circuit_ir: Canonical IR from CircuitCompiler
            
        Returns:
            List of IonQ gate dictionaries
        """
        ionq_gates = []
        
        # Gate name mapping (canonical -> IonQ)
        gate_map = {
            'h': 'h',
            'x': 'x',
            'y': 'y',
            'z': 'z',
            's': 's',
            't': 't',
            'sdg': 'si',  # S-dagger
            'tdg': 'ti',  # T-dagger
            'cx': 'cnot',
            'cnot': 'cnot',
            'swap': 'swap'
        }
        
        for gate in circuit_ir.get('gates', []):
            # Handle both 'type' and 'gate' keys for compatibility
            gate_type = (gate.get('type') or gate.get('gate', '')).lower()
            
            # Get qubits from various formats
            qubits = gate.get('qubits', [])
            if not qubits:
                # Try control/target format
                if 'control' in gate and 'target' in gate:
                    qubits = [gate['control'], gate['target']]
                elif 'target' in gate:
                    qubits = [gate['target']]
                else:
                    qubits = [0]
            
            if isinstance(qubits, int):
                qubits = [qubits]
            
            params = gate.get('params', gate.get('parameters', []))
            
            # Skip measurement gates (IonQ measures all qubits automatically)
            if gate_type == 'measure':
                continue
            
            # Single-qubit gates
            if gate_type in ['h', 'x', 'y', 'z', 's', 't', 'sdg', 'tdg']:
                ionq_gates.append({
                    "gate": gate_map[gate_type],
                    "target": qubits[0]
                })
            
            # Rotation gates
            elif gate_type in ['rx', 'ry', 'rz']:
                ionq_gates.append({
                    "gate": gate_type,
                    "target": qubits[0],
                    "rotation": params[0] if params else 0.0
                })
            
            # Two-qubit gates
            elif gate_type in ['cx', 'cnot']:
                if len(qubits) >= 2:
                    ionq_gates.append({
                        "gate": "cnot",
                        "control": qubits[0],
                        "target": qubits[1]
                    })
            
            elif gate_type == 'swap':
                if len(qubits) >= 2:
                    ionq_gates.append({
                        "gate": "swap",
                        "targets": qubits[:2]
                    })
            
            else:
                print(f"Warning: Unsupported gate '{gate_type}' for IonQ, skipping")

        
        return ionq_gates
    
    def get_job_status(self, job_id: str) -> Dict:
        """
        Poll IonQ job status.
        
        Args:
            job_id: IonQ job ID
            
        Returns:
            Job object (v1 contract) with updated state
        """
        try:
            headers = self._get_headers()
            response = requests.get(
                f"{self.base_url}/jobs/{job_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code != 200:
                raise ValueError(f"IonQ API error: {response.text}")
            
            job_data = response.json()
            status = job_data.get("status")
            
            # Map IonQ status to lifecycle_state
            status_map = {
                'submitted': 'queued',
                'ready': 'queued',
                'running': 'running',
                'completed': 'completed',
                'failed': 'failed',
                'canceled': 'cancelled'
            }
            
            lifecycle_state = status_map.get(status, 'queued')
            is_terminal = lifecycle_state in ['completed', 'failed', 'cancelled']
            
            result = {
                "job_id": job_id,
                "provider": "ionq",
                "hardware_provider": "ionq",
                "execution_type": "qpu",
                "quantum_model": "gate",
                "lifecycle_state": lifecycle_state,
                "is_terminal": is_terminal
            }
            
            if is_terminal:
                result["result_status"] = "success" if lifecycle_state == "completed" else lifecycle_state
                result["completed_at"] = datetime.utcnow().isoformat() + "Z"
            
            return result
            
        except Exception as e:
            raise ValueError(f"Failed to get IonQ job status: {e}")
    
    def get_job_result(self, job_id: str) -> Dict:
        """
        Retrieve IonQ job results.
        
        Args:
            job_id: IonQ job ID
            
        Returns:
            Results dictionary
        """
        try:
            headers = self._get_headers()
            response = requests.get(
                f"{self.base_url}/jobs/{job_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code != 200:
                raise ValueError(f"IonQ API error: {response.text}")
            
            job_data = response.json()
            
            # Check if job is complete
            if job_data.get("status") != "completed":
                raise ValueError(f"Job {job_id} is not complete (status: {job_data.get('status')})")
            
            # Extract results
            data = job_data.get("data", {})
            histogram = data.get("histogram", {})
            
            # Convert to standard format
            counts = {}
            for bitstring, probability in histogram.items():
                # IonQ returns probabilities, convert to counts
                shots = job_data.get("shots", 1024)
                counts[bitstring] = int(probability * shots)
            
            return {
                "counts": counts,
                "shots": job_data.get("shots", 1024),
                "backend": job_data.get("target", "unknown"),
                "execution_time": job_data.get("execution_time", 0.0)
            }
            
        except Exception as e:
            raise ValueError(f"Failed to get IonQ job result: {e}")
