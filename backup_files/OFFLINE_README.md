# Offline Functionality Documentation

## Overview

The Quantum Jobs Tracker now includes comprehensive offline functionality that allows the application to work seamlessly even when there's no internet connection. The system can cache data locally and provide a smooth user experience with automatic synchronization when connectivity is restored.

## Key Features

### 1. Enhanced Database Connection
- **Connection Pooling**: Improved connection management with automatic pooling
- **Retry Logic**: Automatic retry on database operation failures
- **Error Handling**: Comprehensive error handling with exponential backoff
- **Performance**: WAL mode, optimized cache settings, and connection limits

### 2. Automatic Synchronization
- **Background Sync**: Automatic data synchronization every 15-30 minutes
- **Configurable Intervals**: Adjustable sync intervals (5-60 minutes)
- **Smart Sync**: Only syncs when data is stale or on connection restoration
- **Status Tracking**: Real-time sync status monitoring

### 3. Offline Data Storage
- **IndexedDB Integration**: Browser-side data caching using IndexedDB
- **Data Expiration**: Configurable data expiration times (15/30 minutes)
- **Fallback Strategy**: Automatic fallback to cached data when offline
- **Cross-session Persistence**: Data persists across browser sessions

### 4. Offline Detection & UI
- **Connection Monitoring**: Real-time online/offline status detection
- **Visual Indicators**: Clear visual feedback for connection status
- **Graceful Degradation**: Smooth transition between online and offline modes
- **User Notifications**: Toast notifications for status changes

## Architecture

### Backend Components

#### Database Layer (`database.py`)
```python
class QuantumDatabase:
    # Enhanced with connection pooling and sync management
    def __init__(self, db_path="quantum_data.db")
    def start_background_sync()
    def perform_data_sync()
    def get_offline_data(max_age_minutes=30)
    def is_data_fresh(max_age_minutes=30)
```

#### API Endpoints
- `GET /api/offline_data` - Get cached data with expiration
- `GET /api/sync_status` - Get current sync status
- `POST /api/start_sync` - Start background sync
- `POST /api/set_sync_interval` - Configure sync interval
- `POST /api/force_sync` - Force immediate sync
- `GET /api/cached_data/<type>` - Get cached data by type

### Frontend Components

#### Offline Manager (`static/offline_manager.js`)
```javascript
class OfflineManager {
    // Handles IndexedDB, sync scheduling, and offline detection
    async init()
    async performSync()
    async getOfflineData(dataType, maxAgeMinutes)
    async isDataAvailable(dataType, maxAgeMinutes)
}
```

#### Status Dashboard (`templates/offline_status.html`)
- Real-time status monitoring
- Manual sync controls
- Data visualization
- Cache management

## Usage

### For Users

1. **Normal Operation**: The app works normally when online
2. **Offline Detection**: Automatic detection when connection is lost
3. **Cached Data**: Seamless access to recently cached data
4. **Auto Sync**: Automatic synchronization when connection returns

### For Developers

#### Initializing Offline Manager
```javascript
// Automatically initialized on page load
document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
});
```

#### Checking Data Availability
```javascript
// Check if data is available offline
const hasBackends = await offlineManager.isDataAvailable('backends', 30);
const hasJobs = await offlineManager.isDataAvailable('jobs', 30);
```

#### Getting Offline Data
```javascript
// Get cached data with expiration
const backends = await offlineManager.getBackends(30);
const jobs = await offlineManager.getJobs(30);
const metrics = await offlineManager.getMetrics(30);
```

#### Manual Sync Control
```javascript
// Force immediate sync
await offlineManager.forceSyncNow();

// Change sync interval
offlineManager.setSyncInterval(30); // 30 minutes
```

## Configuration

### Sync Intervals
- Default: 15 minutes
- Range: 5-60 minutes
- Configurable via API: `POST /api/set_sync_interval`

### Data Expiration
- Default: 30 minutes for offline data
- Configurable per request
- Automatic cleanup of old data

### Database Settings
- Connection pool size: 5 connections
- Retry attempts: 3 with exponential backoff
- WAL mode enabled for concurrency
- Automatic cleanup: 7 days retention for sync data

## API Reference

### Backend APIs

#### Get Offline Data
```http
GET /api/offline_data?max_age=30
Response: {
  "success": true,
  "data": {...},
  "offline_mode": true,
  "max_age_minutes": 30
}
```

#### Sync Status
```http
GET /api/sync_status
Response: {
  "success": true,
  "sync_status": {...},
  "is_data_fresh_15min": true,
  "is_data_fresh_30min": true,
  "sync_interval_minutes": 15
}
```

#### Force Sync
```http
POST /api/force_sync
Response: {
  "success": true,
  "message": "Data synchronization completed successfully"
}
```

### Frontend API

#### Offline Manager Methods
```javascript
// Check online status
const isOnline = offlineManager.isOnlineStatus();

// Get offline data
const backends = await offlineManager.getBackends(maxAgeMinutes);
const jobs = await offlineManager.getJobs(maxAgeMinutes);
const metrics = await offlineManager.getMetrics(maxAgeMinutes);
const quantumStates = await offlineManager.getQuantumStates(maxAgeMinutes);

// Check data availability
const hasData = await offlineManager.isDataAvailable(dataType, maxAgeMinutes);

// Manual sync
await offlineManager.forceSyncNow();
offlineManager.setSyncInterval(minutes);
```

## Testing

### Automated Tests
Run the test suite to verify offline functionality:

```bash
cd quantum_jobs_tracker
python test_offline_functionality.py
```

### Manual Testing

1. **Offline Status Dashboard**
   - Visit `/offline_status` to monitor offline capabilities
   - Check data freshness indicators
   - Test manual sync operations

2. **Browser Testing**
   - Open developer tools → Network tab
   - Set to "Offline" mode
   - Verify cached data loading
   - Restore connection and check auto-sync

3. **Data Persistence**
   - Load data while online
   - Close browser completely
   - Reopen and check if data persists

## Monitoring

### Database Statistics
Access via `GET /api/database_stats`:
```json
{
  "backends_count": 25,
  "jobs_count": 150,
  "database_size_bytes": 2097152,
  "backends_last_15min": 5,
  "backends_last_30min": 12,
  "is_data_fresh_15min": true,
  "is_data_fresh_30min": true
}
```

### Sync Status
Monitor via `GET /api/sync_status`:
```json
{
  "sync_status": {
    "is_online": true,
    "last_sync_time": "2025-09-11T10:30:00Z",
    "last_sync_error": null
  },
  "is_data_fresh_15min": true,
  "is_data_fresh_30min": true
}
```

## Troubleshooting

### Common Issues

1. **Data Not Syncing**
   - Check network connectivity
   - Verify API endpoints are accessible
   - Check browser console for errors
   - Review sync status via `/api/sync_status`

2. **Offline Data Not Loading**
   - Ensure IndexedDB is enabled in browser
   - Check browser storage quota
   - Clear browser cache and try again
   - Verify data exists in database

3. **Performance Issues**
   - Check database size via `/api/database_stats`
   - Run cleanup: `POST /api/cleanup_database`
   - Adjust sync intervals if needed
   - Monitor connection pool usage

### Debug Information
Enable debug logging by setting environment variable:
```bash
export QUANTUM_DEBUG=1
```

## Future Enhancements

- **Service Worker**: Background sync for complete offline functionality
- **Data Compression**: Reduce storage footprint
- **Selective Sync**: Sync only changed data
- **Conflict Resolution**: Handle data conflicts during sync
- **Push Notifications**: Real-time sync notifications

## Files Modified/Created

### Backend
- `database.py` - Enhanced with connection pooling and sync
- `real_quantum_app.py` - Added offline API endpoints
- `requirements.txt` - Added schedule dependency

### Frontend
- `static/offline_manager.js` - IndexedDB and sync management
- `templates/offline_status.html` - Status dashboard
- `test_offline_functionality.py` - Test suite

### Documentation
- `OFFLINE_README.md` - This documentation file

## Support

For issues or questions about offline functionality:
1. Check the troubleshooting section above
2. Run the test suite: `python test_offline_functionality.py`
3. Visit the status dashboard: `/offline_status`
4. Review logs and error messages
5. Check network connectivity and API access
