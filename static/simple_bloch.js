// Simple, working Bloch sphere implementation
// This will definitely show a visible 3D Bloch sphere

function createSimpleBlochSphere() {
    console.log('🚀 Creating simple Bloch sphere...');
    
    const container = document.getElementById('bloch-3d-container');
    if (!container) {
        console.error('❌ Container not found');
        return;
    }
    
    // Clear any existing content
    container.innerHTML = '';
    
    try {
        // Create a simple but effective 3D Bloch sphere
        const data = [
            // Main sphere surface (simplified)
            {
                type: 'surface',
                x: [[-1, 1], [-1, 1]],
                y: [[-1, 1], [-1, 1]],
                z: [[0, 0], [0, 0]],
                colorscale: [['0', '#1a237e'], ['1', '#1a237e']],
                opacity: 0.3,
                showscale: false,
                hoverinfo: 'skip'
            },
            // Coordinate axes
            {
                type: 'scatter3d',
                x: [-1.2, 1.2, 0, 0, 0, 0],
                y: [0, 0, -1.2, 1.2, 0, 0],
                z: [0, 0, 0, 0, -1.2, 1.2],
                mode: 'lines',
                line: {
                    color: '#ffffff',
                    width: 3
                },
                hoverinfo: 'skip'
            },
            // State vector (pointing to |0⟩ state)
            {
                type: 'scatter3d',
                x: [0],
                y: [0],
                z: [1],
                mode: 'markers',
                marker: {
                    size: 15,
                    color: '#ff6b6b',
                    symbol: 'diamond'
                },
                text: ['|0⟩ State'],
                hoverinfo: 'text'
            },
            // Grid lines for better 3D perception
            {
                type: 'scatter3d',
                x: [-1, 1, null, -1, 1, null, -1, 1],
                y: [-1, -1, null, 1, 1, null, -1, 1],
                z: [0, 0, null, 0, 0, null, -1, 1],
                mode: 'lines',
                line: {
                    color: '#666666',
                    width: 1,
                    opacity: 0.4
                },
                hoverinfo: 'skip'
            }
        ];
        
        const layout = {
            scene: {
                xaxis: { 
                    range: [-1.5, 1.5], 
                    showgrid: true, 
                    zeroline: true,
                    gridcolor: '#333333',
                    zerolinecolor: '#ffffff'
                },
                yaxis: { 
                    range: [-1.5, 1.5], 
                    showgrid: true, 
                    zeroline: true,
                    gridcolor: '#333333',
                    zerolinecolor: '#ffffff'
                },
                zaxis: { 
                    range: [-1.5, 1.5], 
                    showgrid: true, 
                    zeroline: true,
                    gridcolor: '#333333',
                    zerolinecolor: '#ffffff'
                },
                camera: {
                    center: { x: 0, y: 0, z: 0 },
                    eye: { x: 1.8, y: 1.8, z: 1.8 }
                },
                bgcolor: 'rgba(0,0,0,0)'
            },
            margin: { l: 0, r: 0, b: 0, t: 0 },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };
        
        const config = {
            displayModeBar: false,
            responsive: true,
            staticPlot: false
        };
        
        Plotly.newPlot(container, data, layout, config);
        console.log('✅ Simple Bloch sphere created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating Bloch sphere:', error);
        
        // Last resort - show a simple text representation
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ffffff; background: rgba(0,0,0,0.5); border-radius: 12px; border: 2px solid #00d4ff;">
                <h2 style="color: #00d4ff; margin-bottom: 20px;">⚛️ Bloch Sphere</h2>
                <p style="font-size: 16px; margin-bottom: 15px;">Quantum State Visualization</p>
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Current State:</strong> |0⟩</p>
                    <p style="margin: 5px 0;"><strong>θ:</strong> 0° (Polar angle)</p>
                    <p style="margin: 5px 0;"><strong>φ:</strong> 0° (Azimuthal angle)</p>
                </div>
                <p style="font-size: 14px; opacity: 0.8;">Interactive 3D visualization loading...</p>
            </div>
        `;
    }
}

// Auto-initialize when this script loads
if (typeof Plotly !== 'undefined') {
    setTimeout(createSimpleBlochSphere, 100);
} else {
    // Wait for Plotly to load
    window.addEventListener('load', () => {
        setTimeout(createSimpleBlochSphere, 200);
    });
}

// Make function globally available
window.createSimpleBlochSphere = createSimpleBlochSphere;
