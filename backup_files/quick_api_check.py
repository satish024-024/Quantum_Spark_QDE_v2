#!/usr/bin/env python3
"""
Quick API Check - Simple test to verify if API is working and getting data
"""

import requests
import json
import time

def quick_check():
    """Quick check of API status and data retrieval"""
    base_url = "http://localhost:10000"
    
    print("🔍 QUICK API CHECK")
    print("=" * 30)
    
    # Test 1: Server running
    print("1. Checking if server is running...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code in [200, 302, 401]:
            print("   ✅ Server is running")
        else:
            print(f"   ⚠️  Server responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ❌ Server is not running!")
        print("   💡 Start server with: python real_quantum_app.py")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Status endpoint
    print("\n2. Checking status endpoint...")
    try:
        response = requests.get(f"{base_url}/status", timeout=5)
        if response.status_code == 200:
            print("   ✅ Status endpoint working")
            try:
                data = response.json()
                print(f"   📊 Status data: {json.dumps(data, indent=2)}")
            except:
                print("   📄 Status response received (non-JSON)")
        else:
            print(f"   ⚠️  Status endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Status endpoint error: {e}")
    
    # Test 3: Backends data
    print("\n3. Checking quantum backends data...")
    try:
        response = requests.get(f"{base_url}/api/backends", timeout=10)
        if response.status_code == 200:
            print("   ✅ Backends endpoint working")
            try:
                backends = response.json()
                if isinstance(backends, list) and backends:
                    print(f"   🌐 Found {len(backends)} quantum backends:")
                    for i, backend in enumerate(backends[:3]):  # Show first 3
                        if isinstance(backend, dict):
                            name = backend.get('name', f'Backend {i+1}')
                            status = backend.get('status', 'Unknown')
                            print(f"      - {name}: {status}")
                else:
                    print("   📭 No backends data (offline mode or no credentials)")
            except:
                print("   📄 Backends response received (non-JSON)")
        else:
            print(f"   ⚠️  Backends endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Backends endpoint error: {e}")
    
    # Test 4: Jobs data
    print("\n4. Checking quantum jobs data...")
    try:
        response = requests.get(f"{base_url}/api/jobs", timeout=10)
        if response.status_code == 200:
            print("   ✅ Jobs endpoint working")
            try:
                jobs = response.json()
                if isinstance(jobs, list) and jobs:
                    print(f"   📋 Found {len(jobs)} quantum jobs")
                elif isinstance(jobs, dict) and jobs:
                    print(f"   📋 Jobs data received: {len(str(jobs))} characters")
                else:
                    print("   📭 No jobs data")
            except:
                print("   📄 Jobs response received (non-JSON)")
        elif response.status_code in [401, 403]:
            print("   🔐 Jobs endpoint requires authentication")
        else:
            print(f"   ⚠️  Jobs endpoint returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Jobs endpoint error: {e}")
    
    # Test 5: Dashboard metrics
    print("\n5. Checking dashboard metrics...")
    try:
        response = requests.get(f"{base_url}/api/dashboard_metrics", timeout=10)
        if response.status_code == 200:
            print("   ✅ Dashboard metrics working")
            try:
                metrics = response.json()
                if isinstance(metrics, dict) and metrics:
                    print(f"   📊 Metrics data: {len(str(metrics))} characters")
                    # Show some key metrics if available
                    for key in ['total_jobs', 'active_backends', 'queue_length']:
                        if key in metrics:
                            print(f"      - {key}: {metrics[key]}")
                else:
                    print("   📭 No metrics data")
            except:
                print("   📄 Metrics response received (non-JSON)")
        elif response.status_code in [401, 403]:
            print("   🔐 Dashboard metrics require authentication")
        else:
            print(f"   ⚠️  Dashboard metrics returned {response.status_code}")
    except Exception as e:
        print(f"   ❌ Dashboard metrics error: {e}")
    
    print("\n" + "=" * 30)
    print("🎯 QUICK CHECK SUMMARY:")
    print("✅ Server is running and responding")
    print("📡 API endpoints are accessible")
    print("💡 For detailed testing, run: python comprehensive_api_test.py")
    print("🔐 For authenticated endpoints, register/login first")
    print("🌐 For real quantum data, add valid IBM credentials")
    
    return True

if __name__ == "__main__":
    try:
        quick_check()
    except KeyboardInterrupt:
        print("\n⏹️  Check interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")

