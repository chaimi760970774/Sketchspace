
import { reactiveModel } from "./mobxReactiveModel.js";
import { createElement, Fragment } from "react";
import { ReactRoot } from "./reactjs/ReactRoot.jsx";
import { createRoot } from "react-dom/client";

window.React = { createElement, Fragment }; // needed in the lab because it works with both React and Vue

const mountedApp = createRoot(document.getElementById('root'));
mountedApp.render(<ReactRoot model={reactiveModel} />);
