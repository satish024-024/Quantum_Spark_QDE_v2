#!/usr/bin/env python3
"""
Quantum Spark - Professional Dashboard
Simple Flask app to serve the professional dashboard
"""

from flask import Flask, render_template, jsonify, request
import json
import random
import time
import os

# Create Flask app
app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')

# Configure app
app.secret_key = 'professional-dashboard-secret-key'

@app.route('/')
def index():
    """Main professional dashboard page"""
    return render_template('professional_dashboard.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard route"""
    return render_template('professional_dashboard.html')

@app.route('/offline_status')
def offline_status():
    """Offline status page"""
    return render_template('offline_status.html')

@app.route('/api/backends')
def get_backends():
    """Get quantum backends data"""
    backends = [
        {
            "name": "ibmq_qasm_simulator",
            "status": "active",
            "n_qubits": 32,
            "queue_length": random.randint(0, 5),
            "pending_jobs": random.randint(0, 10),
            "operational": True,
            "version": "0.8.0"
        },
        {
            "name": "ibm_nairobi",
            "status": "active", 
            "n_qubits": 7,
            "queue_length": random.randint(0, 3),
            "pending_jobs": random.randint(0, 5),
            "operational": True,
            "version": "1.0.0"
        },
        {
            "name": "ibm_osaka",
            "status": "active",
            "n_qubits": 127,
            "queue_length": random.randint(0, 8),
            "pending_jobs": random.randint(0, 15),
            "operational": True,
            "version": "1.2.0"
        },
        {
            "name": "ibm_kyoto",
            "status": "maintenance",
            "n_qubits": 127,
            "queue_length": 0,
            "pending_jobs": 0,
            "operational": False,
            "version": "1.1.0"
        }
    ]
    return jsonify(backends)

@app.route('/api/jobs')
def get_jobs():
    """Get quantum jobs data"""
    jobs = []
    for i in range(15):
        jobs.append({
            "job_id": f"professional_job_{i+1}",
            "backend": random.choice(["ibmq_qasm_simulator", "ibm_nairobi", "ibm_osaka"]),
            "status": random.choice(["running", "completed", "failed", "queued", "cancelled"]),
            "created_at": time.time() - random.randint(0, 7200),
            "shots": random.randint(100, 1024),
            "priority": random.choice(["high", "medium", "low"]),
            "user": f"user_{random.randint(1, 10)}"
        })
    return jsonify(jobs)

@app.route('/api/metrics')
def get_metrics():
    """Get dashboard metrics"""
    return jsonify({
        "active_backends": random.randint(3, 6),
        "total_jobs": random.randint(100, 500),
        "running_jobs": random.randint(8, 25),
        "success_rate": round(random.uniform(88, 99), 1),
        "avg_queue_time": random.randint(30, 300),
        "total_users": random.randint(50, 200)
    })

@app.route('/api/quantum-state')
def get_quantum_state():
    """Get quantum state data for Bloch sphere"""
    return jsonify({
        "alpha": random.uniform(0, 1),
        "beta": random.uniform(0, 1),
        "gamma": random.uniform(0, 2*3.14159),
        "fidelity": round(random.uniform(0.85, 0.99), 3)
    })

@app.route('/api/results')
def get_results():
    """Get measurement results"""
    results = {}
    for i in range(8):
        results[f"{i:03b}"] = random.randint(50, 200)
    return jsonify(results)

@app.route('/api/performance')
def get_performance():
    """Get performance data"""
    return jsonify({
        "cpu_usage": random.randint(15, 75),
        "memory_usage": random.randint(25, 85),
        "network_latency": random.randint(5, 80),
        "job_throughput": random.randint(8, 30),
        "error_rate": round(random.uniform(0.1, 2.5), 2),
        "queue_efficiency": round(random.uniform(85, 98), 1)
    })

@app.route('/api/entanglement')
def get_entanglement():
    """Get entanglement analysis data"""
    return jsonify({
        "entanglement_entropy": round(random.uniform(0, 1), 3),
        "mutual_information": round(random.uniform(0, 1), 3),
        "concurrence": round(random.uniform(0, 1), 3),
        "negativity": round(random.uniform(0, 1), 3),
        "bell_inequality": round(random.uniform(1.5, 2.8), 2)
    })

@app.route('/api/sync_status')
def get_sync_status():
    """Get sync status for offline functionality"""
    return jsonify({
        "success": True,
        "is_data_fresh_15min": random.choice([True, False]),
        "is_data_fresh_30min": random.choice([True, False]),
        "last_sync": time.time() - random.randint(0, 3600),
        "offline_mode": False
    })

@app.route('/api/ai-query', methods=['POST'])
def ai_query():
    """Handle AI queries"""
    data = request.get_json()
    query = data.get('query', '')
    
    # Professional AI responses
    responses = [
        "In quantum computing, superposition allows qubits to exist in multiple states simultaneously, enabling parallel computation.",
        "Quantum entanglement is a fundamental phenomenon where particles become correlated in ways that cannot be explained by classical physics.",
        "The Bloch sphere provides a geometric representation of quantum states, with each point representing a unique quantum state on the unit sphere.",
        "Quantum gates are unitary operations that manipulate qubit states. Common gates include Pauli-X, Pauli-Y, Pauli-Z, and Hadamard gates.",
        "Quantum measurement collapses the quantum superposition into a definite classical state, following the Born rule for probability calculations.",
        "Quantum algorithms like Shor's algorithm and Grover's algorithm demonstrate potential quantum advantage over classical computing.",
        "Error correction in quantum computing is crucial due to decoherence and noise, requiring sophisticated techniques like surface codes."
    ]
    
    response = random.choice(responses)
    return jsonify({
        "response": response,
        "timestamp": time.time(),
        "confidence": round(random.uniform(0.85, 0.98), 2)
    })

if __name__ == '__main__':
    print("🚀 Starting Quantum Spark Professional Dashboard...")
    print("📱 Professional Quantum Analytics Dashboard")
    print("🌐 Dashboard will be available at: http://localhost:10001")
    print("🎯 Features: Advanced analytics, Professional UI, Offline support")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=10001,
        debug=True,
        threaded=True
    )
