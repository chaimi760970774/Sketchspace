import { observable, configure } from "mobx";

import { userModel } from "./userModel.js";
import { galleryModel } from "./galleryModel.js";
import { canvasModel } from "./canvasModel.js";
import { toastModel } from "./toastModel.js";

configure({ enforceActions: "never", });

// merge every part into one object, so methods can still use `this` across parts
// (e.g. getMyCanvases in galleryModel reads this.user from userModel,
//  and every part can call this.showToast from toastModel)
const model = {
    ...userModel,
    ...galleryModel,
    ...canvasModel,
    ...toastModel,
};

export const reactiveModel = observable(model);

// for debug purpose (a global can only be set by assignment)
window.myModel = reactiveModel;
