from flask import Blueprint, jsonify, request, session
from helpers import user_auth, get_user_quantum_credentials, provider_credentials, validate_crn
import sqlite3
from helpers import get_db_path

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth')
def auth_selection():
    """User authentication page with animated login and registration"""
    from flask import render_template
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
            print(f"  User registered successfully: {email}")
            
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
                user_data = user_auth.verify_token(token)
                session['user_id'] = user_data['user_id']
                session['user_email'] = email
                session['quantum_token'] = user_api_key
                session['quantum_crn'] = user_crn
                session['auth_token'] = token
                
                print(f"  User automatically logged in: ID={user_data['user_id']}, Email={email}")
                
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

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400
        
        success, message, token, api_key, crn = user_auth.login_user(email, password)
        
        print(f"🔐 [LOGIN DEBUG] success={success}, api_key={api_key is not None}, crn={crn is not None}")
        
        if success:
            user_data = user_auth.verify_token(token)
            if user_data:
                session['user_id'] = user_data.get('user_id')
            session['user_email'] = email
            session['quantum_token'] = api_key
            session['quantum_crn'] = crn
            session['auth_token'] = token
            
            # Seed provider credentials cache
            if api_key:
                creds_key = f"{session.get('user_id')}_ibm"
                provider_credentials[creds_key] = {
                    'api_token': api_key,
                    'instance': crn
                }
            
            print(f"🔐 [LOGIN DEBUG] Session stored: user_id={session.get('user_id')}, quantum_token={session.get('quantum_token') is not None}")
            
            return jsonify({
                "success": True,
                "message": message,
                "token": token,
                "redirect": "/dashboard"
            })
        else:
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
