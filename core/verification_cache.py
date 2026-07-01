"""
Verification Cache System
Prevents expensive re-verification (especially Claude which burns tokens)
"""

from datetime import datetime, timedelta
from typing import Optional, Dict
import hashlib
from providers.base_provider import ProviderHealth


class VerificationCache:
    """
    Cache verification results to prevent:
    - Claude token burns on repeated checks
    - UI responsiveness issues
    - API rate limit abuse
    
    Cache invalidation: 30 minutes per key hash
    """
    
    def __init__(self, ttl_minutes: int = 30):
        self._cache: Dict[str, dict] = {}
        self.ttl = timedelta(minutes=ttl_minutes)
    
    def _hash_key(self, api_key: str) -> str:
        """Hash key for cache storage (never store raw keys)"""
        return hashlib.sha256(api_key.encode()).hexdigest()[:16]
    
    def get(self, api_key: str) -> Optional[ProviderHealth]:
        """Get cached verification result if fresh"""
        key_hash = self._hash_key(api_key)
        
        if key_hash not in self._cache:
            return None
        
        cached = self._cache[key_hash]
        
        # Check if expired
        if datetime.now() - cached['timestamp'] > self.ttl:
            del self._cache[key_hash]
            return None
        
        return cached['health']
    
    def set(self, api_key: str, health: ProviderHealth):
        """Cache verification result"""
        key_hash = self._hash_key(api_key)
        self._cache[key_hash] = {
            'health': health,
            'timestamp': datetime.now()
        }
    
    def invalidate(self, api_key: str):
        """Force re-verification (user-requested)"""
        key_hash = self._hash_key(api_key)
        if key_hash in self._cache:
            del self._cache[key_hash]
    
    def cleanup_expired(self):
        """Periodic cleanup of expired entries"""
        now = datetime.now()
        expired_keys = [
            k for k, v in self._cache.items()
            if now - v['timestamp'] > self.ttl
        ]
        for k in expired_keys:
            del self._cache[k]


# Global cache instance (in production, upgrade to Redis)
_verification_cache = VerificationCache(ttl_minutes=30)


def get_verification_cache() -> VerificationCache:
    """Get global verification cache instance"""
    return _verification_cache
