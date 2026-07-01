#!/usr/bin/env python3
"""
Quantum Spark - Amravati Quantum Hackathon Dashboard
Simple Flask app to serve the hackathon dashboard
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
app.secret_key = 'hackathon-dashboard-secret-key'

@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('hackathon_dashboard.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard route"""
    return render_template('hackathon_dashboard.html')

@app.route('/api/backends')
def get_backends():
    """Get quantum backends data"""
    backends = [
        {
            "name": "ibmq_qasm_simulator",
            "status": "active",
            "n_qubits": 32,
            "queue_length": random.randint(0, 5),
            "pending_jobs": random.randint(0, 10)
        },
        {
            "name": "ibm_nairobi",
            "status": "active", 
            "n_qubits": 7,
            "queue_length": random.randint(0, 3),
            "pending_jobs": random.randint(0, 5)
        },
        {
            "name": "ibm_osaka",
            "status": "active",
            "n_qubits": 127,
            "queue_length": random.randint(0, 8),
            "pending_jobs": random.randint(0, 15)
        }
    ]
    return jsonify(backends)

@app.route('/api/jobs')
def get_jobs():
    """Get quantum jobs data"""
    jobs = []
    for i in range(10):
        jobs.append({
            "job_id": f"hackathon_job_{i+1}",
            "backend": random.choice(["ibmq_qasm_simulator", "ibm_nairobi", "ibm_osaka"]),
            "status": random.choice(["running", "completed", "failed", "queued"]),
            "created_at": time.time() - random.randint(0, 3600),
            "shots": random.randint(100, 1000)
        })
    return jsonify(jobs)

@app.route('/api/metrics')
def get_metrics():
    """Get dashboard metrics"""
    return jsonify({
        "active_backends": random.randint(3, 5),
        "total_jobs": random.randint(50, 100),
        "running_jobs": random.randint(5, 15),
        "success_rate": round(random.uniform(85, 98), 1)
    })

@app.route('/api/quantum-state')
def get_quantum_state():
    """Get quantum state data for Bloch sphere"""
    return jsonify({
        "alpha": random.uniform(0, 1),
        "beta": random.uniform(0, 1),
        "gamma": random.uniform(0, 2*3.14159)
    })

@app.route('/api/results')
def get_results():
    """Get measurement results"""
    results = {}
    for i in range(8):
        results[f"{i:03b}"] = random.randint(0, 100)
    return jsonify(results)

@app.route('/api/performance')
def get_performance():
    """Get performance data"""
    return jsonify({
        "cpu_usage": random.randint(20, 80),
        "memory_usage": random.randint(30, 90),
        "network_latency": random.randint(10, 100),
        "job_throughput": random.randint(5, 25)
    })

@app.route('/api/entanglement')
def get_entanglement():
    """Get entanglement analysis data"""
    return jsonify({
        "entanglement_entropy": random.uniform(0, 1),
        "mutual_information": random.uniform(0, 1),
        "concurrence": random.uniform(0, 1),
        "negativity": random.uniform(0, 1)
    })

@app.route('/api/ai-query', methods=['POST'])
def ai_query():
    """Handle AI queries"""
    data = request.get_json()
    query = data.get('query', '')
    
    # Simple AI response simulation
    responses = [
        "This is a quantum superposition state. The qubit can exist in multiple states simultaneously.",
        "Quantum entanglement occurs when two or more qubits become correlated in a way that cannot be explained classically.",
        "The Bloch sphere is a geometric representation of quantum states. Each point represents a unique quantum state.",
        "Quantum gates are operations that change the state of qubits. Common gates include X, Y, Z, and Hadamard gates.",
        "Measurement in quantum mechanics collapses the superposition into a definite state."
    ]
    
    response = random.choice(responses)
    return jsonify({
        "response": response,
        "timestamp": time.time()
    })

if __name__ == '__main__':
    print("🚀 Starting Quantum Spark Hackathon Dashboard...")
    print("📱 Amravati Quantum Hackathon Dashboard")
    print("🌐 Dashboard will be available at: http://localhost:10000")
    print("🎯 Features: Real-time monitoring, 3D visualizations, AI integration")
    print("=" * 60)
    
    app.run(
        host='0.0.0.0',
        port=10000,
        debug=True,
        threaded=True
    )
