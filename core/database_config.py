"""
Database configuration and connection management for the Quantum Application.
Implements connection pooling and health checks for improved reliability.
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import scoped_session, sessionmaker
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///quantum_data.db')

# Connection pool configuration
DATABASE_CONFIG = {
    'poolclass': QueuePool,
    'pool_size': 10,
    'max_overflow': 20,
    'pool_timeout': 30,
    'pool_recycle': 3600,  # Recycle connections after 1 hour
    'pool_pre_ping': True  # Enable connection health checks
}

def create_db_engine():
    """
    Create SQLAlchemy engine with connection pooling
    """
    try:
        engine = create_engine(DATABASE_URL, **DATABASE_CONFIG)
        
        # Add engine health check event
        @event.listens_for(engine, 'engine_connect')
        def ping_connection(connection, branch):
            if branch:
                return
            
            try:
                # Test connection with simple query
                connection.scalar(text('SELECT 1'))
            except Exception:
                logger.warning("[Database] Connection failed health check, will be recycled")
                # Recycle connection on next use
                connection.invalidate()
            else:
                logger.debug("[Database] Connection health check passed")
        
        return engine
    except Exception as e:
        logger.error(f"[Database] Failed to create engine: {str(e)}")
        raise

# Create engine
try:
    engine = create_db_engine()
    # Create scoped session factory
    Session = scoped_session(sessionmaker(bind=engine))
    logger.info("[Database] Connection pool initialized successfully")
except Exception as e:
    logger.error(f"[Database] Failed to initialize connection pool: {str(e)}")
    raise

def get_db_session():
    """
    Get a database session from the connection pool
    """
    try:
        session = Session()
        return session
    except SQLAlchemyError as e:
        logger.error(f"[Database] Error getting database session: {str(e)}")
        raise

def close_db_session(session):
    """
    Safely close a database session
    """
    try:
        session.close()
    except SQLAlchemyError as e:
        logger.error(f"[Database] Error closing database session: {str(e)}")
        raise

def init_all_tables(session):
    """Initialize all required database tables"""
    try:
        # Users table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                api_key TEXT,
                crn TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        """))

        # Circuit definitions
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS circuit_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                circuit_id TEXT UNIQUE NOT NULL,
                user_id INTEGER,
                circuit_name TEXT,
                circuit_type TEXT,
                circuit_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_ai_generated BOOLEAN DEFAULT FALSE,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))

        # Circuit executions
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS circuit_executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                execution_id TEXT UNIQUE NOT NULL,
                circuit_id TEXT,
                user_id INTEGER,
                backend_name TEXT,
                job_id TEXT,
                job_status TEXT DEFAULT 'submitted',
                execution_data TEXT,
                results_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                execution_time REAL,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(circuit_id) REFERENCES circuit_definitions(circuit_id)
            )
        """))

        # Backends table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS backends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                backend_name TEXT UNIQUE NOT NULL,
                status TEXT,
                properties TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Jobs table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT UNIQUE NOT NULL,
                user_id INTEGER,
                backend_name TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                results TEXT,
                error TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        
        # Add user_id column if it doesn't exist (for existing databases)
        try:
            session.execute(text("ALTER TABLE jobs ADD COLUMN user_id INTEGER"))
            session.commit()
        except:
            # Column already exists, ignore error
            pass

        # Metrics table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Quantum states
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS quantum_states (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                circuit_id TEXT,
                state_vector TEXT,
                measurement_results TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(circuit_id) REFERENCES circuit_definitions(circuit_id)
            )
        """))

        # System status
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS system_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                component TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Performance metrics
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL,
                value REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Create indexes for better performance
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"))
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_circuit_definitions_user_id ON circuit_definitions(user_id)"))
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_circuit_executions_user_id ON circuit_executions(user_id)"))
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)"))
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)"))
        session.execute(text("CREATE INDEX IF NOT EXISTS idx_backends_status ON backends(status)"))

        session.commit()
        logger.info("[Database] All tables initialized successfully")
        
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"[Database] Error initializing tables: {str(e)}")
        raise

def get_user_by_id(session, user_id):
    """Get user by ID"""
    try:
        result = session.execute(text("SELECT * FROM users WHERE id = :user_id"), {"user_id": user_id})
        return result.fetchone()
    except SQLAlchemyError as e:
        logger.error(f"[Database] Error fetching user: {str(e)}")
        raise

def save_circuit(session, circuit_data):
    """Save quantum circuit"""
    try:
        session.execute(
            text("""
                INSERT INTO circuit_definitions 
                (circuit_id, user_id, circuit_name, circuit_type, circuit_data)
                VALUES (:circuit_id, :user_id, :name, :type, :data)
            """),
            circuit_data
        )
        session.commit()
        return True
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"[Database] Error saving circuit: {str(e)}")
        raise
        logger.error(f"[Database] Error saving circuit: {str(e)}")
        raise

def save_job_results(session, job_data):
    """Save job execution results"""
    try:
        session.execute(
            text("""
                INSERT INTO jobs
                (job_id, user_id, backend_name, status, results)
                VALUES (:job_id, :user_id, :backend, :status, :results)
            """),
            job_data
        )
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"[Database] Error saving job results: {str(e)}")
        raise

def get_job_status(session, job_id: str):
    """Get job status from database"""
    try:
        result = session.execute(
            text("""
                SELECT job_id, user_id, backend_name, status, results
                FROM jobs WHERE job_id = :job_id
            """),
            {"job_id": job_id}
        )
        row = result.fetchone()
        if row is None:
            return None
        return dict(row)
    except SQLAlchemyError as e:
        logger.error(f"[Database] Error getting job status: {str(e)}")
        raise

def update_job_status(session, job_id: str, status: str, results=None):
    """Update job status in database"""
    try:
        params = {"job_id": job_id, "status": status}
        query = "UPDATE jobs SET status = :status"
        if results is not None:
            query += ", results = :results"
            params["results"] = results
        query += " WHERE job_id = :job_id"
        
        session.execute(text(query), params)
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"[Database] Error updating job status: {str(e)}")
        raise

def update_backend_status(session, backend_data):
    """Update backend status"""
    try:
        session.execute(
            text("""
                INSERT OR REPLACE INTO backends
                (backend_name, status, properties)
                VALUES (:name, :status, :properties)
            """),
            backend_data
        )
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"[Database] Error updating backend: {str(e)}")
        raise