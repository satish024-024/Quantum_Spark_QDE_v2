# 🔍 API Testing Suite

This directory contains comprehensive testing tools to verify that your Quantum Jobs Tracker API is working correctly and retrieving data.

## 📁 Test Files Created

### 1. `quick_api_check.py` - Quick Verification
- **Purpose**: Fast, basic test to verify API is working
- **Runtime**: ~30 seconds
- **Tests**: Server status, basic endpoints, data retrieval
- **Use when**: You want a quick check without detailed analysis

### 2. `comprehensive_api_test.py` - Full Analysis
- **Purpose**: Complete testing of all API endpoints and functionality
- **Runtime**: ~2-3 minutes
- **Tests**: Authentication, all endpoints, data validation, quantum connectivity
- **Use when**: You need detailed analysis and want to verify everything

### 3. `test_api.bat` - Windows Batch Script
- **Purpose**: Easy one-click testing on Windows
- **Features**: Menu-driven interface, automatic Python detection
- **Use when**: You prefer GUI-style interaction on Windows

### 4. `test_api.ps1` - PowerShell Script
- **Purpose**: Enhanced Windows testing with better error handling
- **Features**: Colored output, better error messages
- **Use when**: You have PowerShell and want enhanced experience

## 🚀 How to Use

### Option 1: Quick Check (Recommended for daily use)
```bash
python quick_api_check.py
```

### Option 2: Comprehensive Test (Recommended for troubleshooting)
```bash
python comprehensive_api_test.py
```

### Option 3: Windows Batch File
```cmd
test_api.bat
```

### Option 4: PowerShell (Windows)
```powershell
.\test_api.ps1
```

## 📊 What Gets Tested

### ✅ Basic Functionality
- Server running and responding
- HTTP endpoints accessible
- JSON responses valid
- Error handling working

### 🔐 Authentication
- User registration flow
- Login functionality
- Token-based authentication
- Protected endpoint access

### 📡 Data Retrieval
- Quantum jobs data
- Backend information
- Performance metrics
- Historical data
- Real-time monitoring
- Dashboard metrics
- Database statistics

### 🌐 Quantum Connectivity
- IBM Quantum API connection
- Backend availability
- Credential validation
- Data synchronization

### 🎛️ Dashboard Features
- All dashboard variants
- POST endpoint functionality
- Real-time updates
- Caching mechanisms

## 📈 Understanding Results

### Success Indicators ✅
- **Server Running**: API server is accessible
- **Data Received**: Endpoints returning actual data
- **Authentication Working**: Login/registration functional
- **Quantum Connected**: Real IBM Quantum data available

### Warning Indicators ⚠️
- **Auth Required**: Endpoint needs login (normal for protected areas)
- **Empty Response**: No data available (could be normal)
- **Status Codes**: HTTP responses other than 200

### Error Indicators ❌
- **Connection Failed**: Server not running
- **Import Errors**: Missing dependencies
- **Timeout**: Network or server issues

## 🔧 Troubleshooting

### Server Not Running
```bash
# Start the main application
python real_quantum_app.py

# Or start the hackathon version
python hackathon_dashboard_app.py
```

### No Data Received
1. **Check Authentication**: Register and login first
2. **Check IBM Credentials**: Add valid API token and CRN
3. **Check Network**: Ensure internet connection for quantum data
4. **Check Database**: Verify database is initialized

### Import Errors
```bash
# Install required dependencies
pip install -r requirements.txt

# Or install specific packages
pip install requests flask qiskit-ibm-runtime
```

## 📋 Test Results Interpretation

### Quick Check Results
- Shows basic server status
- Indicates if data is being retrieved
- Provides immediate feedback

### Comprehensive Test Results
- Detailed report with success rates
- Endpoint-by-endpoint analysis
- Data size and content validation
- Recommendations for improvement

## 🎯 Best Practices

1. **Run Quick Check First**: Always start with the quick check
2. **Check Server Status**: Ensure server is running before testing
3. **Authenticate When Needed**: Register/login for protected endpoints
4. **Monitor Regularly**: Run tests periodically to catch issues early
5. **Use Comprehensive Test**: When troubleshooting or after major changes

## 🔄 Integration with Development

### Before Deploying
```bash
python comprehensive_api_test.py
```

### Daily Health Check
```bash
python quick_api_check.py
```

### After Code Changes
```bash
python comprehensive_api_test.py
```

## 📞 Support

If tests fail:
1. Check the detailed error messages
2. Verify server is running
3. Check authentication status
4. Validate IBM Quantum credentials
5. Review network connectivity

## 🎉 Success Criteria

Your API is working well when:
- ✅ Server responds to all requests
- ✅ Authentication flow works
- ✅ Data endpoints return information
- ✅ Quantum connectivity established (if credentials provided)
- ✅ Dashboard functionality accessible

---

**Happy Testing!** 🚀

