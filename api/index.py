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

# Import the Flask application from hybrid_quantum_app
from hybrid_quantum_app import app as flask_app

# Assign to a top-level variable named 'app' so Vercel's static AST parser detects it
app = flask_app
