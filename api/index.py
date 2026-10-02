import os
import sys
import io
import shutil

# Force UTF-8 encoding for standard output/error to prevent UnicodeEncodeError in serverless logs
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except Exception as e:
        print(f"Warning: Failed to set sys.stdout to UTF-8: {e}")

# Determine the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'core'))
sys.path.insert(0, os.path.join(project_root, 'services'))
sys.path.insert(0, os.path.join(project_root, 'quantum'))

# Set database path for Vercel serverless environment (ephemeral read/write /tmp directory)
if os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
    src_db = os.path.join(project_root, 'quantum_data.db')
    dest_db = '/tmp/quantum_data.db'
    if os.path.exists(src_db) and not os.path.exists(dest_db):
        try:
            shutil.copy(src_db, dest_db)
            print(f"✅ Pre-seeded quantum_data.db copied to ephemeral storage {dest_db}")
        except Exception as e:
            print(f"⚠️ Failed to copy database to /tmp: {e}")
    # Force use of writeable SQLite database in /tmp
    os.environ['DATABASE_URL'] = 'sqlite:////tmp/quantum_data.db'

# ---------------------------------------------------------------------------
# TEMPORARY OWNER PASSWORD RESET (added 2026-10-02, remove after use)
# The app has no change-password UI and the owner lost their login password.
# On every cold start this resets the password of the owner accounts below,
# using the app's own SHA-256+salt scheme from core/user_auth.py.
# Set the OWNER_RESET_PASSWORD env var in Vercel to choose your own password;
# otherwise the temporary password below applies. DELETE THIS BLOCK after
# logging in (ask your agent to push a cleanup commit).
# ---------------------------------------------------------------------------
try:
    import sqlite3 as _sqlite3
    import hashlib as _hashlib
    import secrets as _secrets
    _reset_db = '/tmp/quantum_data.db' if (os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV')) else os.path.join(project_root, 'quantum_data.db')
    if os.path.exists(_reset_db):
        _rconn = _sqlite3.connect(_reset_db)
        _rcur = _rconn.cursor()
        _rcur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if _rcur.fetchone():
            _new_pw = os.environ.get('OWNER_RESET_PASSWORD') or 'TDHJzuh6LGUajiOF'
            for _email in ['satishkumarkadali24@gmail.com', 'satishkadali@gmail.com', 'satishkadali24@gmail.com']:
                _salt = _secrets.token_hex(16)
                _ph = _hashlib.sha256((_new_pw + _salt).encode()).hexdigest()
                _rcur.execute('UPDATE users SET password_hash=?, salt=? WHERE email=?', (_ph, _salt, _email))
            _rconn.commit()
            print('✅ Temporary owner password reset applied')
        _rconn.close()
except Exception as _e:
    print(f'⚠️ Temporary password reset skipped: {_e}')
# ------------------------- END TEMPORARY RESET -----------------------------

# Import the Flask application from hybrid_quantum_app
from hybrid_quantum_app import app as flask_app

# Assign to a top-level variable named 'app' so Vercel's static AST parser detects it
app = flask_app
