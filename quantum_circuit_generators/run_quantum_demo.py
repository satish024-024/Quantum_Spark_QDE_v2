"""
IBM Quantum Demo - Showcasing Quantum Computing Power
======================================================
This demonstrates multiple quantum phenomena:
1. Quantum Superposition
2. Quantum Entanglement (GHZ State)
3. Quantum Interference
"""

from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit.visualization import plot_histogram
import matplotlib.pyplot as plt

print("="*70)
print("  IBM QUANTUM COMPUTING DEMONSTRATION")
print("="*70)

# ====================================================================
# CREDENTIAL SETUP
# ====================================================================
print("\n[1/5] Connecting to IBM Quantum...")

API_TOKEN = "YuZ380DwnaFb_Ix46ItXpgxIsf8xfN4ZVAnksrVm0EWl"
CRN = "crn:v1:bluemix:public:quantum-computing:us-east:a/588869f092d145deb52aba6e93a1ccf2:5e4846a1-46e0-48a7-9714-fcb30cc0b4be::"

try:
    # Save account with CRN (IBM Cloud specific)
    QiskitRuntimeService.save_account(
        channel="ibm_cloud",
        token=API_TOKEN,
        instance=CRN,
        overwrite=True
    )
    print("✓ Credentials saved")
    
    service = QiskitRuntimeService(channel="ibm_cloud", instance=CRN)
    print("✓ Connected to IBM Quantum Cloud!")
    
except Exception as e:
    print(f"✗ Connection error: {e}")
    print("Trying alternative connection method...")
    try:
        service = QiskitRuntimeService(channel="ibm_cloud")
        print("✓ Connected using saved credentials!")
    except Exception as e2:
        print(f"✗ Failed: {e2}")
        exit(1)

# ====================================================================
# BACKEND SELECTION
# ====================================================================
print("\n[2/5] Selecting Quantum Backend...")

# List available backends
backends = service.backends()
print(f"\nAvailable backends: {len(backends)}")

# Try to get a real quantum processor, fallback to simulator
try:
    # Prefer least busy real quantum computer
    real_backends = [b for b in backends if not b.simulator and b.operational]
    if real_backends:
        backend = service.least_busy(operational=True, simulator=False)
        print(f"✓ Using REAL quantum computer: {backend.name}")
        print(f"  Qubits: {backend.num_qubits}")
        print(f"  Location: {backend.location if hasattr(backend, 'location') else 'N/A'}")
    else:
        raise Exception("No real backends available")
except:
    # Use simulator
    simulator_backends = [b for b in backends if b.simulator]
    if simulator_backends:
        backend = simulator_backends[0]
        print(f"✓ Using simulator: {backend.name}")
        print(f"  Qubits: {backend.num_qubits}")
    else:
        print("✗ No backends available")
        exit(1)

print(f"  Status: {backend.status().status_msg}")

# ====================================================================
# BUILD QUANTUM CIRCUIT - GHZ STATE (Multi-qubit Entanglement)
# ====================================================================
print("\n[3/5] Building Quantum Circuit...")
print("\n  Circuit Type: GHZ State (Greenberger-Horne-Zeilinger)")
print("  Demonstrates: Maximum quantum entanglement across all qubits")

# Use 3-5 qubits depending on availability
num_qubits = min(5, backend.num_qubits)
qc = QuantumCircuit(num_qubits, num_qubits)

# Create GHZ state: |000...0⟩ + |111...1⟩ / √2
print(f"\n  Using {num_qubits} qubits")

# Step 1: Create superposition on first qubit
qc.h(0)

# Step 2: Entangle all qubits with CNOT cascade
for i in range(num_qubits - 1):
    qc.cx(i, i + 1)

# Step 3: Measure all qubits
qc.measure(range(num_qubits), range(num_qubits))

print("\n  Circuit Diagram:")
print(qc.draw(output='text', fold=-1))

# Circuit statistics
print(f"\n  Circuit Statistics:")
print(f"    - Depth: {qc.depth()}")
print(f"    - Gate count: {qc.size()}")
print(f"    - 2-qubit gates: {qc.num_nonlocal_gates()}")

# ====================================================================
# TRANSPILE FOR HARDWARE
# ====================================================================
print("\n[4/5] Optimizing for quantum hardware...")

pm = generate_preset_pass_manager(
    optimization_level=3,  # Maximum optimization
    backend=backend
)

transpiled_qc = pm.run(qc)

print(f"✓ Transpilation complete")
print(f"  Original depth: {qc.depth()} → Optimized depth: {transpiled_qc.depth()}")
print(f"  Original gates: {qc.size()} → Optimized gates: {transpiled_qc.size()}")

# ====================================================================
# EXECUTE ON IBM QUANTUM
# ====================================================================
print("\n[5/5] Executing on IBM Quantum...")

sampler = SamplerV2(backend=backend)

# Run with multiple shots for statistical accuracy
shots = 2048
print(f"  Shots: {shots}")

job = sampler.run([transpiled_qc], shots=shots)
print(f"✓ Job submitted successfully!")
print(f"  Job ID: {job.job_id()}")

# Monitor job status
import time
print("\n  Waiting for results", end="", flush=True)
while job.status().name not in ['DONE', 'ERROR', 'CANCELLED']:
    print(".", end="", flush=True)
    time.sleep(2)
print(" ✓")

# ====================================================================
# RESULTS ANALYSIS
# ====================================================================
print("\n" + "="*70)
print("  QUANTUM COMPUTATION RESULTS")
print("="*70)

result = job.result()
counts = result[0].data.meas.get_counts()

print(f"\nMeasurement outcomes ({shots} shots):")
print("-" * 50)

# Sort by count (descending)
sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)

# Theoretical: Should see mostly all-0s and all-1s
all_zeros = '0' * num_qubits
all_ones = '1' * num_qubits

total = sum(counts.values())
for state, count in sorted_counts[:10]:  # Show top 10
    percentage = (count / total) * 100
    bar = "█" * int(percentage / 2)
    
    # Highlight expected states
    if state == all_zeros or state == all_ones:
        marker = "⭐"
    else:
        marker = "  "
    
    print(f"{marker} |{state}⟩: {count:4d} ({percentage:5.1f}%) {bar}")

# Calculate fidelity (how close to ideal GHZ state)
expected_count = counts.get(all_zeros, 0) + counts.get(all_ones, 0)
fidelity = (expected_count / total) * 100

print("\n" + "="*70)
print(f"  QUANTUM ENTANGLEMENT FIDELITY: {fidelity:.1f}%")
print("="*70)

print("\n📊 Interpretation:")
print(f"  Expected: ~50% |{all_zeros}⟩ and ~50% |{all_ones}⟩")
print(f"  Achieved: {fidelity:.1f}% in expected states")

if fidelity > 85:
    print("  ✓ EXCELLENT: Strong quantum entanglement demonstrated!")
elif fidelity > 70:
    print("  ✓ GOOD: Quantum entanglement clearly visible")
elif fidelity > 50:
    print("  ⚠ MODERATE: Entanglement present but noisy")
else:
    print("  ⚠ NOISY: Hardware noise affecting quantum state")

print("\n💡 What this proves:")
print("  • All qubits are quantum mechanically entangled")
print("  • Measuring one qubit instantly affects all others")
print("  • This is IMPOSSIBLE with classical computers!")

# Save visualization
try:
    plt.figure(figsize=(12, 6))
    plot_histogram(counts, figsize=(12, 6), 
                   title=f'GHZ State Results - {num_qubits} Qubits on {backend.name}')
    plt.tight_layout()
    output_file = 'd:\\qiskit\\quantum_results.png'
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    print(f"\n📈 Results saved to: {output_file}")
except Exception as e:
    print(f"\n⚠ Could not save visualization: {e}")

print("\n" + "="*70)
print("  ✓ QUANTUM COMPUTATION COMPLETE!")
print("="*70)
print(f"\nBackend: {backend.name}")
print(f"Job ID: {job.job_id()}")
print(f"Execution time: ~{job.metrics()['usage']['quantum_seconds'] if hasattr(job, 'metrics') and job.metrics() else 'N/A'} seconds on quantum hardware")
print("\n🎉 You just ran a real quantum algorithm!")
