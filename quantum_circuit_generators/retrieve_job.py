"""
Retrieve IBM Quantum Job Details
================================
Retrieves status and results for a specific Job ID.
"""

from qiskit_ibm_runtime import QiskitRuntimeService
import sys

# ====================================================================
# CONFIGURATION
# ====================================================================
# Your CRN (Cloud Resource Name)
CRN = "crn:v1:bluemix:public:quantum-computing:us-east:a/588869f092d145deb52aba6e93a1ccf2:5e4846a1-46e0-48a7-9714-fcb30cc0b4be::"

def get_job_details(job_id):
    print(f"\nSearching for Job ID: {job_id}...")
    
    try:
        # Connect to service
        service = QiskitRuntimeService(channel="ibm_cloud", instance=CRN)
        
        # Retrieve job
        job = service.job(job_id)
        
        print("\n" + "="*50)
        print("  JOB DETAILS")
        print("="*50)
        print(f"ID:        {job.job_id()}")
        print(f"Status:    {job.status()}")
        print(f"Backend:   {job.backend().name}")
        print(f"Created:   {job.creation_date}")
        
        # Get metrics if available
        if hasattr(job, 'metrics') and job.metrics():
            print(f"Quantum Time: {job.metrics().get('usage', {}).get('quantum_seconds', 'N/A')} s")

        # Get results if done
        if job.status() == 'DONE':
            print("\n" + "-"*50)
            print("  RESULTS")
            print("-"*50)
            result = job.result()
            # Try to get counts from the first register (usually 'c' or 'meas')
            try:
                # Inspect available data attributes
                data = result[0].data
                # Try common register names
                if hasattr(data, 'c'):
                    counts = data.c.get_counts()
                elif hasattr(data, 'meas'):
                    counts = data.meas.get_counts()
                else:
                    # Fallback: print available attributes
                    print(f"Could not auto-detect register. Available data: {dir(data)}")
                    return

                print("Measurement Counts:")
                total = sum(counts.values())
                sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                
                for state, count in sorted_counts:
                    percentage = (count / total) * 100
                    bar = "█" * int(percentage / 2)
                    print(f"|{state}⟩: {count:4d} ({percentage:5.1f}%) {bar}")
                    
            except Exception as e:
                print(f"Could not parse results: {e}")
                
        elif job.status() == 'ERROR':
            print(f"\nError Message: {job.error_message()}")
            
    except Exception as e:
        print(f"\n✗ Error retrieving job: {e}")

if __name__ == "__main__":
    # Check if Job ID is passed as argument
    if len(sys.argv) > 1:
        job_id = sys.argv[1]
    else:
        print("\n--- IBM Quantum Job Retriever ---")
        job_id = input("Enter Job ID to retrieve: ").strip()
    
    if job_id:
        get_job_details(job_id)
    else:
        print("No Job ID provided.")
