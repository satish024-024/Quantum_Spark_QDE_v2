"""
Simple Quantum Circuit - IBM Quantum Demo
==========================================
Runs a basic quantum circuit on IBM Quantum hardware
"""

from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
import time

print("="*70)
print("  IBM QUANTUM COMPUTER - QUANTUM CIRCUIT EXECUTION")
print("="*70)

# ====================================================================
# CREDENTIALS
# ====================================================================
API_TOKEN = "YuZ380DwnaFb_Ix46ItXpgxIsf8xfN4ZVAnksrVm0EWl"
CRN = "crn:v1:bluemix:public:quantum-computing:us-east:a/588869f092d145deb52aba6e93a1ccf2:5e4846a1-46e0-48a7-9714-fcb30cc0b4be::"

# ====================================================================
# CONNECT TO IBM QUANTUM
# ====================================================================
print("\n[1/4] Connecting to IBM Quantum Cloud...")

try:
    QiskitRuntimeService.save_account(
        channel="ibm_cloud",
        token=API_TOKEN,
        instance=CRN,
        overwrite=True
    )
    service = QiskitRuntimeService(channel="ibm_cloud", instance=CRN)
    print("✓ Successfully connected to IBM Quantum!")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# ====================================================================
# SELECT BACKEND
# ====================================================================
print("\n[2/4] Selecting quantum backend...")

backends = service.backends()
print(f"Available backends: {len(backends)}")

# Try to get a real quantum computer
try:
    real_backends = [b for b in backends if not b.simulator and b.operational]
    if real_backends:
        backend = service.least_busy(operational=True, simulator=False)
        print(f"✓ Using REAL quantum computer: {backend.name}")
    else:
        # Fallback to simulator
        backend = service.backend("ibmq_qasm_simulator")
        print(f"✓ Using simulator: {backend.name}")
except Exception as e:
    print(f"⚠ Error selecting backend: {e}")
    # Use first available
    backend = backends[0]
    print(f"✓ Using: {backend.name}")

print(f"  - Qubits: {backend.num_qubits}")
print(f"  - Status: {backend.status().status_msg}")

# ====================================================================
# BUILD QUANTUM CIRCUIT
# ====================================================================
print("\n[3/4] Building quantum circuit...")

# Create a simple 3-qubit Bell state circuit
qc = QuantumCircuit(3, 3)

# Create superposition
qc.h(0)

# Create entanglement
qc.cx(0, 1)
qc.cx(1, 2)

# Measure
qc.measure([0, 1, 2], [0, 1, 2])

print("\nCircuit diagram:")
print(qc.draw(output='text'))

print(f"\nCircuit stats:")
print(f"  - Depth: {qc.depth()}")
print(f"  - Gates: {qc.size()}")

# ====================================================================
# TRANSPILE AND EXECUTE
# ====================================================================
print("\n[4/4] Running on IBM Quantum...")

# Transpile for hardware
pm = generate_preset_pass_manager(optimization_level=3, backend=backend)
transpiled_qc = pm.run(qc)

print(f"✓ Circuit optimized (depth: {qc.depth()} → {transpiled_qc.depth()})")

# Execute
sampler = SamplerV2(mode=backend)
job = sampler.run([transpiled_qc], shots=1024)

print(f"✓ Job submitted!")
print(f"  Job ID: {job.job_id()}")
print(f"  Backend: {backend.name}")

# Wait for completion
print("\n  Waiting for results", end="", flush=True)
while job.status() not in ['DONE', 'ERROR', 'CANCELLED']:
    print(".", end="", flush=True)
    time.sleep(2)
print(" ✓")

# ====================================================================
# RESULTS
# ====================================================================
print("\n" + "="*70)
print("  RESULTS")
print("="*70)

if job.status() == 'DONE':
    result = job.result()
    # Access data using the classical register name 'c'
    counts = result[0].data.c.get_counts()
    
    print("\nMeasurement outcomes:")
    print("-" * 40)
    
    total = sum(counts.values())
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    
    for state, count in sorted_counts[:8]:
        percentage = (count / total) * 100
        bar = "█" * int(percentage / 2)
        print(f"|{state}⟩: {count:4d} ({percentage:5.1f}%) {bar}")
    
    # Expected states for Bell-like state: |000⟩ and |111⟩
    expected = counts.get('000', 0) + counts.get('111', 0)
    fidelity = (expected / total) * 100
    
    print(f"\n✓ Quantum entanglement fidelity: {fidelity:.1f}%")
    
    print("\n" + "="*70)
    print("  ✓ QUANTUM COMPUTATION COMPLETE!")
    print("="*70)
    print(f"\nJob ID: {job.job_id()}")
    print(f"Backend: {backend.name}")
    print("\n🎉 Successfully ran quantum circuit on IBM Quantum!")
    
else:
    print(f"✗ Job failed: {job.status()}")
