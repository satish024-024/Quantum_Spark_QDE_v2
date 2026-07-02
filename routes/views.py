import os
from flask import Blueprint, render_template, redirect, session, request, send_from_directory
from helpers import user_auth, get_user_quantum_credentials, quantum_manager_singleton

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def index():
    """Default route - redirect to authentication page"""
    return redirect('/auth')

@views_bp.route('/dashboard')
def dashboard():
    """Render dashboard with authentication and IBM Quantum connection"""
    if 'user_id' not in session:
        return redirect('/auth')
    
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    
    quantum_token, quantum_crn = get_user_quantum_credentials()
    if quantum_token:
        try:
            quantum_manager = quantum_manager_singleton.get_manager(quantum_token, quantum_crn)
            if quantum_manager:
                quantum_manager._ensure_connection()
        except Exception as e:
            print(f"Error initializing quantum manager: {e}")
            
    return render_template('dashboard/pantone_dashboard.html')

@views_bp.route('/production-dashboard')
def production_dashboard():
    """Production dashboard page with gray theme"""
    try:
        if 'user_id' not in session:
            return redirect('/auth')
        
        if not user_auth.validate_user_session(session['user_id']):
            session.clear()
            return redirect('/auth')
        
        quantum_token, quantum_crn = get_user_quantum_credentials()
        if quantum_token:
            try:
                quantum_manager = quantum_manager_singleton.get_manager(quantum_token, quantum_crn)
                if quantum_manager:
                    quantum_manager._ensure_connection()
            except Exception as e:
                print(f"Error initializing quantum manager: {e}")
                
        return render_template('production_dashboard.html')
    except Exception as e:
        return f"Error loading production dashboard: {str(e)}", 500

@views_bp.route('/advanced')
def advanced_dashboard():
    if 'user_id' not in session:
        return redirect('/auth')
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    return render_template('advanced_dashboard.html')

@views_bp.route('/modern')
def modern_dashboard_auth():
    if 'user_id' not in session:
        return redirect('/auth')
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    return render_template('modern_dashboard.html')

@views_bp.route('/professional')
def professional_dashboard():
    if 'user_id' not in session:
        return redirect('/auth')
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    return render_template('professional_dashboard.html')

@views_bp.route('/ultimate')
def ultimate_dashboard():
    if 'user_id' not in session:
        return redirect('/auth')
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')
    
    quantum_token, quantum_crn = get_user_quantum_credentials()
    if quantum_token:
        try:
            quantum_manager = quantum_manager_singleton.get_manager(quantum_token, quantum_crn)
            if quantum_manager:
                quantum_manager._ensure_connection()
        except Exception as e:
            print(f"Error: {e}")
            
    return render_template('ultimate_dashboard.html')

@views_bp.route('/hackathon')
def hackathon_dashboard():
    return redirect('/dashboard?type=hackathon')

@views_bp.route('/dashboard-selector')
def dashboard_selector():
    if 'user_id' not in session:
        return redirect('/auth')
    if not user_auth.validate_user_session(session['user_id']):
        session.clear()
        return redirect('/auth')

    dashboard_type = request.args.get('type', 'hackathon')
    quantum_token, quantum_crn = get_user_quantum_credentials()
    if quantum_token:
        try:
            quantum_manager = quantum_manager_singleton.get_manager(quantum_token, quantum_crn)
            if quantum_manager:
                quantum_manager._ensure_connection()
        except Exception as e:
            print(f"Error: {e}")

    dashboard_templates = {
        'hackathon': 'hackathon_dashboard.html',
        'modern': 'modern_dashboard.html',
        'advanced': 'advanced_dashboard.html',
        'professional': 'professional_dashboard.html',
        'production': 'production_dashboard.html',
        'ultimate': 'ultimate_dashboard.html',
        'quantum_research': 'quantum_research_platform.html',
        'circuit_builder': 'circuit_builder.html'
    }

    template = dashboard_templates.get(dashboard_type, 'hackathon_dashboard.html')
    return render_template(template)

@views_bp.route('/hackathon-legacy')
def hackathon_dashboard_legacy():
    return redirect('/dashboard?type=hackathon')

@views_bp.route('/modern-legacy')
def modern_dashboard_legacy():
    return redirect('/dashboard?type=modern')

@views_bp.route('/advanced-legacy')
def advanced_dashboard_legacy():
    return redirect('/dashboard?type=advanced')

@views_bp.route('/professional-legacy')
def professional_dashboard_legacy():
    return redirect('/dashboard?type=professional')

@views_bp.route('/production-legacy')
def production_dashboard_legacy():
    return redirect('/dashboard?type=production')

@views_bp.route('/quantum-research-legacy')
def quantum_research_dashboard_legacy():
    return redirect('/dashboard?type=quantum_research')

@views_bp.route('/circuit-builder-legacy')
def circuit_builder_dashboard_legacy():
    return redirect('/dashboard?type=circuit_builder')

@views_bp.route('/offline_status')
def offline_status():
    return render_template('offline_status.html')

@views_bp.route('/test/providers')
def test_providers_page():
    return render_template('test_providers.html')

@views_bp.route('/circuit-builder')
def circuit_builder():
    """Route to unified 3D Circuit Visualizer integrated application"""
    return render_template('circuit_builder.html')

@views_bp.route('/bloch-sphere')
def bloch_sphere():
    """Route to Bloch Sphere Simulator standalone application"""
    bloch_dir = os.path.join('static', 'bloch-sphere-simulator')
    return send_from_directory(bloch_dir, 'index.html')
