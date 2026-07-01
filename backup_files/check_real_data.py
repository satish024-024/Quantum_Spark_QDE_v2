#!/usr/bin/env python3
"""
Simple test to check if API is returning REAL data or MOCK data
"""

import requests
import json

def check_real_vs_mock_data():
    """Check if API is returning real IBM Quantum data or mock data"""
    base_url = "http://localhost:10000"
    
    print("🔍 CHECKING REAL vs MOCK DATA")
    print("=" * 40)
    
    # Test 1: Dashboard metrics (currently returns hardcoded values)
    print("\n1. Dashboard Metrics:")
    try:
        response = requests.get(f"{base_url}/api/dashboard_metrics", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   📊 Received: {data}")
            
            # Check if these are the known hardcoded values
            if (data.get('total_jobs') == 15 and 
                data.get('active_backends') == 4 and 
                data.get('running_jobs') == 2):
                print("   ❌ MOCK DATA: These are hardcoded demo values!")
                print("   💡 Real data would have different numbers")
            else:
                print("   ✅ REAL DATA: Values look authentic")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Backends data
    print("\n2. Quantum Backends:")
    try:
        response = requests.get(f"{base_url}/api/backends", timeout=15)
        if response.status_code == 200:
            backends = response.json()
            if isinstance(backends, list) and backends:
                print(f"   🌐 Found {len(backends)} backends:")
                for i, backend in enumerate(backends[:3]):
                    name = backend.get('name', 'Unknown')
                    status = backend.get('status', 'Unknown')
                    print(f"      - {name}: {status}")
                
                # Check for real IBM backend names
                real_backend_names = ['ibmq_qasm_simulator', 'ibm_nairobi', 'ibm_oslo', 'ibm_lagos', 'ibm_kyoto', 'ibm_brisbane']
                has_real_backends = any(name in str(backends) for name in real_backend_names)
                
                if has_real_backends:
                    print("   ✅ REAL DATA: Found actual IBM Quantum backends!")
                else:
                    print("   ❌ MOCK DATA: No real IBM backend names found")
                    print("   💡 Real backends would have names like 'ibmq_qasm_simulator', 'ibm_nairobi'")
            else:
                print("   📭 No backends data (empty or offline mode)")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Jobs data
    print("\n3. Quantum Jobs:")
    try:
        response = requests.get(f"{base_url}/api/jobs", timeout=15)
        if response.status_code == 200:
            jobs = response.json()
            if isinstance(jobs, list) and jobs:
                print(f"   📋 Found {len(jobs)} jobs:")
                for i, job in enumerate(jobs[:2]):  # Show first 2 jobs
                    job_id = job.get('job_id', 'Unknown')
                    status = job.get('status', 'Unknown')
                    backend = job.get('backend', 'Unknown')
                    print(f"      - Job {job_id}: {status} on {backend}")
                
                # Check if jobs have real IBM job ID format
                has_real_job_ids = any('c' in str(job.get('job_id', '')) for job in jobs)
                if has_real_job_ids:
                    print("   ✅ REAL DATA: Found actual IBM job IDs!")
                else:
                    print("   ❌ MOCK DATA: No real IBM job ID format found")
                    print("   💡 Real IBM job IDs typically contain letters/numbers like 'c123abc456'")
            else:
                print("   📭 No jobs data")
        elif response.status_code in [401, 403]:
            print("   🔐 Requires authentication")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Check authentication status
    print("\n4. Authentication Status:")
    try:
        response = requests.get(f"{base_url}/api/database_stats", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   📊 Database stats: {data}")
        else:
            print(f"   ❌ Database stats failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 40)
    print("🎯 SUMMARY:")
    print("=" * 40)
    print("✅ If you see REAL DATA messages above:")
    print("   - Your API is connected to IBM Quantum")
    print("   - You have valid credentials configured")
    print("   - You're getting actual quantum computing data")
    print()
    print("❌ If you see MOCK DATA messages above:")
    print("   - Your API is running in demo/offline mode")
    print("   - You need to add valid IBM Quantum credentials")
    print("   - Register/login and add your API token")
    print()
    print("💡 To get REAL data:")
    print("   1. Go to: http://localhost:10000/auth")
    print("   2. Register with your IBM Quantum API token")
    print("   3. Get token from: https://quantum-computing.ibm.com/account")

if __name__ == "__main__":
    try:
        check_real_vs_mock_data()
    except KeyboardInterrupt:
        print("\n⏹️  Check interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
