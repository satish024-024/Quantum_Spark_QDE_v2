import os
import sys

# Configure project paths to resolve imports correctly
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'core'))
sys.path.insert(0, os.path.join(project_root, 'services'))
sys.path.insert(0, os.path.join(project_root, 'quantum'))
sys.path.insert(0, os.path.join(project_root, 'routes'))

from flask import Flask

app = Flask(__name__)

# Configure a consistent secret key to prevent user sessions from invalidating
secret_key_file = os.path.join(project_root, '.secret_key')
if os.path.exists(secret_key_file):
    try:
        with open(secret_key_file, 'r') as f:
            app.secret_key = f.read().strip()
    except Exception as e:
        print(f"Warning: Failed to read .secret_key: {e}")
        app.secret_key = os.environ.get('FLASK_SECRET_KEY') or "quantum_spark_handcrafted_key_2026_vercel"
else:
    app.secret_key = os.environ.get('FLASK_SECRET_KEY') or "quantum_spark_handcrafted_key_2026_vercel"
    try:
        with open(secret_key_file, 'w') as f:
            f.write(app.secret_key)
    except Exception as e:
        print(f"Warning: Failed to write .secret_key: {e}")

# Register Blueprint routes
from routes.views import views_bp
from routes.auth import auth_bp
from routes.backends import backends_bp
from routes.jobs import jobs_bp
from routes.ai import ai_bp
from routes.dashboard import dashboard_bp
from routes.research import research_bp

app.register_blueprint(views_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(backends_bp)
app.register_blueprint(jobs_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(research_bp)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Dashboard running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True, use_reloader=False)