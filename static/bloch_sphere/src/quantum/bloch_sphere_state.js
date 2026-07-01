// Use global THREE object instead of ES6 import for browser compatibility
// import * as THREE from 'three';

import {
    Float
} from "../math/float.js";

import {
    Complex
} from "../math/complex.js";


class BlochSphereState {
    constructor(theta, phi) {
        this.update(theta, phi);
    }

    load() {
        // Compatibility fix for THREE.Math.degToRad
        const degToRad = THREE.Math?.degToRad || THREE.MathUtils?.degToRad || ((deg) => deg * Math.PI / 180);
        
        this.alpha = Float.round(Math.cos(degToRad(this.theta) / 2));
        this.beta = new Complex(
            Float.round(Math.cos(degToRad(this.phi)) * Math.sin(degToRad(this.theta) / 2)),
            Float.round(Math.sin(degToRad(this.phi)) * Math.sin(degToRad(this.theta) / 2))
        );

        this.x = Float.round(Math.sin(degToRad(this.theta)) * Math.cos(degToRad(this.phi)));
        this.y = Float.round(Math.sin(degToRad(this.theta)) * Math.sin(degToRad(this.phi)));
        this.z = Float.round(Math.cos(degToRad(this.theta)));
    }

    update(theta, phi) {
        this.theta = Float.round(theta);
        this.phi = Float.round(phi);
        this.load();
    }
}

export {
    BlochSphereState
}
