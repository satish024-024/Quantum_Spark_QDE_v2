#!/usr/bin/env python3
"""
IBM Quantum API Key Debugging Script
Test your IBM Quantum API key to identify connection issues
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_api_key():
    """Test IBM Quantum API key connectivity"""
    print("🔍 IBM Quantum API Key Diagnostic Tool")
    print("=" * 50)

    # Get API key from user
    api_key = input("Enter your IBM Quantum API key: ").strip()

    if not api_key:
        print("❌ No API key provided")
        return

    # Mask the API key for security
    masked_key = api_key[:8] + "..." + api_key[-4:] if len(api_key) > 12 else api_key
    print(f"🔑 Testing API key: {masked_key}")
    print()

    try:
        print("1. Testing qiskit-ibm-runtime import...")
        from qiskit_ibm_runtime import QiskitRuntimeService
        print("   ✅ qiskit-ibm-runtime imported successfully")
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        print("   💡 Install with: pip install qiskit-ibm-runtime")
        return

    try:
        print("\n2. Testing IBM Quantum service connection...")
        service = QiskitRuntimeService(channel="ibm_quantum", token=api_key)
        print("   ✅ Service connection successful")
    except Exception as e:
        print(f"   ❌ Service connection failed: {e}")
        print("\n🔧 Possible issues:")
        print("   • API key is incorrect or expired")
        print("   • Network connectivity issues")
        print("   • IBM Quantum service is down")
        print("   • Account has insufficient permissions")
        return

    try:
        print("\n3. Testing backend availability...")
        backends = service.backends()
        print(f"   ✅ Found {len(backends)} available backends")

        # Show some backend info
        print("\n   Available backends:")
        for i, backend in enumerate(backends[:5]):  # Show first 5
            print(f"   • {backend.name} (status: {backend.status()})")

        if len(backends) > 5:
            print(f"   • ... and {len(backends) - 5} more")

    except Exception as e:
        print(f"   ❌ Backend query failed: {e}")
        return

    try:
        print("\n4. Testing job history access...")
        jobs = service.jobs(limit=1)
        print(f"   ✅ Job history access successful (found {len(jobs)} recent jobs)")
    except Exception as e:
        print(f"   ❌ Job history access failed: {e}")
        print("   ⚠️  This might indicate account permission issues")

    print("\n🎉 API Key Test Results:")
    print("   ✅ API key is valid")
    print("   ✅ IBM Quantum service connection works")
    print("   ✅ Backend access is functional")
    print("   ✅ Ready for quantum experiments!")

    print("\n💡 Next steps:")
    print("   1. Your API key is working correctly")
    print("   2. Check that the key is properly entered in the web interface")
    print("   3. Ensure your account has sufficient compute credits")
    print("   4. Try accessing http://localhost:10000/quantum-research")

def test_provider_connection():
    """Test using the older IBMProvider (if qiskit-ibm-runtime fails)"""
    print("\n🔄 Testing alternative IBM Quantum connection method...")

    api_key = input("Enter your IBM Quantum API key again: ").strip()

    if not api_key:
        return

    try:
        print("1. Testing qiskit-ibm-provider import...")
        from qiskit_ibm_provider import IBMProvider
        print("   ✅ qiskit-ibm-provider imported successfully")
    except ImportError as e:
        print(f"   ❌ Import failed: {e}")
        print("   💡 Install with: pip install qiskit-ibm-provider")
        return

    try:
        print("\n2. Testing provider connection...")
        provider = IBMProvider(token=api_key)
        print("   ✅ Provider connection successful")
    except Exception as e:
        print(f"   ❌ Provider connection failed: {e}")
        print("\n🔧 Common IBM Provider issues:")
        print("   • API key format might be incorrect")
        print("   • Account might need to accept terms of service")
        print("   • IBM Cloud account might need verification")
        return

    try:
        print("\n3. Testing backend access...")
        backends = provider.backends()
        print(f"   ✅ Found {len(backends)} backends")

        # Show some backend info
        for backend in backends[:3]:
            print(f"   • {backend.name}: {backend.status().backend_state}")

    except Exception as e:
        print(f"   ❌ Backend access failed: {e}")

def main():
    """Main diagnostic function"""
    print("🔧 IBM Quantum API Key Diagnostic Tool")
    print("=" * 50)
    print("This tool will help you troubleshoot IBM Quantum API key issues")
    print()

    choice = input("Choose test method:\n1. QiskitRuntimeService (recommended)\n2. IBMProvider (alternative)\n3. Both\nEnter choice (1-3): ").strip()

    if choice == "1" or choice == "3":
        test_api_key()

    if choice == "2" or choice == "3":
        test_provider_connection()

    print("\n" + "=" * 50)
    print("📞 Need help?")
    print("   • Check IBM Quantum dashboard: https://quantum-computing.ibm.com/")
    print("   • Verify API key in Account settings")
    print("   • Ensure account has available compute credits")
    print("   • Check network connectivity to IBM services")

if __name__ == "__main__":
    main()
