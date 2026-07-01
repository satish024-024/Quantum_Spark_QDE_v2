"""
Backend Definitions - Static, versioned facts about quantum backends.
Does NOT include pricing or runtime state.

This is the single source of truth for backend capabilities.
All other systems read from here.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
from enum import Enum
from datetime import date


class BackendType(Enum):
    SIMULATOR = "simulator"
    QPU = "qpu"


class Connectivity(Enum):
    FULL = "full"           # Any qubit can connect to any
    LINEAR = "linear"       # Chain topology
    GRID = "grid"           # 2D lattice
    HEAVY_HEX = "heavy_hex" # IBM topology


@dataclass(frozen=True)  # Immutable
class BackendDefinition:
    """
    Static facts about a backend. Rarely changes.
    All lookups use canonical_id as the primary key.
    """
    id: str                 # Provider-native ID (may have special chars)
    canonical_id: str       # Normalized ID (lowercase, underscores only)
    name: str
    provider: str
    qubits: int
    backend_type: BackendType
    native_gates: Tuple[str, ...]  # Immutable tuple
    connectivity: Optional[Connectivity] = None
    max_shots: int = 10000
    min_shots: int = 1
    requires_compilation: bool = False
    version: str = "1.0"
    deprecated: bool = False
    deprecation_date: Optional[date] = None
    
    def to_dict(self) -> Dict:
        """Serialize for API responses"""
        return {
            "id": self.id,
            "canonical_id": self.canonical_id,
            "name": self.name,
            "provider": self.provider,
            "qubits": self.qubits,
            "type": self.backend_type.value,
            "native_gates": list(self.native_gates),
            "connectivity": self.connectivity.value if self.connectivity else None,
            "max_shots": self.max_shots,
            "min_shots": self.min_shots,
            "requires_compilation": self.requires_compilation,
            "deprecated": self.deprecated
        }


# =============================================================================
# STATIC DEFINITIONS - Versioned, immutable
# Key: (provider, backend_id) for O(1) lookup
# =============================================================================

_BACKEND_DEFINITIONS: Dict[Tuple[str, str], BackendDefinition] = {
    
    # =========================================================================
    # IBM QUANTUM
    # =========================================================================
    ("ibm", "simulator"): BackendDefinition(
        id="simulator",
        canonical_id="ibm_simulator",
        name="IBM Aer Simulator",
        provider="ibm",
        qubits=32,
        backend_type=BackendType.SIMULATOR,
        native_gates=("id", "rz", "sx", "x", "cx"),
        max_shots=100000
    ),
    ("ibm", "ibm_brisbane"): BackendDefinition(
        id="ibm_brisbane",
        canonical_id="ibm_brisbane",
        name="IBM Brisbane",
        provider="ibm",
        qubits=127,
        backend_type=BackendType.QPU,
        native_gates=("id", "rz", "sx", "x", "cx", "ecr"),
        connectivity=Connectivity.HEAVY_HEX,
        requires_compilation=True
    ),
    ("ibm", "ibm_kyoto"): BackendDefinition(
        id="ibm_kyoto",
        canonical_id="ibm_kyoto",
        name="IBM Kyoto",
        provider="ibm",
        qubits=127,
        backend_type=BackendType.QPU,
        native_gates=("id", "rz", "sx", "x", "cx", "ecr"),
        connectivity=Connectivity.HEAVY_HEX,
        requires_compilation=True
    ),
    ("ibm", "ibm_osaka"): BackendDefinition(
        id="ibm_osaka",
        canonical_id="ibm_osaka",
        name="IBM Osaka",
        provider="ibm",
        qubits=127,
        backend_type=BackendType.QPU,
        native_gates=("id", "rz", "sx", "x", "cx", "ecr"),
        connectivity=Connectivity.HEAVY_HEX,
        requires_compilation=True
    ),
    
    # =========================================================================
    # IONQ
    # =========================================================================
    ("ionq", "simulator"): BackendDefinition(
        id="simulator",
        canonical_id="ionq_simulator",
        name="IonQ Simulator",
        provider="ionq",
        qubits=29,
        backend_type=BackendType.SIMULATOR,
        native_gates=("gpi", "gpi2", "ms"),
        max_shots=10000
    ),
    ("ionq", "harmony"): BackendDefinition(
        id="harmony",
        canonical_id="ionq_harmony",
        name="IonQ Harmony",
        provider="ionq",
        qubits=11,
        backend_type=BackendType.QPU,
        native_gates=("gpi", "gpi2", "ms"),
        connectivity=Connectivity.FULL,
        min_shots=100,
        max_shots=10000,
        requires_compilation=True
    ),
    ("ionq", "aria-1"): BackendDefinition(
        id="aria-1",
        canonical_id="ionq_aria",
        name="IonQ Aria",
        provider="ionq",
        qubits=25,
        backend_type=BackendType.QPU,
        native_gates=("gpi", "gpi2", "ms"),
        connectivity=Connectivity.FULL,
        min_shots=100,
        max_shots=10000,
        requires_compilation=True
    ),
    ("ionq", "aria"): BackendDefinition(  # Alias
        id="aria",
        canonical_id="ionq_aria",
        name="IonQ Aria",
        provider="ionq",
        qubits=25,
        backend_type=BackendType.QPU,
        native_gates=("gpi", "gpi2", "ms"),
        connectivity=Connectivity.FULL,
        min_shots=100,
        max_shots=10000,
        requires_compilation=True
    ),
    
    # =========================================================================
    # RIGETTI
    # =========================================================================
    ("rigetti", "qvm"): BackendDefinition(
        id="qvm",
        canonical_id="rigetti_qvm",
        name="Rigetti QVM",
        provider="rigetti",
        qubits=32,
        backend_type=BackendType.SIMULATOR,
        native_gates=("rx", "rz", "cz"),
        max_shots=10000
    ),
    ("rigetti", "ankaa-2"): BackendDefinition(
        id="Ankaa-2",
        canonical_id="rigetti_ankaa2",
        name="Rigetti Ankaa-2",
        provider="rigetti",
        qubits=84,
        backend_type=BackendType.QPU,
        native_gates=("rx", "rz", "cz", "xy"),
        connectivity=Connectivity.GRID,
        requires_compilation=True
    ),
    ("rigetti", "ankaa-3"): BackendDefinition(
        id="Ankaa-3",
        canonical_id="rigetti_ankaa3",
        name="Rigetti Ankaa-3",
        provider="rigetti",
        qubits=84,
        backend_type=BackendType.QPU,
        native_gates=("rx", "rz", "cz", "xy"),
        connectivity=Connectivity.GRID,
        requires_compilation=True
    ),
    
    # =========================================================================
    # AWS BRAKET
    # =========================================================================
    ("aws_braket", "sv1"): BackendDefinition(
        id="arn:aws:braket:::device/quantum-simulator/amazon/sv1",
        canonical_id="aws_sv1",
        name="Amazon SV1",
        provider="aws_braket",
        qubits=34,
        backend_type=BackendType.SIMULATOR,
        native_gates=("h", "x", "y", "z", "cx", "cz", "swap"),
    ),
    ("aws_braket", "tn1"): BackendDefinition(
        id="arn:aws:braket:::device/quantum-simulator/amazon/tn1",
        canonical_id="aws_tn1",
        name="Amazon TN1",
        provider="aws_braket",
        qubits=50,
        backend_type=BackendType.SIMULATOR,
        native_gates=("h", "x", "y", "z", "cx", "cz", "swap"),
    ),
    ("aws_braket", "dm1"): BackendDefinition(
        id="arn:aws:braket:::device/quantum-simulator/amazon/dm1",
        canonical_id="aws_dm1",
        name="Amazon DM1",
        provider="aws_braket",
        qubits=17,
        backend_type=BackendType.SIMULATOR,
        native_gates=("h", "x", "y", "z", "cx", "cz", "swap"),
    ),
    ("aws_braket", "ionq_aria"): BackendDefinition(
        id="arn:aws:braket:us-east-1::device/qpu/ionq/Aria-1",
        canonical_id="aws_ionq_aria",
        name="IonQ Aria (via Braket)",
        provider="aws_braket",
        qubits=25,
        backend_type=BackendType.QPU,
        native_gates=("gpi", "gpi2", "ms"),
        connectivity=Connectivity.FULL,
        min_shots=100,
        requires_compilation=True
    ),
    ("aws_braket", "rigetti_ankaa"): BackendDefinition(
        id="arn:aws:braket:us-west-1::device/qpu/rigetti/Ankaa-2",
        canonical_id="aws_rigetti_ankaa",
        name="Rigetti Ankaa (via Braket)",
        provider="aws_braket",
        qubits=84,
        backend_type=BackendType.QPU,
        native_gates=("rx", "rz", "cz", "xy"),
        connectivity=Connectivity.GRID,
        requires_compilation=True
    ),
}


# =============================================================================
# PRECOMPUTED LOOKUP MAPS - O(1) access
# Built at module load time
# =============================================================================

# Normalized lookup: (provider_lower, backend_lower) -> BackendDefinition
_NORMALIZED_LOOKUP: Dict[Tuple[str, str], BackendDefinition] = {}

# Canonical ID lookup: canonical_id -> BackendDefinition
_CANONICAL_LOOKUP: Dict[str, BackendDefinition] = {}

# Provider -> list of backends
_PROVIDER_BACKENDS: Dict[str, List[BackendDefinition]] = {}


def _build_lookup_maps():
    """Build precomputed lookup maps at module load time"""
    for (provider, backend_id), definition in _BACKEND_DEFINITIONS.items():
        # Normalized lookup
        key = (provider.lower(), backend_id.lower())
        _NORMALIZED_LOOKUP[key] = definition
        
        # Canonical lookup (use canonical_id as primary)
        _CANONICAL_LOOKUP[definition.canonical_id] = definition
        
        # Provider backends list
        if provider not in _PROVIDER_BACKENDS:
            _PROVIDER_BACKENDS[provider] = []
        # Avoid duplicates (aliases map to same definition)
        if definition not in _PROVIDER_BACKENDS[provider]:
            _PROVIDER_BACKENDS[provider].append(definition)


# Build maps on import
_build_lookup_maps()


# =============================================================================
# PUBLIC API
# =============================================================================

def get_definition(provider: str, backend_id: str) -> Optional[BackendDefinition]:
    """
    Get static definition by provider and backend ID.
    O(1) lookup using precomputed normalized map.
    Returns None if unknown.
    """
    key = (provider.lower(), backend_id.lower())
    return _NORMALIZED_LOOKUP.get(key)


def get_by_canonical_id(canonical_id: str) -> Optional[BackendDefinition]:
    """
    Get definition by canonical ID (preferred for internal use).
    O(1) lookup.
    """
    return _CANONICAL_LOOKUP.get(canonical_id)


def get_all_backends(provider: str) -> List[BackendDefinition]:
    """Get all backends for a provider (no duplicates)"""
    return _PROVIDER_BACKENDS.get(provider, [])


def get_all_providers() -> List[str]:
    """Get list of all registered providers"""
    return list(_PROVIDER_BACKENDS.keys())


def is_known_backend(provider: str, backend_id: str) -> bool:
    """Check if backend exists in registry"""
    return get_definition(provider, backend_id) is not None
