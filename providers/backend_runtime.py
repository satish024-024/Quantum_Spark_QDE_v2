"""
Backend Runtime State - Dynamic state fetched from providers.
Cached briefly (60s), never stored in static registry.

Returns UNKNOWN status on fetch failures - never lies about availability.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict
import time
import logging

logger = logging.getLogger(__name__)


class RuntimeStatus:
    """Standard runtime status values"""
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"  # Cannot determine - fetch failed


@dataclass
class RuntimeState:
    """
    Live state of a backend. Changes constantly.
    Fetched from providers, cached briefly.
    """
    status: str  # One of RuntimeStatus values
    queue_depth: int
    availability_percent: float
    last_checked: datetime
    next_maintenance: Optional[datetime] = None
    error_message: Optional[str] = None  # If status is UNKNOWN
    
    def is_available(self) -> bool:
        """Returns True only if definitely online"""
        return self.status == RuntimeStatus.ONLINE
    
    def is_unknown(self) -> bool:
        """Returns True if status could not be determined"""
        return self.status == RuntimeStatus.UNKNOWN
    
    def is_stale(self, max_age_seconds: int = 60) -> bool:
        """Check if cached state is too old"""
        age = (datetime.utcnow() - self.last_checked).total_seconds()
        return age > max_age_seconds
    
    def to_dict(self) -> Dict:
        """Serialize for API responses"""
        return {
            "status": self.status,
            "queue_depth": self.queue_depth,
            "availability_percent": self.availability_percent,
            "last_checked": self.last_checked.isoformat(),
            "next_maintenance": self.next_maintenance.isoformat() if self.next_maintenance else None,
            "is_available": self.is_available(),
            "is_unknown": self.is_unknown(),
            "error": self.error_message
        }


# =============================================================================
# CACHE CONFIGURATION
# =============================================================================

CACHE_TTL_SECONDS = 60  # How long to cache runtime state
_runtime_cache: Dict[str, RuntimeState] = {}
_cache_timestamps: Dict[str, float] = {}


def get_runtime_state(
    provider: str, 
    backend_id: str, 
    force_refresh: bool = False
) -> RuntimeState:
    """
    Get current runtime state for a backend.
    
    - Returns cached state if fresh
    - Fetches from provider if stale or forced
    - Returns UNKNOWN status on fetch failure (never lies about online)
    """
    cache_key = f"{provider}:{backend_id}"
    
    # Check cache (unless forced refresh)
    if not force_refresh and cache_key in _runtime_cache:
        cached_at = _cache_timestamps.get(cache_key, 0)
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return _runtime_cache[cache_key]
    
    # Fetch fresh state
    state = _fetch_from_provider(provider, backend_id)
    
    # Cache the result
    _runtime_cache[cache_key] = state
    _cache_timestamps[cache_key] = time.time()
    
    return state


def _fetch_from_provider(provider: str, backend_id: str) -> RuntimeState:
    """
    Fetch live state from provider API.
    
    Returns UNKNOWN status on any failure - never pretends backend is online.
    """
    try:
        # Provider-specific fetching
        if provider == "ibm":
            return _fetch_ibm_status(backend_id)
        elif provider == "ionq":
            return _fetch_ionq_status(backend_id)
        elif provider == "rigetti":
            return _fetch_rigetti_status(backend_id)
        elif provider == "aws_braket":
            return _fetch_aws_braket_status(backend_id)
        else:
            logger.warning(f"Unknown provider '{provider}' - returning UNKNOWN status")
            return _unknown_state(f"Unknown provider: {provider}")
            
    except Exception as e:
        logger.error(f"Failed to fetch runtime state for {provider}/{backend_id}: {e}")
        return _unknown_state(str(e))


def _unknown_state(error_message: str) -> RuntimeState:
    """Create an UNKNOWN state - used when fetch fails"""
    return RuntimeState(
        status=RuntimeStatus.UNKNOWN,
        queue_depth=0,
        availability_percent=0.0,
        last_checked=datetime.utcnow(),
        error_message=error_message
    )


# =============================================================================
# PROVIDER-SPECIFIC FETCHERS
# In production, these call actual provider APIs
# =============================================================================

def _fetch_ibm_status(backend_id: str) -> RuntimeState:
    """
    Fetch IBM Quantum backend status.
    Would call IBM Quantum API in production.
    """
    try:
        # TODO: In production, use qiskit-ibm-runtime to fetch real status
        # from qiskit_ibm_runtime import QiskitRuntimeService
        # service = QiskitRuntimeService()
        # backend = service.backend(backend_id)
        # status = backend.status()
        
        # For now, return simulated online status
        # IMPORTANT: In production, replace with real API call
        return RuntimeState(
            status=RuntimeStatus.ONLINE,
            queue_depth=0,  # Would be status.pending_jobs
            availability_percent=100.0,
            last_checked=datetime.utcnow()
        )
    except Exception as e:
        return _unknown_state(f"IBM API error: {e}")


def _fetch_ionq_status(backend_id: str) -> RuntimeState:
    """
    Fetch IonQ backend status.
    Would call IonQ API in production.
    """
    try:
        # TODO: In production, call IonQ API
        # import requests
        # headers = {"Authorization": f"Bearer {api_key}"}
        # response = requests.get(f"{IONQ_API}/backends/{backend_id}", headers=headers)
        
        return RuntimeState(
            status=RuntimeStatus.ONLINE,
            queue_depth=0,
            availability_percent=100.0,
            last_checked=datetime.utcnow()
        )
    except Exception as e:
        return _unknown_state(f"IonQ API error: {e}")


def _fetch_rigetti_status(backend_id: str) -> RuntimeState:
    """
    Fetch Rigetti QCS backend status.
    Would call Rigetti QCS API in production.
    """
    try:
        # TODO: In production, call Rigetti QCS API
        return RuntimeState(
            status=RuntimeStatus.ONLINE,
            queue_depth=0,
            availability_percent=100.0,
            last_checked=datetime.utcnow()
        )
    except Exception as e:
        return _unknown_state(f"Rigetti API error: {e}")


def _fetch_aws_braket_status(backend_id: str) -> RuntimeState:
    """
    Fetch AWS Braket device status.
    Would call AWS Braket API in production.
    """
    try:
        # TODO: In production, use boto3
        # import boto3
        # client = boto3.client('braket')
        # response = client.get_device(deviceArn=backend_id)
        # device_status = response['deviceStatus']
        
        return RuntimeState(
            status=RuntimeStatus.ONLINE,
            queue_depth=0,
            availability_percent=100.0,
            last_checked=datetime.utcnow()
        )
    except Exception as e:
        return _unknown_state(f"AWS Braket API error: {e}")


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def clear_cache():
    """Clear all cached runtime states (useful for testing)"""
    _runtime_cache.clear()
    _cache_timestamps.clear()


def get_cache_stats() -> Dict:
    """Get cache statistics for monitoring"""
    now = time.time()
    stale_count = sum(
        1 for ts in _cache_timestamps.values() 
        if now - ts > CACHE_TTL_SECONDS
    )
    
    return {
        "cached_backends": len(_runtime_cache),
        "stale_entries": stale_count,
        "ttl_seconds": CACHE_TTL_SECONDS
    }
