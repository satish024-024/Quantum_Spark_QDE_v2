"""
AWS Braket Quantum Provider Adapter
Multi-Provider Quantum Integration v2.1

Uses amazon-braket-sdk and boto3 for multi-device access.
Supports BOTH gate-based and annealing (D-Wave via Braket).

API Reference: https://docs.aws.amazon.com/braket/
SDK Version: amazon-braket-sdk >= 1.107.0
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json

# Import base classes
try:
    from .quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel,
        ProviderResult
    )
except ImportError:
    from quantum_provider_base import (
        GateBasedProvider, 
        ProviderCapabilities, 
        ComputationModel,
        ProviderResult
    )


class AWSBraketProvider(GateBasedProvider):
    """
    AWS Braket quantum provider for gate-based quantum computing.
    
    Supports multiple hardware providers through Braket:
    - IonQ (Harmony, Aria)
    - IQM (Garnet)
    - Rigetti (Ankaa)
    - Amazon (SV1, DM1, TN1 simulators)
    
    Requires: boto3, amazon-braket-sdk
    
    Note: For D-Wave access through Braket, use the dedicated
    DWaveProvider which inherits from AnnealingProvider.
    """
    
    PROVIDER_NAME = "aws_braket"
    
    # Device ARN prefixes
    DEVICE_ARNS = {
        # Simulators (always available)
        'sv1': 'arn:aws:braket:::device/quantum-simulator/amazon/sv1',
        'dm1': 'arn:aws:braket:::device/quantum-simulator/amazon/dm1',
        'tn1': 'arn:aws:braket:::device/quantum-simulator/amazon/tn1',
        
        # IonQ devices
        'ionq_harmony': 'arn:aws:braket:us-east-1::device/qpu/ionq/Harmony',
        'ionq_aria1': 'arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1',
        'ionq_aria2': 'arn:aws:braket:us-east-1::device/qpu/ionq/Aria-2',
        'ionq_forte1': 'arn:aws:braket:us-east-1::device/qpu/ionq/Forte-1',
        
        # IQM devices
        'iqm_garnet': 'arn:aws:braket:eu-north-1::device/qpu/iqm/Garnet',
        
        # Rigetti devices
        'rigetti_ankaa2': 'arn:aws:braket:us-west-1::device/qpu/rigetti/Ankaa-2',
    }
    
    def __init__(self, region: str = 'us-east-1', 
                 s3_bucket: str = None,
                 s3_prefix: str = 'braket-results'):
        """
        Initialize AWS Braket provider.
        
        Args:
            region: AWS region (us-east-1, us-west-1, eu-north-1)
            s3_bucket: S3 bucket for results (required for job submission)
            s3_prefix: S3 prefix for result files
        """
        super().__init__()
        
        self.region = region
        self.s3_bucket = s3_bucket
        self.s3_prefix = s3_prefix
        
        # Try to initialize boto3 client
        self._braket_client = None
        self._device_cache = {}
        
        try:
            import boto3
            self._braket_client = boto3.client('braket', region_name=region)
        except ImportError:
            pass  # boto3 not installed
        except Exception:
            pass  # AWS credentials not configured
        
        # Configure capabilities
        self.capabilities.model = ComputationModel.GATE_BASED
        self.capabilities.cost_model = "per_task"
        self.capabilities.access_model = "broker"  # Braket is a broker
        self.capabilities.max_shots = 10000
    
    def get_backends(self) -> List[Dict[str, Any]]:
        """
        Get available AWS Braket quantum devices.
        Uses boto3.client('braket').search_devices() API.
        
        Returns:
            List of backends with normalized fields
        """
        try:
            if not self._braket_client:
                import boto3
                self._braket_client = boto3.client('braket', region_name=self.region)
            
            # Search for quantum devices
            response = self._braket_client.search_devices(
                filters=[
                    {'name': 'deviceType', 'values': ['QPU', 'SIMULATOR']}
                ]
            )
            
            backends = []
            for device in response.get('devices', []):
                device_type = device.get('deviceType', 'UNKNOWN')
                provider_name = device.get('providerName', 'unknown')
                
                backends.append({
                    'id': device.get('deviceArn', ''),
                    'name': device.get('deviceName', 'unknown'),
                    'provider': f"braket_{provider_name.lower()}",
                    'actual_hardware_provider': provider_name,
                    'computation_model': 'gate',
                    'status': device.get('deviceStatus', 'UNKNOWN').lower(),
                    'type': 'qpu' if device_type == 'QPU' else 'simulator',
                    'device_arn': device.get('deviceArn', ''),
                    'qubits': self._get_qubit_count(device),
                })
            
            return backends
            
        except ImportError:
            return self._get_mock_backends()
        except Exception as e:
            print(f"Error fetching Braket devices: {e}")
            return self._get_mock_backends()
    
    def _get_mock_backends(self) -> List[Dict[str, Any]]:
        """Return mock backends when AWS not configured"""
        return [
            {
                'id': self.DEVICE_ARNS['sv1'],
                'name': 'SV1',
                'provider': 'braket_amazon',
                'actual_hardware_provider': 'Amazon',
                'computation_model': 'gate',
                'status': 'online',
                'type': 'simulator',
                'device_arn': self.DEVICE_ARNS['sv1'],
                'qubits': 34,
            },
            {
                'id': self.DEVICE_ARNS['ionq_aria1'],
                'name': 'Aria-1',
                'provider': 'braket_ionq',
                'actual_hardware_provider': 'IonQ',
                'computation_model': 'gate',
                'status': 'online',
                'type': 'qpu',
                'device_arn': self.DEVICE_ARNS['ionq_aria1'],
                'qubits': 25,
            },
        ]
    
    def _get_qubit_count(self, device: Dict) -> int:
        """Extract qubit count from device metadata"""
        # Try to get from properties if available
        return device.get('qubits', 0)
    
    def get_provider_info(self) -> Dict[str, Any]:
        """Get AWS Braket provider metadata"""
        return {
            'name': self.PROVIDER_NAME,
            'display_name': 'AWS Braket',
            'model': self.capabilities.model.value,
            'region': self.region,
            'cost_model': self.capabilities.cost_model,
            'access_model': self.capabilities.access_model,
            'is_broker': True,
            'supported_providers': ['Amazon', 'IonQ', 'IQM', 'Rigetti'],
            's3_bucket': self.s3_bucket
        }
    
    def health_check(self) -> bool:
        """Verify AWS Braket API accessibility"""
        try:
            if not self._braket_client:
                import boto3
                self._braket_client = boto3.client('braket', region_name=self.region)
            
            # Simple API call to verify credentials
            self._braket_client.search_devices(
                filters=[{'name': 'deviceType', 'values': ['SIMULATOR']}],
                maxResults=1
            )
            return True
        except:
            return False
    
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        List recent AWS Braket quantum tasks.
        
        Args:
            limit: Maximum number of tasks to return
            
        Returns:
            List of normalized job dicts
        """
        try:
            if not self._braket_client:
                return []
            
            response = self._braket_client.search_quantum_tasks(
                maxResults=min(limit, 100)
            )
            
            jobs = []
            for task in response.get('quantumTasks', []):
                jobs.append({
                    'job_id': task.get('quantumTaskArn', '').split('/')[-1],
                    'provider': 'aws_braket',
                    'status': task.get('status', 'UNKNOWN').lower(),
                    'backend': task.get('deviceArn', '').split('/')[-1],
                    'created_at': task.get('createdAt', ''),
                    'computation_type': 'gate',
                    'device_arn': task.get('deviceArn', '')
                })
            
            return jobs
            
        except Exception as e:
            print(f"Error listing Braket tasks: {e}")
            return []
    
    def submit_circuit(self, circuit: Any, backend: str, shots: int,
                       **kwargs) -> Dict[str, Any]:
        """
        Submit a quantum circuit to AWS Braket.
        
        Uses AwsDevice.run() from amazon-braket-sdk.
        
        Args:
            circuit: Braket circuit or OpenQASM string
            backend: Device name or ARN
            shots: Number of shots
            **kwargs: Additional options (disable_qubit_rewiring, etc.)
            
        Returns:
            Job submission result with task ARN
        """
        try:
            from braket.aws import AwsDevice, AwsQuantumTask
            from braket.circuits import Circuit
            
            # Resolve device ARN
            device_arn = self._resolve_device_arn(backend)
            
            # Get device
            device = AwsDevice(device_arn)
            
            # Ensure S3 bucket is configured
            if not self.s3_bucket:
                return {
                    'job_id': None,
                    'status': 'failed',
                    'provider': 'aws_braket',
                    'error': 'S3 bucket not configured for results'
                }
            
            # Submit task
            s3_destination = (self.s3_bucket, self.s3_prefix)
            
            task = device.run(
                circuit,
                s3_destination_folder=s3_destination,
                shots=shots,
                disable_qubit_rewiring=kwargs.get('disable_qubit_rewiring', False)
            )
            
            return {
                'job_id': task.id,
                'task_arn': task.id,
                'status': task.state(),
                'provider': 'aws_braket',
                'backend': backend,
                'device_arn': device_arn,
                'submitted_at': datetime.now().isoformat(),
                'shots': shots
            }
            
        except ImportError:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'aws_braket',
                'error': 'amazon-braket-sdk not installed'
            }
        except Exception as e:
            return {
                'job_id': None,
                'status': 'failed',
                'provider': 'aws_braket',
                'error': str(e)
            }
    
    def _resolve_device_arn(self, backend: str) -> str:
        """Resolve backend name to full device ARN"""
        # If already an ARN, return as-is
        if backend.startswith('arn:aws:braket'):
            return backend
        
        # Check predefined ARNs
        backend_lower = backend.lower().replace('-', '_').replace(' ', '_')
        if backend_lower in self.DEVICE_ARNS:
            return self.DEVICE_ARNS[backend_lower]
        
        # Default to SV1 simulator
        return self.DEVICE_ARNS['sv1']
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of a Braket quantum task.
        
        Args:
            job_id: Task ARN or ID
            
        Returns:
            Task status information
        """
        try:
            from braket.aws import AwsQuantumTask
            
            task = AwsQuantumTask(job_id)
            
            return {
                'job_id': job_id,
                'status': task.state().lower(),
                'provider': 'aws_braket',
                'backend': str(task.metadata().get('deviceArn', '')).split('/')[-1]
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'aws_braket',
                'error': str(e)
            }
    
    def get_job_result(self, job_id: str) -> Dict[str, Any]:
        """
        Get results of a completed Braket quantum task.
        
        Args:
            job_id: Task ARN or ID
            
        Returns:
            Task results with measurement counts
        """
        try:
            from braket.aws import AwsQuantumTask
            
            task = AwsQuantumTask(job_id)
            result = task.result()
            
            return {
                'job_id': job_id,
                'status': 'completed',
                'provider': 'aws_braket',
                'counts': dict(result.measurement_counts),
                'measurements': result.measurements.tolist() if hasattr(result.measurements, 'tolist') else [],
                'metadata': {
                    'shots': result.task_metadata.shots,
                    'device': result.task_metadata.deviceArn
                }
            }
            
        except Exception as e:
            return {
                'job_id': job_id,
                'status': 'error',
                'provider': 'aws_braket',
                'error': str(e)
            }
    
    def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """Cancel a Braket quantum task"""
        try:
            from braket.aws import AwsQuantumTask
            
            task = AwsQuantumTask(job_id)
            task.cancel()
            
            return {
                'success': True,
                'job_id': job_id,
                'status': 'cancelled'
            }
        except Exception as e:
            return {
                'success': False,
                'job_id': job_id,
                'error': str(e)
            }
    
    def estimate_cost(self, backend: str, shots: int) -> float:
        """
        Estimate cost for a Braket task.
        
        AWS Braket pricing (approximate as of 2025):
        - SV1: $0.075 per minute
        - DM1: $0.075 per minute
        - TN1: $0.275 per minute
        - IonQ: $0.01 per shot + $0.30 per task
        - Rigetti: $0.00035 per shot
        - IQM: $0.00145 per shot
        """
        backend_lower = backend.lower()
        
        if 'sv1' in backend_lower or 'dm1' in backend_lower:
            return 0.075  # Approximate 1 minute minimum
        elif 'tn1' in backend_lower:
            return 0.275
        elif 'ionq' in backend_lower:
            return 0.30 + (0.01 * shots)
        elif 'rigetti' in backend_lower:
            return 0.00035 * shots
        elif 'iqm' in backend_lower:
            return 0.00145 * shots
        else:
            return 0.0
