import {
    GlobalContext
} from "./context.js";

import {
    ToolboxEventsNamespace
} from "./events/toolbox.js";

import {
    BlochSphereEventsNamespace
} from "./events/bloch_sphere.js";

// Make GlobalContext globally available
window.GlobalContext = GlobalContext;
window.ToolboxEventsNamespace = ToolboxEventsNamespace;
window.BlochSphereEventsNamespace = BlochSphereEventsNamespace;

console.log('✅ Bloch sphere modules loaded globally');

window.onload = function () {
    GlobalContext.onload();
}

window.onresize = function () {
    GlobalContext.onresize();
}
