import os
import sys
import io
import time
import json
import uuid
import datetime
import threading
import sqlite3
import logging
from datetime import timezone
from typing import Dict, List, Any, Optional, Union
from flask import session, jsonify

# Force UTF-8 encoding for standard output/error to prevent UnicodeEncodeError in serverless and console logs
if hasattr(sys.stdout, 'buffer'):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except Exception:
        pass

# Add project root and core to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'core'))

from database_config import get_db_session, close_db_session
from user_auth import user_auth
from providers.registry import ProviderRegistry
try:
    from providers.ibm_provider import IBMProvider
    from providers.ionq_provider import IonQProvider
    from providers.rigetti_provider import RigettiProvider
    
    if not ProviderRegistry.is_registered('ibm'):
        ProviderRegistry.register('ibm', IBMProvider())
    if not ProviderRegistry.is_registered('ionq'):
        ProviderRegistry.register('ionq', IonQProvider())
    if not ProviderRegistry.is_registered('rigetti'):
        ProviderRegistry.register('rigetti', RigettiProvider())
except ImportError as e:
    print(f"Warning: Failed to import/register backend providers: {e}")

# Setup logging
logging.getLogger('qiskit').setLevel(logging.WARNING)
logging.getLogger('qiskit_ibm_runtime').setLevel(logging.WARNING)

# Qiskit imports
from qiskit import QuantumCircuit, transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

try:
    from qiskit_aer import AerSimulator
    AER_AVAILABLE = True
except ImportError:
    AER_AVAILABLE = False

try:
    from qiskit.qasm3 import dumps as qasm3_dumps
    OPENQASM3_AVAILABLE = True
except ImportError:
    OPENQASM3_AVAILABLE = False

# Initialize Gemini AI Service
try:
    from dotenv import load_dotenv
    load_dotenv()
    from gemini_ai_service import GeminiAIService
    gemini_ai = GeminiAIService()
    GEMINI_AI_AVAILABLE = True
except Exception as e:
    gemini_ai = None
    GEMINI_AI_AVAILABLE = False
    print(f"⚠️ Gemini AI Service not available: {e}")

# Global In-Memory Credentials Cache
provider_credentials = {}

def get_db_path(filename="quantum_data.db"):
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith('sqlite://') and filename == "quantum_data.db":
        return db_url.replace('sqlite:///', '').replace('sqlite://', '')
    elif os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
        return f'/tmp/{filename}'
    else:
        return filename

def validate_crn(crn):
    """Validate and clean CRN format"""
    if not crn or not isinstance(crn, str):
        return None
    crn = crn.rstrip(':')
    if crn.startswith('crn:v1:bluemix:public:quantum-computing:'):
        return crn
    return None

def is_crn_access_error(error_message):
    """Check if an error message indicates a CRN access issue"""
    if not error_message:
        return False
    error_lower = str(error_message).lower()
    access_indicators = [
        'access denied', 'forbidden', 'unauthorized', 'not authorized',
        'permission denied', 'invalid crn', 'instance not found', 'crn error'
    ]
    return any(indicator in error_lower for indicator in access_indicators)

def handle_ibm_error(error):
    """Handle IBM Quantum specific errors with structured responses"""
    error_str = str(error).upper()
    if "INVALID_CIRCUIT" in error_str or "UNSUPPORTED_GATE" in error_str:
        return {
            'error_type': 'CIRCUIT_ERROR',
            'message': 'Circuit contains unsupported operations for the target backend',
            'suggestion': 'Try using only basic gates (H, X, Y, Z, CX) or check backend compatibility',
            'severity': 'HIGH'
        }
    elif "CIRCUIT_TOO_DEEP" in error_str or "DEPTH_EXCEEDED" in error_str:
        return {
            'error_type': 'CIRCUIT_COMPLEXITY',
            'message': 'Circuit depth exceeds backend limits',
            'suggestion': 'Simplify the circuit or use fewer gates',
            'severity': 'HIGH'
        }
    elif "TOO_MANY_QUBITS" in error_str or "QUBIT_LIMIT" in error_str:
        return {
            'error_type': 'QUBIT_LIMIT',
            'message': 'Circuit requires more qubits than available on the backend',
            'suggestion': 'Reduce the number of qubits or choose a larger backend',
            'severity': 'HIGH'
        }
    elif "BACKEND_UNAVAILABLE" in error_str or "OFFLINE" in error_str:
        return {
            'error_type': 'BACKEND_UNAVAILABLE',
            'message': 'Selected backend is currently unavailable',
            'suggestion': 'Try a different backend or check backend status',
            'severity': 'MEDIUM'
        }
    elif "MAINTENANCE" in error_str or "SCHEDULED_DOWNTIME" in error_str:
        return {
            'error_type': 'BACKEND_MAINTENANCE',
            'message': 'Backend is under maintenance',
            'suggestion': 'Try again later or use a different backend',
            'severity': 'MEDIUM'
        }
    elif "UNAUTHORIZED" in error_str or "INVALID_TOKEN" in error_str:
        return {
            'error_type': 'AUTHENTICATION_ERROR',
            'message': 'Invalid or expired IBM Quantum credentials',
            'suggestion': 'Check your API token and CRN in account settings',
            'severity': 'HIGH'
        }
    elif "QUOTA_EXCEEDED" in error_str or "RATE_LIMIT" in error_str:
        return {
            'error_type': 'QUOTA_EXCEEDED',
            'message': 'API quota or rate limit exceeded',
            'suggestion': 'Wait before submitting more jobs or upgrade your plan',
            'severity': 'MEDIUM'
        }
    elif "TIMEOUT" in error_str or "CONNECTION_ERROR" in error_str:
        return {
            'error_type': 'NETWORK_ERROR',
            'message': 'Network connection issue with IBM Quantum',
            'suggestion': 'Check your internet connection and try again',
            'severity': 'LOW'
        }
    return {
        'error_type': 'UNKNOWN_ERROR',
        'message': f'Unexpected error: {str(error)}',
        'suggestion': 'Please try again or contact support if the issue persists',
        'severity': 'MEDIUM'
    }

def get_user_quantum_credentials():
    """Get user's IBM Quantum credentials from session or database"""
    user_id = session.get('user_id')
    user_email = session.get('user_email', 'Unknown')
    
    if not user_id:
        return None, None
        
    quantum_token = session.get('quantum_token')
    quantum_crn = session.get('quantum_crn')
    
    if quantum_token:
        if quantum_crn:
            valid_crn = validate_crn(quantum_crn)
            if valid_crn:
                return quantum_token, valid_crn
            else:
                session.pop('quantum_crn', None)
        return quantum_token, None
        
    # Query database
    try:
        # Check ibm_credentials table
        try:
            conn = sqlite3.connect(get_db_path())
            cursor = conn.cursor()
            cursor.execute('SELECT api_token, crn FROM ibm_credentials WHERE user_id = ? AND is_active = 1', (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                quantum_token, quantum_crn = result
                valid_crn = validate_crn(quantum_crn) if quantum_crn else None
                session['quantum_token'] = quantum_token
                if valid_crn:
                    session['quantum_crn'] = valid_crn
                return quantum_token, valid_crn
        except Exception as db_err:
            print(f"Error checking ibm_credentials table: {db_err}")

        # Legacy fallback to user_auth
        quantum_token, quantum_crn = user_auth.get_user_credentials(user_id)
        if quantum_token:
            valid_crn = validate_crn(quantum_crn) if quantum_crn else None
            session['quantum_token'] = quantum_token
            if valid_crn:
                session['quantum_crn'] = valid_crn
            else:
                session.pop('quantum_crn', None)
            return quantum_token, valid_crn
    except Exception as e:
        print(f"Error fetching user credentials: {e}")
        
    return None, None

class IBMServiceSingleton:
    """Singleton manager for IBM Quantum Runtime Service instances."""
    _instances = {}
    _lock = threading.Lock()
    
    @classmethod
    def get_service(cls, user_id, token, crn=None):
        if user_id in cls._instances:
            return cls._instances[user_id]
        
        with cls._lock:
            if user_id in cls._instances:
                return cls._instances[user_id]
            
            print(f"🔧 Creating NEW IBM Quantum service for user {user_id}")
            try:
                service = QiskitRuntimeService(
                    channel="ibm_quantum_platform",
                    token=token
                )
                cls._instances[user_id] = service
                print(f"✅ IBM Quantum service created and cached for user {user_id}")
                return service
            except Exception as e:
                print(f"❌ IBM Quantum connection failed: {e}")
                return None
    
    @classmethod
    def clear_service(cls, user_id):
        with cls._lock:
            if user_id in cls._instances:
                del cls._instances[user_id]
                print(f"🗑️ Cleared IBM Quantum service for user {user_id}")
                
    @classmethod
    def clear_user_service(cls, user_id):
        cls.clear_service(user_id)

class IBMJobCache:
    """Thread-safe smart cache for IBM Quantum jobs with proper invalidation."""
    _cache = {}
    _lock = threading.Lock()
    _cache_ttl = 30
    _cleanup_ttl = 600
    
    @classmethod
    def get_cached_jobs(cls, user_id):
        with cls._lock:
            cls._cleanup_stale_entries()
            if user_id not in cls._cache:
                return None, False
            
            entry = cls._cache[user_id]
            age = (datetime.datetime.now(timezone.utc) - entry['last_fetch']).total_seconds()
            
            if entry.get('has_active', False) and age > 5:
                return None, False
            
            if age < cls._cache_ttl:
                return entry['jobs'], True
            return None, False
            
    @classmethod
    def update_cache(cls, user_id, jobs):
        active_statuses = {'RUNNING', 'QUEUED', 'PENDING', 'INITIALIZING', 'VALIDATING'}
        has_active = any(
            j.get('status', '').upper() in active_statuses for j in jobs
        )
        with cls._lock:
            cls._cache[user_id] = {
                'jobs': jobs,
                'last_fetch': datetime.datetime.now(timezone.utc),
                'has_active': has_active
            }
            
    @classmethod
    def _cleanup_stale_entries(cls):
        now = datetime.datetime.now(timezone.utc)
        to_delete = []
        for uid, entry in cls._cache.items():
            if (now - entry['last_fetch']).total_seconds() > cls._cleanup_ttl:
                to_delete.append(uid)
        for uid in to_delete:
            del cls._cache[uid]

class IBMResultsCache:
    """Thread-safe cache for IBM Quantum results with 60-second TTL."""
    _cache = {}
    _lock = threading.Lock()
    _cache_ttl = 60
    _cleanup_ttl = 600
    _last_cleanup = None
    
    @classmethod
    def get_cached_results(cls, user_id):
        with cls._lock:
            cls._cleanup_stale_entries()
            if user_id not in cls._cache:
                return None, False
            entry = cls._cache[user_id]
            age = (datetime.datetime.now(timezone.utc) - entry['last_fetch']).total_seconds()
            if age < cls._cache_ttl:
                return entry['results'], True
            return None, False
            
    @classmethod
    def update_cache(cls, user_id, results):
        with cls._lock:
            cls._cache[user_id] = {
                'results': results,
                'last_fetch': datetime.datetime.now(timezone.utc)
            }
            
    @classmethod
    def _cleanup_stale_entries(cls):
        now = datetime.datetime.now(timezone.utc)
        if cls._last_cleanup and (now - cls._last_cleanup).total_seconds() < 60:
            return
        cls._last_cleanup = now
        stale_users = []
        for user_id, entry in cls._cache.items():
            age = (now - entry['last_fetch']).total_seconds()
            if age > cls._cleanup_ttl:
                stale_users.append(user_id)
        for user_id in stale_users:
            del cls._cache[user_id]
            
    @classmethod
    def invalidate(cls, user_id):
        with cls._lock:
            if user_id in cls._cache:
                del cls._cache[user_id]

from routes.quantum_manager import QuantumBackendManager

class QuantumManagerSingleton:
    _instance = None
    _managers = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
        
    def get_manager(self, token=None, crn=None):
        if not token:
            return None
        user_key = f"{token[:10]}_{crn[:20] if crn else 'no_crn'}"
        if user_key in self._managers:
            return self._managers[user_key]
        if token:
            manager = QuantumBackendManager(token, crn)
            self._managers[user_key] = manager
            return manager
        return None
        
    def reset_manager(self):
        self._managers = {}
        
    def is_connected(self, token=None, crn=None):
        if not token:
            for manager in self._managers.values():
                if manager and hasattr(manager, 'is_connected') and manager.is_connected:
                    return True
            return False
        user_key = f"{token[:10]}_{crn[:20] if crn else 'no_crn'}"
        manager = self._managers.get(user_key)
        return manager is not None and hasattr(manager, 'is_connected') and manager.is_connected

quantum_manager_singleton = QuantumManagerSingleton()

class CircuitStateManager:
    def __init__(self, get_db_session_func):
        self.get_db_session = get_db_session_func
        self.current_circuits = {}
        
    def get_current_circuit(self, user_id=None):
        if not user_id:
            return None
        circuit_id = self.current_circuits.get(user_id)
        if circuit_id:
            return {'circuit_id': circuit_id, 'user_id': user_id}
        return None
        
    def set_current_circuit(self, circuit_id, user_id):
        self.current_circuits[user_id] = circuit_id
        
    def create_circuit(self, circuit_data, user_id, circuit_name, circuit_type, is_ai_generated=False):
        circuit_id = f"circuit_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        return circuit_id

circuit_manager = CircuitStateManager(get_db_session)
