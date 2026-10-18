import { resolvePromise, isPending } from "/src/utils/resolvePromise.ts";
import { getCanvas, listStrokes, listElements, addStroke, deleteStroke, clearStrokes } from "/src/api/canvasSource.ts";
import { startSocket, stopSocket, joinCanvas, leaveCanvas, sendStroke, deleteStrokeLive, clearCanvasStrokes } from "/src/api/socketSource.ts";
import { getOwnerToken, isCanvasOwner } from "/src/api/canvasSource.ts";
import { toLocalElement } from "/src/utils/elementFields.ts";
import { validateStroke } from "/src/utils/validateStroke.ts";
import type { JoinResult } from "/src/api/socketSource.ts";
import type { Canvas, CanvasElement, Model, NewStroke, Point, PromiseState, SaveStatus, ServerElement, ServerStroke, Stroke } from "./types.ts";

// the server has the layers foreground / middleground / background; strokes go on the top one for now
const STROKE_LAYER_ID = "foreground";

export type LiveStatus = "offline" | "connecting" | "live";

interface OpenCanvasState {
    // Data
    currentCanvas: Canvas | null;   // null while nothing is open
    // Strokes of the open canvas, oldest first (drawn in this order); see Stroke in types.ts
    //   id: the server's id, or a temporary one until the stroke is saved
    //   status (frontend only): "saving" / "saved" / "failed"
    strokes: Stroke[];

    // Live drawing (socket.io)
    liveStatus: LiveStatus;         // "live": joined the canvas, strokes arrive and leave by socket
    peerCount: number;              // people in the canvas right now, including you
    joinedCanvasId: string | null;  // the canvas the socket has joined; kept while offline so it is joined again on reconnect
    shareDialogOpen: boolean;       // the popup with the canvas id
    shareCopied: boolean;           // true after Copy was clicked, until the popup is opened again
    canvasRemoved: "" | "unshared" | "deleted";     // set when the server removed you from the open canvas

    // Page state
    canvasPromiseState: PromiseState<boolean>;      // loading the canvas and its strokes
    renamingCanvas: boolean;        // true while the name input is shown in the topbar
    canvasNameDraft: string;
    canvasNameError: string;
}

const initialState: OpenCanvasState = {
    currentCanvas: null,
    strokes: [],
    liveStatus: "offline",
    peerCount: 0,
    joinedCanvasId: null,
    shareDialogOpen: false,
    shareCopied: false,
    canvasRemoved: "",
    canvasPromiseState: {},
    renamingCanvas: false,
    canvasNameDraft: "",
    canvasNameError: "",
};

// a stroke from the server, marked as saved (only the fields the app uses)
function toSavedStroke(stroke: ServerStroke): Stroke {
    return {
        id: stroke.id,
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

// the canvas that is open: its info from the server, renaming, sharing and its strokes
export const openCanvasModel = {

    // ========== Data and page state ==========

    ...initialState,



    // ========== Methods ==========

    // Opening
    loadCanvas(canvasId: string): void {
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
        function isLatest(): boolean { return model.canvasPromiseState.promise === promise; }

        function storeACB(results: [Canvas, ServerStroke[], ServerElement[]]): boolean {
            if (isLatest()) {
                model.currentCanvas = results[0];
                model.strokes = results[1].map(toSavedStroke);
                model.elements = results[2].map(toLocalElement);
                model.clearHistory();
                model.joinLiveCanvas(canvasId);
            }
            return true;    // resolvePromise needs a truthy result, otherwise it still looks like loading
        }
        function loadFailedACB(error: Error): void {
            if (isLatest()) model.showToast("Could not open the canvas: " + error.message, "error");
        }
    },

    // ---------- Live drawing ----------
    // The canvas loads over REST, then the socket joins it for the headcount and live changes.
    // Without the live connection, drawing still works over REST.
    joinLiveCanvas(canvasId: string): void {
        const model = this;
        // the socket is made once, so the handlers read the model's current state
        startSocket({
            onConnect: function connectedACB(): void { model.rejoinLiveCanvas(); },
            onDisconnect: function disconnectedACB(): void { model.liveStatus = "offline"; model.peerCount = 0; },
            onStrokeAdded: function strokeAddedACB(stroke: ServerStroke): void { model.addRemoteStroke(stroke); },
            onStrokeRemoved: function strokeRemovedACB(strokeId: string): void { model.removeStrokeLocally(strokeId); },
            onStrokeDeleted: function strokeDeletedACB(strokeId: string): void { model.removeStrokeLocally(strokeId); },
            onElementAdded: function elementAddedACB(element: ServerElement): void { model.addRemoteElement(element); },
            onElementUpdated: function elementUpdatedACB(element: ServerElement): void { model.updateRemoteElement(element); },
            onElementDeleted: function elementDeletedACB(elementId: string): void { model.removeElementLocally(elementId); },
            onCleared: function clearedACB(): void { model.clearStrokesLocally(); model.showToast("The owner cleared the canvas", "info"); },
            onPeers: function peersACB(count: number): void { model.peerCount = count; },
            onUnshared: function unsharedACB(): void { model.removedFromCanvas("unshared"); },
            onDeleted: function deletedACB(): void { model.removedFromCanvas("deleted"); },
        });
        this.joinedCanvasId = canvasId;
        this.sendJoin(canvasId);
    },

    // waits in the socket until it is connected
    sendJoin(canvasId: string): void {
        const model = this;
        this.liveStatus = "connecting";
        joinCanvas(canvasId, getOwnerToken(canvasId)).then(joinedACB).catch(joinFailedACB);

        function isStillOpen(): boolean { return model.joinedCanvasId === canvasId; }
        function joinedACB(result: JoinResult): void {
            if (!isStillOpen()) return;
            model.liveStatus = "live";
            // the server's strokes and elements, plus our own that are not saved yet
            function isUnsavedCB(item: { status?: SaveStatus }): boolean { return item.status !== "saved"; }
            model.strokes = [...result.strokes.map(toSavedStroke), ...model.strokes.filter(isUnsavedCB)];
            model.elements = [...result.elements.map(toLocalElement), ...model.elements.filter(isUnsavedCB)];
        }
        function joinFailedACB(error: Error): void {
            if (!isStillOpen()) return;
            model.liveStatus = "offline";
            model.showToast("Live drawing is not available (" + error.message + "), strokes are saved without live sharing", "error");
        }
    },

    // after a reconnect: join again to get what was missed
    rejoinLiveCanvas(): void {
        if (this.joinedCanvasId && this.liveStatus === "offline") this.sendJoin(this.joinedCanvasId);
    },

    // a stroke another person drew
    addRemoteStroke(stroke: ServerStroke): void {
        if (!this.currentCanvas || stroke.canvasId !== this.currentCanvas._id) return;
        if (this.findStroke(stroke.id)) return;         // our own REST stroke, announced to everyone
        this.strokes = [...this.strokes, toSavedStroke(stroke)];
    },

    // a stroke somebody else undid
    removeStrokeLocally(strokeId: string): void {
        function isOtherCB(stroke: Stroke): boolean { return stroke.id !== strokeId; }
        this.strokes = this.strokes.filter(isOtherCB);
        if (this.selectedElementId === strokeId) this.selectedElementId = null;
    },
    clearStrokesLocally(): void {
        this.strokes = [];
        this.selectedElementId = null;
    },

    // the owner made the canvas private or deleted it
    removedFromCanvas(reason: "unshared" | "deleted"): void {
        this.canvasRemoved = reason;
        this.joinedCanvasId = null;
        this.peerCount = 0;
        this.liveStatus = "offline";
        this.currentCanvas = null;
        this.strokes = [];
        this.elements = [];
        this.selectedElementId = null;
    },

    // after a login or logout the connection still carries the old login: close it, the next canvas opens a new one
    resetLiveConnection(): void {
        stopSocket();
        this.joinedCanvasId = null;
        this.peerCount = 0;
        this.liveStatus = "offline";
    },

    // the canvas page closed or another canvas opened
    leaveLiveCanvas(): void {
        if (this.joinedCanvasId) leaveCanvas();
        this.joinedCanvasId = null;
        this.peerCount = 0;
        if (this.liveStatus === "live") this.liveStatus = "offline";
    },

    getLiveLabel(): string {
        if (this.liveStatus === "live") return this.peerCount > 1 ? "people drawing here" : "only you here";
        if (this.liveStatus === "connecting") return "connecting...";
        return "offline";
    },

    isLoadingCanvas(): boolean { return isPending(this.canvasPromiseState); },
    isCanvasOpen(canvasId: string | undefined): boolean { return Boolean(this.currentCanvas) && this.currentCanvas?._id === canvasId; },

    // the server answers 404 for an unknown id and 400 for a badly formed one
    isCanvasNotFound(): boolean {
        const error = this.canvasPromiseState.error;
        if (!error) return false;
        return error.status === 404 || error.status === 400;
    },
    getCanvasError(): string {
        const error = this.canvasPromiseState.error;
        return error ? error.message : "";
    },

    // Renaming (Enter saves, Esc cancels, clicking away saves)
    startRename(): void {
        if (!this.currentCanvas) return;
        this.renamingCanvas = true;
        this.canvasNameDraft = this.currentCanvas.name;
        this.canvasNameError = "";
    },
    setCanvasNameDraft(name: string): void {
        this.canvasNameDraft = name;
        this.canvasNameError = "";
    },
    cancelRename(): void {
        this.renamingCanvas = false;
        this.canvasNameDraft = "";
        this.canvasNameError = "";
    },
    saveRename(): void {
        if (!this.renamingCanvas || !this.currentCanvas) return;       // e.g. the blur that follows Enter or Esc
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
    openShareDialog(): Promise<void> {
        const model = this;
        const canvas = this.currentCanvas;
        if (!canvas) return Promise.resolve();
        const sharedCanvasId = canvas._id;      // kept for afterSaveACB below, which runs later
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
        function afterSaveACB(): void {
            const open = model.currentCanvas;
            if (open && open._id === sharedCanvasId && open.isShared) model.shareDialogOpen = true;
        }
    },
    closeShareDialog(): void { this.shareDialogOpen = false; },

    // the Copy button in the popup
    copyCanvasId(): Promise<void> {
        if (!this.currentCanvas) return Promise.resolve();
        const model = this;
        const canvasId = this.currentCanvas._id;
        function copiedACB(): void { model.shareCopied = true; }
        function copyFailedACB(): void { model.showToast("Could not copy, select the id and copy it by hand", "info"); }
        if (!navigator.clipboard) return Promise.resolve(copyFailedACB());
        return navigator.clipboard.writeText(canvasId).then(copiedACB, copyFailedACB);
    },

    // "Make private" in the popup: everyone else is removed from the canvas
    makeCurrentCanvasPrivate(): Promise<void> {
        this.closeShareDialog();
        if (!this.currentCanvas) return Promise.resolve();
        return this.setCanvasShared(this.currentCanvas._id, false);
    },

    // only the owner (the account, or whoever holds the token) can change sharing; the server says if the account owns it
    isCurrentCanvasOwner(): boolean {
        if (!this.currentCanvas) return false;
        return this.currentCanvas.isOwner === true || isCanvasOwner(this.currentCanvas._id);
    },

    // Strokes
    // The one place a stroke is added: over the socket when joined, otherwise REST.
    drawStroke(path: Point[]): void {
        if (!this.currentCanvas) return;
        const model = this;
        const stroke: NewStroke = {
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

        function updateThisStroke(changes: Partial<Stroke>): void {
            function updateCB(other: Stroke): Stroke { return other.id === temporaryId ? { ...other, ...changes } : other; }
            model.strokes = model.strokes.map(updateCB);
        }
        function isNotTemporaryCB(other: Stroke): boolean { return other.id !== temporaryId; }
        function savedACB(strokeId: string): void {
            // a REST stroke can come back through "stroke:added" first: keep one
            if (model.findStroke(strokeId)) {
                model.strokes = model.strokes.filter(isNotTemporaryCB);
            } else {
                updateThisStroke({ id: strokeId, status: "saved" });
            }
            // the stroke may have been selected while saving: keep it selected under its new id
            if (model.selectedElementId === temporaryId) model.selectedElementId = strokeId;
            model.pushUndoOp({ type: "removeStroke", strokeId });
        }
        function failedACB(error: Error): void {
            updateThisStroke({ status: "failed" });
            model.showToast("A stroke could not be saved (" + error.message + "), it is shown faded", "error");
        }
    },

    isLive(): boolean { return this.liveStatus === "live" && Boolean(this.currentCanvas) && this.joinedCanvasId === this.currentCanvas?._id; },

    // Clear: removes every stroke and every element (owner only).
    // The server clears strokes in one request but has no bulk delete for elements, so each saved element is deleted
    // on its own; the people in the canvas get an "element:deleted" for each. Elements still saving are kept.
    clearCanvas(): Promise<void> {
        const model = this;
        if (!this.currentCanvas) return Promise.resolve();
        if (!this.isCurrentCanvasOwner()) {
            this.showToast("Only the owner can clear the canvas", "error");
            return Promise.resolve();
        }
        const canvasId = this.currentCanvas._id;
        function isSavedCB(element: CanvasElement): boolean { return element.status !== "saving"; }
        const savedElements = this.elements.filter(isSavedCB);
        const stillSaving = this.elements.length - savedElements.length;
        const clearing = this.isLive() ? clearCanvasStrokes() : clearStrokes(canvasId);
        return clearing.then(clearedACB).catch(failedACB);

        function clearedACB(removedStrokes: number): void {
            if (!model.isCanvasOpenNow(canvasId)) return;
            model.clearStrokesLocally();
            function removeElementCB(element: CanvasElement): void { model.removeElement(element.id, true); }
            savedElements.forEach(removeElementCB);
            model.clearHistory();
            const total = removedStrokes + savedElements.length;
            model.showToast("Cleared " + total + (total === 1 ? " item" : " items")
                + (stillSaving ? ", " + stillSaving + " still saving, clear again" : ""), "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not clear the canvas: " + error.message, "error"); }
    },

    findStroke(strokeId: string | null): Stroke | undefined {
        function isTargetCB(stroke: Stroke): boolean { return stroke.id === strokeId; }
        return this.strokes.find(isTargetCB);
    },

    // Removed from the canvas right away, then deleted on the server.
    // If the server refuses, the stroke is put back where it was.
    // quiet: no "deleted" or "still saving" messages (used by the eraser)
    removeStroke(strokeId: string, quiet?: boolean): void {
        const model = this;
        const stroke = this.findStroke(strokeId);
        if (!stroke) return;

        if (stroke.status === "saving") {
            if (!quiet) this.showToast("Line is still saving, try again in a moment", "info");
            return;
        }

        const removed: Stroke = stroke;     // kept for putBack below, which may run much later
        function isTargetCB(other: Stroke): boolean { return other.id === strokeId; }
        function isOtherCB(other: Stroke): boolean { return other.id !== strokeId; }
        function toIdCB(other: Stroke): string { return other.id; }
        // the strokes drawn before this one, to find its place again if it has to come back
        const idsBefore = this.strokes.slice(0, this.strokes.findIndex(isTargetCB)).map(toIdCB);

        this.strokes = this.strokes.filter(isOtherCB);
        this.selectedElementId = null;

        // a stroke that failed to save never reached the server, so there is nothing to delete there
        if (stroke.status === "failed") {
            if (!quiet) this.showToast("Line deleted", "success");
            return;
        }

        this.pushUndoOp({ type: "restoreStroke", stroke: removed });

        if (!this.currentCanvas) return;
        const canvasId = this.currentCanvas._id;
        const deleting = this.isLive() ? deleteStrokeLive(strokeId) : deleteStroke(canvasId, strokeId);
        deleting.then(deletedACB).catch(failedACB);

        function deletedACB(): void { if (!quiet) model.showToast("Line deleted", "success"); }
        function failedACB(error: Error): void {
            // only put it back if that canvas is still open
            if (model.currentCanvas && model.currentCanvas._id === canvasId) putBack();
            model.showToast("Could not delete the line (" + error.message + "), it was put back", "error");
        }
        // the strokes that were before it are still in front, in the same order: it goes right after them
        function putBack(): void {
            function wasBeforeCB(other: Stroke): boolean { return idsBefore.includes(other.id); }
            const position = model.strokes.filter(wasBeforeCB).length;
            model.strokes = [...model.strokes.slice(0, position), removed, ...model.strokes.slice(position)];
        }
    },

    // Re-adds a previously deleted stroke to the server. Used by undo/redo.
    // onSaved receives the new server id once the stroke is saved; no pushUndoOp is called here
    // (the caller supplies the callback to keep the history stack correct).
    restoreStroke(stroke: Stroke, onSaved?: (strokeId: string) => void): void {
        if (!this.currentCanvas) return;
        const model = this;
        const newStroke: NewStroke = {
            canvasId: this.currentCanvas._id,
            layerId: stroke.layerId,
            path: stroke.path,
            brush: stroke.brush,
            size: stroke.size,
            color: stroke.color,
            opacity: stroke.opacity,
        };
        const temporaryId = "unsaved-" + crypto.randomUUID();
        this.strokes = [...this.strokes, { ...newStroke, id: temporaryId, status: "saving" }];
        const isLive = this.liveStatus === "live" && this.joinedCanvasId === newStroke.canvasId;
        const sending = isLive ? sendStroke(newStroke) : addStroke(newStroke.canvasId, newStroke);
        sending.then(savedACB).catch(failedACB);

        function updateThisStroke(changes: Partial<Stroke>): void {
            function updateCB(other: Stroke): Stroke { return other.id === temporaryId ? { ...other, ...changes } : other; }
            model.strokes = model.strokes.map(updateCB);
        }
        function isNotTemporaryCB(other: Stroke): boolean { return other.id !== temporaryId; }
        function savedACB(strokeId: string): void {
            if (model.findStroke(strokeId)) {
                model.strokes = model.strokes.filter(isNotTemporaryCB);
            } else {
                updateThisStroke({ id: strokeId, status: "saved" });
            }
            if (model.selectedElementId === temporaryId) model.selectedElementId = strokeId;
            onSaved?.(strokeId);
        }
        function failedACB(error: Error): void {
            updateThisStroke({ status: "failed" });
            model.showToast("A stroke could not be restored (" + error.message + "), it is shown faded", "error");
        }
    },

    // "saving", "failed", "saved", or "" when there is nothing on the canvas; shown next to the canvas name
    // (failed strokes stay faded; failed elements are removed)
    getSaveStatus(): SaveStatus | "" {
        const items: { status?: SaveStatus }[] = [...this.strokes, ...this.elements];
        function hasStatus(status: SaveStatus): (item: { status?: SaveStatus }) => boolean {
            function isCB(item: { status?: SaveStatus }): boolean { return item.status === status; }
            return isCB;
        }
        if (items.some(hasStatus("saving"))) return "saving";
        if (items.some(hasStatus("failed"))) return "failed";
        if (items.length > 0) return "saved";
        return "";
    },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
