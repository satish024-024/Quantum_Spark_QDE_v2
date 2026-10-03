"""
Quantum Provider Registry

Production-grade provider management for multi-backend quantum execution.
Truth source for available backends.
"""

from typing import Dict
from .quantum_base_provider import QuantumProvider

class ProviderRegistry:
    """
    Singleton registry for quantum providers.
    Backend-authoritative: provides live backend data to frontend.
    """
    
    _providers: Dict[str, QuantumProvider] = {}
    
    @classmethod
    def register(cls, name: str, provider: QuantumProvider, user_id: int = None):
        """
        Register a quantum provider. If user_id is provided, keys per user to avoid cross-user leakage.
        """
        key = f"{user_id}:{name}" if user_id is not None else name
        cls._providers[key] = provider
    
    @classmethod
    def get(cls, name: str, user_id: int = None) -> QuantumProvider:
        """
        Get provider by name, checking per-user instance first before global fallback.
        """
        if user_id is not None:
            user_key = f"{user_id}:{name}"
            if user_key in cls._providers:
                return cls._providers[user_key]
        if name in cls._providers:
            return cls._providers[name]
        available = ', '.join(k for k in cls._providers.keys() if ':' not in k)
        raise ValueError(
            f"Provider '{name}' not registered. "
            f"Available: {available}"
        )
    
    @classmethod
    def list_providers(cls) -> Dict[str, Dict]:
        """
        List all registered providers with their capabilities.
        
        Returns:
            Dict mapping provider name to capabilities:
            {
                "ibm": {
                    "name": "ibm",
                    "backends": [...]
                }
            }
        """
        result = {}
        for key, provider in cls._providers.items():
            if ':' in key:
                continue
            try:
                backends = provider.get_available_backends()
                result[key] = {
                    "name": key,
                    "backends": backends
                }
            except Exception as e:
                # Provider may be unavailable (credentials, network, etc.)
                # Don't fail entire registry
                result[name] = {
                    "name": name,
                    "backends": [],
                    "error": str(e)
                }
        
        return result
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """Check if provider is registered"""
        return name in cls._providers
    
    @classmethod
    def clear(cls):
        """Clear all providers (for testing)"""
        cls._providers = {}
