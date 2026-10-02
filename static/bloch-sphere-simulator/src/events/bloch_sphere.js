import {
    GlobalContext
} from "./../context.js";

import {
    ToolboxEventsNamespace
} from "./toolbox.js";

import { 
    NavbarEventsNamespace 
} from "./navbar.js";


var BlochSphereEventsNamespace = {
    updateBlochSphereState: function() {
        // get blochsphere state
        let blochSphereState = GlobalContext.blochSphere.blochSphereState;
    
        // update theta & phi
        $("#theta-value").html(blochSphereState.theta.toString());
        $("#phi-value").html(blochSphereState.phi.toString());
    
        // update alpha & beta
        $("#alpha-value").html(blochSphereState.alpha.toString());
        $("#beta-value").html(blochSphereState.beta.toString());
    
        // update x, y & z
        $("#x-value").html(blochSphereState.x.toString());
        $("#y-value").html(blochSphereState.y.toString());
        $("#z-value").html(blochSphereState.z.toString());
    },
    
    blochSphereOperation: function() {
        if (GlobalContext.blochSphereOperation.inProgress) {
            if (GlobalContext.blochSphereOperation.rotation == 0) {
                // set inProgress flag to false
                GlobalContext.blochSphereOperation.inProgress = false;
    
                // get blochSphere state
                let blochSphereState = GlobalContext.blochSphere.blochSphereState;
    
                // save theta & phi
                GlobalContext.blochSphereStateProperties.theta = blochSphereState.theta;
                GlobalContext.blochSphereStateProperties.phi = blochSphereState.phi;

                // diable quantum gates
                ToolboxEventsNamespace.enableQuantumGates();
    
                // save workspace
                NavbarEventsNamespace.saveWorkspace();
            }
            else {
                if (GlobalContext.blochSphereOperation.rotation > 0) {
                    // apply delta quantum operation
                    GlobalContext.blochSphereOperation.rotation -= 1;
                    GlobalContext.blochSphere.updateBlochSphereState(GlobalContext.blochSphereOperation.rotationAxis, THREE.Math.degToRad(1));
                }
                else {
                    // apply delta quantum operation
                    GlobalContext.blochSphereOperation.rotation += 1;
                    GlobalContext.blochSphere.updateBlochSphereState(GlobalContext.blochSphereOperation.rotationAxis, THREE.Math.degToRad(-1));
                }
    
                // update blochsphere state
                BlochSphereEventsNamespace.updateBlochSphereState();
            }
        }
    },
    
    startBlochSphereOperation: function(gate) {
        // disable quantum gates
        ToolboxEventsNamespace.disableQuantumGates();
    
        // set inProgress flag to true
        GlobalContext.blochSphereOperation.inProgress = true;
    
        // set rotationAxis and rotation
        GlobalContext.blochSphereOperation.rotationAxis = gate.rotationAxis;
        GlobalContext.blochSphereOperation.rotation = gate.rotation
    }
}


export {
    BlochSphereEventsNamespace
}
