import { resolvePromise, isPending } from "/src/utils/resolvePromise.js";
import { getCanvas, listStrokes, listElements, addStroke, deleteStroke, clearStrokes } from "/src/api/canvasSource.js";
import { startSocket, isSocketConnected, joinCanvas, leaveCanvas, sendStroke, deleteStrokeLive, undoStroke, clearCanvasStrokes } from "/src/api/socketSource.js";
import { getOwnerToken, isCanvasOwner } from "/src/api/canvasSource.js";
import { toLocalElement } from "/src/utils/elementFields.js";
import { validateStroke } from "/src/utils/validateStroke.js";

// the server has the layers foreground / middleground / background; strokes go on the top one for now
const STROKE_LAYER_ID = "foreground";

// the canvas that is open: its info from the server, renaming, sharing and its strokes
export const openCanvasModel = {

    // ========== Data ==========

    currentCanvas: null,        // { _id, name, isShared, createdAt, updatedAt, layers }, null while nothing is open

    // Strokes of the open canvas, oldest first (drawn in this order)
    // stroke: { id, canvasId, layerId, path: [{ x, y }], brush, size, color, opacity, status }
    //   id: the server's id, or a temporary one until the stroke is saved
    //   status (frontend only): "saving" / "saved" / "failed"
    strokes: [],

    // Live drawing (socket.io)
    liveStatus: "offline",      // "offline" / "connecting" / "live" (joined the canvas, strokes arrive and leave by socket)
    peerCount: 0,               // people in the canvas right now, including you
    joinedCanvasId: null,       // the canvas the socket has joined; kept while offline so it is joined again on reconnect
    shareDialogOpen: false,     // the popup with the canvas id
    shareCopied: false,         // true after Copy was clicked, until the popup is opened again
    canvasRemoved: "",          // "unshared" / "deleted" when the server removed you from the open canvas, otherwise ""



    // ========== Page state ==========

    canvasPromiseState: {},     // loading the canvas and its strokes
    renamingCanvas: false,      // true while the name input is shown in the topbar
    canvasNameDraft: "",
    canvasNameError: "",



    // ========== Methods ==========

    // Opening
    loadCanvas(canvasId){
        const model = this;

        // what is on screen belongs to the previous canvas: start empty
        this.elements = [];
        this.pendingElementChanges = {};
        this.selectedElementId = null;
        this.strokes = [];
        this.currentCanvas = null;
        this.canvasRemoved = "";
        this.shareDialogOpen = false;
        this.leaveLiveCanvas();
        this.cancelRename();

        // canvas info, strokes and elements are requested at the same time
        const promise = Promise.all([getCanvas(canvasId), listStrokes(canvasId), listElements(canvasId)]).then(storeACB);
        resolvePromise(promise, this.canvasPromiseState);
        promise.catch(loadFailedACB);

        // a canvas opened earlier that finishes loading late must not replace this one
        function isLatest(){ return model.canvasPromiseState.promise === promise; }

        // keep only the stroke fields the app uses (the server also sends _id and createdAt)
        function toSavedStrokeCB(stroke){
            return {
                id: stroke._id,
                canvasId: stroke.canvasId,
                layerId: stroke.layerId,
                path: stroke.path,
                brush: stroke.brush,
                size: stroke.size,
                color: stroke.color,
                opacity: stroke.opacity,
                status: "saved",
            };
        }
        function storeACB(results){
            if (isLatest()) {
                model.currentCanvas = results[0];
                model.strokes = results[1].map(toSavedStrokeCB);
                model.elements = results[2].map(toLocalElement);
                model.joinLiveCanvas(canvasId);
            }
            return true;    // resolvePromise needs a truthy result, otherwise it still looks like loading
        }
        function loadFailedACB(error){
            if (isLatest()) model.showToast("Could not open the canvas: " + error.message, "error");
        }
    },

    // ---------- Live drawing ----------
    // The canvas loads over REST, then the socket joins it for the headcount and live changes.
    // Without the live connection, drawing still works over REST.
    joinLiveCanvas(canvasId){
        const model = this;
        // the socket is made once, so the handlers read the model's current state
        startSocket({
            onConnect: function connectedACB(){ model.rejoinLiveCanvas(); },
            onDisconnect: function disconnectedACB(){ model.liveStatus = "offline"; model.peerCount = 0; },
            onStrokeAdded: function strokeAddedACB(stroke){ model.addRemoteStroke(stroke); },
            onStrokeRemoved: function strokeRemovedACB(strokeId){ model.removeStrokeLocally(strokeId); },
            onStrokeDeleted: function strokeDeletedACB(strokeId){ model.removeStrokeLocally(strokeId); },
            onElementAdded: function elementAddedACB(element){ model.addRemoteElement(element); },
            onElementUpdated: function elementUpdatedACB(element){ model.updateRemoteElement(element); },
            onElementDeleted: function elementDeletedACB(elementId){ model.removeElementLocally(elementId); },
            onCleared: function clearedACB(){ model.clearStrokesLocally(); model.showToast("The owner cleared the canvas", "info"); },
            onPeers: function peersACB(count){ model.peerCount = count; },
            onUnshared: function unsharedACB(){ model.removedFromCanvas("unshared"); },
            onDeleted: function deletedACB(){ model.removedFromCanvas("deleted"); },
        });
        this.joinedCanvasId = canvasId;
        this.sendJoin(canvasId);
    },

    // waits in the socket until it is connected
    sendJoin(canvasId){
        const model = this;
        this.liveStatus = "connecting";
        joinCanvas(canvasId, getOwnerToken(canvasId)).then(joinedACB).catch(joinFailedACB);

        function isStillOpen(){ return model.joinedCanvasId === canvasId; }
        function joinedACB(result){
            if (!isStillOpen()) return;
            model.liveStatus = "live";
            // the server's strokes and elements, plus our own that are not saved yet
            function toSavedStrokeCB(stroke){ return { ...stroke, status: "saved" }; }
            function isUnsavedCB(stroke){ return stroke.status !== "saved"; }
            model.strokes = [...result.strokes.map(toSavedStrokeCB), ...model.strokes.filter(isUnsavedCB)];
            model.elements = [...result.elements.map(toLocalElement), ...model.elements.filter(isUnsavedCB)];
        }
        function joinFailedACB(error){
            if (!isStillOpen()) return;
            model.liveStatus = "offline";
            model.showToast("Live drawing is not available (" + error.message + "), strokes are saved without live sharing", "error");
        }
    },

    // after a reconnect: join again to get what was missed
    rejoinLiveCanvas(){
        if (this.joinedCanvasId && this.liveStatus === "offline") this.sendJoin(this.joinedCanvasId);
    },

    // a stroke another person drew
    addRemoteStroke(stroke){
        if (!this.currentCanvas || stroke.canvasId !== this.currentCanvas._id) return;
        if (this.findStroke(stroke.id)) return;         // our own REST stroke, announced to everyone
        this.strokes = [...this.strokes, { ...stroke, status: "saved" }];
    },

    // a stroke somebody else undid
    removeStrokeLocally(strokeId){
        function isOtherCB(stroke){ return stroke.id !== strokeId; }
        this.strokes = this.strokes.filter(isOtherCB);
        if (this.selectedElementId === strokeId) this.selectedElementId = null;
    },
    clearStrokesLocally(){
        this.strokes = [];
        this.selectedElementId = null;
    },

    // the owner made the canvas private or deleted it
    removedFromCanvas(reason){
        this.canvasRemoved = reason;
        this.joinedCanvasId = null;
        this.peerCount = 0;
        this.liveStatus = "offline";
        this.currentCanvas = null;
        this.strokes = [];
        this.elements = [];
        this.selectedElementId = null;
    },

    // the canvas page closed or another canvas opened
    leaveLiveCanvas(){
        if (this.joinedCanvasId) leaveCanvas();
        this.joinedCanvasId = null;
        this.peerCount = 0;
        if (this.liveStatus === "live") this.liveStatus = "offline";
    },

    getLiveLabel(){
        if (this.liveStatus === "live") return this.peerCount > 1 ? "people drawing here" : "only you here";
        if (this.liveStatus === "connecting") return "connecting...";
        return "offline";
    },

    isLoadingCanvas(){ return isPending(this.canvasPromiseState); },
    isCanvasOpen(canvasId){ return Boolean(this.currentCanvas) && this.currentCanvas._id === canvasId; },

    // the server answers 404 for an unknown id and 400 for a badly formed one
    isCanvasNotFound(){
        const error = this.canvasPromiseState.error;
        return Boolean(error) && (error.status === 404 || error.status === 400);
    },
    getCanvasError(){
        const error = this.canvasPromiseState.error;
        return error ? error.message : "";
    },

    // Renaming (Enter saves, Esc cancels, clicking away saves)
    startRename(){
        this.renamingCanvas = true;
        this.canvasNameDraft = this.currentCanvas.name;
        this.canvasNameError = "";
    },
    setCanvasNameDraft(name){
        this.canvasNameDraft = name;
        this.canvasNameError = "";
    },
    cancelRename(){
        this.renamingCanvas = false;
        this.canvasNameDraft = "";
        this.canvasNameError = "";
    },
    saveRename(){
        if (!this.renamingCanvas) return;       // e.g. the blur that follows Enter or Esc
        const name = this.canvasNameDraft.trim();
        if (!name) {
            this.canvasNameError = "Name cannot be empty";
            return;
        }
        const canvas = this.currentCanvas;
        this.cancelRename();
        if (name === canvas.name) return;       // nothing changed, no request needed
        this.saveCanvasChanges(canvas._id, { name: name }, "Renamed to \"" + name + "\"");
    },

    // Sharing
    // Share button: shares a private canvas (owner only), then opens the popup with the canvas id
    openShareDialog(){
        const model = this;
        const canvas = this.currentCanvas;
        this.shareCopied = false;
        if (canvas.isShared) {
            this.shareDialogOpen = true;
            return Promise.resolve();
        }
        if (!this.isCurrentCanvasOwner()) {
            this.showToast("Only the owner can share this canvas", "error");
            return Promise.resolve();
        }
        return this.saveCanvasChanges(canvas._id, { isShared: true }, "Canvas is now shared in the Gallery").then(afterSaveACB);

        // saveCanvasChanges reports its own failure: only open the popup if the canvas is shared now
        function afterSaveACB(){
            const open = model.currentCanvas;
            if (open && open._id === canvas._id && open.isShared) model.shareDialogOpen = true;
        }
    },
    closeShareDialog(){ this.shareDialogOpen = false; },

    // the Copy button in the popup
    copyCanvasId(){
        const model = this;
        const canvasId = this.currentCanvas._id;
        function copiedACB(){ model.shareCopied = true; }
        function copyFailedACB(){ model.showToast("Could not copy, select the id and copy it by hand", "info"); }
        if (!navigator.clipboard) return Promise.resolve(copyFailedACB());
        return navigator.clipboard.writeText(canvasId).then(copiedACB, copyFailedACB);
    },

    // "Make private" in the popup: everyone else is removed from the canvas
    makeCurrentCanvasPrivate(){
        this.closeShareDialog();
        return this.setCanvasShared(this.currentCanvas._id, false);
    },

    // only the owner (holds the token) can change sharing
    isCurrentCanvasOwner(){ return Boolean(this.currentCanvas) && isCanvasOwner(this.currentCanvas._id); },

    // Strokes
    // The one place a stroke is added: over the socket when joined, otherwise REST.
    drawStroke(path){
        if (!this.currentCanvas) return;
        const model = this;
        const stroke = {
            canvasId: this.currentCanvas._id,
            layerId: STROKE_LAYER_ID,
            path: path,
            brush: this.strokeType,
            size: this.strokeWidth,
            color: this.strokeColor,
            opacity: this.strokeOpacity,
        };

        const error = validateStroke(stroke);
        if (error) {
            this.showToast("Stroke not saved: " + error, "error");
            return;
        }

        // shown right away, marked as "saving" until the server answers
        const temporaryId = "unsaved-" + crypto.randomUUID();
        this.strokes = [...this.strokes, { ...stroke, id: temporaryId, status: "saving" }];
        const isLive = this.liveStatus === "live" && this.joinedCanvasId === stroke.canvasId;
        const sending = isLive ? sendStroke(stroke) : addStroke(stroke.canvasId, stroke);
        sending.then(savedACB).catch(failedACB);

        function updateThisStroke(changes){
            function updateCB(other){ return other.id === temporaryId ? { ...other, ...changes } : other; }
            model.strokes = model.strokes.map(updateCB);
        }
        function savedACB(strokeId){
            // a REST stroke can come back through "stroke:added" first: keep one
            if (model.findStroke(strokeId)) {
                function isTemporaryCB(other){ return other.id !== temporaryId; }
                model.strokes = model.strokes.filter(isTemporaryCB);
            } else {
                updateThisStroke({ id: strokeId, status: "saved" });
            }
            // the stroke may have been selected while saving: keep it selected under its new id
            if (model.selectedElementId === temporaryId) model.selectedElementId = strokeId;
        }
        function failedACB(error){
            updateThisStroke({ status: "failed" });
            model.showToast("A stroke could not be saved (" + error.message + "), it is shown faded", "error");
        }
    },

    isLive(){ return this.liveStatus === "live" && this.joinedCanvasId === (this.currentCanvas && this.currentCanvas._id); },

    // Undo: the server removes the caller's most recent stroke, then it goes from this screen too.
    // It needs the live connection: strokes saved over REST cannot be undone.
    undoLastStroke(){
        const model = this;
        if (!this.currentCanvas) return Promise.resolve();
        if (!this.isLive()) {
            this.showToast("Undo needs the live connection", "info");
            return Promise.resolve();
        }
        if (this.getSaveStatus() === "saving") {
            this.showToast("A line is still being saved, try again in a moment", "info");
            return Promise.resolve();
        }
        return undoStroke().then(undoneACB).catch(failedACB);

        function undoneACB(strokeId){ model.removeStrokeLocally(strokeId); }
        function failedACB(error){ model.showToast("Could not undo: " + error.message, "error"); }
    },

    // Clear: removes every stroke (owner only); photos and shapes stay. Over the socket when live, otherwise REST.
    clearAllStrokes(){
        const model = this;
        if (!this.currentCanvas) return Promise.resolve();
        if (!this.isCurrentCanvasOwner()) {
            this.showToast("Only the owner can clear the canvas", "error");
            return Promise.resolve();
        }
        const canvasId = this.currentCanvas._id;
        const clearing = this.isLive() ? clearCanvasStrokes() : clearStrokes(canvasId);
        return clearing.then(clearedACB).catch(failedACB);

        function clearedACB(removed){
            if (model.currentCanvas && model.currentCanvas._id === canvasId) model.clearStrokesLocally();
            model.showToast("Cleared " + removed + (removed === 1 ? " line" : " lines"), "success");
        }
        function failedACB(error){ model.showToast("Could not clear the canvas: " + error.message, "error"); }
    },

    findStroke(strokeId){
        function isTargetCB(stroke){ return stroke.id === strokeId; }
        return this.strokes.find(isTargetCB);
    },

    // Removed from the canvas right away, then deleted on the server.
    // If the server refuses, the stroke is put back where it was.
    removeStroke(strokeId){
        const model = this;
        const stroke = this.findStroke(strokeId);
        if (!stroke) return;

        if (stroke.status === "saving") {
            this.showToast("This line is still being saved, try again in a moment", "info");
            return;
        }

        function isTargetCB(other){ return other.id === strokeId; }
        function isOtherCB(other){ return other.id !== strokeId; }
        function toIdCB(other){ return other.id; }
        // the strokes drawn before this one, to find its place again if it has to come back
        const idsBefore = this.strokes.slice(0, this.strokes.findIndex(isTargetCB)).map(toIdCB);

        this.strokes = this.strokes.filter(isOtherCB);
        this.selectedElementId = null;

        // a stroke that failed to save never reached the server, so there is nothing to delete there
        if (stroke.status === "failed") {
            this.showToast("Line deleted", "success");
            return;
        }

        const canvasId = this.currentCanvas._id;
        const deleting = this.isLive() ? deleteStrokeLive(strokeId) : deleteStroke(canvasId, strokeId);
        deleting.then(deletedACB).catch(failedACB);

        function deletedACB(){ model.showToast("Line deleted", "success"); }
        function failedACB(error){
            // only put it back if that canvas is still open
            if (model.currentCanvas && model.currentCanvas._id === canvasId) putBack();
            model.showToast("Could not delete the line (" + error.message + "), it was put back", "error");
        }
        // the strokes that were before it are still in front, in the same order: it goes right after them
        function putBack(){
            function wasBeforeCB(other){ return idsBefore.includes(other.id); }
            const position = model.strokes.filter(wasBeforeCB).length;
            model.strokes = [...model.strokes.slice(0, position), stroke, ...model.strokes.slice(position)];
        }
    },

    // "saving", "failed", "saved", or "" when there is nothing on the canvas; shown next to the canvas name
    // (failed strokes stay faded; failed elements are removed)
    getSaveStatus(){
        const items = [...this.strokes, ...this.elements];
        function hasStatus(status){
            function isCB(item){ return item.status === status; }
            return isCB;
        }
        if (items.some(hasStatus("saving"))) return "saving";
        if (items.some(hasStatus("failed"))) return "failed";
        if (items.length > 0) return "saved";
        return "";
    },
};
