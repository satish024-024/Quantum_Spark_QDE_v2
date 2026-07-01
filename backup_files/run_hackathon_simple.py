#!/usr/bin/env python3
"""
Simple runner for the original Hackathon Dashboard
"""

import os
import sys

def main():
    print("🚀 Quantum Spark - Original Hackathon Dashboard")
    print("=" * 50)
    print("📱 Amravati Quantum Hackathon Dashboard")
    print("🎯 Simple version with all original features")
    print("🌐 Will run on: http://localhost:10000")
    print("=" * 50)
    
    # Run the simple hackathon app
    os.system("python hackathon_app.py")

if __name__ == "__main__":
    main()
