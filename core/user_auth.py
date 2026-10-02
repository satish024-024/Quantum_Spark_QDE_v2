"""
Robust User Authentication System for Quantum Jobs Tracker
Handles user registration, login, and IBM Quantum credential management
"""

import jwt
import hashlib
import sqlite3
import time
import secrets
from datetime import datetime, timedelta
from flask import request, jsonify, session
import os

class UserAuthSystem:
    def __init__(self, secret_key=None):
        self.secret_key = secret_key or secrets.token_hex(32)
        db_url = os.environ.get('DATABASE_URL')
        if db_url and db_url.startswith('sqlite://'):
            self.db_path = db_url.replace('sqlite:///', '').replace('sqlite://', '')
        elif os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
            self.db_path = '/tmp/quantum_data.db'
        else:
            self.db_path = "quantum_data.db"
        self.init_user_table()
    
    def init_user_table(self):
        """Initialize users table in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if table exists and what columns it has
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        table_exists = cursor.fetchone()
        
        if table_exists:
            # Get existing table schema
            cursor.execute("PRAGMA table_info(users)")
            columns = [column[1] for column in cursor.fetchall()]
            
            # Add missing columns if they don't exist
            if 'salt' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT")
                print("✅ Added salt column to users table")
            
            if 'created_at' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                print("✅ Added created_at column to users table")
            
            if 'last_login' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN last_login TIMESTAMP")
                print("✅ Added last_login column to users table")
            
            if 'is_active' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
                print("✅ Added is_active column to users table")
        else:
            # Create new table with all columns
            cursor.execute('''
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    api_key TEXT NOT NULL,
                    crn TEXT NOT NULL,
                    salt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            print("✅ Created new users table with all columns")
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password):
        """Hash password using SHA-256 with salt"""
        salt = secrets.token_hex(16)
        return hashlib.sha256((password + salt).encode()).hexdigest(), salt
    
    def verify_password(self, password, password_hash, salt):
        """Verify password against hash with salt"""
        return hashlib.sha256((password + salt).encode()).hexdigest() == password_hash
    
    def generate_token(self, user_id, email):
        """Generate JWT token for user"""
        payload = {
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=24),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.secret_key, algorithm='HS256')
    
    def verify_token(self, token):
        """Verify JWT token and return user data"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    # ------------------------------------------------------------------
    # Password reset (forgot password / change password)
    # ------------------------------------------------------------------
    def _init_reset_table(self):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    token TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    email TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    used INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
        finally:
            conn.close()

    def create_password_reset_token(self, email):
        """Create a single-use reset token valid for 1 hour. Returns token or None."""
        self._init_reset_table()
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            row = cursor.fetchone()
            if not row:
                return None
            user_id = row[0]
            # Invalidate any previous unused tokens for this user
            cursor.execute('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', (user_id,))
            token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            cursor.execute(
                'INSERT INTO password_reset_tokens (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)',
                (token, user_id, email, expires_at.strftime('%Y-%m-%d %H:%M:%S'))
            )
            conn.commit()
            return token
        finally:
            conn.close()

    def verify_password_reset_token(self, token):
        """Return (user_id, email) if the reset token is valid, unused and unexpired."""
        self._init_reset_table()
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT user_id, email, expires_at, used FROM password_reset_tokens WHERE token = ?',
                (token,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            user_id, email, expires_at, used = row
            if used:
                return None
            try:
                exp = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S')
            except (ValueError, TypeError):
                return None
            if datetime.utcnow() > exp:
                return None
            return user_id, email
        finally:
            conn.close()

    def reset_password_with_token(self, token, new_password):
        """Set a new password using a valid reset token. Single-use."""
        if not new_password or len(new_password) < 6:
            return False, "Password must be at least 6 characters"
        verified = self.verify_password_reset_token(token)
        if not verified:
            return False, "Reset link is invalid or has expired"
        user_id, _email = verified
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            pw_hash, salt = self.hash_password(new_password)
            cursor.execute(
                'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
                (pw_hash, salt, user_id)
            )
            cursor.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', (token,))
            conn.commit()
            return True, "Password has been reset successfully"
        finally:
            conn.close()

    def change_password(self, user_id, current_password, new_password):
        """Change password for a logged-in user after verifying the current one."""
        if not new_password or len(new_password) < 6:
            return False, "New password must be at least 6 characters"
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT password_hash, salt FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            if not row:
                return False, "User not found"
            pw_hash, salt = row
            if not self.verify_password(current_password, pw_hash, salt):
                return False, "Current password is incorrect"
            new_hash, new_salt = self.hash_password(new_password)
            cursor.execute(
                'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
                (new_hash, new_salt, user_id)
            )
            conn.commit()
            return True, "Password changed successfully"
        finally:
            conn.close()
    
    def register_user(self, email, password, api_key, crn):
        """Register a new user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if user already exists
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                return False, "User already exists with this email"
            
            # Validate inputs
            if len(password) < 6:
                return False, "Password must be at least 6 characters long"
            
            if not api_key or len(api_key) < 10:
                return False, "Invalid API key"
            
            if not crn or len(crn) < 10:
                return False, "Invalid CRN"
            
            # Hash password with salt
            password_hash, salt = self.hash_password(password)
            
            # Insert new user
            cursor.execute('''
                INSERT INTO users (email, password_hash, api_key, crn, salt)
                VALUES (?, ?, ?, ?, ?)
            ''', (email, password_hash, api_key, crn, salt))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            return True, f"User registered successfully"
            
        except Exception as e:
            return False, f"Registration failed: {str(e)}"
        finally:
            conn.close()
    
    def login_user(self, email, password):
        """Login user and return token"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get user data
            cursor.execute('''
                SELECT id, email, password_hash, api_key, crn, salt, is_active
                FROM users WHERE email = ?
            ''', (email,))
            
            user = cursor.fetchone()
            if not user:
                return False, "User not found", None, None, None
            
            user_id, user_email, password_hash, api_key, crn, salt, is_active = user
            
            if not is_active:
                return False, "Account is deactivated", None, None, None
            
            # Handle legacy users without salt (simple password verification)
            if salt is None:
                # For legacy users, use simple hash comparison
                simple_hash = hashlib.sha256(password.encode()).hexdigest()
                if simple_hash != password_hash:
                    return False, "Invalid password", None, None, None
                
                # Update user with proper salt for future logins
                new_password_hash, new_salt = self.hash_password(password)
                cursor.execute('''
                    UPDATE users SET password_hash = ?, salt = ? WHERE id = ?
                ''', (new_password_hash, new_salt, user_id))
                conn.commit()
            else:
                # Verify password with salt
                if not self.verify_password(password, password_hash, salt):
                    return False, "Invalid password", None, None, None
            
            # Update last login
            cursor.execute('''
                UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
            ''', (user_id,))
            conn.commit()
            
            # Generate token
            token = self.generate_token(user_id, user_email)
            
            return True, "Login successful", token, api_key, crn
            
        except Exception as e:
            return False, f"Login failed: {str(e)}", None, None, None
        finally:
            conn.close()
    
    def get_user_credentials(self, user_id):
        """Get user's API key and CRN"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT api_key, crn FROM users WHERE id = ?', (user_id,))
            result = cursor.fetchone()
            if result:
                return result[0], result[1]
            return None, None
        finally:
            conn.close()
    
    def validate_user_session(self, user_id):
        """Validate if user session is still valid"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT is_active FROM users WHERE id = ?', (user_id,))
            result = cursor.fetchone()
            # Handle both old schema (no is_active column) and new schema
            if result:
                # Check if is_active column exists and is 1, or if it's None (old schema)
                return result[0] is None or result[0] == 1
            return False
        except Exception as e:
            print(f"Error validating user session: {e}")
            return False
        finally:
            conn.close()

# Global auth system instance
user_auth = UserAuthSystem()
