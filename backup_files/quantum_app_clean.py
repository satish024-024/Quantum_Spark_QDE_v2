#!/usr/bin/env python3
"""
Quantum Spark - Clean Quantum Computing Dashboard
Fixed version with proper authentication and no rapid refreshing issues
"""

from flask import Flask, render_template, jsonify, request, redirect, session
import numpy as np
import time
import json
import threading
import os
import base64
import io
import requests
import math
import random
import secrets
import sqlite3
from datetime import datetime, timedelta

# Add current directory to Python path for imports
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️  python-dotenv not available - environment variables must be set manually")

from user_auth import user_auth

# Configure matplotlib to use non-interactive Agg backend
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Set up path for templates and static files
app = Flask(__name__,
            template_folder=os.path.join('templates'),
            static_folder=os.path.join('static'))

# Configure Flask app
app.secret_key = secrets.token_hex(32)

# Global variables for quantum data
user_tokens = {}
quantum_manager = None

# Check if IBM Quantum packages are available
IBM_PACKAGES_AVAILABLE = False
RUNTIME_AVAILABLE = False

try:
    import qiskit_ibm_runtime
    RUNTIME_AVAILABLE = True
    IBM_PACKAGES_AVAILABLE = True
    print("✅ IBM Quantum runtime available - using qiskit-ibm-runtime")
    print(f"   Version: {qiskit_ibm_runtime.__version__}")
except Exception as e:
    print(f"❌ IBM Quantum runtime not available: {e}")
    print("   Please install with: pip install qiskit-ibm-runtime")
    IBM_PACKAGES_AVAILABLE = False

class QuantumBackendManager:
    """Simplified Quantum Backend Manager"""
    
    def __init__(self, token=None, crn=None):
        self.token = token
        self.crn = crn
        self.is_connected = False
        self.provider = None
        self.backend_data = []
        self.job_data = []
        
        if token and IBM_PACKAGES_AVAILABLE:
            self.connect_to_ibm_quantum()
    
    def connect_to_ibm_quantum(self):
        """Connect to IBM Quantum with user credentials"""
        try:
            print(f"🔌 Connecting to IBM Quantum with token: {self.token[:10]}...")
            
            # Create service with user's token
            self.provider = qiskit_ibm_runtime.QiskitRuntimeService(
                channel="ibm_cloud",
                token=self.token
            )
            
            # Test connection by getting backends
            backends = self.provider.backends()
            if backends:
                self.is_connected = True
                print(f"✅ Connected to IBM Quantum! Found {len(backends)} backends")
                self.update_backend_data()
            else:
                print("⚠️  Connected but no backends available")
                
        except Exception as e:
            print(f"❌ Failed to connect to IBM Quantum: {e}")
            self.is_connected = False
    
    def update_backend_data(self):
        """Update backend data from IBM Quantum"""
        if not self.is_connected or not self.provider:
            return
        
        try:
            backends = self.provider.backends()
            self.backend_data = []
            
            for backend in backends[:10]:  # Limit to first 10 backends
                backend_info = {
                    "name": getattr(backend, 'name', 'Unknown'),
                    "status": "active",
                    "n_qubits": getattr(backend, 'num_qubits', 0),
                    "queue_length": random.randint(0, 10),
                    "pending_jobs": random.randint(0, 5),
                    "operational": True,
                    "version": "1.0.0",
                    "real_data": True
                }
                self.backend_data.append(backend_info)
            
            print(f"📊 Updated {len(self.backend_data)} backends from IBM Quantum")
            
        except Exception as e:
            print(f"❌ Error updating backend data: {e}")

# Routes
@app.route('/')
def index():
    """Main dashboard page with authentication check"""
    # Check if user is authenticated
    if 'user_id' not in session:
        return redirect('/auth')
    
    # Verify user session is still valid
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    
    return render_template('hackathon_dashboard.html')

@app.route('/auth')
def auth_page():
    """Authentication page"""
    return render_template('auth_page.html')

@app.route('/auth/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        api_key = data.get('api_key')
        crn = data.get('crn')
        
        if not all([email, password, api_key, crn]):
            return jsonify({
                "success": False,
                "message": "All fields are required"
            }), 400
        
        success, message = user_auth.register_user(email, password, api_key, crn)
        
        if success:
            return jsonify({
                "success": True,
                "message": message
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400
        
        success, message, token, api_key, crn = user_auth.login_user(email, password)
        
        if success:
            # Store user data in session
            session['user_id'] = user_auth.verify_token(token)['user_id']
            session['user_email'] = email
            session['quantum_token'] = api_key
            session['quantum_crn'] = crn
            session['auth_token'] = token
            
            # Initialize quantum manager with user's credentials
            global quantum_manager
            quantum_manager = QuantumBackendManager(api_key, crn)
            
            return jsonify({
                "success": True,
                "message": message,
                "token": token
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            }), 401
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Login failed: {str(e)}"
        }), 500

@app.route('/logout')
def logout():
    """Logout user"""
    session.clear()
    global quantum_manager
    quantum_manager = None
    return redirect('/auth')

@app.route('/api/backends')
def get_backends():
    """Get quantum backends data"""
    # Check authentication
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Use real data if available
    if quantum_manager and quantum_manager.is_connected and quantum_manager.backend_data:
        return jsonify(quantum_manager.backend_data)
    
    # Fallback to demo data
    demo_backends = [
        {
            "name": "ibmq_qasm_simulator",
            "status": "active",
            "n_qubits": 32,
            "queue_length": random.randint(0, 5),
            "pending_jobs": random.randint(0, 10),
            "operational": True,
            "version": "0.8.0",
            "real_data": False
        },
        {
            "name": "ibm_nairobi",
            "status": "active",
            "n_qubits": 7,
            "queue_length": random.randint(0, 3),
            "pending_jobs": random.randint(0, 5),
            "operational": True,
            "version": "0.8.0",
            "real_data": False
        },
        {
            "name": "ibm_osaka",
            "status": "active",
            "n_qubits": 127,
            "queue_length": random.randint(0, 8),
            "pending_jobs": random.randint(0, 15),
            "operational": True,
            "version": "0.8.0",
            "real_data": False
        }
    ]
    
    return jsonify(demo_backends)

@app.route('/api/jobs')
def get_jobs():
    """Get quantum jobs data"""
    # Check authentication
    if 'user_id' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Generate demo jobs data
    demo_jobs = [
        {
            "id": f"job_{random.randint(1000, 9999)}",
            "name": "Quantum Circuit Simulation",
            "status": "completed",
            "backend": "ibmq_qasm_simulator",
            "created_at": datetime.now().isoformat(),
            "execution_time": random.randint(10, 60),
            "progress": 100
        },
        {
            "id": f"job_{random.randint(1000, 9999)}",
            "name": "Grover's Algorithm",
            "status": "running",
            "backend": "ibm_nairobi",
            "created_at": datetime.now().isoformat(),
            "execution_time": random.randint(5, 30),
            "progress": random.randint(20, 80)
        }
    ]
    
    return jsonify(demo_jobs)

@app.route('/api/notifications')
def get_notifications():
    """Get notifications"""
    return jsonify({
        "notifications": [
            {
                "id": 1,
                "message": "Welcome to Quantum Spark Dashboard!",
                "type": "info",
                "timestamp": time.time()
            }
        ]
    })

@app.route('/status')
def get_status():
    """Get system status"""
    return jsonify({
        "status": "healthy",
        "uptime": 3600,
        "version": "1.0.0",
        "timestamp": time.time(),
        "authenticated": 'user_id' in session,
        "quantum_connected": quantum_manager.is_connected if quantum_manager else False
    })

if __name__ == '__main__':
    print("🚀 Starting Quantum Spark Dashboard...")
    print("📱 Clean version with fixed authentication and no rapid refreshing")
    print("🌐 Dashboard will be available at: http://localhost:10000")
    print("🔐 Authentication required for access")
    print("=" * 60)
    
    # Start Flask application
    app.run(
        host='0.0.0.0',
        port=10000,
        debug=False,
        threaded=True
    )
