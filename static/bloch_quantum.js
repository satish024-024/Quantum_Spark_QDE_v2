// Quantum mechanics functions for Bloch sphere visualization
// Based on https://github.com/kherb27/Blochy.git

function state2vector(state) {
    // Simplified version that works with basic arrays
    try {
        let stateData = state;
        if (state._data) {
            stateData = state._data;
        } else if (Array.isArray(state)) {
            stateData = state;
        }
        
        // For simple real numbers, calculate Bloch sphere coordinates
        const alpha = stateData[0];
        const beta = stateData[1];
        
        // Normalize if needed
        const norm = Math.sqrt(alpha * alpha + beta * beta);
        if (norm > 0) {
            const alpha_norm = alpha / norm;
            const beta_norm = beta / norm;
            
            // Calculate Bloch sphere coordinates
            const u = 2 * alpha_norm * beta_norm;
            const v = 0; // No imaginary part in simplified version
            const w = alpha_norm * alpha_norm - beta_norm * beta_norm;
            
            return [u, v, w];
        } else {
            return [0, 0, 1]; // Default to |0⟩ state
        }
    } catch (error) {
        console.error('Error in state2vector:', error);
        return [0, 0, 1];
    }
}

function rot(axis_op, angle, ...state) {
    //rot_op = (-1j*phi*op).expm()
    if (typeof(axis_op) === 'string') {
        if (axis_op === 'x') {
            op = math.matrix([[0,math.complex(0.5,0)],[math.complex(0.5,0),0]]);
        }
        else if (axis_op === 'y') {
            op =  math.matrix([[0,math.complex(0,-0.5)],[math.complex(0,0.5),0]]);
        }
        else if (axis_op === 'z') {
            op = math.matrix([[math.complex(0.5,0),0],[0,math.complex(-0.5,0)]]);
        }
        else {
            throw 'Unknown axis string';
        } 
    }
    /*
    else if (false) {
        
    }
     */
    else {
        op = axis_op;
    }
   
    //console.log(math.multiply(math.complex(0,-angle),op));
    rot_op = math.expm(math.multiply(math.complex(0,-angle),op));
    //console.log("Rotation operator");
    //console.log(rot_op);
    if (state.length === 0) {
        return rot_op
    }
    else {
    //console.log("new state is");
    //console.log(math.multiply(rot_op,state[0]));
    return math.multiply(rot_op,state[0])
    }

}

function gen_state(up_is_true) {
    if (up_is_true) {
        // Return |0⟩ state as simple array [1, 0]
        return [1, 0];
    } else {
        // Return |1⟩ state as simple array [0, 1]
        return [0, 1];
    }
}

// Make functions globally available
window.gen_state = gen_state;
window.state2vector = state2vector;
window.rot = rot;
window.rot_phosphor = rot_phosphor;
window.pulse = pulse;
window.pulse_phosphor = pulse_phosphor;
window.rabi_plot = rabi_plot;

function print_state(state){
    arrText = '(' + state['_data'][0] + ', ' + state['_data'][1] + ')';
    console.log(arrText);
}

function rot_phosphor(axis_op, angle, state, divider=10) {
    //console.log("Divider is");
    //console.log(divider);
    uarr = [];
    varr = [];
    warr = [];
    [u,v,w] = state2vector(state);
    uarr.push(u);
    varr.push(v);
    warr.push(w);
    
    for (var i = 1; i <= divider; i++) {
        staten = rot(axis_op,angle/divider*i,state);
        [u,v,w] = state2vector(staten);
        //console.log("We rotate by");
        //console.log(angle/divider*i);
        //console.log([u,v,w]);
        //console.log("old state");
        //console.log(state);
        //console.log("new state");
        //console.log(staten);
        uarr.push(u);
        varr.push(v);
        warr.push(w);
    }
    
    var hist = {
        x:uarr, y: varr, z: warr,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 1.0,
        line: {color: document.getElementById('phosphor_color')?.value || '#ff0000', width:3},
    }
    
    return hist
}

function pulse(axis, time, state) {
    //console.log("Pulse along axis");
    //console.log(axis);
    //console.log("for time");
    //console.log(time);
    //console.log("on state");
    //console.log(state);
    
    if (axis === 'x') {
        op = math.matrix([[0,math.complex(0.5,0)],[math.complex(0.5,0),0]]);
    }
    else if (axis === 'y') {
        op =  math.matrix([[0,math.complex(0,-0.5)],[math.complex(0,0.5),0]]);
    }
    else {
        throw 'Unknown axis string';
    }
    
    //console.log("Operator is");
    //console.log(op);
    
    pulse_op = math.expm(math.multiply(math.complex(0,-time),op));
    //console.log("Pulse operator is");
    //console.log(pulse_op);
    
    new_state = math.multiply(pulse_op,state);
    //console.log("New state is");
    //console.log(new_state);
    
    return new_state
}

function pulse_phosphor(axis, time, state, divider=10) {
    //console.log("Divider is");
    //console.log(divider);
    uarr = [];
    varr = [];
    warr = [];
    [u,v,w] = state2vector(state);
    uarr.push(u);
    varr.push(v);
    warr.push(w);
    
    for (var i = 1; i <= divider; i++) {
        staten = pulse(axis,time/divider*i,state);
        [u,v,w] = state2vector(staten);
        //console.log("We pulse by");
        //console.log(time/divider*i);
        //console.log([u,v,w]);
        //console.log("old state");
        //console.log(state);
        //console.log("new state");
        //console.log(staten);
        uarr.push(u);
        varr.push(v);
        warr.push(w);
    }
    
    var hist = {
        x:uarr, y: varr, z: warr,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 1.0,
        line: {color: document.getElementById('phosphor_color')?.value || '#ff0000', width:3},
    }
    
    return hist
}

function rabi_plot() {
    //console.log("Rabi plot");
    //console.log(document.getElementById('detuning').value);
    //console.log(document.getElementById('phase').value);
    //console.log(document.getElementById('amplitude').value);
    //console.log(document.getElementById('pulselength').value);
    
    detuning = parseFloat(document.getElementById('detuning')?.value || 0);
    phase = parseFloat(document.getElementById('phase')?.value || 0);
    amplitude = parseFloat(document.getElementById('amplitude')?.value || 1);
    pulselength = parseFloat(document.getElementById('pulselength')?.value || 0.5);
    
    //console.log("Detuning is");
    //console.log(detuning);
    //console.log("Phase is");
    //console.log(phase);
    //console.log("Amplitude is");
    //console.log(amplitude);
    //console.log("Pulse length is");
    //console.log(pulselength);
    
    // Rabi frequency
    omega_R = amplitude;
    
    // Effective Rabi frequency
    omega_eff = math.sqrt(omega_R**2 + detuning**2);
    
    // Time array
    t = linspace(0, pulselength, 100);
    
    // Population in excited state
    P_excited = [];
    for (var i = 0; i < t.length; i++) {
        P = (omega_R**2 / omega_eff**2) * math.sin(omega_eff * t[i] / 2)**2;
        P_excited.push(P);
    }
    
    // Create plot
    var data = [{
        x: t,
        y: P_excited,
        type: 'scatter',
        mode: 'lines',
        name: 'Excited State Population',
        line: {color: '#1f77b4', width: 2}
    }];
    
    var layout = {
        title: 'Rabi Oscillations',
        xaxis: {title: 'Time'},
        yaxis: {title: 'Population', range: [0, 1]},
        showlegend: true
    };
    
    // Check if rabi_div exists
    if (document.getElementById('rabi_div')) {
        Plotly.newPlot('rabi_div', data, layout);
    }
}
