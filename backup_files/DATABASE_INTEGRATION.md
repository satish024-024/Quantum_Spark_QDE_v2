# Database Integration for Quantum Jobs Tracker

This document describes the database integration features that enable offline mode and historical data storage for the Quantum Jobs Tracker application.

## Overview

The database integration provides:
- **Historical Data Storage**: Stores quantum backend data, jobs, metrics, and quantum states
- **Offline Mode**: Displays cached data when the connection to IBM Quantum is lost
- **15-minute Data Persistence**: Automatically stores data every 15 minutes
- **Data Cleanup**: Automatic cleanup of old data to prevent database bloat

## Database Schema

### Tables

1. **backends** - Stores quantum backend information
   - `id` (INTEGER PRIMARY KEY)
   - `name` (TEXT) - Backend name
   - `status` (TEXT) - Backend status
   - `qubits` (INTEGER) - Number of qubits
   - `operational` (BOOLEAN) - Whether backend is operational
   - `pending_jobs` (INTEGER) - Number of pending jobs
   - `data_json` (TEXT) - Full backend data as JSON
   - `timestamp` (DATETIME) - When data was stored

2. **jobs** - Stores quantum job information
   - `id` (INTEGER PRIMARY KEY)
   - `job_id` (TEXT UNIQUE) - IBM Quantum job ID
   - `backend_name` (TEXT) - Backend where job was run
   - `status` (TEXT) - Job status
   - `creation_date` (DATETIME) - When job was created
   - `end_date` (DATETIME) - When job completed
   - `queue_position` (INTEGER) - Position in queue
   - `result_json` (TEXT) - Job results as JSON
   - `timestamp` (DATETIME) - When data was stored

3. **metrics** - Stores aggregated metrics
   - `id` (INTEGER PRIMARY KEY)
   - `metric_name` (TEXT) - Name of the metric
   - `metric_value` (REAL) - Metric value
   - `metric_type` (TEXT) - Type of metric
   - `metadata` (TEXT) - Additional metadata as JSON
   - `timestamp` (DATETIME) - When metric was recorded

4. **quantum_states** - Stores quantum state information
   - `id` (INTEGER PRIMARY KEY)
   - `state_name` (TEXT) - Name of the quantum state
   - `state_vector` (TEXT) - State vector as JSON
   - `theta` (REAL) - Theta angle
   - `phi` (REAL) - Phi angle
   - `fidelity` (REAL) - State fidelity
   - `timestamp` (DATETIME) - When state was stored

5. **system_status** - Tracks system connection status
   - `id` (INTEGER PRIMARY KEY)
   - `is_online` (BOOLEAN) - Whether system is online
   - `last_successful_update` (DATETIME) - Last successful data update
   - `error_count` (INTEGER) - Number of consecutive errors
   - `last_error` (TEXT) - Last error message
   - `timestamp` (DATETIME) - When status was recorded

## API Endpoints

### Historical Data
- `GET /api/historical_data?hours=24` - Get historical data for last N hours
- `GET /api/offline_data` - Get cached data for offline mode
- `GET /api/metrics_history?metric=active_backends&hours=24` - Get historical metrics
- `GET /api/database_stats` - Get database statistics
- `POST /api/cleanup_database` - Clean up old data

### Request/Response Examples

#### Get Historical Data
```bash
curl "http://localhost:5000/api/historical_data?hours=24"
```

Response:
```json
{
  "success": true,
  "data": {
    "backends": [...],
    "jobs": [...],
    "metrics": [...],
    "quantum_states": [...],
    "system_status": {...},
    "last_update": "2024-01-15T10:30:00Z"
  },
  "offline_mode": false,
  "hours_back": 24
}
```

#### Get Offline Data
```bash
curl "http://localhost:5000/api/offline_data"
```

Response:
```json
{
  "success": true,
  "data": {
    "backends": [...],
    "jobs": [...],
    "metrics": [...],
    "quantum_state": {...},
    "offline_mode": true,
    "last_update": "2024-01-15T10:30:00Z"
  }
}
```

## Frontend Integration

### Offline Mode Features

1. **Connection Status Indicator**: Shows online/offline status in the header
2. **Offline Banner**: Displays when connection is lost with retry button
3. **Cached Data Display**: Shows last known data with offline indicators
4. **Historical Charts**: Displays historical trends using Chart.js

### Historical Data Widget

The dashboard includes a new "Historical Data" widget that provides:
- Time range selector (1 hour, 6 hours, 24 hours, 1 week)
- Interactive charts for backends and jobs over time
- Database statistics (data points, last update, database size)
- Export functionality for historical data

### JavaScript Integration

The `database_integration.js` file provides:
- Automatic offline/online detection
- Data caching and retrieval
- Historical chart creation
- Connection status management

## Configuration

### Database Settings

The database is configured in `database.py`:
- **Database File**: `quantum_data.db` (SQLite)
- **Connection Timeout**: 30 seconds
- **Thread Safety**: Uses threading locks for concurrent access

### Data Retention

- **Default Retention**: 30 days
- **Cleanup Frequency**: Manual via API endpoint
- **Storage Optimization**: Automatic VACUUM after cleanup

### Background Tasks

- **Data Storage**: Every 15 minutes (900 seconds)
- **Connection Check**: Every 30 seconds
- **Automatic Cleanup**: Not implemented (manual only)

## Usage Examples

### Testing Database Integration

Run the test script to verify functionality:

```bash
cd quantum_jobs_tracker
python test_database_integration.py
```

### Manual Data Cleanup

Clean up data older than 7 days:

```bash
curl -X POST "http://localhost:5000/api/cleanup_database" \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

### Viewing Database Statistics

```bash
curl "http://localhost:5000/api/database_stats"
```

## Troubleshooting

### Common Issues

1. **Database Locked Error**
   - Ensure no other processes are accessing the database
   - Check for long-running queries
   - Restart the application if necessary

2. **Offline Mode Not Working**
   - Check browser console for JavaScript errors
   - Verify API endpoints are accessible
   - Ensure database has cached data

3. **Historical Data Not Loading**
   - Check if data exists in the database
   - Verify time range selection
   - Check browser network tab for API errors

### Debugging

Enable debug logging by adding to your Flask app:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check database file:
```bash
sqlite3 quantum_data.db ".tables"
sqlite3 quantum_data.db "SELECT COUNT(*) FROM backends;"
```

## Performance Considerations

- **Database Size**: Monitor with `/api/database_stats`
- **Query Performance**: Indexes are created for common queries
- **Memory Usage**: SQLite is lightweight but monitor for large datasets
- **Concurrent Access**: Thread-safe but avoid excessive concurrent writes

## Security Notes

- Database file is stored locally (not in version control)
- No sensitive data is stored (only public quantum data)
- API endpoints are read-only except for cleanup
- No authentication required for local development

## Future Enhancements

- [ ] Automatic data cleanup scheduling
- [ ] Data compression for large datasets
- [ ] Export to different formats (CSV, Excel)
- [ ] Real-time data streaming
- [ ] Database backup/restore functionality
- [ ] Advanced analytics and reporting
