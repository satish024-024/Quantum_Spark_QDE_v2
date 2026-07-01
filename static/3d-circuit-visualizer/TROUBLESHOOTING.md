# Troubleshooting 3D Quantum Circuit Visualizer

## 🔍 Common Issues and Solutions

### Issue: "Failed to load visualization"

If the 3D visualization fails to load, follow these troubleshooting steps:

## Step 1: Check Browser Console

1. **Open Developer Tools**:
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Press `Cmd+Option+I` (Mac)

2. **Look for errors in the Console tab**:
   - Red error messages
   - Failed script loading warnings
   - WebGL-related errors

## Step 2: Run Diagnostics

The application includes an automatic diagnostic tool that runs when the page loads. Check the console for:

```
🔍 Running Quantum Visualizer Diagnostics...
```

If you don't see this, manually run diagnostics by typing in the console:
```javascript
runDiagnostics()
```

## Step 3: Common Issues and Fixes

### ❌ Three.js Not Loading
**Symptoms**: Console shows "Three.js library not loaded"
**Solutions**:
- Check your internet connection
- Disable ad blockers temporarily
- Try refreshing the page
- Check if the CDN is blocked by your network

### ❌ WebGL Not Supported
**Symptoms**: Console shows "WebGL not supported"
**Solutions**:
- Update your graphics drivers
- Enable WebGL in browser settings
- Try a different browser (Chrome, Firefox, Edge)
- Check if hardware acceleration is enabled

### ❌ Canvas Element Not Found
**Symptoms**: Console shows "Canvas element not found"
**Solutions**:
- Check if `index.html` is loading correctly
- Verify the canvas ID is correct (`threejs-canvas`)
- Check browser network tab for failed HTML requests

### ❌ Canvas Has Zero Dimensions
**Symptoms**: Console shows canvas dimensions as 0x0
**Solutions**:
- Check CSS for the canvas container
- Ensure parent containers have proper sizing
- Try resizing the browser window
- Check for CSS conflicts

### ❌ Scripts Not Loading
**Symptoms**: Console shows "Failed to load [script name]"
**Solutions**:
- Check if the server is running (`npm run dev`)
- Verify file paths in the HTML
- Check browser network tab for 404 errors
- Ensure all JS files exist in the `js/` directory

## Step 4: Test Files

### Three.js Test Page
Visit `http://localhost:3000/test.html` to test basic Three.js functionality.

### Manual Tests

1. **Test WebGL Support**:
   ```javascript
   const canvas = document.createElement('canvas');
   const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
   console.log('WebGL supported:', !!gl);
   ```

2. **Test Three.js Loading**:
   ```javascript
   console.log('Three.js loaded:', typeof THREE !== 'undefined');
   if (typeof THREE !== 'undefined') {
       console.log('Version:', THREE.REVISION);
   }
   ```

3. **Test Canvas Element**:
   ```javascript
   const canvas = document.getElementById('threejs-canvas');
   console.log('Canvas found:', !!canvas);
   if (canvas) {
       console.log('Dimensions:', canvas.clientWidth, 'x', canvas.clientHeight);
   }
   ```

## Step 5: Browser-Specific Issues

### Chrome/Chromium
- Enable hardware acceleration: `chrome://settings/?search=hardware+acceleration`
- Check GPU settings: `chrome://gpu/`

### Firefox
- Enable WebGL: `about:config` → `webgl.force-enabled` = true
- Check WebGL status: `about:support`

### Safari
- Enable WebGL in Develop menu
- Update to latest version

## Step 6: System Requirements

**Minimum Requirements:**
- Modern browser with WebGL support
- Graphics card with OpenGL support
- Stable internet connection
- JavaScript enabled

**Recommended:**
- Chrome 90+ or Firefox 88+
- Dedicated graphics card
- 4GB+ RAM
- Fast internet connection

## Step 7: Getting Help

If issues persist:

1. **Check the console output** from the diagnostic tool
2. **Note your browser and OS version**
3. **Include the exact error messages**
4. **Try the test page** (`test.html`) to isolate the issue

## 🔧 Quick Fixes

### Restart the Application
```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Clear Browser Cache
- Hard refresh: `Ctrl+F5` or `Cmd+Shift+R`
- Clear browser cache completely

### Disable Extensions
- Try in incognito/private mode
- Disable browser extensions temporarily

### Update Everything
- Update your browser
- Update graphics drivers
- Update operating system

## 📊 Diagnostic Output Reference

### Successful Load
```
Three.js loaded successfully
QuantumSimulator loaded
QuantumVisualizer loaded
QuantumCircuit loaded
Gate3D loaded
IBMIntegration loaded
Main script loaded
Quantum Visualizer initialized successfully
```

### Common Error Patterns
- **Network errors**: Check internet connection
- **404 errors**: Check file paths and server
- **WebGL errors**: Update graphics drivers
- **Canvas errors**: Check HTML structure
- **Script errors**: Check JavaScript syntax

## 🚀 Alternative Solutions

If the main application doesn't work, try:

1. **Test Page**: `http://localhost:3000/test.html`
2. **Online Demo**: Check if Three.js examples work
3. **Different Browser**: Try Chrome, Firefox, or Edge
4. **Virtual Machine**: Test in a different environment

---

**Still having issues?** Check the browser console for the diagnostic output and include it when asking for help!
