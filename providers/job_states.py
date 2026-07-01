"""
Job States - Standardized job lifecycle states.
All providers map their native states to these.

Returns UNKNOWN + logs loudly when mapping fails.
"""

from enum import Enum
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class JobState(Enum):
    """
    Standard job lifecycle states.
    All provider-specific states map to these.
    """
    # Non-terminal states
    QUEUED = "queued"           # Waiting in queue
    VALIDATING = "validating"   # Being validated/compiled
    RUNNING = "running"         # Executing on hardware
    
    # Terminal states
    COMPLETED = "completed"     # Finished successfully
    FAILED = "failed"           # Execution failed
    CANCELLED = "cancelled"     # User or system cancelled
    
    # Unknown - logged loudly, treated as terminal
    UNKNOWN = "unknown"         # Could not map provider state
    
    @property
    def is_terminal(self) -> bool:
        """Check if this state means the job is done"""
        return self in (
            JobState.COMPLETED, 
            JobState.FAILED, 
            JobState.CANCELLED, 
            JobState.UNKNOWN
        )
    
    @property
    def is_success(self) -> bool:
        """Check if job completed successfully"""
        return self == JobState.COMPLETED
    
    @property
    def is_error(self) -> bool:
        """Check if job ended in error/unknown state"""
        return self in (JobState.FAILED, JobState.UNKNOWN)


# =============================================================================
# PROVIDER STATE MAPPINGS
# Maps provider-native states to standard JobState
# =============================================================================

PROVIDER_STATE_MAP: Dict[str, Dict[str, JobState]] = {
    
    "ibm": {
        # IBM Quantum / Qiskit Runtime states
        "INITIALIZING": JobState.QUEUED,
        "QUEUED": JobState.QUEUED,
        "VALIDATING": JobState.VALIDATING,
        "RUNNING": JobState.RUNNING,
        "DONE": JobState.COMPLETED,
        "ERROR": JobState.FAILED,
        "CANCELLED": JobState.CANCELLED,
        # Older API states
        "JobStatus.INITIALIZING": JobState.QUEUED,
        "JobStatus.QUEUED": JobState.QUEUED,
        "JobStatus.VALIDATING": JobState.VALIDATING,
        "JobStatus.RUNNING": JobState.RUNNING,
        "JobStatus.DONE": JobState.COMPLETED,
        "JobStatus.ERROR": JobState.FAILED,
        "JobStatus.CANCELLED": JobState.CANCELLED,
    },
    
    "ionq": {
        # IonQ API states
        "submitted": JobState.QUEUED,
        "ready": JobState.QUEUED,
        "running": JobState.RUNNING,
        "completed": JobState.COMPLETED,
        "failed": JobState.FAILED,
        "canceled": JobState.CANCELLED,
        "cancelled": JobState.CANCELLED,  # Alternative spelling
    },
    
    "rigetti": {
        # Rigetti QCS states
        "PENDING": JobState.QUEUED,
        "QUEUED": JobState.QUEUED,
        "RUNNING": JobState.RUNNING,
        "SUCCEEDED": JobState.COMPLETED,
        "COMPLETED": JobState.COMPLETED,
        "FAILED": JobState.FAILED,
        "CANCELLED": JobState.CANCELLED,
        "CANCELED": JobState.CANCELLED,
    },
    
    "aws_braket": {
        # AWS Braket task states
        "CREATED": JobState.QUEUED,
        "QUEUED": JobState.QUEUED,
        "RUNNING": JobState.RUNNING,
        "COMPLETED": JobState.COMPLETED,
        "FAILED": JobState.FAILED,
        "CANCELLED": JobState.CANCELLED,
        "CANCELLING": JobState.CANCELLED,
    },
}


def normalize_job_state(provider: str, raw_state: str) -> JobState:
    """
    Map provider-specific state to standard JobState.
    
    Returns UNKNOWN and logs loudly if mapping fails.
    This catches silent provider API changes.
    """
    # Get provider's state map
    provider_map = PROVIDER_STATE_MAP.get(provider, {})
    
    # Try exact match first
    state = provider_map.get(raw_state)
    
    # Try case-insensitive if exact match fails
    if state is None:
        raw_upper = raw_state.upper()
        raw_lower = raw_state.lower()
        for known_state, mapped_state in provider_map.items():
            if known_state.upper() == raw_upper or known_state.lower() == raw_lower:
                state = mapped_state
                break
    
    if state is None:
        # UNKNOWN - log this loudly so we notice API changes
        logger.warning(
            f"UNKNOWN JOB STATE: provider='{provider}', raw_state='{raw_state}'. "
            f"Provider API may have changed. Please update PROVIDER_STATE_MAP."
        )
        return JobState.UNKNOWN
    
    return state


def get_state_display(state: JobState) -> Dict:
    """Get display information for a job state"""
    display_map = {
        JobState.QUEUED: {
            "label": "Queued",
            "icon": "⏳",
            "color": "#f59e0b",  # Amber
            "description": "Waiting in queue"
        },
        JobState.VALIDATING: {
            "label": "Validating",
            "icon": "🔍",
            "color": "#3b82f6",  # Blue
            "description": "Circuit being validated"
        },
        JobState.RUNNING: {
            "label": "Running",
            "icon": "⚡",
            "color": "#10b981",  # Green
            "description": "Executing on hardware"
        },
        JobState.COMPLETED: {
            "label": "Completed",
            "icon": "✅",
            "color": "#22c55e",  # Success green
            "description": "Finished successfully"
        },
        JobState.FAILED: {
            "label": "Failed",
            "icon": "❌",
            "color": "#ef4444",  # Red
            "description": "Execution failed"
        },
        JobState.CANCELLED: {
            "label": "Cancelled",
            "icon": "🚫",
            "color": "#6b7280",  # Gray
            "description": "Job was cancelled"
        },
        JobState.UNKNOWN: {
            "label": "Unknown",
            "icon": "❓",
            "color": "#f97316",  # Orange (warning)
            "description": "Status could not be determined"
        },
    }
    
    return display_map.get(state, {
        "label": "Unknown",
        "icon": "❓",
        "color": "#6b7280",
        "description": "Status unknown"
    })


def is_valid_provider(provider: str) -> bool:
    """Check if provider has state mappings defined"""
    return provider in PROVIDER_STATE_MAP


def get_known_states(provider: str) -> list:
    """Get list of known raw states for a provider"""
    return list(PROVIDER_STATE_MAP.get(provider, {}).keys())
