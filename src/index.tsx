
import { reactiveModel } from "./model/mobxReactiveModel.ts";
import { createElement, Fragment } from "react";
import { ReactRoot, makeRouter } from "./reactjs/ReactRoot.tsx";
import { createRoot } from "react-dom/client";

// needed in the lab because it works with both React and Vue; a global can only be set by assignment
// (the cast is needed because TypeScript's window.React expects the whole React library)
(window as unknown as { React: object }).React = { createElement, Fragment };

// a login from an earlier visit is picked up from the cookie
reactiveModel.restoreSession();

// created once here, outside any component
const router = makeRouter(reactiveModel);

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("index.html has no element with id \"root\"");
const mountedApp = createRoot(rootElement);
mountedApp.render(<ReactRoot model={reactiveModel} router={router} />);
