"""
Database module for Quantum Jobs Tracker
Handles SQLite database operations for storing historical quantum data
with enhanced connection pooling and offline support
"""

import sqlite3
import json
import datetime
import threading
import time
import logging
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
import os
from functools import wraps
from concurrent.futures import ThreadPoolExecutor
import schedule

class QuantumDatabase:
    """SQLite database manager for quantum data persistence with enhanced connection pooling"""

    def __init__(self, db_path: str = None):
        if db_path is None:
            db_url = os.environ.get('DATABASE_URL')
            if db_url and db_url.startswith('sqlite://'):
                # Extract file path from sqlite:// url format
                db_path = db_url.replace('sqlite:///', '').replace('sqlite://', '')
            elif os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
                db_path = '/tmp/quantum_data.db'
            else:
                db_path = "quantum_data.db"
        self.db_path = db_path
        self.lock = threading.RLock()  # Reentrant lock for better concurrency
        self.connection_pool = {}
        self.pool_size = 5
        self.max_retries = 3
        self.retry_delay = 0.5
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="db-worker")
        self.last_sync_time = None
        self.sync_interval_minutes = 15  # Default 15 minutes
        self.offline_mode = False

        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        # Initialize database and start background sync
        self.init_database()
        # Don't start background sync automatically - let the app control it

    def retry_on_failure(max_retries=None, delay=None):
        """Decorator for retrying database operations on failure"""
        def decorator(func):
            @wraps(func)
            def wrapper(self, *args, **kwargs):
                retries = max_retries or self.max_retries
                delay_time = delay or self.retry_delay

                for attempt in range(retries + 1):
                    try:
                        return func(self, *args, **kwargs)
                    except sqlite3.Error as e:
                        if attempt == retries:
                            self.logger.error(f"Database operation failed after {retries + 1} attempts: {e}")
                            raise e
                        self.logger.warning(f"Database operation failed (attempt {attempt + 1}/{retries + 1}): {e}")
                        time.sleep(delay_time * (2 ** attempt))  # Exponential backoff
                return None
            return wrapper
        return decorator

    def get_connection_from_pool(self):
        """Get a connection from the pool with thread safety"""
        thread_id = threading.get_ident()

        with self.lock:
            if thread_id not in self.connection_pool:
                if len(self.connection_pool) >= self.pool_size:
                    # Remove oldest connection if pool is full
                    oldest_thread = min(self.connection_pool.keys(),
                                      key=lambda k: self.connection_pool[k]['last_used'])
                    old_conn = self.connection_pool[oldest_thread]['connection']
                    old_conn.close()
                    del self.connection_pool[oldest_thread]

                conn = sqlite3.connect(self.db_path, timeout=30.0, check_same_thread=False)
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON")
                conn.execute("PRAGMA journal_mode = WAL")  # Write-Ahead Logging for better concurrency
                conn.execute("PRAGMA synchronous = NORMAL")  # Balance between performance and safety
                conn.execute("PRAGMA cache_size = 1000")  # 1MB cache
                conn.execute("PRAGMA temp_store = memory")  # Store temp tables in memory

                self.connection_pool[thread_id] = {
                    'connection': conn,
                    'last_used': time.time(),
                    'in_use': True
                }

            pool_entry = self.connection_pool[thread_id]
            pool_entry['last_used'] = time.time()
            pool_entry['in_use'] = True
            return pool_entry['connection']

    def release_connection(self, conn):
        """Release connection back to pool"""
        thread_id = threading.get_ident()

        with self.lock:
            if thread_id in self.connection_pool:
                self.connection_pool[thread_id]['in_use'] = False

    def close_all_connections(self):
        """Close all connections in the pool"""
        with self.lock:
            for pool_entry in self.connection_pool.values():
                try:
                    pool_entry['connection'].close()
                except Exception as e:
                    self.logger.warning(f"Error closing connection: {e}")
            self.connection_pool.clear()

    def start_background_sync(self):
        """Start background synchronization scheduler"""
        def sync_job():
            try:
                self.logger.info("Running scheduled data synchronization...")
                self.perform_data_sync()
            except Exception as e:
                self.logger.error(f"Background sync failed: {e}")

        # Schedule sync every 15 minutes
        schedule.every(self.sync_interval_minutes).minutes.do(sync_job)

        # Run sync in background thread
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute

        self.executor.submit(run_scheduler)
        self.logger.info(f"Background sync started with {self.sync_interval_minutes} minute intervals")

    def perform_data_sync(self):
        """Perform data synchronization with external sources"""
        try:
            # Check if we need to sync based on last sync time
            current_time = datetime.datetime.now()
            if self.last_sync_time and (current_time - self.last_sync_time).total_seconds() < (self.sync_interval_minutes * 60):
                return  # Skip if we synced recently

            self.last_sync_time = current_time

            # Clean up old data
            self.cleanup_old_data(days_to_keep=7)  # Keep 7 days for offline access

            # Update sync status
            self.update_sync_status(True)

            self.logger.info("Data synchronization completed successfully")

        except Exception as e:
            self.logger.error(f"Data synchronization failed: {e}")
            self.update_sync_status(False, str(e))

    def update_sync_status(self, success: bool, error_message: str = None):
        """Update synchronization status"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO system_status (is_online, last_successful_update, last_error, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (success, datetime.datetime.now().isoformat() if success else None, error_message))

            conn.commit()

    def set_sync_interval(self, minutes: int):
        """Set synchronization interval in minutes"""
        if 5 <= minutes <= 60:  # Between 5 minutes and 1 hour
            self.sync_interval_minutes = minutes
            self.logger.info(f"Sync interval updated to {minutes} minutes")

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current synchronization status"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('''
                SELECT * FROM system_status
                ORDER BY timestamp DESC
                LIMIT 1
            ''')

            row = cursor.fetchone()
            if row:
                return dict(row)
            else:
                return {
                    'is_online': False,
                    'last_successful_update': None,
                    'last_error': 'No sync status available',
                    'timestamp': datetime.datetime.now().isoformat()
                }

    def init_database(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Backends table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS backends (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    qubits INTEGER,
                    max_experiments INTEGER,
                    max_shots INTEGER,
                    operational BOOLEAN,
                    pending_jobs INTEGER,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    data_json TEXT
                )
            ''')
            
            # Jobs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    backend_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    creation_date DATETIME,
                    end_date DATETIME,
                    queue_position INTEGER,
                    estimated_time TEXT,
                    result_json TEXT,
                    error_message TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Metrics table for storing aggregated data
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    metric_type TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            ''')
            
            # Quantum states table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS quantum_states (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    state_name TEXT NOT NULL,
                    state_vector TEXT NOT NULL,
                    theta REAL,
                    phi REAL,
                    fidelity REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # System status table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS system_status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    is_online BOOLEAN NOT NULL,
                    last_successful_update DATETIME,
                    error_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Historical snapshots table - stores complete dashboard state at intervals
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS historical_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT DEFAULT 'system',
                    snapshot_name TEXT,
                    backends_data TEXT NOT NULL,
                    jobs_data TEXT NOT NULL,
                    performance_data TEXT NOT NULL,
                    widgets_data TEXT,
                    snapshot_trigger TEXT DEFAULT 'manual',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    retention_days INTEGER DEFAULT 7,
                    notes TEXT
                )
            ''')
            
            # Create indexes for better performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_backends_timestamp ON backends(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_jobs_timestamp ON jobs(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_quantum_states_timestamp ON quantum_states(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(metric_name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON historical_snapshots(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_snapshots_user ON historical_snapshots(user_id)')
            
            conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Get database connection from pool with proper error handling"""
        conn = None
        try:
            conn = self.get_connection_from_pool()
            yield conn
        except sqlite3.Error as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                self.release_connection(conn)
    
    def store_backends(self, backends_data: List[Dict[str, Any]]):
        """Store backend data"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                for backend in backends_data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO backends 
                        (name, status, qubits, max_experiments, max_shots, operational, 
                         pending_jobs, data_json, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (
                        backend.get('name', ''),
                        backend.get('status', ''),
                        backend.get('qubits', 0),
                        backend.get('max_experiments', 0),
                        backend.get('max_shots', 0),
                        backend.get('operational', False),
                        backend.get('pending_jobs', 0),
                        json.dumps(backend)
                    ))
                
                conn.commit()
    
    def store_jobs(self, jobs_data: List[Dict[str, Any]], user_id: int = None):
        """Store job data with user_id for multi-user support"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                for job in jobs_data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO jobs 
                        (job_id, backend_name, status, creation_date, end_date, 
                         queue_position, estimated_time, result_json, error_message, user_id, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (
                        job.get('job_id', ''),
                        job.get('backend_name', ''),
                        job.get('status', ''),
                        job.get('creation_date'),
                        job.get('end_date'),
                        job.get('queue_position', 0),
                        job.get('estimated_time', ''),
                        json.dumps(job.get('result', {})),
                        job.get('error_message', ''),
                        user_id or job.get('user_id'),
                    ))
                
                conn.commit()
    
    def store_metrics(self, metrics_data: Dict[str, Any]):
        """Store metrics data"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                for metric_name, value in metrics_data.items():
                    if isinstance(value, (int, float)):
                        cursor.execute('''
                            INSERT INTO metrics (metric_name, metric_value, metric_type, metadata)
                            VALUES (?, ?, ?, ?)
                        ''', (
                            metric_name,
                            value,
                            'numeric',
                            json.dumps({'source': 'real_time'})
                        ))
                
                conn.commit()
    
    def store_quantum_state(self, state_data: Dict[str, Any]):
        """Store quantum state data"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO quantum_states 
                    (state_name, state_vector, theta, phi, fidelity, timestamp)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    state_data.get('name', 'current_state'),
                    json.dumps(state_data.get('state_vector', [])),
                    state_data.get('theta', 0.0),
                    state_data.get('phi', 0.0),
                    state_data.get('fidelity', 1.0)
                ))
                
                conn.commit()
    
    def update_system_status(self, is_online: bool, error_message: str = None):
        """Update system status"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if is_online:
                    cursor.execute('''
                        INSERT INTO system_status (is_online, last_successful_update, timestamp)
                        VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', (True,))
                else:
                    cursor.execute('''
                        INSERT INTO system_status (is_online, error_count, last_error, timestamp)
                        VALUES (?, 
                                COALESCE((SELECT error_count + 1 FROM system_status ORDER BY timestamp DESC LIMIT 1), 1),
                                ?, CURRENT_TIMESTAMP)
                    ''', (False, error_message))
                
                conn.commit()
    
    def get_latest_data(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get latest data from the last N hours"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=hours_back)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get latest backends
            cursor.execute('''
                SELECT * FROM backends 
                WHERE timestamp >= ? 
                ORDER BY timestamp DESC
            ''', (cutoff_time,))
            backends = [dict(row) for row in cursor.fetchall()]
            
            # Get latest jobs
            cursor.execute('''
                SELECT * FROM jobs 
                WHERE timestamp >= ? 
                ORDER BY timestamp DESC
            ''', (cutoff_time,))
            jobs = [dict(row) for row in cursor.fetchall()]
            
            # Get latest metrics
            cursor.execute('''
                SELECT metric_name, metric_value, timestamp 
                FROM metrics 
                WHERE timestamp >= ? 
                ORDER BY timestamp DESC
            ''', (cutoff_time,))
            metrics = [dict(row) for row in cursor.fetchall()]
            
            # Get latest quantum states
            cursor.execute('''
                SELECT * FROM quantum_states 
                WHERE timestamp >= ? 
                ORDER BY timestamp DESC
            ''', (cutoff_time,))
            quantum_states = [dict(row) for row in cursor.fetchall()]
            
            # Get system status
            cursor.execute('''
                SELECT * FROM system_status 
                ORDER BY timestamp DESC 
                LIMIT 1
            ''')
            system_status = dict(cursor.fetchone()) if cursor.fetchone() else {}
            
            return {
                'backends': backends,
                'jobs': jobs,
                'metrics': metrics,
                'quantum_states': quantum_states,
                'system_status': system_status,
                'last_update': cutoff_time.isoformat()
            }
    
    def get_historical_metrics(self, metric_name: str, hours_back: int = 24) -> List[Dict[str, Any]]:
        """Get historical metrics for a specific metric"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=hours_back)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT metric_value, timestamp 
                FROM metrics 
                WHERE metric_name = ? AND timestamp >= ? 
                ORDER BY timestamp ASC
            ''', (metric_name, cutoff_time))
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_offline_data(self, max_age_minutes: int = 30) -> Dict[str, Any]:
        """Get data for offline mode with expiration check"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(minutes=max_age_minutes)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Get backends from last sync
            cursor.execute('''
                SELECT DISTINCT name, status, qubits, operational, pending_jobs, data_json, timestamp
                FROM backends
                WHERE timestamp >= ?
                AND name IN (
                    SELECT name FROM backends
                    WHERE timestamp >= ?
                    GROUP BY name
                    HAVING MAX(timestamp)
                )
                ORDER BY timestamp DESC
            ''', (cutoff_time, cutoff_time))
            backends = [dict(row) for row in cursor.fetchall()]

            # Get recent jobs within time window
            cursor.execute('''
                SELECT * FROM jobs
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT 200
            ''', (cutoff_time,))
            jobs = [dict(row) for row in cursor.fetchall()]

            # Get latest metrics within time window
            cursor.execute('''
                SELECT metric_name, metric_value, timestamp
                FROM metrics
                WHERE timestamp >= ?
                AND metric_name IN (
                    SELECT metric_name FROM metrics
                    WHERE timestamp >= ?
                    GROUP BY metric_name
                    HAVING MAX(timestamp)
                )
                ORDER BY timestamp DESC
            ''', (cutoff_time, cutoff_time))
            metrics = [dict(row) for row in cursor.fetchall()]

            # Get latest quantum state within time window
            cursor.execute('''
                SELECT * FROM quantum_states
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (cutoff_time,))
            quantum_state = dict(cursor.fetchone()) if cursor.fetchone() else {}

            # Get sync status
            sync_status = self.get_sync_status()

            return {
                'backends': backends,
                'jobs': jobs,
                'metrics': metrics,
                'quantum_state': quantum_state,
                'offline_mode': True,
                'data_age_minutes': (datetime.datetime.now() - cutoff_time).total_seconds() / 60,
                'max_age_minutes': max_age_minutes,
                'last_update': datetime.datetime.now().isoformat(),
                'sync_status': sync_status,
                'data_freshness': 'fresh' if len(backends) > 0 else 'stale'
            }

    def is_data_fresh(self, max_age_minutes: int = 30) -> bool:
        """Check if we have fresh data available"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(minutes=max_age_minutes)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Check if we have recent backends
            cursor.execute('''
                SELECT COUNT(*) as count FROM backends
                WHERE timestamp >= ?
            ''', (cutoff_time,))

            backends_count = cursor.fetchone()['count']

            # Check if we have recent jobs
            cursor.execute('''
                SELECT COUNT(*) as count FROM jobs
                WHERE timestamp >= ?
            ''', (cutoff_time,))
            jobs_count = cursor.fetchone()['count']

            return backends_count > 0 and jobs_count > 0

    def get_jobs(self, limit: int = 100, user_id: int = None) -> List[Dict[str, Any]]:
        """Get jobs from database, optionally filtered by user_id, ordered by timestamp"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if user_id is not None:
                cursor.execute('''
                    SELECT * FROM jobs
                    WHERE user_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (user_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM jobs
                    ORDER BY timestamp DESC
                    LIMIT ?
                ''', (limit,))
            jobs = [dict(row) for row in cursor.fetchall()]
            return jobs

    def get_cached_data_with_expiration(self, data_type: str, max_age_minutes: int = 15) -> Dict[str, Any]:
        """Get cached data with expiration checking"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(minutes=max_age_minutes)

        with self.get_connection() as conn:
            cursor = conn.cursor()

            if data_type == 'backends':
                cursor.execute('''
                    SELECT * FROM backends
                    WHERE timestamp >= ?
                    ORDER BY timestamp DESC
                ''', (cutoff_time,))
                data = [dict(row) for row in cursor.fetchall()]

            elif data_type == 'jobs':
                cursor.execute('''
                    SELECT * FROM jobs
                    WHERE timestamp >= ?
                    ORDER BY timestamp DESC
                    LIMIT 100
                ''', (cutoff_time,))
                data = [dict(row) for row in cursor.fetchall()]

            elif data_type == 'metrics':
                cursor.execute('''
                    SELECT * FROM metrics
                    WHERE timestamp >= ?
                    ORDER BY timestamp DESC
                ''', (cutoff_time,))
                data = [dict(row) for row in cursor.fetchall()]

            else:
                return {'error': f'Unknown data type: {data_type}'}

            return {
                'data': data,
                'data_type': data_type,
                'timestamp': datetime.datetime.now().isoformat(),
                'expires_in_minutes': max_age_minutes,
                'is_expired': len(data) == 0
            }
    
    def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old data to prevent database bloat"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(days=days_to_keep)
        
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Keep only recent data
                cursor.execute('DELETE FROM backends WHERE timestamp < ?', (cutoff_time,))
                cursor.execute('DELETE FROM jobs WHERE timestamp < ?', (cutoff_time,))
                cursor.execute('DELETE FROM metrics WHERE timestamp < ?', (cutoff_time,))
                cursor.execute('DELETE FROM quantum_states WHERE timestamp < ?', (cutoff_time,))
                cursor.execute('DELETE FROM system_status WHERE timestamp < ?', (cutoff_time,))
                
                conn.commit()
                
                # Vacuum database to reclaim space
                cursor.execute('VACUUM')
                conn.commit()
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics including offline capabilities"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            stats = {}

            # Count records in each table
            tables = ['backends', 'jobs', 'metrics', 'quantum_states', 'system_status']
            for table in tables:
                cursor.execute(f'SELECT COUNT(*) as count FROM {table}')
                stats[f'{table}_count'] = cursor.fetchone()['count']

            # Get database size
            cursor.execute('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()')
            stats['database_size_bytes'] = cursor.fetchone()['size']

            # Get oldest and newest records
            cursor.execute('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM backends')
            time_range = cursor.fetchone()
            stats['oldest_record'] = time_range['oldest']
            stats['newest_record'] = time_range['newest']

            # Get offline readiness metrics
            cutoff_15min = datetime.datetime.now() - datetime.timedelta(minutes=15)
            cutoff_30min = datetime.datetime.now() - datetime.timedelta(minutes=30)

            cursor.execute('SELECT COUNT(*) as count FROM backends WHERE timestamp >= ?', (cutoff_15min,))
            stats['backends_last_15min'] = cursor.fetchone()['count']

            cursor.execute('SELECT COUNT(*) as count FROM jobs WHERE timestamp >= ?', (cutoff_15min,))
            stats['jobs_last_15min'] = cursor.fetchone()['count']

            cursor.execute('SELECT COUNT(*) as count FROM backends WHERE timestamp >= ?', (cutoff_30min,))
            stats['backends_last_30min'] = cursor.fetchone()['count']

            cursor.execute('SELECT COUNT(*) as count FROM jobs WHERE timestamp >= ?', (cutoff_30min,))
            stats['jobs_last_30min'] = cursor.fetchone()['count']

            # Get sync status
            stats['sync_status'] = self.get_sync_status()
            stats['is_data_fresh_15min'] = self.is_data_fresh(15)
            stats['is_data_fresh_30min'] = self.is_data_fresh(30)
            stats['connection_pool_size'] = len(self.connection_pool)
            stats['sync_interval_minutes'] = self.sync_interval_minutes

            return stats

    def shutdown(self):
        """Properly shutdown the database and cleanup resources"""
        try:
            # Stop background sync
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=True)

            # Close all connections
            self.close_all_connections()

            self.logger.info("Database shutdown completed successfully")
        except Exception as e:
            self.logger.error(f"Error during database shutdown: {e}")

    def __del__(self):
        """Destructor to ensure proper cleanup"""
        try:
            self.shutdown()
        except:
            pass
    
    # ==================== HISTORICAL SNAPSHOTS METHODS ====================
    
    def save_snapshot(self, backends_data, jobs_data, performance_data, widgets_data=None, 
                     snapshot_trigger='manual', user_id='system', snapshot_name=None, 
                     retention_days=7, notes=None):
        """Save a historical snapshot of dashboard data"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO historical_snapshots 
                    (user_id, snapshot_name, backends_data, jobs_data, performance_data, 
                     widgets_data, snapshot_trigger, retention_days, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id,
                    snapshot_name or f"Snapshot {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    json.dumps(backends_data),
                    json.dumps(jobs_data),
                    json.dumps(performance_data),
                    json.dumps(widgets_data) if widgets_data else None,
                    snapshot_trigger,
                    retention_days,
                    notes
                ))
                
                snapshot_id = cursor.lastrowid
                conn.commit()
                return snapshot_id
    
    def get_snapshots(self, user_id='system', limit=None, days_back=30, start_date=None, end_date=None):
        """Get historical snapshots with filters"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = 'SELECT * FROM historical_snapshots WHERE user_id = ?'
            params = [user_id]
            
            if start_date and end_date:
                query += ' AND timestamp BETWEEN ? AND ?'
                params.extend([start_date, end_date])
            elif days_back:
                cutoff = datetime.datetime.now() - datetime.timedelta(days=days_back)
                query += ' AND timestamp >= ?'
                params.append(cutoff)
            
            query += ' ORDER BY timestamp DESC'
            
            if limit:
                query += ' LIMIT ?'
                params.append(limit)
            
            cursor.execute(query, params)
            snapshots = []
            for row in cursor.fetchall():
                snapshot = dict(row)
                # Parse JSON fields
                snapshot['backends_data'] = json.loads(snapshot['backends_data'])
                snapshot['jobs_data'] = json.loads(snapshot['jobs_data'])
                snapshot['performance_data'] = json.loads(snapshot['performance_data'])
                if snapshot.get('widgets_data'):
                    snapshot['widgets_data'] = json.loads(snapshot['widgets_data'])
                snapshots.append(snapshot)
            
            return snapshots
    
    def get_snapshot_by_id(self, snapshot_id):
        """Get a specific snapshot by ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM historical_snapshots WHERE id = ?', (snapshot_id,))
            row = cursor.fetchone()
            
            if row:
                snapshot = dict(row)
                snapshot['backends_data'] = json.loads(snapshot['backends_data'])
                snapshot['jobs_data'] = json.loads(snapshot['jobs_data'])
                snapshot['performance_data'] = json.loads(snapshot['performance_data'])
                if snapshot.get('widgets_data'):
                    snapshot['widgets_data'] = json.loads(snapshot['widgets_data'])
                return snapshot
            return None
    
    def delete_snapshot(self, snapshot_id, user_id='system'):
        """Delete a specific snapshot"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'DELETE FROM historical_snapshots WHERE id = ? AND user_id = ?',
                    (snapshot_id, user_id)
                )
                deleted = cursor.rowcount
                conn.commit()
                return deleted > 0
    
    def cleanup_old_snapshots(self):
        """Clean up snapshots based on retention_days"""
        with self.lock:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Delete snapshots past their retention period
                cursor.execute('''
                    DELETE FROM historical_snapshots
                    WHERE timestamp < datetime('now', '-' || retention_days || ' days')
                ''')
                
                deleted = cursor.rowcount
                conn.commit()
                self.logger.info(f"Cleaned up {deleted} old snapshots")
                return deleted
    
    def get_snapshot_stats(self, user_id='system'):
        """Get statistics about snapshots"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_count,
                    SUM(CASE WHEN snapshot_trigger = 'auto' THEN 1 ELSE 0 END) as auto_count,
                    SUM(CASE WHEN snapshot_trigger = 'manual' THEN 1 ELSE 0 END) as manual_count,
                    MIN(timestamp) as oldest_snapshot,
                    MAX(timestamp) as newest_snapshot,
                    AVG(retention_days) as avg_retention_days
                FROM historical_snapshots
                WHERE user_id = ?
            ''', (user_id,))
            
            row = cursor.fetchone()
            return dict(row) if row else {}

# Global database instance
db = QuantumDatabase()
