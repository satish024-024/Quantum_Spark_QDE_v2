"""
Quantum Experiment Tracker
==========================
Reproducibility layer for quantum experiments.

Every experiment gets:
- Unique ID (UUID)
- Timestamp
- Config snapshot (frozen params)
- Random seed (deterministic)
- Backend calibration snapshot
- Transpiled circuit (QASM)
- Results history

This is an ACADEMIC PROTOTYPE - not production-grade.
"""

import uuid
import json
import sqlite3
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from copy import deepcopy

# Try to import Qiskit components
try:
    from qiskit import QuantumCircuit, qasm3
    from qiskit.quantum_info import SparsePauliOp
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False
    print("⚠️ Qiskit not available - experiment tracker will work with limited functionality")


@dataclass
class ExperimentConfig:
    """Immutable experiment configuration"""
    algorithm: str  # 'vqe', 'qaoa', 'qml'
    problem_type: str  # 'h2', 'maxcut', etc.
    ansatz_type: str
    optimizer: str
    max_iterations: int
    shots: int
    seed: int
    backend_name: str
    error_mitigation: Dict[str, bool]
    custom_params: Dict[str, Any]
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'ExperimentConfig':
        return cls(**data)


@dataclass
class IterationRecord:
    """Single optimizer iteration data"""
    iteration: int
    timestamp: str
    parameters: List[float]
    cost_value: float
    gradient_norm: Optional[float]
    metadata: Dict[str, Any]


class ExperimentTracker:
    """
    Tracks quantum experiments for reproducibility.
    
    Key features:
    - Deterministic seed control
    - Config snapshotting
    - Backend calibration storage
    - Transpiled circuit storage (for full reproducibility)
    - Iteration-level tracking
    
    HONEST LIMITATION:
    - This is SQLite-based, not production DB
    - No distributed locking
    - No real-time sync
    """
    
    def __init__(self, db_path: str = None):
        """
        Initialize experiment tracker.
        
        Args:
            db_path: Path to SQLite database. Defaults to ./experiments.db
        """
        if db_path is None:
            import os
            if os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
                db_path = "/tmp/experiments.db"
            else:
                db_path = Path(__file__).parent / "experiments.db"
        
        self.db_path = str(db_path)
        self._init_database()
        self.current_experiment_id = None
        
        print(f"[ExperimentTracker] Initialized: {self.db_path}")
    
    def _init_database(self):
        """Create tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Main experiments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS experiments (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                status TEXT DEFAULT 'created',
                algorithm TEXT NOT NULL,
                config_json TEXT NOT NULL,
                seed INTEGER NOT NULL,
                backend_name TEXT,
                backend_calibration_json TEXT,
                transpiled_circuit_qasm TEXT,
                hamiltonian_json TEXT,
                final_result_json TEXT,
                notes TEXT
            )
        """)
        
        # Iterations table for tracking optimizer progress
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS iterations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                experiment_id TEXT NOT NULL,
                iteration_number INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                parameters_json TEXT NOT NULL,
                cost_value REAL NOT NULL,
                gradient_norm REAL,
                metadata_json TEXT,
                FOREIGN KEY (experiment_id) REFERENCES experiments(id)
            )
        """)
        
        # Index for fast iteration lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_iterations_experiment 
            ON iterations(experiment_id)
        """)
        
        conn.commit()
        conn.close()
    
    def create_experiment(
        self,
        algorithm: str,
        config: Dict[str, Any],
        seed: int = None,
        backend_name: str = None
    ) -> str:
        """
        Create a new experiment with unique ID.
        
        Args:
            algorithm: 'vqe', 'qaoa', or 'qml'
            config: Experiment configuration (will be frozen)
            seed: Random seed for reproducibility. If None, generates one.
            backend_name: Name of quantum backend
            
        Returns:
            experiment_id: Unique experiment identifier
        """
        experiment_id = str(uuid.uuid4())
        
        if seed is None:
            seed = np.random.randint(0, 2**31)
        
        # Set global seed for reproducibility
        np.random.seed(seed)
        
        created_at = datetime.utcnow().isoformat()
        
        # Freeze config (deep copy to prevent mutation)
        frozen_config = deepcopy(config)
        frozen_config['seed'] = seed
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO experiments (id, created_at, status, algorithm, config_json, seed, backend_name)
            VALUES (?, ?, 'created', ?, ?, ?, ?)
        """, (
            experiment_id,
            created_at,
            algorithm,
            json.dumps(frozen_config),
            seed,
            backend_name
        ))
        
        conn.commit()
        conn.close()
        
        self.current_experiment_id = experiment_id
        print(f"[Experiment] Created: {experiment_id[:8]}... (seed={seed})")
        
        return experiment_id
    
    def store_backend_calibration(self, experiment_id: str, backend) -> None:
        """
        Store backend calibration snapshot for reproducibility.
        
        CRITICAL: Without this, experiments cannot be truly reproduced.
        Even with same seed, backend properties change daily.
        """
        if not QISKIT_AVAILABLE:
            return
        
        try:
            calibration_data = {
                'name': backend.name,
                'num_qubits': backend.num_qubits,
                'snapshot_time': datetime.utcnow().isoformat(),
            }
            
            # Try to get calibration properties
            if hasattr(backend, 'target'):
                target = backend.target
                calibration_data['basis_gates'] = list(target.operation_names)
                
                # Get error rates for 2-qubit gates
                error_rates = {}
                for op_name in ['cx', 'ecr', 'cz']:
                    if op_name in target.operation_names:
                        for qargs in target.qargs_for_operation_name(op_name):
                            error = target[op_name][qargs].error
                            if error is not None:
                                error_rates[f"{op_name}_{qargs}"] = error
                
                calibration_data['two_qubit_errors'] = error_rates
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE experiments 
                SET backend_calibration_json = ?
                WHERE id = ?
            """, (json.dumps(calibration_data), experiment_id))
            conn.commit()
            conn.close()
            
            print(f"[Calibration] Stored for {backend.name}")
            
        except Exception as e:
            print(f"⚠️ Could not store backend calibration: {e}")
    
    def store_transpiled_circuit(self, experiment_id: str, circuit: 'QuantumCircuit') -> None:
        """
        Store transpiled circuit as QASM for full reproducibility.
        
        This is CRITICAL for reproducibility:
        - Same logical circuit can transpile differently
        - Backend-specific optimizations change over time
        - Without this, you cannot replay the exact experiment
        """
        if not QISKIT_AVAILABLE:
            return
        
        try:
            # Convert to OpenQASM 3
            qasm_str = qasm3.dumps(circuit)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE experiments 
                SET transpiled_circuit_qasm = ?
                WHERE id = ?
            """, (qasm_str, experiment_id))
            conn.commit()
            conn.close()
            
            print(f"[Circuit] Stored transpiled ({circuit.num_qubits}q, depth={circuit.depth()})")
            
        except Exception as e:
            print(f"⚠️ Could not store transpiled circuit: {e}")
    
    def store_hamiltonian(self, experiment_id: str, hamiltonian: 'SparsePauliOp') -> None:
        """Store the problem Hamiltonian"""
        if not QISKIT_AVAILABLE:
            return
        
        try:
            ham_data = {
                'paulis': [(str(pauli), coeff.real) for pauli, coeff in zip(
                    hamiltonian.paulis, hamiltonian.coeffs
                )],
                'num_qubits': hamiltonian.num_qubits
            }
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE experiments 
                SET hamiltonian_json = ?
                WHERE id = ?
            """, (json.dumps(ham_data), experiment_id))
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"⚠️ Could not store Hamiltonian: {e}")
    
    def record_iteration(
        self,
        experiment_id: str,
        iteration: int,
        parameters: np.ndarray,
        cost_value: float,
        gradient_norm: float = None,
        metadata: Dict[str, Any] = None
    ) -> None:
        """
        Record a single optimizer iteration.
        
        Call this from your optimizer callback to track convergence.
        """
        timestamp = datetime.utcnow().isoformat()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO iterations 
            (experiment_id, iteration_number, timestamp, parameters_json, cost_value, gradient_norm, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            experiment_id,
            iteration,
            timestamp,
            json.dumps(parameters.tolist() if isinstance(parameters, np.ndarray) else parameters),
            float(cost_value),
            gradient_norm,
            json.dumps(metadata or {})
        ))
        
        # Update experiment status
        cursor.execute("""
            UPDATE experiments SET status = 'running', updated_at = ? WHERE id = ?
        """, (timestamp, experiment_id))
        
        conn.commit()
        conn.close()
    
    def finalize_experiment(
        self,
        experiment_id: str,
        result: Dict[str, Any],
        status: str = 'completed'
    ) -> None:
        """
        Mark experiment as complete and store final results.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE experiments 
            SET status = ?, updated_at = ?, final_result_json = ?
            WHERE id = ?
        """, (
            status,
            datetime.utcnow().isoformat(),
            json.dumps(result, default=str),
            experiment_id
        ))
        
        conn.commit()
        conn.close()
        
        print(f"[Experiment] {experiment_id[:8]}... {status}")
    
    def get_experiment(self, experiment_id: str) -> Optional[Dict]:
        """Retrieve experiment data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,))
        row = cursor.fetchone()
        
        if row is None:
            return None
        
        columns = [desc[0] for desc in cursor.description]
        experiment = dict(zip(columns, row))
        
        # Parse JSON fields
        for field in ['config_json', 'backend_calibration_json', 'hamiltonian_json', 'final_result_json']:
            if experiment.get(field):
                try:
                    experiment[field.replace('_json', '')] = json.loads(experiment[field])
                except:
                    pass
        
        conn.close()
        return experiment
    
    def get_iterations(self, experiment_id: str) -> List[Dict]:
        """Get all iterations for an experiment"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM iterations 
            WHERE experiment_id = ? 
            ORDER BY iteration_number
        """, (experiment_id,))
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        iterations = []
        for row in rows:
            iteration = dict(zip(columns, row))
            iteration['parameters'] = json.loads(iteration['parameters_json'])
            iterations.append(iteration)
        
        conn.close()
        return iterations
    
    def get_energy_history(self, experiment_id: str) -> List[float]:
        """Get cost/energy values across iterations (for plotting)"""
        iterations = self.get_iterations(experiment_id)
        return [it['cost_value'] for it in iterations]
    
    def list_experiments(self, algorithm: str = None, limit: int = 50) -> List[Dict]:
        """List recent experiments"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if algorithm:
            cursor.execute("""
                SELECT id, created_at, status, algorithm, seed, backend_name 
                FROM experiments 
                WHERE algorithm = ?
                ORDER BY created_at DESC 
                LIMIT ?
            """, (algorithm, limit))
        else:
            cursor.execute("""
                SELECT id, created_at, status, algorithm, seed, backend_name 
                FROM experiments 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (limit,))
        
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        
        conn.close()
        return [dict(zip(columns, row)) for row in rows]


# Singleton instance for global access
_tracker_instance = None

def get_experiment_tracker(db_path: str = None) -> ExperimentTracker:
    """Get or create the global experiment tracker"""
    global _tracker_instance
    if _tracker_instance is None:
        _tracker_instance = ExperimentTracker(db_path)
    return _tracker_instance


if __name__ == "__main__":
    # Quick test
    tracker = ExperimentTracker("test_experiments.db")
    
    exp_id = tracker.create_experiment(
        algorithm='vqe',
        config={'molecule': 'H2', 'ansatz': 'efficient_su2'},
        seed=42
    )
    
    # Simulate iterations
    for i in range(10):
        tracker.record_iteration(
            exp_id,
            iteration=i,
            parameters=np.random.random(4),
            cost_value=-0.5 - 0.1 * i + np.random.random() * 0.05
        )
    
    tracker.finalize_experiment(exp_id, {'final_energy': -1.137})
    
    # Retrieve
    exp = tracker.get_experiment(exp_id)
    print(f"Retrieved: {exp['algorithm']}, seed={exp['seed']}, status={exp['status']}")
    print(f"Energy history: {tracker.get_energy_history(exp_id)}")
