# Quantum Circuit Generation and Job Retrieval Instructions

This folder contains scripts to generate quantum circuits, run them on IBM Quantum hardware, and retrieve job details.

## 1. Running a Quantum Circuit

To run a basic quantum circuit (Bell State) on a real IBM Quantum computer:

1.  Open a terminal in this folder.
2.  Run the following command:
    ```bash
    python run_quantum_circuit.py
    ```
3.  The script will:
    *   Connect to IBM Quantum using your saved credentials.
    *   Select the least busy real quantum backend (e.g., `ibm_fez`).
    *   Generate a 3-qubit Bell state circuit.
    *   Transpile (optimize) the circuit for the hardware.
    *   Submit the job and wait for results.
    *   Display the measurement counts and entanglement fidelity.

## 2. Retrieving Job Details

The `run_quantum_circuit.py` script automatically retrieves and displays job details upon completion. 

To retrieve details for a *past* job, you can use the following Python snippet (create a new file e.g., `get_job.py`):

```python
from qiskit_ibm_runtime import QiskitRuntimeService

# Connect
service = QiskitRuntimeService(channel="ibm_cloud", instance="YOUR_CRN")

# Retrieve Job
job_id = "YOUR_JOB_ID"  # Replace with the Job ID from your previous run
job = service.job(job_id)

# Display Details
print(f"Job ID: {job.job_id()}")
print(f"Status: {job.status()}")
print(f"Backend: {job.backend().name}")
print(f"Creation Date: {job.creation_date}")

# Get Results (if done)
if job.status() == 'DONE':
    result = job.result()
    print("Results:", result[0].data.c.get_counts())
```

## 3. Files in this Folder

*   **`run_quantum_circuit.py`**: Main script to run a simple quantum circuit.
*   **`run_ibm_demo.py`**: A more advanced demo showing a GHZ state.
*   **`example_ibm_quantum.py`**: Another example script.
*   **`README.md`**: General Qiskit documentation.
*   **`docs/`**: Detailed Qiskit documentation.

## 4. Troubleshooting

*   **Import Errors**: Ensure you are running the script from this folder and that `qiskit` is installed (`pip install qiskit qiskit-ibm-runtime`).
*   **Connection Errors**: Check your API Token and CRN in the script.
*   **Job Failures**: Check the IBM Quantum dashboard for detailed error messages if a job fails.
