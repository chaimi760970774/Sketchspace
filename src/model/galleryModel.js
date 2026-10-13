import { resolvePromise, isPending } from "/src/utils/resolvePromise.js";
import { listCanvases, listMyCanvases, getCanvas, createCanvas, updateCanvas, deleteCanvas, getOwnedCanvasIds, isCanvasOwner, forgetOwnerToken } from "/src/api/canvasSource.js";

// canvas list (from the server), search, folders, creating / changing / deleting canvases
export const galleryModel = {

    // ========== Data ==========

    // All canvases, loaded from the server by loadCanvases()
    // canvas: { _id, name, isShared, createdAt, updatedAt, layers }
    // isShared: only shared canvases are shown in the Gallery
    canvases: [],
    // the ids of the canvases the logged-in account owns, from the server (a guest's are found through owner tokens)
    myCanvasIds: [],

    // Folders created by users (replace with data from the REST API later)
    // A folder only belongs to its owner and is only shown in their My Work
    folders: [
        { id: "f1", name: "Travel", owner: "guest" },
    ],

    // Which folder each canvas is in: { [canvasId]: folderId }; a canvas that is not listed is in no folder
    // TODO: the server has no folders yet, so this only lives in the frontend and is lost on reload.
    //       Move it to the server once it supports folders.
    canvasFolders: {},



    // ========== Page state ==========

    canvasesPromiseState: {},   // loading the canvas list
    busyCanvasIds: [],          // canvases with a request running (delete / share / rename), their buttons wait
    creatingCanvas: false,      // true while a new canvas is being created
    createCanvasError: "",      // why the last create failed, "" if it did not

    // Joining a canvas by the id from the Share popup
    joinCanvasIdDraft: "",
    joinCanvasIdError: "",

    // Search, Gallery and My Work each keep their own text so one page's filter does not leak into the other
    gallerySearchText: "",
    myWorkSearchText: "",

    // My Work folder tabs
    selectedFolderId: null,     // folder tab that is open, null = "All"
    dragOverTab: null,          // tab a canvas is being dragged over: "all", a folder id, or null
    newFolderOpen: false,       // true while the new folder name input is shown
    newFolderName: "",
    newFolderError: "",         // shown next to the input when the name cannot be used



    // ========== Methods ==========

    // Loading the list
    loadCanvases(){
        const model = this;
        const mine = this.isLoggedIn ? listMyCanvases() : Promise.resolve([]);
        let accountCanvasIds = [];
        const promise = Promise.all([listCanvases(), mine]).then(mergeACB).then(addOwnPrivateCanvasesACB).then(storeCanvasesACB);
        resolvePromise(promise, this.canvasesPromiseState);
        promise.catch(loadFailedACB);

        // the shared canvases, plus the account's own (shared or private)
        function mergeACB(results){
            const shared = results[0];
            const own = results[1];
            accountCanvasIds = own.map(function toIdCB(canvas){ return canvas._id; });
            function isNotSharedCB(canvas){ return !shared.some(function hasIdCB(other){ return other._id === canvas._id; }); }
            return shared.concat(own.filter(isNotSharedCB));
        }

        // canvases made with an owner token that the account does not hold yet (a guest's, or not claimed yet):
        // read the private ones one by one with their token
        function addOwnPrivateCanvasesACB(sharedCanvases){
            function isNotListedCB(id){ return !sharedCanvases.some(function hasIdCB(canvas){ return canvas._id === id; }); }
            function readOwnCB(id){
                function ignoreMissingCB(error){
                    // 404: deleted elsewhere, so the token is useless
                    if (error.status === 404) forgetOwnerToken(id);
                    return null;
                }
                return getCanvas(id).catch(ignoreMissingCB);
            }
            function readAllACB(ownCanvases){ return sharedCanvases.concat(ownCanvases.filter(Boolean)); }
            return Promise.all(getOwnedCanvasIds().filter(isNotListedCB).map(readOwnCB)).then(readAllACB);
        }

        // an older request that finishes late must not overwrite a newer list
        function isLatest(){ return model.canvasesPromiseState.promise === promise; }
        function storeCanvasesACB(canvases){
            if (isLatest()) {
                model.canvases = canvases;
                model.myCanvasIds = accountCanvasIds;
            }
            return canvases;
        }
        function loadFailedACB(error){
            if (isLatest()) model.showToast("Could not load canvases: " + error.message, "error");
        }
    },
    isLoadingCanvases(){ return isPending(this.canvasesPromiseState); },
    getCanvasesError(){
        const error = this.canvasesPromiseState.error;
        return error ? error.message : "";
    },

    // Joining
    setJoinCanvasIdDraft(text){
        this.joinCanvasIdDraft = text;
        this.joinCanvasIdError = "";
    },
    // returns the id to open, or null if the text is not a canvas id (24 hex characters)
    // whether the canvas exists and is shared is only known when it is opened
    submitJoinCanvasId(){
        const id = this.joinCanvasIdDraft.trim();
        if (!/^[0-9a-f]{24}$/i.test(id)) {
            this.joinCanvasIdError = id ? "That is not a valid canvas id" : "Paste a canvas id first";
            return null;
        }
        this.joinCanvasIdDraft = "";
        this.joinCanvasIdError = "";
        return id;
    },

    // Search
    setGallerySearchText(text){ this.gallerySearchText = text; },
    setMyWorkSearchText(text){ this.myWorkSearchText = text; },

    filterCanvases(canvases, searchText){
        const text = searchText.toLowerCase();
        function matchCB(canvas){ return canvas.name.toLowerCase().includes(text); }
        return canvases.filter(matchCB);
    },

    // Gallery shows everyone's shared canvases
    getGalleryCanvases(){
        function isSharedCB(canvas){ return canvas.isShared; }
        return this.filterCanvases(this.canvases.filter(isSharedCB), this.gallerySearchText);
    },

    // My Work shows the current user's canvases, only the ones in the open folder unless "All" is open
    getMyCanvases(){
        const model = this;
        const folderId = this.selectedFolderId;
        const canvasFolders = this.canvasFolders;
        function isInFolderCB(canvas){ return model.isMine(canvas._id) && (!folderId || canvasFolders[canvas._id] === folderId); }
        return this.filterCanvases(this.canvases.filter(isInFolderCB), this.myWorkSearchText);
    },

    // a canvas is the user's when the account owns it, or this browser holds its owner token
    isMine(canvasId){ return this.myCanvasIds.includes(canvasId) || isCanvasOwner(canvasId); },

    isCanvasBusy(canvasId){ return this.busyCanvasIds.includes(canvasId); },
    setCanvasBusy(canvasId, busy){
        function isOtherCB(id){ return id !== canvasId; }
        const others = this.busyCanvasIds.filter(isOtherCB);
        this.busyCanvasIds = busy ? [...others, canvasId] : others;
    },

    findCanvas(canvasId){
        function isTargetCB(canvas){ return canvas._id === canvasId; }
        return this.canvases.find(isTargetCB);
    },

    // replaces one canvas in the list (and the open canvas, if it is that one) with the server's version
    replaceCanvas(updated){
        function replaceCB(canvas){ return canvas._id === updated._id ? updated : canvas; }
        this.canvases = this.canvases.map(replaceCB);
        if (this.currentCanvas && this.currentCanvas._id === updated._id) this.currentCanvas = updated;
    },

    // Creating
    // resolves to the new canvas id, or null if it failed (the user has been told already)
    createNewCanvas(){
        if (this.creatingCanvas) return Promise.resolve(null);      // ignore double clicks
        const model = this;
        this.creatingCanvas = true;
        this.createCanvasError = "";
        return createCanvas({ name: "untitled" }).then(createdACB).catch(failedACB).finally(doneACB);

        function createdACB(canvasId){
            model.showToast("New canvas created", "success");
            return canvasId;
        }
        function failedACB(error){
            model.createCanvasError = error.message;
            model.showToast("Could not create a canvas: " + error.message, "error");
            return null;
        }
        function doneACB(){ model.creatingCanvas = false; }
    },

    // Changing (name and/or isShared)
    // after the update the canvas is read again, so updatedAt is the server's time
    saveCanvasChanges(canvasId, changes, successMessage){
        const model = this;
        this.setCanvasBusy(canvasId, true);
        return updateCanvas(canvasId, changes)
            .then(readAgainACB)
            .then(savedACB)
            .catch(failedACB)
            .finally(doneACB);

        function readAgainACB(){ return getCanvas(canvasId); }
        function savedACB(canvas){
            model.replaceCanvas(canvas);
            model.showToast(successMessage, "success");
        }
        function failedACB(error){ model.showToast("Could not save the change: " + error.message, "error"); }
        function doneACB(){ model.setCanvasBusy(canvasId, false); }
    },

    setCanvasShared(canvasId, isShared){
        const message = isShared ? "Canvas is now shared in the Gallery" : "Canvas is now private";
        return this.saveCanvasChanges(canvasId, { isShared: isShared }, message);
    },

    // Deleting
    removeCanvas(canvasId){
        const model = this;
        const canvas = this.findCanvas(canvasId);
        const name = canvas ? canvas.name : "canvas";
        this.setCanvasBusy(canvasId, true);
        return deleteCanvas(canvasId).then(deletedACB).catch(failedACB).finally(doneACB);

        function isOtherCanvasCB(canvas){ return canvas._id !== canvasId; }
        function deletedACB(){
            model.canvases = model.canvases.filter(isOtherCanvasCB);
            model.setCanvasFolder(canvasId, null);
            model.showToast("Deleted \"" + name + "\"", "success");
        }
        function failedACB(error){ model.showToast("Could not delete \"" + name + "\": " + error.message, "error"); }
        function doneACB(){ model.setCanvasBusy(canvasId, false); }
    },

    // Folders
    getMyFolders(){
        const userId = this.user.id;
        function isMineCB(folder){ return folder.owner === userId; }
        return this.folders.filter(isMineCB);
    },

    selectFolder(folderId){ this.selectedFolderId = folderId; },

    openNewFolder(){
        this.newFolderOpen = true;
        this.newFolderName = "";
    },
    cancelNewFolder(){
        this.newFolderName = "";        // cleared first so a following blur does not create the folder
        this.newFolderError = "";
        this.newFolderOpen = false;
    },
    setNewFolderName(name){
        this.newFolderName = name;
        this.newFolderError = "";       // the user is fixing the name, hide the old error
    },

    getFolderName(folderId){
        function isTargetCB(folder){ return folder.id === folderId; }
        const folder = this.folders.find(isTargetCB);
        return folder ? folder.name : "";
    },

    // error message for a new folder name, empty if the name is fine
    checkFolderName(name){
        if (!name) return "Please type a folder name";
        function isSameNameCB(folder){ return folder.name.toLowerCase() === name.toLowerCase(); }
        if (this.getMyFolders().some(isSameNameCB)) return "\"" + name + "\" already exists";
        return "";
    },

    // the input stays open with an error message if the name cannot be used
    createFolder(){
        const name = this.newFolderName.trim();
        const error = this.checkFolderName(name);
        if (error) {
            this.newFolderError = error;
            return;
        }
        this.folders = [...this.folders, { id: crypto.randomUUID(), name: name, owner: this.user.id }];
        this.cancelNewFolder();
        this.showToast("Created folder \"" + name + "\"", "success");
    },

    // clicking away from an empty input just closes it, otherwise it counts as creating
    leaveNewFolder(){
        if (this.newFolderName.trim()) this.createFolder();
        else this.cancelNewFolder();
    },

    // the folder disappears, its canvases stay and are still shown in "All"
    deleteFolder(folderId){
        const name = this.getFolderName(folderId);
        function isOtherFolderCB(folder){ return folder.id !== folderId; }
        function notInFolderCB(entry){ return entry[1] !== folderId; }      // entry = [canvasId, folderId]
        this.folders = this.folders.filter(isOtherFolderCB);
        this.canvasFolders = Object.fromEntries(Object.entries(this.canvasFolders).filter(notInFolderCB));
        if (this.selectedFolderId === folderId) this.selectedFolderId = null;
        this.showToast("Deleted folder \"" + name + "\"", "success");
    },

    // folderId null = the canvas is in no folder
    setCanvasFolder(canvasId, folderId){
        function isOtherCanvasCB(entry){ return entry[0] !== canvasId; }     // entry = [canvasId, folderId]
        const others = Object.fromEntries(Object.entries(this.canvasFolders).filter(isOtherCanvasCB));
        this.canvasFolders = folderId ? { ...others, [canvasId]: folderId } : others;
    },

    // folderId null = take the canvas out of its folder (dropped on "All")
    moveCanvasToFolder(canvasId, folderId){
        const canvas = this.findCanvas(canvasId);
        if (!canvas) return;

        const currentFolderId = this.canvasFolders[canvasId] || null;
        const targetName = folderId ? this.getFolderName(folderId) : "All";
        if (currentFolderId === folderId) {
            this.showToast("\"" + canvas.name + "\" is already in " + targetName, "info");
            return;
        }

        this.setCanvasFolder(canvasId, folderId);
        if (folderId) this.showToast("Moved to " + targetName, "success");
        else this.showToast("Removed from folder", "success");
    },

    // Drag and drop highlight
    setDragOverTab(tab){ this.dragOverTab = tab; },
};
