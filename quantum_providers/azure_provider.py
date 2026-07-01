"""
Azure Quantum Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses azure.quantum.Workspace for Azure Quantum access.
Azure acts as a BROKER for multiple hardware providers.

API Reference: https://learn.microsoft.com/azure/quantum/
SDK: azure-quantum >= 2.0.0
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from .quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel
    )
except ImportError:
    from quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel
    )


class AzureQuantumProvider(GateBasedProvider):
    """
    Azure Quantum provider - a BROKER for multiple hardware providers.
    
    Azure Quantum provides access to:
    - IonQ (Harmony, Aria)
    - Quantinuum (H1, H2)
    - Rigetti (Ankaa)
    - PASQAL (neutral atoms)
    
    Uses azure.quantum.Workspace.get_targets().
    """
    
    PROVIDER_NAME = "azure_quantum"
    
    # Known Azure Quantum targets
    AZURE_TARGETS = {
        # IonQ (gate-based, trapped ions)
        'ionq.simulator': {'provider': 'IonQ', 'type': 'simulator', 'qubits': 29},
        'ionq.harmony': {'provider': 'IonQ', 'type': 'qpu', 'qubits': 11},
        'ionq.aria-1': {'provider': 'IonQ', 'type': 'qpu', 'qubits': 25},
        
        # Quantinuum (gate-based, trapped ions)
        'quantinuum.hqs-lt-s1': {'provider': 'Quantinuum', 'type': 'qpu', 'qubits': 12},
        'quantinuum.hqs-lt-s1-apival': {'provider': 'Quantinuum', 'type': 'emulator', 'qubits': 12},
        'quantinuum.hqs-lt-s2': {'provider': 'Quantinuum', 'type': 'qpu', 'qubits': 32},
        
        # Rigetti (gate-based, superconducting)
        'rigetti.qpu.ankaa-2': {'provider': 'Rigetti', 'type': 'qpu', 'qubits': 84},
        'rigetti.sim.qvm': {'provider': 'Rigetti', 'type': 'simulator', 'qubits': 25},
        
        # PASQAL (neutral atoms)
        'pasqal.device.fresnel': {'provider': 'PASQAL', 'type': 'qpu', 'qubits': 100},
    }
    
    def __init__(self, resource_id: str = None, location: str = None,
                 subscription_id: str = None, resource_group: str = None,
                 workspace_name: str = None):
        """
        Initialize Azure Quantum provider.
        
        Can connect via:
        1. resource_id (full Azure resource ID)
        2. subscription_id + resource_group + workspace_name
        
        Args:
            resource_id: Full Azure resource ID
            location: Azure region (e.g., 'eastus')
            subscription_id: Azure subscription ID
            resource_group: Resource group name
            workspace_name: Workspace name
        """
        super().__init__()
        
        self.resource_id = resource_id
        self.location = location
        self.subscription_id = subscription_id
        self.resource_group = resource_group
        self.workspace_name = workspace_name
        
        self._workspace = None
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.GATE_BASED
        self.capabilities.cost_model = "per_shot"
        self.capabilities.access_model = "broker"  # Azure is a broker
    
    def _get_workspace(self):
        """Get Azure Quantum Workspace (lazy load)"""
        if self._workspace is None:
            try:
                from azure.quantum import Workspace
                
                if self.resource_id:
                    self._workspace = Workspace(
                        resource_id=self.resource_id,
                        location=self.location
                    )
                elif self.subscription_id and self.resource_group and self.workspace_name:
                    self._workspace = Workspace(
                        subscription_id=self.subscription_id,
                        resource_group=self.resource_group,
                        name=self.workspace_name,
                        location=self.location or 'eastus'
                    )
                else:
                    raise ValueError("Must provide resource_id or (subscription_id + resource_group + workspace_name)")
                    
            except ImportError:
                raise ImportError("azure-quantum not installed. Run: pip install azure-quantum")
        
        return self._workspace
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available Azure Quantum targets.
        
        Uses Workspace.get_targets() to discover available providers.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            workspace = self._get_workspace()
            targets = workspace.get_targets()
            
            backends = []
            for target in targets:
                target_id = target.name
                target_info = self.AZURE_TARGETS.get(target_id, {})
                
                backends.append({
                    'id': target_id,
                    'name': target_id.split('.')[-1],
                    'provider': f"azure_{target_info.get('provider', 'unknown').lower()}",
                    'actual_hardware_provider': target_info.get('provider', 'Unknown'),
                    'computation_model': 'gate',
                    'status': 'online' if target.current_availability else 'offline',
                    'qubits': target_info.get('qubits', 0),
                    'type': target_info.get('type', 'unknown'),
                    'target_id': target_id
                })
            
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching Azure Quantum targets: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when Azure SDK not configured"""
        backends = []
        for target_id, info in self.AZURE_TARGETS.items():
            backends.append({
                'id': target_id,
                'name': target_id.split('.')[-1],
                'provider': f"azure_{info['provider'].lower()}",
                'actual_hardware_provider': info['provider'],
                'computation_model': 'gate',
                'status': 'unknown',
                'qubits': info['qubits'],
                'type': info['type'],
                'target_id': target_id
            })
        return backends
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get Azure Quantum provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'Azure Quantum',
            'model': self.capabilities.model.value,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'is_broker': True,
            'supported_providers': ['IonQ', 'Quantinuum', 'Rigetti', 'PASQAL'],
            'workspace_name': self.workspace_name
        }
    
    def health_check(self) -> bool:
        """Verify Azure Quantum accessibility"""
        try:
            workspace = self._get_workspace()
            targets = workspace.get_targets()
            return len(list(targets)) > 0
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent Azure Quantum jobs.
        
        Uses Workspace.list_jobs().
        """
        try:
            workspace = self._get_workspace()
            jobs = list(workspace.list_jobs())[:limit]
            
            return [{
                'job_id': job.id,
                'provider': 'azure_quantum',
                'status': job.details.status.lower() if hasattr(job.details, 'status') else 'unknown',
                'backend': job.details.target if hasattr(job.details, 'target') else 'unknown',
                'created_at': str(job.details.creation_time) if hasattr(job.details, 'creation_time') else '',
                'computation_type': 'gate'
            } for job in jobs]
            
        except Exception as e:
            print(f"Error listing Azure jobs: {e}")
            return []
    
    def submit_circuit(self, circuit: Any, backend: str, shots: int,
                       **kwargs) -> Dict[str, Any]:
        """
        Submit a circuit to Azure Quantum.
        
        Supports Qiskit, Cirq, and Q# circuits via Azure SDK.
        
        Args:
            circuit: Quantum circuit (Qiskit, Cirq, or Q#)
            backend: Target ID (e.g., 'ionq.aria-1')
            shots: Number of shots
            **kwargs: Additional options
            
        Returns:
            Job submission result
        """
        try:
            import uuid
            
            workspace = self._get_workspace()
            
            # Get target
            target = workspace.get_targets(name=backend)
            
            # Submit job
            job = target.submit(
                circuit,
                name=kwargs.get('name', f'job_{uuid.uuid4().hex[:8]}'),
                shots=shots
            )
            
            return {
                'job_id': job.id,
                'status': 'submitted',
                'provider': 'azure_quantum',
                'backend': backend,
                'submitted_at': datetime.now().isoformat(),
                'shots': shots
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'azure_quantum',
                'error': 'azure-quantum not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'azure_quantum',
                'error': str(e)
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get Azure Quantum job status"""
        try:
            workspace = self._get_workspace()
            job = workspace.get_job(job_id)
            
            return {
                'job_id': job_id,
                'status': job.details.status.lower() if hasattr(job.details, 'status') else 'unknown',
                'provider': 'azure_quantum',
                'backend': job.details.target if hasattr(job.details, 'target') else 'unknown'
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'azure_quantum',
                'error': str(e)
            }
    
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """Get Azure Quantum job result"""
        try:
            workspace = self._get_workspace()
            job = workspace.get_job(job_id)
            
            result = job.get_results()
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'azure_quantum',
                'counts': result if isinstance(result, dict) else {},
                'raw_result': result
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'azure_quantum',
                'error': str(e)
            }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for an Azure Quantum job.
        
        Costs vary by provider and target.
        """
        # Azure Quantum pricing varies by provider
        pricing = {
            'ionq': 0.00097,      # $0.97 per 1000 shots
            'quantinuum': 0.05,   # Higher cost
            'rigetti': 0.00035,   # Per shot
            'pasqal': 0.01        # Per shot estimate
        }
        
        backend_lower = backend.lower()
        for provider, rate in pricing.items():
            if provider in backend_lower:
                return rate * shots
        
        return 0.001 * shots  # Default rate
