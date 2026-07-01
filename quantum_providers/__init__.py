"""
Quantum Providers Package
Multi-Provider Quantum Integration v2.1 - Capability-Based Architecture

10 Quantum Providers:
- Gate-based: IBM (existing), IonQ, AWS Braket, Rigetti, Google, Azure, Quantinuum
- Annealing: D-Wave
- Photonic: Xanadu
"""

from .quantum_provider_base import (
    ComputationModel,
    ProviderCapabilities,
    QuantumProviderBase,
    GateBasedProvider,
    AnnealingProvider,
    PhotonicProvider,
    ProviderResult
)

from .widget_provider_adapter import WidgetDataAdapter

# Gate-based providers
from .ionq_provider import IonQProvider
from .aws_braket_provider import AWSBraketProvider
from .rigetti_provider import RigettiProvider
from .google_provider import GoogleQuantumProvider
from .azure_provider import AzureQuantumProvider
from .quantinuum_provider import QuantinuumProvider

# Annealing providers
from .dwave_provider import DWaveProvider

# Photonic providers
from .xanadu_provider import XanaduProvider

__all__ = [
    # Base classes
    'ComputationModel',
    'ProviderCapabilities',
    'QuantumProviderBase',
    'GateBasedProvider',
    'AnnealingProvider',
    'PhotonicProvider',
    'ProviderResult',
    'WidgetDataAdapter',
    
    # Gate-based providers
    'IonQProvider',
    'AWSBraketProvider',
    'RigettiProvider',
    'GoogleQuantumProvider',
    'AzureQuantumProvider',
    'QuantinuumProvider',
    
    # Annealing providers
    'DWaveProvider',
    
    # Photonic providers
    'XanaduProvider'
]

# Provider registry for easy discovery
PROVIDER_REGISTRY = {
    'ionq': IonQProvider,
    'aws_braket': AWSBraketProvider,
    'rigetti': RigettiProvider,
    'google': GoogleQuantumProvider,
    'azure_quantum': AzureQuantumProvider,
    'quantinuum': QuantinuumProvider,
    'dwave': DWaveProvider,
    'xanadu': XanaduProvider,
}

def get_provider(name: str, **kwargs):
    """
    Factory function to get a provider instance by name.
    
    Args:
        name: Provider name (e.g., 'ionq', 'aws_braket', 'dwave')
        **kwargs: Provider-specific configuration
        
    Returns:
        Provider instance
    """
    if name not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider: {name}. Available: {list(PROVIDER_REGISTRY.keys())}")
    
    return PROVIDER_REGISTRY[name](**kwargs)


def list_providers() -> dict:
    """
    List all available providers with their capabilities.
    
    Returns:
        Dict of provider info
    """
    providers = {}
    for name, cls in PROVIDER_REGISTRY.items():
        instance = cls.__new__(cls)
        instance.__init__.__wrapped__ if hasattr(instance.__init__, '__wrapped__') else None
        
        providers[name] = {
            'class': cls.__name__,
            'model': cls.__bases__[0].__name__ if cls.__bases__ else 'Unknown'
        }
    
    return providers


__version__ = '2.1.0'
