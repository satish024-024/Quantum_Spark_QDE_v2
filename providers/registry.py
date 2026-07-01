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
    def register(cls, name: str, provider: QuantumProvider):
        """
        Register a quantum provider.
        
        Args:
            name: Provider identifier (e.g., 'ibm', 'aws_braket')
            provider: Provider instance implementing QuantumProvider interface
        """
        if name in cls._providers:
            raise ValueError(f"Provider '{name}' is already registered")
        cls._providers[name] = provider
    
    @classmethod
    def get(cls, name: str) -> QuantumProvider:
        """
        Get provider by name.
        
        Args:
            name: Provider identifier
            
        Returns:
            Provider instance
            
        Raises:
            ValueError: If provider not registered
        """
        if name not in cls._providers:
            available = ', '.join(cls._providers.keys())
            raise ValueError(
                f"Provider '{name}' not registered. "
                f"Available: {available}"
            )
        return cls._providers[name]
    
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
        for name, provider in cls._providers.items():
            try:
                backends = provider.get_available_backends()
                result[name] = {
                    "name": name,
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
