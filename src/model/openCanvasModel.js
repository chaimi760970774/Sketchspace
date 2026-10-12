import { resolvePromise, isPending } from "/src/utils/resolvePromise.js";
import { getCanvas, listStrokes, addStroke, deleteStroke } from "/src/api/canvasSource.js";
import { validateStroke } from "/src/utils/validateStroke.js";

// the server has the layers foreground / middleground / background; strokes go on the top one for now
const STROKE_LAYER_ID = "foreground";

// pencil is a bit see-through, pen is solid
const BRUSH_OPACITY = { pencil: 0.6, pen: 1 };

// the canvas that is open: its info from the server, renaming, sharing and its strokes
export const openCanvasModel = {

    // ========== Data ==========

    currentCanvas: null,        // { _id, name, isShared, createdAt, updatedAt, layers }, null while nothing is open

    // Strokes of the open canvas, oldest first (drawn in this order)
    // stroke: { id, canvasId, layerId, path: [{ x, y }], brush, size, color, opacity, status }
    //   id: the server's id, or a temporary one until the stroke is saved
    //   status (frontend only): "saving" / "saved" / "failed"
    strokes: [],



    // ========== Page state ==========

    canvasPromiseState: {},     // loading the canvas and its strokes
    renamingCanvas: false,      // true while the name input is shown in the topbar
    canvasNameDraft: "",
    canvasNameError: "",



    // ========== Methods ==========

    // Opening
    loadCanvas(canvasId){
        const model = this;

        // photos and shapes are not saved on the server yet, so the ones on screen belong to the
        // previously open canvas: start this one empty
        this.elements = [];
        this.selectedElementId = null;
        this.strokes = [];
        this.currentCanvas = null;
        this.cancelRename();

        // canvas info and strokes are requested at the same time
        const promise = Promise.all([getCanvas(canvasId), listStrokes(canvasId)]).then(storeACB);
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
            }
            return true;    // resolvePromise needs a truthy result, otherwise it still looks like loading
        }
        function loadFailedACB(error){
            if (isLatest()) model.showToast("Could not open the canvas: " + error.message, "error");
        }
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
    toggleCurrentCanvasShared(){
        this.setCanvasShared(this.currentCanvas._id, !this.currentCanvas.isShared);
    },

    // Strokes
    getStrokeOpacity(){ return BRUSH_OPACITY[this.strokeType]; },

    // The one place a new stroke is added. For real-time drawing later, send it with
    // socket.io "stroke:add" here instead of the REST addStroke.
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
            opacity: this.getStrokeOpacity(),
        };

        const error = validateStroke(stroke);
        if (error) {
            this.showToast("Stroke not saved: " + error, "error");
            return;
        }

        // shown right away, marked as "saving" until the server answers
        const temporaryId = "unsaved-" + crypto.randomUUID();
        this.strokes = [...this.strokes, { ...stroke, id: temporaryId, status: "saving" }];
        addStroke(stroke.canvasId, stroke).then(savedACB).catch(failedACB);

        function updateThisStroke(changes){
            function updateCB(other){ return other.id === temporaryId ? { ...other, ...changes } : other; }
            model.strokes = model.strokes.map(updateCB);
        }
        function savedACB(strokeId){
            updateThisStroke({ id: strokeId, status: "saved" });
            // the stroke may have been selected while saving: keep it selected under its new id
            if (model.selectedElementId === temporaryId) model.selectedElementId = strokeId;
        }
        function failedACB(error){
            updateThisStroke({ status: "failed" });
            model.showToast("A stroke could not be saved (" + error.message + "), it is shown faded", "error");
        }
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
        deleteStroke(canvasId, strokeId).then(deletedACB).catch(failedACB);

        function deletedACB(){ model.showToast("Line deleted", "success"); }
        function failedACB(error){
            // only put it back if that canvas is still open
            if (model.currentCanvas && model.currentCanvas._id === canvasId) putBack();
            model.showToast(deleteErrorMessage(error), "error");
        }
        // the strokes that were before it are still in front, in the same order: it goes right after them
        function putBack(){
            function wasBeforeCB(other){ return idsBefore.includes(other.id); }
            const position = model.strokes.filter(wasBeforeCB).length;
            model.strokes = [...model.strokes.slice(0, position), stroke, ...model.strokes.slice(position)];
        }
        // a 404 without a message from the server means the route does not exist (yet);
        // once the server has it, its own messages (e.g. "Stroke not found") are shown instead
        function deleteErrorMessage(error){
            if (error.status === 404 && !error.hasServerMessage)
                return "Deleting lines is not supported by the server yet, the line was put back";
            return "Could not delete the line (" + error.message + "), it was put back";
        }
    },

    // "saving", "failed", "saved", or "" when there are no strokes; shown next to the canvas name
    getStrokeSaveStatus(){
        function hasStatus(status){
            function isCB(stroke){ return stroke.status === status; }
            return isCB;
        }
        if (this.strokes.some(hasStatus("saving"))) return "saving";
        if (this.strokes.some(hasStatus("failed"))) return "failed";
        if (this.strokes.length > 0) return "saved";
        return "";
    },
};
