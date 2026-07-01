#!/usr/bin/env python3
"""
Launch Production Dashboard
Quick launcher for the Quantum Nexus Production Dashboard
"""

import webbrowser
import time
import subprocess
import sys
import os
import threading

def launch_production_dashboard():
    """Launch the production dashboard with automatic browser opening"""
    print("🚀 Launching Quantum Nexus Production Dashboard...")
    print("=" * 60)
    
    # Check if server is already running
    try:
        import requests
        response = requests.get("http://localhost:10000", timeout=2)
        if response.status_code == 200:
            print("✅ Server is already running!")
            open_dashboard()
            return
    except:
        pass
    
    print("🔧 Starting Flask server...")
    
    # Start the Flask server in a separate thread
    def start_server():
        try:
            subprocess.run([sys.executable, "hybrid_quantum_app.py"], 
                         cwd=os.path.dirname(os.path.abspath(__file__)))
        except Exception as e:
            print(f"❌ Error starting server: {e}")
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    for i in range(30):  # Wait up to 30 seconds
        try:
            import requests
            response = requests.get("http://localhost:10000", timeout=1)
            if response.status_code == 200:
                print("✅ Server started successfully!")
                break
        except:
            time.sleep(1)
            print(f"⏳ Waiting... ({i+1}/30)")
    else:
        print("❌ Server failed to start within 30 seconds")
        return
    
    # Open the production dashboard
    open_dashboard()

def open_dashboard():
    """Open the production dashboard in the browser"""
    dashboard_url = "http://localhost:10000/production-dashboard"
    print(f"🌐 Opening dashboard: {dashboard_url}")
    
    try:
        webbrowser.open(dashboard_url)
        print("✅ Dashboard opened in browser!")
    except Exception as e:
        print(f"❌ Error opening browser: {e}")
        print(f"Please manually open: {dashboard_url}")
    
    print("\n🎯 Production Dashboard Features:")
    print("• Modern gray theme with advanced animations")
    print("• Real-time IBM Quantum data integration")
    print("• 10+ interactive quantum computing widgets")
    print("• AI assistant for quantum computing help")
    print("• 3D visualizations (Bloch sphere, circuits)")
    print("• Performance monitoring and analytics")
    
    print("\n📋 Quick Access URLs:")
    print(f"• Production Dashboard: {dashboard_url}")
    print("• Hackathon Dashboard: http://localhost:10000/dashboard")
    print("• Advanced Dashboard: http://localhost:10000/advanced")
    
    print("\n🔧 Server Controls:")
    print("• Press Ctrl+C to stop the server")
    print("• Server will run in the background")
    
    print("\n" + "=" * 60)
    print("🎉 Production Dashboard is ready!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        launch_production_dashboard()
        
        # Keep the script running
        print("\n🔄 Server is running... Press Ctrl+C to stop")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down server...")
        print("✅ Goodbye!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Please check the server logs for more details.")
