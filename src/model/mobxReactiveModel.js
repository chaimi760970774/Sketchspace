import { observable, configure } from "mobx";

import { userModel } from "./userModel.js";
import { galleryModel } from "./galleryModel.js";
import { canvasModel } from "./canvasModel.js";
import { openCanvasModel } from "./openCanvasModel.js";
import { toastModel } from "./toastModel.js";

configure({ enforceActions: "never", });

// merge every part into one object, so methods can still use `this` across parts
// (e.g. getMyFolders in galleryModel reads this.user from userModel, saveRename in openCanvasModel
//  calls this.saveCanvasChanges from galleryModel, and every part can call this.showToast from toastModel)
const model = {
    ...userModel,
    ...galleryModel,
    ...canvasModel,
    ...openCanvasModel,
    ...toastModel,
};

export const reactiveModel = observable(model);

// for debug purpose (a global can only be set by assignment)
window.myModel = reactiveModel;
