"""
Cost Protection - Prevents runaway spending and maintains audit trail.

Features:
- Per-user daily and monthly spending limits
- Audit log for every paid job submission
- Pricing version tracking for historical accuracy
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# DEFAULT LIMITS
# =============================================================================

DEFAULT_DAILY_LIMIT_USD = 10.0
DEFAULT_MONTHLY_LIMIT_USD = 100.0


# =============================================================================
# DATABASE MODELS (SQLAlchemy)
# =============================================================================

def init_cost_protection_tables(db):
    """
    Initialize cost protection database tables.
    Call this during app setup with your SQLAlchemy db instance.
    """
    
    class UserCostLimit(db.Model):
        """Per-user spending limits"""
        __tablename__ = 'user_cost_limits'
        
        user_id = db.Column(db.Integer, primary_key=True)
        daily_limit_usd = db.Column(db.Float, default=DEFAULT_DAILY_LIMIT_USD)
        monthly_limit_usd = db.Column(db.Float, default=DEFAULT_MONTHLY_LIMIT_USD)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class JobCostAudit(db.Model):
        """
        Audit log of all paid job submissions.
        Includes pricing version for historical accuracy.
        """
        __tablename__ = 'job_cost_audit'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, nullable=False, index=True)
        provider = db.Column(db.String(32), nullable=False)
        backend_canonical_id = db.Column(db.String(128), nullable=False)
        shots = db.Column(db.Integer, nullable=False)
        estimated_cost_usd = db.Column(db.Float, nullable=False)
        actual_cost_usd = db.Column(db.Float, nullable=True)  # Filled later if known
        pricing_version = db.Column(db.String(32), nullable=True)
        pricing_effective_date = db.Column(db.Date, nullable=True)
        submitted_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
        job_id = db.Column(db.String(256), nullable=True)
        job_status = db.Column(db.String(32), nullable=True)
        notes = db.Column(db.Text, nullable=True)
    
    class ConfirmationToken(db.Model):
        """
        Database-backed confirmation tokens for paid jobs.
        Survives restarts, works across workers.
        """
        __tablename__ = 'confirmation_tokens'
        
        token = db.Column(db.String(64), primary_key=True)
        user_id = db.Column(db.Integer, nullable=False)
        provider = db.Column(db.String(32), nullable=False)
        backend_canonical_id = db.Column(db.String(128), nullable=False)
        shots = db.Column(db.Integer, nullable=False)
        estimated_cost_usd = db.Column(db.Float, nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        expires_at = db.Column(db.DateTime, nullable=False)
        used = db.Column(db.Boolean, default=False)
    
    return UserCostLimit, JobCostAudit, ConfirmationToken


# =============================================================================
# IN-MEMORY FALLBACK (for systems without database)
# =============================================================================

_user_limits: Dict[int, Dict] = {}
_audit_log: list = []
_confirmation_tokens: Dict[str, Dict] = {}


def get_user_limits(user_id: int, db=None) -> Dict:
    """
    Get spending limits for a user.
    Uses database if available, falls back to in-memory.
    """
    if db:
        # TODO: Query from database
        pass
    
    if user_id not in _user_limits:
        _user_limits[user_id] = {
            'daily_limit': DEFAULT_DAILY_LIMIT_USD,
            'monthly_limit': DEFAULT_MONTHLY_LIMIT_USD
        }
    
    return _user_limits[user_id]


def check_spending_limit(
    user_id: int, 
    estimated_cost: float,
    db=None
) -> Tuple[bool, Optional[str]]:
    """
    Check if user is within spending limits.
    
    Returns:
        (allowed: bool, reason: str|None)
    """
    limits = get_user_limits(user_id, db)
    
    # Calculate today's spending
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_spent = sum(
        entry['estimated_cost'] 
        for entry in _audit_log 
        if entry['user_id'] == user_id and entry['submitted_at'] >= today_start
    )
    
    if today_spent + estimated_cost > limits['daily_limit']:
        return False, (
            f"Daily spending limit exceeded. "
            f"Spent today: ${today_spent:.2f}, "
            f"Limit: ${limits['daily_limit']:.2f}, "
            f"This job: ~${estimated_cost:.2f}"
        )
    
    # Calculate monthly spending
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_spent = sum(
        entry['estimated_cost']
        for entry in _audit_log
        if entry['user_id'] == user_id and entry['submitted_at'] >= month_start
    )
    
    if month_spent + estimated_cost > limits['monthly_limit']:
        return False, (
            f"Monthly spending limit exceeded. "
            f"Spent this month: ${month_spent:.2f}, "
            f"Limit: ${limits['monthly_limit']:.2f}"
        )
    
    return True, None


def log_job_submission(
    user_id: int,
    provider: str,
    backend_canonical_id: str,
    shots: int,
    estimated_cost: float,
    pricing_version: str = None,
    pricing_effective_date: str = None,
    job_id: str = None,
    db=None
) -> int:
    """
    Log a paid job submission to the audit trail.
    
    Returns:
        audit_id: ID of the audit entry
    """
    entry = {
        'id': len(_audit_log) + 1,
        'user_id': user_id,
        'provider': provider,
        'backend_canonical_id': backend_canonical_id,
        'shots': shots,
        'estimated_cost': estimated_cost,
        'actual_cost': None,
        'pricing_version': pricing_version,
        'pricing_effective_date': pricing_effective_date,
        'submitted_at': datetime.utcnow(),
        'job_id': job_id,
        'job_status': 'submitted'
    }
    
    _audit_log.append(entry)
    
    logger.info(
        f"AUDIT: User {user_id} submitted job to {provider}/{backend_canonical_id} "
        f"- {shots} shots, estimated ${estimated_cost:.4f}"
    )
    
    return entry['id']


def update_job_actual_cost(
    audit_id: int,
    actual_cost: float,
    job_status: str = None,
    db=None
):
    """
    Update an audit entry with actual cost (if known).
    Called when provider reports actual charges.
    """
    for entry in _audit_log:
        if entry['id'] == audit_id:
            entry['actual_cost'] = actual_cost
            if job_status:
                entry['job_status'] = job_status
            
            logger.info(
                f"AUDIT: Updated job {audit_id} - actual cost: ${actual_cost:.4f}"
            )
            break


def get_user_spending_summary(user_id: int, db=None) -> Dict:
    """
    Get spending summary for a user.
    Useful for dashboard display.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    user_jobs = [e for e in _audit_log if e['user_id'] == user_id]
    
    today_spent = sum(
        e['estimated_cost'] for e in user_jobs 
        if e['submitted_at'] >= today_start
    )
    month_spent = sum(
        e['estimated_cost'] for e in user_jobs 
        if e['submitted_at'] >= month_start
    )
    
    limits = get_user_limits(user_id, db)
    
    return {
        'user_id': user_id,
        'today': {
            'spent': round(today_spent, 2),
            'limit': limits['daily_limit'],
            'remaining': round(limits['daily_limit'] - today_spent, 2)
        },
        'month': {
            'spent': round(month_spent, 2),
            'limit': limits['monthly_limit'],
            'remaining': round(limits['monthly_limit'] - month_spent, 2)
        },
        'total_jobs': len(user_jobs)
    }


# =============================================================================
# CONFIRMATION TOKENS
# =============================================================================

def create_confirmation_token(
    user_id: int,
    provider: str,
    backend_canonical_id: str,
    shots: int,
    estimated_cost: float,
    ttl_minutes: int = 5,
    db=None
) -> str:
    """
    Create a confirmation token for a paid job.
    Token expires after ttl_minutes.
    """
    import secrets
    token = secrets.token_urlsafe(32)
    
    _confirmation_tokens[token] = {
        'user_id': user_id,
        'provider': provider,
        'backend_canonical_id': backend_canonical_id,
        'shots': shots,
        'estimated_cost': estimated_cost,
        'created_at': datetime.utcnow(),
        'expires_at': datetime.utcnow() + timedelta(minutes=ttl_minutes),
        'used': False
    }
    
    logger.info(
        f"Created confirmation token for user {user_id}: "
        f"{provider}/{backend_canonical_id}, {shots} shots, ~${estimated_cost:.4f}"
    )
    
    return token


def validate_and_consume_token(
    token: str,
    user_id: int,
    provider: str,
    backend_canonical_id: str,
    shots: int,
    db=None
) -> Tuple[bool, Optional[str], Optional[float]]:
    """
    Validate and consume a confirmation token.
    
    Returns:
        (valid: bool, error: str|None, estimated_cost: float|None)
    """
    record = _confirmation_tokens.get(token)
    
    if not record:
        return False, "Invalid confirmation token", None
    
    if record['used']:
        return False, "Token already used", None
    
    if datetime.utcnow() > record['expires_at']:
        return False, "Confirmation expired. Please try again.", None
    
    if record['user_id'] != user_id:
        return False, "Token does not belong to this user", None
    
    if record['provider'] != provider:
        return False, "Provider mismatch. Please confirm again.", None
    
    if record['backend_canonical_id'] != backend_canonical_id:
        return False, "Backend changed. Please confirm again.", None
    
    if record['shots'] != shots:
        return False, "Shot count changed. Please confirm again.", None
    
    # Mark as used (atomic in production with DB lock)
    record['used'] = True
    
    logger.info(f"Consumed confirmation token for user {user_id}")
    
    return True, None, record['estimated_cost']


def cleanup_expired_tokens(db=None):
    """Remove expired tokens (call periodically)"""
    now = datetime.utcnow()
    expired = [
        token for token, data in _confirmation_tokens.items()
        if data['expires_at'] < now
    ]
    
    for token in expired:
        del _confirmation_tokens[token]
    
    if expired:
        logger.info(f"Cleaned up {len(expired)} expired confirmation tokens")
