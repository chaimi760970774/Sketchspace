
import { reactiveModel } from "./model/mobxReactiveModel.js";
import { createElement, Fragment } from "react";
import { ReactRoot, makeRouter } from "./reactjs/ReactRoot.jsx";
import { createRoot } from "react-dom/client";

// needed in the lab because it works with both React and Vue; a global can only be set by assignment
window.React = { createElement, Fragment };

// created once here, outside any component
const router = makeRouter(reactiveModel);

const mountedApp = createRoot(document.getElementById('root'));
mountedApp.render(<ReactRoot model={reactiveModel} router={router} />);
