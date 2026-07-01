"""
Widget Provider Adapter - Compatibility Layer
Multi-Provider Quantum Integration v2.1

Normalizes provider data for dashboard widgets.
All providers output different data formats - this layer unifies them.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

try:
    from .quantum_provider_base import ComputationModel
except ImportError:
    from quantum_provider_base import ComputationModel


class WidgetDataAdapter:
    """
    Normalize provider data for dashboard widgets.
    Converts any provider's raw data to standard widget format.
    """
    
    # Status normalization map
    STATUS_MAP = {
        # Online states
        'ONLINE': 'online',
        'online': 'online',
        'AVAILABLE': 'online',
        'available': 'online',
        'active': 'online',
        'ACTIVE': 'online',
        'operational': 'online',
        'OPERATIONAL': 'online',
        
        # Offline states
        'OFFLINE': 'offline',
        'offline': 'offline',
        'unavailable': 'offline',
        'UNAVAILABLE': 'offline',
        'maintenance': 'offline',
        'MAINTENANCE': 'offline',
        
        # Job running states
        'RUNNING': 'running',
        'running': 'running',
        'EXECUTING': 'running',
        'executing': 'running',
        'in_progress': 'running',
        'IN_PROGRESS': 'running',
        
        # Job queued states
        'QUEUED': 'queued',
        'queued': 'queued',
        'pending': 'queued',
        'PENDING': 'queued',
        'submitted': 'queued',
        'SUBMITTED': 'queued',
        'INITIALIZING': 'queued',
        'initializing': 'queued',
        'VALIDATING': 'queued',
        
        # Completed states
        'COMPLETED': 'completed',
        'completed': 'completed',
        'DONE': 'completed',
        'done': 'completed',
        'success': 'completed',
        'SUCCESS': 'completed',
        'ready': 'completed',
        'READY': 'completed',
        
        # Failed states
        'FAILED': 'failed',
        'failed': 'failed',
        'ERROR': 'failed',
        'error': 'failed',
        
        # Cancelled states
        'CANCELLED': 'cancelled',
        'cancelled': 'cancelled',
        'CANCELED': 'cancelled',
        'canceled': 'cancelled',
    }
    
    @staticmethod
    def normalize_backend(raw_backend: Dict[str, Any], 
                          provider_model: ComputationModel,
                          provider_name: str = None) -> Dict[str, Any]:
        """
        Convert any provider backend to standard widget format.
        
        Args:
            raw_backend: Raw backend data from provider
            provider_model: Computation model (gate/annealing/photonic)
            provider_name: Override provider name
        
        Returns:
            Normalized backend dict for widget rendering
        """
        # Extract name (different providers use different keys)
        name = (raw_backend.get('name') or 
                raw_backend.get('backend') or 
                raw_backend.get('id') or 
                raw_backend.get('deviceName') or
                'unknown')
        
        # Extract status
        raw_status = (raw_backend.get('status') or 
                      raw_backend.get('deviceStatus') or
                      raw_backend.get('current_availability') or
                      'unknown')
        
        normalized = {
            'id': raw_backend.get('id', name),
            'name': name,
            'provider': provider_name or raw_backend.get('provider', 'unknown'),
            'computation_model': provider_model.value if provider_model else 'gate',
            'status': WidgetDataAdapter._normalize_status(raw_status),
            'capacity': WidgetDataAdapter._get_capacity(raw_backend, provider_model),
            'availability': WidgetDataAdapter._get_availability(raw_backend),
        }
        
        # Add model-specific fields
        if provider_model == ComputationModel.GATE_BASED:
            normalized['qubits'] = raw_backend.get('qubits', 0)
            normalized['type'] = raw_backend.get('type', 'qpu')
        elif provider_model == ComputationModel.ANNEALING:
            normalized['qubits'] = raw_backend.get('qubits', 0)  # Actually spins
            normalized['topology'] = raw_backend.get('topology', 'unknown')
        elif provider_model == ComputationModel.PHOTONIC:
            normalized['modes'] = raw_backend.get('modes', 0)
            normalized['variable_type'] = raw_backend.get('variable_type', 'continuous')
        
        # Preserve useful extra fields
        for key in ['device_arn', 'actual_hardware_provider', 'characterization', 
                    'average_queue_time', 'degraded', 'cost_per_shot', 'cost_per_task']:
            if key in raw_backend:
                normalized[key] = raw_backend[key]
        
        return normalized
    
    @staticmethod
    def normalize_job(raw_job: Dict[str, Any], provider: str) -> Dict[str, Any]:
        """
        Convert any provider job to standard widget format.
        
        Args:
            raw_job: Raw job data from provider
            provider: Provider name
        
        Returns:
            Normalized job dict for widget rendering
        """
        # Extract job ID (different providers use different keys)
        job_id = (raw_job.get('job_id') or 
                  raw_job.get('id') or 
                  raw_job.get('task_id') or
                  raw_job.get('uuid') or
                  'unknown')
        
        # Extract status
        raw_status = raw_job.get('status', 'unknown')
        
        # Extract creation time
        created_at = (raw_job.get('created_at') or 
                      raw_job.get('creation_date') or
                      raw_job.get('submitted_at') or
                      raw_job.get('creationDate') or
                      datetime.now().isoformat())
        
        # Extract backend
        backend = (raw_job.get('backend') or 
                   raw_job.get('backend_name') or
                   raw_job.get('target') or
                   raw_job.get('device') or
                   'unknown')
        
        return {
            'job_id': str(job_id),
            'provider': provider,
            'status': WidgetDataAdapter._normalize_status(raw_status),
            'backend': backend,
            'created_at': created_at,
            'computation_type': raw_job.get('model', 'gate'),
            'shots': raw_job.get('shots', 0),
            'name': raw_job.get('name', ''),
        }
    
    @staticmethod
    def normalize_jobs_list(raw_jobs: List[Dict[str, Any]], 
                            provider: str) -> List[Dict[str, Any]]:
        """Normalize a list of jobs"""
        return [WidgetDataAdapter.normalize_job(job, provider) for job in raw_jobs]
    
    @staticmethod
    def normalize_backends_list(raw_backends: List[Dict[str, Any]], 
                                provider_model: ComputationModel,
                                provider_name: str) -> List[Dict[str, Any]]:
        """Normalize a list of backends"""
        return [
            WidgetDataAdapter.normalize_backend(b, provider_model, provider_name) 
            for b in raw_backends
        ]
    
    @staticmethod
    def _normalize_status(status: str) -> str:
        """Standardize status across all providers"""
        if status is None:
            return 'unknown'
        return WidgetDataAdapter.STATUS_MAP.get(str(status), str(status).lower())
    
    @staticmethod
    def _get_capacity(backend: Dict[str, Any], 
                      model: ComputationModel) -> str:
        """Extract capacity metric based on computation model"""
        if model == ComputationModel.GATE_BASED:
            qubits = backend.get('qubits', 0)
            return f"{qubits} qubits"
        elif model == ComputationModel.ANNEALING:
            qubits = backend.get('qubits', backend.get('num_qubits', 0))
            return f"{qubits} spins"
        elif model == ComputationModel.PHOTONIC:
            modes = backend.get('modes', 0)
            return f"{modes} modes"
        return "Unknown"
    
    @staticmethod
    def _get_availability(backend: Dict[str, Any]) -> str:
        """Calculate availability percentage or status text"""
        # Check for queue time
        queue_time = backend.get('average_queue_time')
        if queue_time is not None:
            if queue_time == 0:
                return 'Immediate'
            elif queue_time < 60:
                return f'~{queue_time}s wait'
            elif queue_time < 3600:
                return f'~{queue_time // 60}m wait'
            else:
                return f'~{queue_time // 3600}h wait'
        
        # Check degraded status
        if backend.get('degraded'):
            return 'Degraded'
        
        # Fall back to status
        status = backend.get('status', '')
        if WidgetDataAdapter._normalize_status(status) == 'online':
            return 'Available'
        return 'Unavailable'
    
    @staticmethod
    def get_status_color(status: str) -> str:
        """Get CSS color class for status"""
        normalized = WidgetDataAdapter._normalize_status(status)
        color_map = {
            'online': 'success',
            'offline': 'error',
            'running': 'warning',
            'queued': 'info',
            'completed': 'success',
            'failed': 'error',
            'cancelled': 'secondary',
            'unknown': 'secondary'
        }
        return color_map.get(normalized, 'secondary')
    
    @staticmethod
    def get_model_badge(model: str) -> Dict[str, str]:
        """Get badge info for computation model"""
        badges = {
            'gate': {'icon': '⚛️', 'label': 'Gate-Based', 'class': 'model-gate'},
            'annealing': {'icon': '🔶', 'label': 'Annealing', 'class': 'model-annealing'},
            'photonic': {'icon': '🟢', 'label': 'Photonic', 'class': 'model-photonic'}
        }
        return badges.get(model, {'icon': '❓', 'label': 'Unknown', 'class': 'model-unknown'})
