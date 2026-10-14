import { resolvePromise, isPending } from "/src/utils/resolvePromise.ts";
import { listCanvases, listMyCanvases, getCanvas, createCanvas, updateCanvas, deleteCanvas, getOwnedCanvasIds, isCanvasOwner, forgetOwnerToken } from "/src/api/canvasSource.ts";
import type { Canvas, CanvasChanges, Folder, Model, PromiseState, RequestError } from "./types.ts";

interface GalleryState {
    // Data
    // All canvases, loaded from the server by loadCanvases(); only shared ones (isShared) are shown in the Gallery
    canvases: Canvas[];
    // the ids of the canvases the logged-in account owns, from the server (a guest's are found through owner tokens)
    myCanvasIds: string[];
    // Folders created by users (replace with data from the REST API later)
    // A folder only belongs to its owner and is only shown in their My Work
    folders: Folder[];
    // Which folder each canvas is in: canvas id -> folder id; a canvas that is not listed is in no folder
    // TODO: the server has no folders yet, so this only lives in the frontend and is lost on reload.
    //       Move it to the server once it supports folders.
    canvasFolders: Record<string, string>;

    // Page state
    canvasesPromiseState: PromiseState<Canvas[]>;   // loading the canvas list
    busyCanvasIds: string[];        // canvases with a request running (delete / share / rename), their buttons wait
    creatingCanvas: boolean;        // true while a new canvas is being created
    createCanvasError: string;      // why the last create failed, "" if it did not
    // Joining a canvas by the id from the Share popup
    joinCanvasIdDraft: string;
    joinCanvasIdError: string;
    // Search, Gallery and My Work each keep their own text so one page's filter does not leak into the other
    gallerySearchText: string;
    myWorkSearchText: string;
    // My Work folder tabs
    selectedFolderId: string | null;    // folder tab that is open, null = "All"
    dragOverTab: string | null;         // tab a canvas is being dragged over: "all", a folder id, or null
    newFolderOpen: boolean;             // true while the new folder name input is shown
    newFolderName: string;
    newFolderError: string;             // shown next to the input when the name cannot be used
}

const initialState: GalleryState = {
    canvases: [],
    myCanvasIds: [],
    folders: [
        { id: "f1", name: "Travel", owner: "guest" },
    ],
    canvasFolders: {},
    canvasesPromiseState: {},
    busyCanvasIds: [],
    creatingCanvas: false,
    createCanvasError: "",
    joinCanvasIdDraft: "",
    joinCanvasIdError: "",
    gallerySearchText: "",
    myWorkSearchText: "",
    selectedFolderId: null,
    dragOverTab: null,
    newFolderOpen: false,
    newFolderName: "",
    newFolderError: "",
};

// the list being loaded, with the ids of the canvases the account owns
interface LoadedList {
    canvases: Canvas[];
    accountCanvasIds: string[];
}

// canvas list (from the server), search, folders, creating / changing / deleting canvases
export const galleryModel = {

    // ========== Data and page state ==========

    ...initialState,



    // ========== Methods ==========

    // Loading the list
    loadCanvases(): void {
        const model = this;
        const mine: Promise<Canvas[]> = this.isLoggedIn ? listMyCanvases() : Promise.resolve([]);
        const loading = Promise.all([listCanvases(), mine]).then(mergeACB).then(addOwnPrivateCanvasesACB);
        const promise = loading.then(storeCanvasesACB);
        resolvePromise(promise, this.canvasesPromiseState);
        promise.catch(loadFailedACB);

        // the shared canvases, plus the account's own (shared or private)
        function mergeACB(results: [Canvas[], Canvas[]]): LoadedList {
            const shared = results[0];
            const own = results[1];
            function toIdCB(canvas: Canvas): string { return canvas._id; }
            function isNotSharedCB(canvas: Canvas): boolean {
                function hasIdCB(other: Canvas): boolean { return other._id === canvas._id; }
                return !shared.some(hasIdCB);
            }
            return { canvases: shared.concat(own.filter(isNotSharedCB)), accountCanvasIds: own.map(toIdCB) };
        }

        // canvases made with an owner token that the account does not hold yet (a guest's, or not claimed yet):
        // read the private ones one by one with their token
        function addOwnPrivateCanvasesACB(list: LoadedList): Promise<LoadedList> {
            function isNotListedCB(id: string): boolean {
                function hasIdCB(canvas: Canvas): boolean { return canvas._id === id; }
                return !list.canvases.some(hasIdCB);
            }
            function readOwnCB(id: string): Promise<Canvas | null> {
                function ignoreMissingCB(error: RequestError): null {
                    // 404: deleted elsewhere, so the token is useless
                    if (error.status === 404) forgetOwnerToken(id);
                    return null;
                }
                return getCanvas(id).catch(ignoreMissingCB);
            }
            function isCanvasCB(canvas: Canvas | null): canvas is Canvas { return canvas !== null; }
            function readAllACB(ownCanvases: (Canvas | null)[]): LoadedList {
                return { ...list, canvases: list.canvases.concat(ownCanvases.filter(isCanvasCB)) };
            }
            return Promise.all(getOwnedCanvasIds().filter(isNotListedCB).map(readOwnCB)).then(readAllACB);
        }

        // an older request that finishes late must not overwrite a newer list
        function isLatest(): boolean { return model.canvasesPromiseState.promise === promise; }
        function storeCanvasesACB(list: LoadedList): Canvas[] {
            if (isLatest()) {
                model.canvases = list.canvases;
                model.myCanvasIds = list.accountCanvasIds;
            }
            return list.canvases;
        }
        function loadFailedACB(error: Error): void {
            if (isLatest()) model.showToast("Could not load canvases: " + error.message, "error");
        }
    },
    isLoadingCanvases(): boolean { return isPending(this.canvasesPromiseState); },
    getCanvasesError(): string {
        const error = this.canvasesPromiseState.error;
        return error ? error.message : "";
    },

    // Joining
    setJoinCanvasIdDraft(text: string): void {
        this.joinCanvasIdDraft = text;
        this.joinCanvasIdError = "";
    },
    // returns the id to open, or null if the text is not a canvas id (24 hex characters)
    // whether the canvas exists and is shared is only known when it is opened
    submitJoinCanvasId(): string | null {
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
    setGallerySearchText(text: string): void { this.gallerySearchText = text; },
    setMyWorkSearchText(text: string): void { this.myWorkSearchText = text; },

    filterCanvases(canvases: Canvas[], searchText: string): Canvas[] {
        const text = searchText.toLowerCase();
        function matchCB(canvas: Canvas): boolean { return canvas.name.toLowerCase().includes(text); }
        return canvases.filter(matchCB);
    },

    // Gallery shows everyone's shared canvases
    getGalleryCanvases(): Canvas[] {
        function isSharedCB(canvas: Canvas): boolean { return canvas.isShared; }
        return this.filterCanvases(this.canvases.filter(isSharedCB), this.gallerySearchText);
    },

    // My Work shows the current user's canvases, only the ones in the open folder unless "All" is open
    getMyCanvases(): Canvas[] {
        const model = this;
        const folderId = this.selectedFolderId;
        const canvasFolders = this.canvasFolders;
        function isInFolderCB(canvas: Canvas): boolean { return model.isMine(canvas._id) && (!folderId || canvasFolders[canvas._id] === folderId); }
        return this.filterCanvases(this.canvases.filter(isInFolderCB), this.myWorkSearchText);
    },

    // a canvas is the user's when the account owns it, or this browser holds its owner token
    isMine(canvasId: string): boolean { return this.myCanvasIds.includes(canvasId) || isCanvasOwner(canvasId); },

    isCanvasBusy(canvasId: string): boolean { return this.busyCanvasIds.includes(canvasId); },
    setCanvasBusy(canvasId: string, busy: boolean): void {
        function isOtherCB(id: string): boolean { return id !== canvasId; }
        const others = this.busyCanvasIds.filter(isOtherCB);
        this.busyCanvasIds = busy ? [...others, canvasId] : others;
    },

    findCanvas(canvasId: string): Canvas | undefined {
        function isTargetCB(canvas: Canvas): boolean { return canvas._id === canvasId; }
        return this.canvases.find(isTargetCB);
    },

    // replaces one canvas in the list (and the open canvas, if it is that one) with the server's version
    replaceCanvas(updated: Canvas): void {
        function replaceCB(canvas: Canvas): Canvas { return canvas._id === updated._id ? updated : canvas; }
        this.canvases = this.canvases.map(replaceCB);
        if (this.currentCanvas && this.currentCanvas._id === updated._id) this.currentCanvas = updated;
    },

    // Creating
    // resolves to the new canvas id, or null if it failed (the user has been told already)
    createNewCanvas(): Promise<string | null> {
        if (this.creatingCanvas) return Promise.resolve(null);      // ignore double clicks
        const model = this;
        this.creatingCanvas = true;
        this.createCanvasError = "";
        return createCanvas({ name: "untitled" }).then(createdACB).catch(failedACB).finally(doneACB);

        function createdACB(canvasId: string): string {
            model.showToast("New canvas created", "success");
            return canvasId;
        }
        function failedACB(error: Error): null {
            model.createCanvasError = error.message;
            model.showToast("Could not create a canvas: " + error.message, "error");
            return null;
        }
        function doneACB(): void { model.creatingCanvas = false; }
    },

    // Changing (name and/or isShared)
    // after the update the canvas is read again, so updatedAt is the server's time
    saveCanvasChanges(canvasId: string, changes: CanvasChanges, successMessage: string): Promise<void> {
        const model = this;
        this.setCanvasBusy(canvasId, true);
        return updateCanvas(canvasId, changes)
            .then(readAgainACB)
            .then(savedACB)
            .catch(failedACB)
            .finally(doneACB);

        function readAgainACB(): Promise<Canvas> { return getCanvas(canvasId); }
        function savedACB(canvas: Canvas): void {
            model.replaceCanvas(canvas);
            model.showToast(successMessage, "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not save the change: " + error.message, "error"); }
        function doneACB(): void { model.setCanvasBusy(canvasId, false); }
    },

    setCanvasShared(canvasId: string, isShared: boolean): Promise<void> {
        const message = isShared ? "Canvas is now shared in the Gallery" : "Canvas is now private";
        return this.saveCanvasChanges(canvasId, { isShared: isShared }, message);
    },

    // Deleting
    removeCanvas(canvasId: string): Promise<void> {
        const model = this;
        const canvas = this.findCanvas(canvasId);
        const name = canvas ? canvas.name : "canvas";
        this.setCanvasBusy(canvasId, true);
        return deleteCanvas(canvasId).then(deletedACB).catch(failedACB).finally(doneACB);

        function isOtherCanvasCB(canvas: Canvas): boolean { return canvas._id !== canvasId; }
        function deletedACB(): void {
            model.canvases = model.canvases.filter(isOtherCanvasCB);
            model.setCanvasFolder(canvasId, null);
            model.showToast("Deleted \"" + name + "\"", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not delete \"" + name + "\": " + error.message, "error"); }
        function doneACB(): void { model.setCanvasBusy(canvasId, false); }
    },

    // Folders
    getMyFolders(): Folder[] {
        const userId = this.user.id;
        function isMineCB(folder: Folder): boolean { return folder.owner === userId; }
        return this.folders.filter(isMineCB);
    },

    selectFolder(folderId: string | null): void { this.selectedFolderId = folderId; },

    openNewFolder(): void {
        this.newFolderOpen = true;
        this.newFolderName = "";
    },
    cancelNewFolder(): void {
        this.newFolderName = "";        // cleared first so a following blur does not create the folder
        this.newFolderError = "";
        this.newFolderOpen = false;
    },
    setNewFolderName(name: string): void {
        this.newFolderName = name;
        this.newFolderError = "";       // the user is fixing the name, hide the old error
    },

    getFolderName(folderId: string): string {
        function isTargetCB(folder: Folder): boolean { return folder.id === folderId; }
        const folder = this.folders.find(isTargetCB);
        return folder ? folder.name : "";
    },

    // error message for a new folder name, empty if the name is fine
    checkFolderName(name: string): string {
        if (!name) return "Please type a folder name";
        function isSameNameCB(folder: Folder): boolean { return folder.name.toLowerCase() === name.toLowerCase(); }
        if (this.getMyFolders().some(isSameNameCB)) return "\"" + name + "\" already exists";
        return "";
    },

    // the input stays open with an error message if the name cannot be used
    createFolder(): void {
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
    leaveNewFolder(): void {
        if (this.newFolderName.trim()) this.createFolder();
        else this.cancelNewFolder();
    },

    // the folder disappears, its canvases stay and are still shown in "All"
    deleteFolder(folderId: string): void {
        const name = this.getFolderName(folderId);
        function isOtherFolderCB(folder: Folder): boolean { return folder.id !== folderId; }
        function notInFolderCB(entry: [string, string]): boolean { return entry[1] !== folderId; }      // entry = [canvasId, folderId]
        this.folders = this.folders.filter(isOtherFolderCB);
        this.canvasFolders = Object.fromEntries(Object.entries(this.canvasFolders).filter(notInFolderCB));
        if (this.selectedFolderId === folderId) this.selectedFolderId = null;
        this.showToast("Deleted folder \"" + name + "\"", "success");
    },

    // folderId null = the canvas is in no folder
    setCanvasFolder(canvasId: string, folderId: string | null): void {
        function isOtherCanvasCB(entry: [string, string]): boolean { return entry[0] !== canvasId; }     // entry = [canvasId, folderId]
        const others = Object.fromEntries(Object.entries(this.canvasFolders).filter(isOtherCanvasCB));
        this.canvasFolders = folderId ? { ...others, [canvasId]: folderId } : others;
    },

    // folderId null = take the canvas out of its folder (dropped on "All")
    moveCanvasToFolder(canvasId: string, folderId: string | null): void {
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
    setDragOverTab(tab: string | null): void { this.dragOverTab = tab; },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
