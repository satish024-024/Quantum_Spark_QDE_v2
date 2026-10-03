import os
import sqlite3
from flask import Blueprint, jsonify, request, session
from helpers import user_auth, get_user_quantum_credentials, provider_credentials, validate_crn
from helpers import get_db_path

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth')
def auth_selection():
    """User authentication page with animated login and registration"""
    from flask import render_template, redirect
    # Already logged in? Skip the login form and go straight to the dashboard.
    if session.get('user_id'):
        return redirect('/dashboard')
    return render_template('auth_animated.html')

@auth_bp.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        api_key = data.get('api_key')
        crn = data.get('crn')
        
        if not all([email, password, api_key, crn]):
            return jsonify({
                "success": False,
                "message": "All fields are required"
            }), 400
        
        success, message = user_auth.register_user(email, password, api_key, crn)
        
        if success:
            print("  User registered successfully")
            
            # Verify user was created in database
            try:
                from database import db
                with db.get_connection() as conn:
                    cursor = conn.execute('SELECT id, email FROM users WHERE email = ?', (email,))
                    user = cursor.fetchone()
                    if user:
                        # Convert tuple/dict to dict-like
                        u_id = user[0] if isinstance(user, tuple) else user['id']
                        print(f"  User verified in database: ID={u_id}")
                    else:
                        print(f"  User not found in database after registration!")
                        return jsonify({
                            "success": False,
                            "message": "Registration failed: User not found in database"
                        }), 500
            except Exception as db_error:
                print(f"  Could not verify user in database: {db_error}")
            
            # Login the user automatically
            login_success, login_message, token, user_api_key, user_crn = user_auth.login_user(email, password)
            
            if login_success:
                session.clear()
                user_data = user_auth.verify_token(token)
                session['user_id'] = user_data['user_id']
                session['user_email'] = email
                session['quantum_token'] = user_api_key
                session['quantum_crn'] = user_crn
                session['auth_token'] = token
                try:
                    session['pwd_version'] = user_auth.get_pwd_version(user_data['user_id'])
                except Exception:
                    session['pwd_version'] = 0
                # Keep the login alive across browser restarts (30-day cookie).
                session.permanent = True
                
                print(f"  User automatically logged in: ID={user_data['user_id']}")
                
                return jsonify({
                    "success": True,
                    "message": f"{message}. You have been automatically logged in.",
                    "token": token,
                    "redirect": "/dashboard"
                })
            else:
                print(f"  Registration successful but auto-login failed: {login_message}")
                return jsonify({
                    "success": True,
                    "message": f"{message}. Please log in manually.",
                    "redirect": "/auth"
            })
        else:
            return jsonify({
                "success": False,
                "message": message
            }), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }), 500

_login_failed_attempts = {}
def _login_is_rate_limited(key, max_hits=5, window_s=60):
    import time
    now = time.time()
    hits = [t for t in _login_failed_attempts.get(key, []) if now - t < window_s]
    _login_failed_attempts[key] = hits
    return len(hits) >= max_hits

def _record_login_failure(key):
    import time
    now = time.time()
    hits = _login_failed_attempts.get(key, [])
    hits.append(now)
    _login_failed_attempts[key] = hits

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        ip = (request.headers.get('X-Forwarded-For') or request.remote_addr or 'unknown').split(',')[0].strip()
        login_rate_key = f"{ip}:{(email or '').strip().lower()}"
        if _login_is_rate_limited(login_rate_key, max_hits=5, window_s=60):
            return jsonify({
                "success": False,
                "message": "Too many failed login attempts. Please try again later."
            }), 429
        
        success, message, token, api_key, crn = user_auth.login_user(email, password)
        
        if success:
            _login_failed_attempts.pop(login_rate_key, None)
            session.clear()
            user_data = user_auth.verify_token(token)
            if user_data:
                session['user_id'] = user_data.get('user_id')
                # Track password version so a later password change/reset
                # invalidates this session.
                try:
                    session['pwd_version'] = user_auth.get_pwd_version(user_data.get('user_id'))
                except Exception:
                    session['pwd_version'] = 0
            session['user_email'] = email
            session['quantum_token'] = api_key
            session['quantum_crn'] = crn
            session['auth_token'] = token
            # Keep the login alive across browser restarts (30-day cookie).
            session.permanent = True
            
            # Seed provider credentials cache
            if api_key:
                creds_key = f"{session.get('user_id')}_ibm"
                provider_credentials[creds_key] = {
                    'api_token': api_key,
                    'instance': crn
                }
            
            return jsonify({
                "success": True,
                "message": message,
                "token": token,
                "redirect": "/dashboard"
            })
        else:
            _record_login_failure(login_rate_key)
            return jsonify({
                "success": False,
                "message": message
            }), 401
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Login failed: {str(e)}"
        }), 500

@auth_bp.route('/api/user', methods=['GET'])
def api_get_user():
    """Get current user info from session"""
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    if user_id and user_email:
        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "email": user_email
            }
        })
    else:
        return jsonify({
            "success": False,
            "message": "Not authenticated"
        }), 401

@auth_bp.route('/api/auth/status', methods=['GET'])
def get_auth_status():
    """Check current session and return user status"""
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    if user_id and user_email:
        token = session.get('quantum_token')
        crn = session.get('quantum_crn')
        
        return jsonify({
            "authenticated": True,
            "email": user_email,
            "user_id": user_id,
            "has_ibm_token": bool(token),
            "has_ibm_crn": bool(crn)
        })
    else:
        return jsonify({
            "authenticated": False,
            "email": None,
            "user_id": None,
            "has_ibm_token": False,
            "has_ibm_crn": False
        })

@auth_bp.route('/api/circuit/auth-status', methods=['GET'])
def circuit_auth_status():
    """Return authentication and quantum configuration status for circuit builder"""
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    if not user_id or not user_email:
        return jsonify({
            "authenticated": False,
            "quantum_configured": False,
            "error": "Please log in to save and execute circuits"
        })
        
    # Get user credentials
    quantum_token = session.get('quantum_token')
    quantum_crn = session.get('quantum_crn')
    
    if not quantum_token or not quantum_crn:
        try:
            # Try to fetch from DB/helpers
            quantum_token, quantum_crn = get_user_quantum_credentials()
        except Exception as e:
            print(f"Error fetching quantum credentials for user {user_id}: {e}")
            
    is_configured = bool(quantum_token and quantum_crn)
    
    return jsonify({
        "authenticated": True,
        "quantum_configured": is_configured,
        "user_email": user_email,
        "message": "Ready to execute circuits on IBM Quantum" if is_configured else "Please configure your IBM Quantum credentials"
    })

@auth_bp.route('/api/logout', methods=['POST'])
def api_logout():
    """Logout user and clear session"""
    session.clear()
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })

@auth_bp.route('/api/provider/save-credentials', methods=['POST'])
def save_provider_credentials():
    """Save provider credentials securely."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        provider = data.get('provider')
        if not provider:
            return jsonify({'error': 'Provider required'}), 400
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        credentials = {k: v for k, v in data.items() if k != 'provider'}
        if not credentials:
            return jsonify({'error': 'No credentials provided'}), 400
        
        # Store in memory cache
        creds_key = f"{user_id}_{provider}"
        provider_credentials[creds_key] = credentials
        session[f"provider_creds_{provider}"] = True
        
        # Try to validate
        validation_result = validate_provider_credentials(provider, credentials)
        if validation_result.get('success'):
            print(f"✅ {provider.upper()} credentials saved and validated for user {user_id}")
            return jsonify({
                'success': True,
                'message': f'Connected to {provider.upper()} successfully',
                'provider': provider,
                'backends': validation_result.get('backends', []),
                'refresh_required': True,
                'widget_updates': {
                    'backends': True, 'jobs': True, 'metrics': True, 'visualizations': True
                }
            }), 200
        else:
            if creds_key in provider_credentials:
                del provider_credentials[creds_key]
            session.pop(f"provider_creds_{provider}", None)
            return jsonify({
                'success': False,
                'message': validation_result.get('error', 'Invalid credentials'),
                'provider': provider
            }), 401
    except Exception as e:
        print(f"Error saving credentials: {e}")
        return jsonify({'error': str(e)}), 500

def validate_provider_credentials(provider, credentials):
    """Validate credentials by attempting to connect to the provider."""
    import requests
    from providers.registry import ProviderRegistry
    try:
        if provider == 'ionq':
            api_key = credentials.get('api_key') or credentials.get('ionq_api_key')
            if not api_key:
                return {'success': False, 'error': 'API key required'}
            response = requests.get('https://api.ionq.co/v0.3/backends', headers={
                'Authorization': f'apiKey {api_key}', 'Content-Type': 'application/json'
            }, timeout=10)
            if response.status_code == 200:
                backends = []
                for b in response.json():
                    backends.append({
                        'id': b.get('backend', 'unknown'),
                        'name': f"IonQ {b.get('backend', 'Unknown').title()}",
                        'qubits': b.get('qubits', 11),
                        'type': 'simulator' if 'simulator' in b.get('backend', '') else 'qpu',
                        'status': b.get('status', 'unknown'),
                        'available': b.get('status') == 'available'
                    })
                try:
                    from providers.ionq_provider import IonQProvider
                    ProviderRegistry._providers['ionq'] = IonQProvider(api_key=api_key)
                except Exception as update_err:
                    print(f"⚠️ Could not update provider: {update_err}")
                return {'success': True, 'backends': backends}
            else:
                return {'success': False, 'error': f'IonQ API error: {response.status_code}'}
        elif provider == 'rigetti':
            api_key = credentials.get('api_key')
            if not api_key or len(api_key) < 20:
                return {'success': False, 'error': 'Invalid Rigetti API key format'}
            return {'success': True, 'backends': ['Aspen-M-3', 'Aspen-11', 'QVM']}
        elif provider == 'aws_braket':
            access_key = credentials.get('access_key')
            secret_key = credentials.get('secret_key')
            if not access_key or not secret_key or len(access_key) < 16 or len(secret_key) < 30:
                return {'success': False, 'error': 'Invalid AWS credential format'}
            return {'success': True, 'backends': ['ionq', 'rigetti', 'dm1', 'sv1', 'tn1']}
        else:
            # Fallback success for other providers
            return {'success': True, 'backends': ['simulator']}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@auth_bp.route('/api/add_api_instance', methods=['POST'])
def add_api_instance():
    try:
        data = request.get_json() or {}
        instances = session.get('api_instances', [])
        instances.append(data)
        session['api_instances'] = instances
        return jsonify({'success': True, 'message': 'API instance added'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/get_api_instances', methods=['GET'])
def get_api_instances():
    try:
        instances = session.get('api_instances', [])
        return jsonify({'success': True, 'instances': instances})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------------------------------------------------------------------------
# Forgot password / reset password / change password
# ---------------------------------------------------------------------------
# Simple in-memory rate limiter for password-reset requests.
# (Resets on server restart; sufficient to blunt token-DoS/spam.)
_forgot_attempts = {}
def _forgot_rate_limited(key, max_hits=5, window_s=3600):
    import time
    now = time.time()
    hits = [t for t in _forgot_attempts.get(key, []) if now - t < window_s]
    if len(hits) >= max_hits:
        return True
    hits.append(now)
    _forgot_attempts[key] = hits
    return False

@auth_bp.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Start a password reset: generate a single-use token for the email.

    If SMTP is configured (see core/mailer.py), the reset link is emailed.
    Otherwise the link is returned directly in the response.
    The response never reveals whether the email exists.
    """
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'success': False, 'message': 'Email is required'}), 400

        # Throttle: max 5 reset requests per email per hour (also blunts
        # token-invalidation DoS against a legitimate reset).
        if _forgot_rate_limited('fp:' + email):
            return jsonify({'success': False,
                            'message': 'Too many requests. Please try again later.'}), 429

        token = user_auth.create_password_reset_token(email)
        # Always respond generically to avoid email enumeration.
        resp = {'success': True,
                'message': 'If an account exists for this email, a reset link has been sent.'}
        if token:
            base = (os.environ.get('APP_BASE_URL') or request.host_url).rstrip('/')
            reset_url = f'{base}/reset-password?token={token}'
            try:
                from core.mailer import is_configured, send_password_reset_email
                if is_configured():
                    send_password_reset_email(email, reset_url)
            except Exception as mail_err:
                print(f'⚠️ Reset email failed: {mail_err}')
        return jsonify(resp)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Request failed: {str(e)}'}), 500


@auth_bp.route('/reset-password')
def reset_password_page():
    """Render the set-new-password page (token validated client-side too)."""
    from flask import render_template
    return render_template('reset_password.html')


@auth_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    """Set a new password using a valid reset token."""
    try:
        data = request.get_json() or {}
        token = data.get('token') or ''
        new_password = data.get('new_password') or ''
        ok, msg = user_auth.reset_password_with_token(token, new_password)
        return jsonify({'success': ok, 'message': msg}), (200 if ok else 400)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Reset failed: {str(e)}'}), 500


@auth_bp.route('/api/change-password', methods=['POST'])
def change_password():
    """Change password for the logged-in user (verifies current password)."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Not authenticated'}), 401
        data = request.get_json() or {}
        ok, msg = user_auth.change_password(
            user_id,
            data.get('current_password') or '',
            data.get('new_password') or ''
        )
        return jsonify({'success': ok, 'message': msg}), (200 if ok else 400)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Change failed: {str(e)}'}), 500
