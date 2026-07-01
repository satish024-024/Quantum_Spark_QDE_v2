"""
Circuit State Manager for Quantum Dashboard
Manages circuit state, history, and integration with IBM Quantum jobs
"""

import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
import sqlite3
from contextlib import contextmanager

class CircuitStateManager:
    """Manages circuit state and history for the quantum dashboard"""
    
    def __init__(self, db_connection_func):
        self.db_connection_func = db_connection_func
        self.current_circuit = None
        self.circuit_history = []
        self.init_database()
    
    def init_database(self):
        """Initialize circuit-related database tables"""
        try:
            with self.db_connection_func() as conn:
                # Disable foreign key constraints to avoid issues
                from sqlalchemy import text
                conn.execute(text('PRAGMA foreign_keys = OFF'))
                
                # Circuit definitions table (no foreign keys)
                conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS circuit_definitions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        circuit_id TEXT UNIQUE NOT NULL,
                        user_id INTEGER,
                        circuit_name TEXT,
                        circuit_type TEXT,
                        circuit_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_ai_generated BOOLEAN DEFAULT FALSE
                    )
                '''))
                
                # Circuit execution history table (no foreign keys)
                conn.execute(text('''
                    CREATE TABLE IF NOT EXISTS circuit_executions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        execution_id TEXT UNIQUE NOT NULL,
                        circuit_id TEXT,
                        user_id INTEGER,
                        backend_name TEXT,
                        job_id TEXT,
                        status TEXT DEFAULT 'submitted',
                        execution_data TEXT,
                        results_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP,
                        execution_time REAL
                    )
                '''))
                
                # Create indices for better query performance
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_circuit_definitions_user_id 
                    ON circuit_definitions(user_id)
                '''))
                
                conn.execute(text('''
                    CREATE INDEX IF NOT EXISTS idx_circuit_executions_user_id 
                    ON circuit_executions(user_id)
                '''))
                
                conn.commit()
                print("OK Circuit database tables initialized")
                
        except Exception as e:
            print(f"ERROR initializing circuit database: {e}")
            import traceback
            traceback.print_exc()
    
    def create_circuit(self, circuit_data: Dict, user_id: int, circuit_name: str = None, 
                      circuit_type: str = "custom", is_ai_generated: bool = False) -> str:
        """Create a new circuit and set it as current"""
        circuit_id = f"circuit_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        if not circuit_name:
            circuit_name = f"{circuit_type.replace('_', ' ').title()} Circuit"
        
        circuit_record = {
            'circuit_id': circuit_id,
            'user_id': user_id,
            'circuit_name': circuit_name,
            'circuit_type': circuit_type,
            'circuit_data': json.dumps(circuit_data),
            'is_ai_generated': is_ai_generated,
            'created_at': datetime.now().isoformat(),
            'modified_at': datetime.now().isoformat()
        }
        
        # Store in database
        with self.db_connection_func() as conn:
            conn.execute('''
                INSERT INTO circuit_definitions 
                (circuit_id, user_id, circuit_name, circuit_type, circuit_data, is_ai_generated)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                circuit_id, user_id, circuit_name, circuit_type, 
                json.dumps(circuit_data), is_ai_generated
            ))
            conn.commit()
        
        # Set as current circuit
        self.current_circuit = circuit_record
        self.circuit_history.append(circuit_record)
        
        return circuit_id
    
    def update_circuit(self, circuit_id: str, circuit_data: Dict, user_id: int) -> bool:
        """Update an existing circuit"""
        try:
            with self.db_connection_func() as conn:
                conn.execute('''
                    UPDATE circuit_definitions 
                    SET circuit_data = ?, modified_at = ?
                    WHERE circuit_id = ? AND user_id = ?
                ''', (json.dumps(circuit_data), datetime.now().isoformat(), circuit_id, user_id))
                conn.commit()
                
                # Update current circuit if it's the one being modified
                if self.current_circuit and self.current_circuit['circuit_id'] == circuit_id:
                    self.current_circuit['circuit_data'] = json.dumps(circuit_data)
                    self.current_circuit['modified_at'] = datetime.now().isoformat()
                
                return True
        except Exception as e:
            print(f"Error updating circuit: {e}")
            return False
    
    def get_current_circuit(self) -> Optional[Dict]:
        """Get the current circuit"""
        if self.current_circuit:
            # Handle both string and dict formats for circuit_data
            circuit_data_raw = self.current_circuit['circuit_data']
            if isinstance(circuit_data_raw, str):
                circuit_data = json.loads(circuit_data_raw)
            elif isinstance(circuit_data_raw, dict):
                circuit_data = circuit_data_raw
            else:
                circuit_data = {}
            
            return {
                **self.current_circuit,
                'circuit_data': circuit_data
            }
        return None
    
    def set_current_circuit(self, circuit_id: str, user_id: int) -> bool:
        """Set a specific circuit as current"""
        try:
            with self.db_connection_func() as conn:
                cursor = conn.execute('''
                    SELECT * FROM circuit_definitions 
                    WHERE circuit_id = ? AND user_id = ?
                ''', (circuit_id, user_id))
                
                circuit = cursor.fetchone()
                if circuit:
                    self.current_circuit = dict(circuit)
                    return True
                return False
        except Exception as e:
            print(f"Error setting current circuit: {e}")
            return False
    
    def get_circuit_history(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get circuit history for a user"""
        try:
            with self.db_connection_func() as conn:
                cursor = conn.execute('''
                    SELECT * FROM circuit_definitions 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (user_id, limit))
                
                circuits = []
                for row in cursor.fetchall():
                    circuit = dict(row)
                    # Handle both string and dict formats for circuit_data
                    circuit_data_raw = circuit['circuit_data']
                    if isinstance(circuit_data_raw, str):
                        circuit['circuit_data'] = json.loads(circuit_data_raw)
                    elif isinstance(circuit_data_raw, dict):
                        circuit['circuit_data'] = circuit_data_raw
                    else:
                        circuit['circuit_data'] = {}
                    circuits.append(circuit)
                
                return circuits
        except Exception as e:
            print(f"Error getting circuit history: {e}")
            return []
    
    def get_circuit_by_id(self, circuit_id: str, user_id: int) -> Optional[Dict]:
        """Get a specific circuit by ID"""
        try:
            with self.db_connection_func() as conn:
                cursor = conn.execute('''
                    SELECT * FROM circuit_definitions 
                    WHERE circuit_id = ? AND user_id = ?
                ''', (circuit_id, user_id))
                
                circuit = cursor.fetchone()
                if circuit:
                    circuit_dict = dict(circuit)
                    # Handle both string and dict formats for circuit_data
                    circuit_data_raw = circuit_dict['circuit_data']
                    if isinstance(circuit_data_raw, str):
                        circuit_dict['circuit_data'] = json.loads(circuit_data_raw)
                    elif isinstance(circuit_data_raw, dict):
                        circuit_dict['circuit_data'] = circuit_data_raw
                    else:
                        circuit_dict['circuit_data'] = {}
                    return circuit_dict
                return None
        except Exception as e:
            print(f"Error getting circuit: {e}")
            return None
    
    def record_execution(self, circuit_id: str, user_id: int, backend_name: str, 
                        job_id: str = None, status: str = "submitted", 
                        execution_data: Dict = None, results_data: Dict = None) -> str:
        """Record a circuit execution"""
        execution_id = f"exec_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        
        try:
            with self.db_connection_func() as conn:
                conn.execute('''
                    INSERT INTO circuit_executions 
                    (execution_id, circuit_id, user_id, backend_name, job_id, status, execution_data, results_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    execution_id, circuit_id, user_id, backend_name, job_id, status,
                    json.dumps(execution_data or {}), json.dumps(results_data or {})
                ))
                conn.commit()
                
                return execution_id
        except Exception as e:
            print(f"Error recording execution: {e}")
            return None
    
    def update_execution_status(self, execution_id: str, status: str, results_data: Dict = None):
        """Update execution status and results"""
        try:
            with self.db_connection_func() as conn:
                conn.execute('''
                    UPDATE circuit_executions 
                    SET status = ?, results_data = ?, completed_at = ?
                    WHERE execution_id = ?
                ''', (status, json.dumps(results_data or {}), 
                      datetime.now().isoformat(), execution_id))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error updating execution status: {e}")
            return False
    
    def get_execution_history(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Get execution history for a user"""
        try:
            with self.db_connection_func() as conn:
                cursor = conn.execute('''
                    SELECT ce.*, cd.circuit_name, cd.circuit_type
                    FROM circuit_executions ce
                    JOIN circuit_definitions cd ON ce.circuit_id = cd.circuit_id
                    WHERE ce.user_id = ? 
                    ORDER BY ce.created_at DESC 
                    LIMIT ?
                ''', (user_id, limit))
                
                executions = []
                for row in cursor.fetchall():
                    execution = dict(row)
                    execution['execution_data'] = json.loads(execution['execution_data'] or '{}')
                    execution['results_data'] = json.loads(execution['results_data'] or '{}')
                    executions.append(execution)
                
                return executions
        except Exception as e:
            print(f"Error getting execution history: {e}")
            return []
    
    def get_circuit_executions(self, circuit_id: str, user_id: int) -> List[Dict]:
        """Get all executions for a specific circuit"""
        try:
            with self.db_connection_func() as conn:
                cursor = conn.execute('''
                    SELECT * FROM circuit_executions 
                    WHERE circuit_id = ? AND user_id = ?
                    ORDER BY created_at DESC
                ''', (circuit_id, user_id))
                
                executions = []
                for row in cursor.fetchall():
                    execution = dict(row)
                    execution['execution_data'] = json.loads(execution['execution_data'] or '{}')
                    execution['results_data'] = json.loads(execution['results_data'] or '{}')
                    executions.append(execution)
                
                return executions
        except Exception as e:
            print(f"Error getting circuit executions: {e}")
            return []
    
    def generate_demo_circuits(self, user_id: int) -> List[str]:
        """Generate demo circuits for testing (real-looking data)"""
        demo_circuits = [
            {
                'name': 'Bell State Preparation',
                'type': 'bell_state',
                'data': {
                    'gates': [
                        {'name': 'h', 'qubits': [0], 'position': 0},
                        {'name': 'cx', 'qubits': [0, 1], 'position': 1}
                    ],
                    'num_qubits': 2,
                    'depth': 2
                }
            },
            {
                'name': 'Grover Search Algorithm',
                'type': 'grover_search',
                'data': {
                    'gates': [
                        {'name': 'h', 'qubits': [0], 'position': 0},
                        {'name': 'h', 'qubits': [1], 'position': 1},
                        {'name': 'h', 'qubits': [2], 'position': 2},
                        {'name': 'x', 'qubits': [0], 'position': 3},
                        {'name': 'x', 'qubits': [1], 'position': 4},
                        {'name': 'x', 'qubits': [2], 'position': 5},
                        {'name': 'ccx', 'qubits': [0, 1, 2], 'position': 6}
                    ],
                    'num_qubits': 3,
                    'depth': 7
                }
            },
            {
                'name': 'Quantum Random Number Generator',
                'type': 'random_number_generator',
                'data': {
                    'gates': [
                        {'name': 'h', 'qubits': [0], 'position': 0},
                        {'name': 'h', 'qubits': [1], 'position': 1},
                        {'name': 'measure', 'qubits': [0, 1], 'position': 2}
                    ],
                    'num_qubits': 2,
                    'depth': 3
                }
            }
        ]
        
        circuit_ids = []
        for demo in demo_circuits:
            circuit_id = self.create_circuit(
                demo['data'], 
                user_id, 
                demo['name'], 
                demo['type'], 
                is_ai_generated=True
            )
            circuit_ids.append(circuit_id)
            
            # Add some demo executions
            self.record_execution(
                circuit_id, user_id, 'ibm_brisbane', 
                f"demo_job_{int(time.time())}", 'completed',
                {'shots': 1024, 'backend_type': 'real'},
                {'counts': {'00': 512, '11': 512}, 'fidelity': 0.95}
            )
        
        return circuit_ids
