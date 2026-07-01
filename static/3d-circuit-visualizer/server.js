// Simple development server for the 3D Quantum Circuit Visualizer
// Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }

    const filePath = path.join(__dirname, pathname);

    // Security check - prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Internal server error');
            }
            return;
        }

        if (stats.isDirectory()) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'text/plain';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);

        readStream.on('error', (error) => {
            console.error('Error reading file:', error);
            res.writeHead(500);
            res.end('Internal server error');
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 Quantum Visualizer server running at http://${HOST}:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔄 Open your browser and navigate to http://${HOST}:${PORT}`);
    console.log(`⏹️  Press Ctrl+C to stop the server`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Quantum Visualizer server...');
    server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down Quantum Visualizer server...');
    server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
    });
});
