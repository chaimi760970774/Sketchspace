import { observable, configure } from "mobx";

import { userModel } from "./userModel.js";
import { galleryModel } from "./galleryModel.js";
import { canvasModel } from "./canvasModel.js";

configure({ enforceActions: "never", });

// merge every part into one object, so methods can still use `this` across parts
// (e.g. getMyCanvases in galleryModel reads this.user from userModel)
const model = {
    ...userModel,
    ...galleryModel,
    ...canvasModel,
};

export const reactiveModel = observable(model);

// for debug purpose
window.myModel = reactiveModel;
