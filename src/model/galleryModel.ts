import { resolvePromise, isPending } from "/src/utils/resolvePromise.ts";
import { listCanvases, listMyCanvases, getCanvas, createCanvas, updateCanvas, deleteCanvas, getOwnedCanvasIds, isCanvasOwner, forgetOwnerToken,
         setCanvasFolder as setCanvasFolderRequest, claimCanvas } from "/src/api/canvasSource.ts";
import { listStrokes, listElements } from "/src/api/canvasSource.ts";
import { renderCanvasThumbnail } from "/src/utils/renderThumbnail.ts";
import { getThumbnail, getThumbnailVersion, saveThumbnail } from "/src/utils/thumbnailStore.ts";
import { listFolders, createFolder as createFolderRequest, deleteFolder as deleteFolderRequest } from "/src/api/folderSource.ts";
import type { Canvas, CanvasChanges, Folder, Model, PromiseState, RequestError, ServerElement, ServerStroke } from "./types.ts";

// same rule as the server: 1-30 characters after trimming, counted per character (an emoji is one)
const MAX_FOLDER_NAME = 30;

interface GalleryState {
    // Data
    // All canvases, loaded from the server by loadCanvases(); only public ones (isPublic) are shown in the Gallery
    canvases: Canvas[];
    // the ids of the canvases the logged-in account owns, from the server (a guest's are found through owner tokens)
    myCanvasIds: string[];
    // The logged-in account's folders, loaded from the server by loadFolders(); a guest has none.
    // Which folder a canvas is in is its own folderId.
    folders: Folder[];

    // card previews made in this session (also kept in localStorage), by canvas id
    thumbnails: Record<string, string>;

    // Page state
    canvasesPromiseState: PromiseState<Canvas[]>;   // loading the canvas list
    foldersPromiseState: PromiseState<Folder[]>;    // loading the folders
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
    creatingFolder: boolean;            // true while a new folder is being saved
    busyFolderIds: string[];            // folders being deleted, their delete button waits
}

const initialState: GalleryState = {
    canvases: [],
    myCanvasIds: [],
    folders: [],
    thumbnails: {},
    canvasesPromiseState: {},
    foldersPromiseState: {},
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
    creatingFolder: false,
    busyFolderIds: [],
};

// canvases whose preview is being made right now
const thumbnailsInProgress = new Set<string>();

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

    // My Work needs the canvases and the folders; both are loaded at the same time
    loadMyWork(): Promise<void> {
        function doneACB(): void {}     // each load reports its own result
        return Promise.all([this.loadCanvases(), this.loadFolders()]).then(doneACB);
    },

    // Loading the list; resolves when it is done (failures are shown, not passed on)
    loadCanvases(): Promise<void> {
        const model = this;
        const mine: Promise<Canvas[]> = this.isLoggedIn ? listMyCanvases() : Promise.resolve([]);
        const loading = Promise.all([listCanvases(), mine]).then(mergeACB).then(addOwnPrivateCanvasesACB);
        const promise = loading.then(storeCanvasesACB);
        resolvePromise(promise, this.canvasesPromiseState);
        function doneACB(): void {}
        return promise.then(doneACB, loadFailedACB);

        // the shared canvases, plus the account's own (shared or private); for the account's own shared
        // canvases the copy from /mine is used, because only that one says which folder it is in
        function mergeACB(results: [Canvas[], Canvas[]]): LoadedList {
            const shared = results[0];
            const own = results[1];
            function toIdCB(canvas: Canvas): string { return canvas._id; }
            function findOwn(id: string): Canvas | undefined {
                function hasIdCB(other: Canvas): boolean { return other._id === id; }
                return own.find(hasIdCB);
            }
            function preferOwnCB(canvas: Canvas): Canvas { return findOwn(canvas._id) || canvas; }
            function isNotSharedCB(canvas: Canvas): boolean {
                function hasIdCB(other: Canvas): boolean { return other._id === canvas._id; }
                return !shared.some(hasIdCB);
            }
            return { canvases: shared.map(preferOwnCB).concat(own.filter(isNotSharedCB)), accountCanvasIds: own.map(toIdCB) };
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
                model.loadMissingThumbnails();
            }
            return list.canvases;
        }
        function loadFailedACB(error: Error): void {
            if (isLatest()) model.showToast("Could not load canvases: " + error.message, "error");
        }
    },
    // The preview of a card; undefined/null until it is made. Reads this.thumbnails, so cards update by themselves.
    getCardThumbnail(canvasId: string): string | null { return this.thumbnails[canvasId] || getThumbnail(canvasId); },

    // Makes a preview for every listed canvas that has none (a canvas never opened in this browser, or
    // changed by someone else since), by drawing its strokes and elements. One canvas at a time.
    loadMissingThumbnails(): Promise<void> {
        const model = this;
        function needsThumbnailCB(canvas: Canvas): boolean {
            if (thumbnailsInProgress.has(canvas._id)) return false;
            return !getThumbnail(canvas._id) || (getThumbnailVersion(canvas._id) !== null && getThumbnailVersion(canvas._id) !== canvas.updatedAt);
        }
        function makeOneACB(previous: Promise<void>, canvas: Canvas): Promise<void> {
            function makeACB(): Promise<void> { return model.makeThumbnail(canvas); }
            return previous.then(makeACB);
        }
        function doneACB(): void {}
        return this.canvases.filter(needsThumbnailCB).reduce(makeOneACB, Promise.resolve()).then(doneACB);
    },

    makeThumbnail(canvas: Canvas): Promise<void> {
        const model = this;
        thumbnailsInProgress.add(canvas._id);
        function renderACB(results: [ServerStroke[], ServerElement[]]): Promise<string | null> {
            return renderCanvasThumbnail(results[0], results[1]);
        }
        function storeACB(dataUrl: string | null): void {
            if (!dataUrl) return;
            saveThumbnail(canvas._id, dataUrl, canvas.updatedAt);
            model.thumbnails[canvas._id] = dataUrl;
        }
        function cleanUpACB(): void { thumbnailsInProgress.delete(canvas._id); }
        // a canvas that cannot be read just keeps the empty preview
        return Promise.all([listStrokes(canvas._id), listElements(canvas._id)]).then(renderACB).then(storeACB).catch(ignoreACB).then(cleanUpACB);
        function ignoreACB(): void {}
    },

    isLoadingCanvases(): boolean { return isPending(this.canvasesPromiseState); },
    getCanvasesError(): string {
        const error = this.canvasesPromiseState.error;
        return error ? error.message : "";
    },

    // Loading the folders (only an account has folders); resolves when it is done
    loadFolders(): Promise<void> {
        const model = this;
        if (!this.isLoggedIn) {
            resolvePromise(null, this.foldersPromiseState);     // nothing to load, no old error either
            this.folders = [];
            return Promise.resolve();
        }
        const promise = listFolders().then(storeFoldersACB);
        resolvePromise(promise, this.foldersPromiseState);
        function doneACB(): void {}
        return promise.then(doneACB, loadFailedACB);

        // an older request that finishes late must not overwrite a newer list
        function isLatest(): boolean { return model.foldersPromiseState.promise === promise; }
        function storeFoldersACB(folders: Folder[]): Folder[] {
            if (isLatest()) {
                model.folders = folders;
                // the open folder may have been deleted in another tab
                function isOpenFolderCB(folder: Folder): boolean { return folder.id === model.selectedFolderId; }
                if (model.selectedFolderId && !folders.some(isOpenFolderCB)) model.selectedFolderId = null;
            }
            return folders;
        }
        function loadFailedACB(error: Error): void {
            if (isLatest()) model.showToast("Could not load folders: " + error.message, "error");
        }
    },
    isLoadingFolders(): boolean { return isPending(this.foldersPromiseState); },
    getFoldersError(): string {
        const error = this.foldersPromiseState.error;
        return error ? error.message : "";
    },
    // folders are for accounts; a guest is asked to log in instead
    canUseFolders(): boolean { return this.isLoggedIn; },

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

    // Gallery shows everyone's public canvases (a canvas shared by id only is not listed)
    getGalleryCanvases(): Canvas[] {
        function isPublicCB(canvas: Canvas): boolean { return canvas.isPublic; }
        return this.filterCanvases(this.canvases.filter(isPublicCB), this.gallerySearchText);
    },

    // My Work shows the current user's canvases, only the ones in the open folder unless "All" is open
    getMyCanvases(): Canvas[] {
        const model = this;
        const folderId = this.selectedFolderId;
        function isInFolderCB(canvas: Canvas): boolean { return model.isMine(canvas._id) && (!folderId || canvas.folderId === folderId); }
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
    // GET /api/canvas/:id does not say which folder the canvas is in, so the folder it had is kept
    replaceCanvas(updated: Canvas): void {
        function replaceCB(canvas: Canvas): Canvas {
            if (canvas._id !== updated._id) return canvas;
            return { ...updated, folderId: updated.folderId === undefined ? canvas.folderId : updated.folderId };
        }
        this.canvases = this.canvases.map(replaceCB);
        if (this.currentCanvas && this.currentCanvas._id === updated._id) this.currentCanvas = updated;
    },

    // Creating
    // resolves to the new canvas id, or null if it failed (the user has been told already)
    createNewCanvas(folderId?: string | null): Promise<string | null> {
        if (this.creatingCanvas) return Promise.resolve(null);      // ignore double clicks
        const model = this;
        this.creatingCanvas = true;
        this.createCanvasError = "";
        return createCanvas({ name: "untitled" }).then(createdACB).catch(failedACB).finally(doneACB);

        function createdACB(canvasId: string): Promise<string> | string {
            model.showToast("New canvas created", "success");
            if (folderId) return setCanvasFolderRequest(canvasId, folderId).then(() => canvasId).catch(() => canvasId);
            return canvasId;
        }
        function failedACB(error: Error): null {
            model.createCanvasError = error.message;
            model.showToast("Could not create a canvas: " + error.message, "error");
            return null;
        }
        function doneACB(): void { model.creatingCanvas = false; }
    },

    // Changing (name, isShared and/or isPublic)
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

    // sharing by id: anyone with the canvas id can join; turning it off makes the canvas private, which also takes it out of the Gallery
    setCanvasShared(canvasId: string, isShared: boolean): Promise<void> {
        const message = isShared ? "Anyone with the canvas id can now join" : "Canvas is now private";
        return this.saveCanvasChanges(canvasId, { isShared: isShared }, message);
    },

    // listing in the Gallery; a public canvas is shared too, so this turns sharing on as well
    setCanvasPublic(canvasId: string, isPublic: boolean): Promise<void> {
        const message = isPublic ? "Canvas is now public in the Gallery" : "Canvas removed from the Gallery";
        return this.saveCanvasChanges(canvasId, { isPublic: isPublic }, message);
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
            model.showToast("Deleted \"" + name + "\"", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not delete \"" + name + "\": " + error.message, "error"); }
        function doneACB(): void { model.setCanvasBusy(canvasId, false); }
    },

    // Folders
    getMyFolders(): Folder[] { return this.folders; },      // the server only sends the account's own

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

    // error message for a new folder name (already trimmed), empty if the name is fine
    // the same rules as the server, so a name it would refuse is not sent
    checkFolderName(name: string): string {
        if (!name) return "Please type a folder name";
        if (Array.from(name).length > MAX_FOLDER_NAME) return "Folder name can be at most " + MAX_FOLDER_NAME + " characters";
        function isSameNameCB(folder: Folder): boolean { return folder.name.trim().toLowerCase() === name.toLowerCase(); }
        if (this.getMyFolders().some(isSameNameCB)) return "\"" + name + "\" already exists";
        return "";
    },

    // saved on the server first, then shown; the input stays open with an error message if it fails
    createFolder(): Promise<void> {
        if (this.creatingFolder) return Promise.resolve();      // ignore Enter pressed twice
        const model = this;
        const name = this.newFolderName.trim();
        const error = this.checkFolderName(name);
        if (error) {
            this.newFolderError = error;
            return Promise.resolve();
        }
        this.creatingFolder = true;
        return createFolderRequest(name).then(createdACB).catch(failedACB).finally(doneACB);

        function createdACB(folder: Folder): void {
            model.folders = [...model.folders, folder];
            model.cancelNewFolder();
            model.showToast("Created folder \"" + folder.name + "\"", "success");
        }
        // e.g. 409 when another tab created the same name first: the server's message is shown at the input
        function failedACB(error: Error): void { model.newFolderError = error.message; }
        function doneACB(): void { model.creatingFolder = false; }
    },

    // clicking away from an empty input just closes it, otherwise it counts as creating
    leaveNewFolder(): void {
        if (this.creatingFolder) return;        // the blur that follows Enter while it saves
        if (this.newFolderName.trim()) this.createFolder();
        else this.cancelNewFolder();
    },

    isFolderBusy(folderId: string): boolean { return this.busyFolderIds.includes(folderId); },
    setFolderBusy(folderId: string, busy: boolean): void {
        function isOtherCB(id: string): boolean { return id !== folderId; }
        const others = this.busyFolderIds.filter(isOtherCB);
        this.busyFolderIds = busy ? [...others, folderId] : others;
    },

    // the folder disappears, its canvases stay and are shown in "All" (the server takes them out too)
    deleteFolder(folderId: string): Promise<void> {
        if (this.isFolderBusy(folderId)) return Promise.resolve();      // ignore double clicks
        const model = this;
        const name = this.getFolderName(folderId);
        this.setFolderBusy(folderId, true);
        return deleteFolderRequest(folderId).then(deletedACB).catch(failedACB).finally(doneACB);

        function isOtherFolderCB(folder: Folder): boolean { return folder.id !== folderId; }
        function takeOutCB(canvas: Canvas): Canvas { return canvas.folderId === folderId ? { ...canvas, folderId: null } : canvas; }
        function deletedACB(): void {
            model.folders = model.folders.filter(isOtherFolderCB);
            model.canvases = model.canvases.map(takeOutCB);
            if (model.selectedFolderId === folderId) model.selectedFolderId = null;
            model.showToast("Deleted folder \"" + name + "\"", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not delete folder \"" + name + "\": " + error.message, "error"); }
        function doneACB(): void { model.setFolderBusy(folderId, false); }
    },

    // sets the folder of one canvas in the list (null = no folder); only the frontend copy
    setCanvasFolderLocally(canvasId: string, folderId: string | null): void {
        function moveCB(canvas: Canvas): Canvas { return canvas._id === canvasId ? { ...canvas, folderId: folderId } : canvas; }
        this.canvases = this.canvases.map(moveCB);
    },

    // folderId null = take the canvas out of its folder (dropped on "All")
    // shown at once, then saved; the old folder comes back if the server refuses
    moveCanvasToFolder(canvasId: string, folderId: string | null): Promise<void> {
        const canvas = this.findCanvas(canvasId);
        if (!canvas) return Promise.resolve();
        const model = this;
        const canvasName = canvas.name;     // kept for failedACB below, which runs later
        const previousFolderId = canvas.folderId ?? null;
        const targetName = folderId ? this.getFolderName(folderId) : "All";
        if (previousFolderId === folderId) {
            this.showToast("\"" + canvas.name + "\" is already in " + targetName, "info");
            return Promise.resolve();
        }

        this.setCanvasFolderLocally(canvasId, folderId);
        return setCanvasFolderRequest(canvasId, folderId).catch(claimAndRetryACB).then(movedACB).catch(failedACB);

        // a canvas made before logging in is held by its owner token: it has to be claimed by the account first
        function claimAndRetryACB(error: RequestError): Promise<unknown> {
            if (error.status !== 403 || !isCanvasOwner(canvasId)) throw error;
            function retryACB(): Promise<unknown> { return setCanvasFolderRequest(canvasId, folderId); }
            return claimCanvas(canvasId).then(retryACB);
        }
        function movedACB(): void {
            if (folderId) model.showToast("Moved to " + targetName, "success");
            else model.showToast("Removed from folder", "success");
        }
        function failedACB(error: Error): void {
            // only undo it if nothing else moved the canvas since
            const now = model.findCanvas(canvasId);
            if (now && (now.folderId ?? null) === folderId) model.setCanvasFolderLocally(canvasId, previousFolderId);
            model.showToast("Could not move \"" + canvasName + "\": " + error.message, "error");
        }
    },

    // Drag and drop highlight
    setDragOverTab(tab: string | null): void { this.dragOverTab = tab; },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
