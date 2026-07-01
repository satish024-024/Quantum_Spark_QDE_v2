// Use global THREE object instead of ES6 import for browser compatibility
// import * as THREE from 'three';

import {
    Float
} from "./float.js";


class Vector3Helpers {
    static angleBetweenVectors(vector1, vector2, planeNormal) {
        let angle = THREE.Math.radToDeg(vector1.angleTo(vector2));
        let crossProduct = new THREE.Vector3();

        crossProduct.crossVectors(vector1, vector2);
        if (Float.round(crossProduct.dot(planeNormal)) < 0) {
            angle *= -1;
        }

        return angle;
    }
}


export {
    Vector3Helpers
}
