// 3D Plotting functions for Bloch sphere visualization
// Clean working version from Blochy repository

function init_plotting(data) {
    const config = {
        displayModeBar: false, // hide toolbar
        responsive: true // resize 
    };

    var layout = {
        hovermode: 'closest',
        scene: {
            xaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            }, 
            yaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            },
            zaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            },
            camera: {
                center: {
                    x:0, y:0,z:0
                },
                eye: {
                    x:-0.9, y:1, z:0.6
                },
                projection: 'perspective'
            }
        },
        showlegend: false,
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        },
        annotations: [
            {
                showarrow: false,
                text: 'bloch.kherb.io',
                x:1.0,
                y:0.0,
                xref: 'paper',
                yref: 'paper', 
                xanchor: 'right',
                yanchor: 'bottom',
                opacity: 0.4
            }
        ]
    };

    Plotly.react('bloch-3d-container', data, layout, config);
}

function cylinder_axes(v,k=[2,0,0]) {
    // v needs to be normalized, k must not be parallel to v
    // t is height
    qp = math.subtract(k,math.dotMultiply(Array(3).fill(math.dot(v,k)),v));
    q = math.dotMultiply(qp,Array(3).fill(1/math.norm(qp,2)));
    p = math.cross(v,q);
    p = math.dotMultiply(p,Array(3).fill(1/math.norm(p,2)));
    return [q,p]
}

function gen_vector_plot(vector,normalize=true) {
    color = document.getElementById('spin_color')?.value || '#1a237e';
    [u,v,w] = vector;
    if (normalize === true) {
        l = math.sqrt(u**2+v**2+w**2);
        u = u/l;
        v = v/l;
        w = w/l;
    }
    
    hovertext = '|Ψ⟩= |0⟩+ 0.5 |1⟩<extra></extra>';
    
    zax = [u,v,w];
    [q,p] = cylinder_axes(zax);

    xarr = Array(0);
    yarr = Array(0);
    zarr = Array(0);
    
    for (var i = 0; i < 7; i++) {
        phi = 2*Math.PI*i/6;
        r = 0.025;
        l = 0.9
        xarr.push([(q[0]*math.cos(phi)+p[0]*math.sin(phi))*r,(q[0]*math.cos(phi)+p[0]*math.sin(phi))*r+zax[0]*l]);
        yarr.push([(q[1]*math.cos(phi)+p[1]*math.sin(phi))*r,(q[1]*math.cos(phi)+p[1]*math.sin(phi))*r+zax[1]*l]);
        zarr.push([(q[2]*math.cos(phi)+p[2]*math.sin(phi))*r,(q[2]*math.cos(phi)+p[2]*math.sin(phi))*r+zax[2]*l]);
    }

    var upp = {
        name: 'tail',
        x:xarr, y: yarr, z: zarr,
        type: 'surface',
        colorscale: [['0.0', color], ['1.0',color]],
        showscale: false,
        opacity:1.0,
        hovertemplate: hovertext,
        contours: {
            x : { highlight: false },
            y : { highlight: false },
            z : { highlight: false }
        }
    };
    
    var head = {
        u: [0.3*(u)],
        v: [0.3*(v)],
        w: [0.3*(w)],
        sizemode: 'absolute',
        sizeref: .25,
        hovertemplate: hovertext,
        colorscale: [['0.0', color], ['1.0',color]],
        showscale: false,
        type: 'cone',
        anchor: 'tip',
        x: [u],
        y: [v],
        z: [w]
    }
    
    return [head,upp]
}

function gen_bloch_sphere() {
    theta = linspace(0,Math.PI,20);
    phi = linspace(0,2*Math.PI,40);
    [u,v] = meshgrid(theta,phi);
    su = math.map(u,math.sin);
    xs = math.dotMultiply(math.map(v,math.cos),su);
    ys = math.dotMultiply(math.map(v,math.sin),su);
    zs = math.map(u,math.cos);
    window.gen_bloch_sphere = gen_bloch_sphere;

    var x = []
    var y = []
    var z = []
    var xb = []
    var yb = []
    var zb = []
    
    for (var i = 0; i < 12; i++) {
        //meridians 
        t = i*math.PI/6;
        xcurr = math.multiply(math.map(theta,math.sin),math.cos(t));
        ycurr = math.multiply(math.map(theta,math.sin),math.sin(t));
        zcurr = math.map(theta,math.cos);
        if ([0,3,6,9].includes(i)) {
            xb = xb.concat(xcurr);
            xb = xb.concat([null]);
            yb = yb.concat(ycurr);
            yb = yb.concat([null]);
            zb = zb.concat(zcurr);
            zb = zb.concat([null]);
        }
        else {
            x = x.concat(xcurr);
            x = x.concat([null]);
            y = y.concat(ycurr);
            y = y.concat([null]);
            z = z.concat(zcurr);
            z = z.concat([null]);
        }
    }
    
    for (var i = 1; i < 9; i++) {
        //parallels
        t = i*math.PI/6;
        xcurr = math.multiply(math.map(phi,math.cos),math.sin(t));
        ycurr = math.multiply(math.map(phi,math.sin),math.sin(t));
        zcurr = Array(phi.length).fill(math.cos(t));

        if ([3].includes(i)) {
            xb = xb.concat(xcurr);
            xb = xb.concat([null]);
            yb = yb.concat(ycurr);
            yb = yb.concat([null]);
            zb = zb.concat(zcurr);
            zb = zb.concat([null]);
        }
        else {
            x = x.concat(xcurr);
            x = x.concat([null]);
            y = y.concat(ycurr);
            y = y.concat([null]);
            z = z.concat(zcurr);
            z = z.concat([null]);
        }        
    }

    var sphere = {
        name: 'sphere',
        x:xs, y: ys, z: zs,
        type: 'surface',
        colorscale: [['0.0', '#AAAAAA' ], ['1.0', '#AAAAAA']],
        showscale: false,
        opacity:0.1,
        hoverinfo: 'skip',
        contours: {
            x : { highlight: false },
            y : { highlight: false },
            z : { highlight: false }
        }
    };

    var gridlines = {
        name: 'gridlines_bold',
        x:x, y: y, z: z,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 0.05,
        line: {color: '#000000', width:3},
    }

    var gridlines_bold = {
        name: 'gridlines_bold',
        x:xb, y: yb, z: zb,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 0.075,
        line: {color: '#000000', width:3},
    }

    var equator_plane = {
        name: 'equator_plane',
        x: xs, y:ys, z:math.multiply(zs,0),
        type: 'surface',
        colorscale: [['0.0', '#AAAAAA' ], ['1.0', '#AAAAAA']],
        showscale: false,
        opacity:0.075,
        hoverinfo: 'skip',
    }

    north_text = document.getElementById('north_text')?.value || "0";
    south_text = document.getElementById('south_text')?.value || "1";
    if (north_text != "") {
        north_text = "|" + north_text + "⟩"
    }
    if (south_text != "") {
        south_text = "|" + south_text + "⟩"
    }

    var axes = {
        name: 'axes',
        x: [-1,1,null,0,0,null,0,0], y:[0,0,null,-1,1,null,0,0], z:[0,0,null,0,0,null,-1,1],
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines+text',
        opacity: 0.5,
        line: {color: '#000000', width:3},
        text: ["x","","","y","","","",north_text,""],
        textfont: {
            size:30,
            color: "#000000"
        },
        textposition: 'top center'
    }
    
    var lower_tag = {
        x: [0], y:[0], z:[-1],
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'text',
        opacity: 0.5,
        line: {color: '#000000', width:3},
        text: [south_text],
        textfont: {
            size:30,
            color: "#000000"
        },
        textposition: 'bottom center'
    }

    return [sphere, gridlines, gridlines_bold,equator_plane,axes,lower_tag]
}

function update_state_plot(full_update=false) {
    if (full_update) {
        BLOCHSPHERE = gen_bloch_sphere();
    }
    
    point_vector = state2vector(QMSTATEVECTOR[QMSTATEVECTOR.length-1]);
    new_data = gen_vector_plot(point_vector);
    
    if (PHOSPHOR_ENABLED === true) {
        phosphor_length = document.getElementById('phosphor_length')?.value || 10;
        phosphor_length = phosphor_length - 1;
        startidx = PHOSPHOR.length-1-phosphor_length;
        if (startidx < 0) {
            startidx = 0;
        }
        stopidx = PHOSPHOR.length;
        phosphor_data = PHOSPHOR.slice(startidx,stopidx);
    }
    else {
        phosphor_data = []
    }
    
    init_plotting(BLOCHSPHERE.concat(new_data).concat(phosphor_data));
}

// Make functions globally available
window.update_state_plot = update_state_plot;
window.init_plotting = init_plotting;
window.gen_bloch_sphere = gen_bloch_sphere;
window.gen_vector_plot = gen_vector_plot;

// Helper functions for mathematical operations
function linspace(start, end, num) {
    const step = (end - start) / (num - 1);
    return Array.from({length: num}, (_, i) => start + step * i);
}

function meshgrid(x, y) {
    const X = [];
    const Y = [];
    
    for (let i = 0; i < y.length; i++) {
        X[i] = [];
        Y[i] = [];
        for (let j = 0; j < x.length; j++) {
            X[i][j] = x[j];
            Y[i][j] = y[i];
        }
    }
    
    return [X, Y];
}

// Add missing math.js functions if not available
if (typeof math === 'undefined') {
    // Create a minimal math object if math.js is not loaded
    window.math = {
        dot: function(a, b) {
            if (Array.isArray(a) && Array.isArray(b)) {
                let result = 0;
                for (let i = 0; i < a.length; i++) {
                    result += a[i] * b[i];
                }
                return result;
            }
            return 0;
        },
        norm: function(a) {
            if (Array.isArray(a)) {
                let result = 0;
                for (let i = 0; i < a.length; i++) {
                    result += a[i] * a[i];
                }
                return Math.sqrt(result);
            }
            return 0;
        },
        complex: function(real, imag) {
            return { re: real, im: imag || 0 };
        },
        multiply: function(a, b) {
            if (typeof a === 'number' && typeof b === 'number') {
                return a * b;
            }
            return 0;
        }
    };
} else if (typeof math.dot === 'undefined') {
    math.dot = function(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            let result = 0;
            for (let i = 0; i < a.length; i++) {
                result += a[i] * b[i];
            }
            return result;
        }
        return 0;
    };
}

if (typeof math.cross === 'undefined') {
    math.cross = function(a, b) {
        if (Array.isArray(a) && Array.isArray(b) && a.length >= 3 && b.length >= 3) {
            return [
                a[1] * b[2] - a[2] * b[1],
                a[2] * b[0] - a[0] * b[2],
                a[0] * b[1] - a[1] * b[0]
            ];
        }
        return [0, 0, 0];
    };
}

if (typeof math.norm === 'undefined') {
    math.norm = function(a, p = 2) {
        if (Array.isArray(a)) {
            if (p === 2) {
                let sum = 0;
                for (let i = 0; i < a.length; i++) {
                    sum += a[i] * a[i];
                }
                return Math.sqrt(sum);
            }
        }
        return 0;
    };
}

if (typeof math.dotMultiply === 'undefined') {
    math.dotMultiply = function(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            const result = [];
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                result.push(a[i] * b[i]);
            }
            return result;
        } else if (Array.isArray(a) && typeof b === 'number') {
            return a.map(val => val * b);
        }
        return [];
    };
}

if (typeof math.subtract === 'undefined') {
    math.subtract = function(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            const result = [];
            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                result.push(a[i] - b[i]);
            }
            return result;
        }
        return [];
    };
}

if (typeof math.multiply === 'undefined') {
    math.multiply = function(a, b) {
        if (typeof a === 'number' && Array.isArray(b)) {
            return b.map(val => a * val);
        } else if (Array.isArray(a) && typeof b === 'number') {
            return a.map(val => val * b);
        }
        return 0;
    };
}

if (typeof math.map === 'undefined') {
    math.map = function(array, func) {
        if (Array.isArray(array)) {
            // Handle nested arrays recursively
            if (array.length > 0 && Array.isArray(array[0])) {
                return array.map(row => math.map(row, func));
            }
            return array.map(func);
        }
        return [];
    };
}

if (typeof math.sin === 'undefined') {
    math.sin = Math.sin;
}

if (typeof math.cos === 'undefined') {
    math.cos = Math.cos;
}

if (typeof math.sqrt === 'undefined') {
    math.sqrt = Math.sqrt;
}
