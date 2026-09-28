import { observable, configure } from "mobx";

configure({ enforceActions: "never", });

const model = {};

export const reactiveModel = observable(model);

// for debug purpose
window.myModel = reactiveModel;