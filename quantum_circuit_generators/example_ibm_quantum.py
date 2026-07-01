"""
Example: Build and Run a Quantum Circuit on IBM Quantum
=========================================================

This script demonstrates how to:
1. Build a quantum circuit
2. Connect to IBM Quantum
3. Run on real quantum hardware or simulator
"""

from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.visualization import plot_histogram
import matplotlib.pyplot as plt

# ====================================================================
# STEP 1: Build a Quantum Circuit (Bell State / Entanglement)
# ====================================================================
print("Building quantum circuit...")
qc = QuantumCircuit(2, 2)  # 2 qubits, 2 classical bits

# Create a Bell state (maximally entangled state)
qc.h(0)           # Hadamard gate on qubit 0
qc.cx(0, 1)       # CNOT gate (creates entanglement between qubit 0 and 1)

# Measure qubits
qc.measure(0, 0)  # Measure qubit 0 into classical bit 0
qc.measure(1, 1)  # Measure qubit 1 into classical bit 1

print("\nCircuit:")
print(qc.draw(output='text'))

# ====================================================================
# STEP 2: Set Up IBM Quantum Account
# ====================================================================
print("\n" + "="*60)
print("IBM Quantum Account Setup")
print("="*60)

# FIRST TIME SETUP: Uncomment and add your token
# Get your token from: https://quantum.cloud.ibm.com/account
# QiskitRuntimeService.save_account(
#     channel="ibm_quantum",
#     token="YOUR_IBM_QUANTUM_TOKEN_HERE",
#     overwrite=True
# )

try:
    # Load saved account
    service = QiskitRuntimeService(channel="ibm_quantum")
    print("✓ Successfully connected to IBM Quantum!")
    
except Exception as e:
    print(f"✗ Error connecting to IBM Quantum: {e}")
    print("\nTo connect to IBM Quantum:")
    print("1. Create a free account at: https://quantum.cloud.ibm.com/")
    print("2. Get your API token from: https://quantum.cloud.ibm.com/account")
    print("3. Uncomment the save_account() code above and add your token")
    print("\nFor now, running on local simulator...")
    
    # Fallback to local simulator
    from qiskit.primitives import StatevectorSampler
    sampler = StatevectorSampler()
    job = sampler.run([qc], shots=1024)
    result = job.result()
    counts = result[0].data.meas.get_counts()
    
    print(f"\nLocal Simulator Results: {counts}")
    print("\nExpected: ~50% '00' and ~50% '11' (entangled state)")
    exit(0)

# ====================================================================
# STEP 3: Select a Backend (Quantum Computer or Simulator)
# ====================================================================
print("\n" + "="*60)
print("Available Backends")
print("="*60)

# Option A: Use a simulator (recommended for testing)
print("\n[OPTION A] Using IBM Cloud Simulator (free, instant)")
backend = service.backend("ibmq_qasm_simulator")

# Option B: Use real quantum hardware (uncomment to use)
# print("\n[OPTION B] Finding least busy real quantum computer...")
# backend = service.least_busy(operational=True, simulator=False)

print(f"\nSelected Backend: {backend.name}")
print(f"Qubits: {backend.num_qubits}")
print(f"Status: {backend.status().status_msg}")

# ====================================================================
# STEP 4: Run the Circuit
# ====================================================================
print("\n" + "="*60)
print("Running Circuit")
print("="*60)

# Transpile and run
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager

pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
transpiled_qc = pm.run(qc)

print(f"\nOriginal circuit depth: {qc.depth()}")
print(f"Transpiled circuit depth: {transpiled_qc.depth()}")

# Run with Sampler
sampler = SamplerV2(backend=backend)
job = sampler.run([transpiled_qc], shots=1024)

print(f"\nJob submitted!")
print(f"Job ID: {job.job_id()}")
print(f"Job Status: {job.status()}")

# Wait for results
print("\nWaiting for results...")
result = job.result()
counts = result[0].data.meas.get_counts()

# ====================================================================
# STEP 5: Display Results
# ====================================================================
print("\n" + "="*60)
print("Results")
print("="*60)

print(f"\nMeasurement Counts: {counts}")
print("\nExpected for Bell State:")
print("  ~50% |00⟩ (both qubits in state 0)")
print("  ~50% |11⟩ (both qubits in state 1)")
print("  ~0%  |01⟩ or |10⟩ (qubits are entangled!)")

# Calculate percentages
total = sum(counts.values())
print("\nActual Distribution:")
for state, count in sorted(counts.items()):
    percentage = (count / total) * 100
    bar = "█" * int(percentage / 2)
    print(f"  |{state}⟩: {count:4d} ({percentage:5.1f}%) {bar}")

# Optional: Plot histogram (uncomment if you want visual output)
# plt.figure(figsize=(10, 6))
# plot_histogram(counts)
# plt.title("Measurement Results: Bell State Circuit")
# plt.savefig('ibm_quantum_results.png')
# print("\n✓ Histogram saved as 'ibm_quantum_results.png'")

print("\n" + "="*60)
print("✓ Successfully ran quantum circuit on IBM Quantum!")
print("="*60)
