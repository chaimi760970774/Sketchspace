import { observable, configure } from "mobx";

import { userModel } from "./userModel.ts";
import { galleryModel } from "./galleryModel.ts";
import { canvasModel } from "./canvasModel.ts";
import { openCanvasModel } from "./openCanvasModel.ts";
import { toastModel } from "./toastModel.ts";
import { historyModel } from "./historyModel.ts";

import type { Model } from "./types.ts";

configure({ enforceActions: "never", });

// window.myModel, for debugging in the browser console
declare global {
    interface Window {
        myModel: Model;
    }
}

// merge every part into one object, so methods can still use `this` across parts
// (e.g. loadFolders in galleryModel reads this.isLoggedIn from userModel, saveRename in openCanvasModel
//  calls this.saveCanvasChanges from galleryModel, and every part can call this.showToast from toastModel)
const model = {
    ...userModel,
    ...galleryModel,
    ...canvasModel,
    ...openCanvasModel,
    ...historyModel,
    ...toastModel,
};

export const reactiveModel: Model = observable(model);

// for debug purpose (a global can only be set by assignment)
window.myModel = reactiveModel;
