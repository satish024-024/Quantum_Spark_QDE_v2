#!/usr/bin/env python3
"""
Cleanup Test Users
Removes test users from the database
"""

import sqlite3

def cleanup_test_users():
    """Clean up test users"""
    conn = sqlite3.connect('quantum_data.db')
    cursor = conn.cursor()
    
    # Remove test users
    test_emails = [
        "test@example.com",
        "quicktest@example.com",
        "testuser@example.com"
    ]
    
    for email in test_emails:
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        print(f"Cleaned up user: {email}")
    
    conn.commit()
    conn.close()
    print("✅ Test users cleaned up")

if __name__ == "__main__":
    cleanup_test_users()
