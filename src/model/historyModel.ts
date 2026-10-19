import type { CanvasElement, ElementChanges, Model, Stroke } from "./types.ts";

export type HistoryOp =
    | { type: "removeStroke";  strokeId: string }
    | { type: "restoreStroke"; stroke: Stroke }
    | { type: "removeElement"; elementId: string }
    | { type: "restoreElement"; element: CanvasElement }
    | { type: "updateElement"; elementId: string; changes: ElementChanges };

const MAX_HISTORY = 20;

interface HistoryState {
    undoStack: HistoryOp[];
    redoStack: HistoryOp[];
    isApplyingHistory: boolean;
}

const initialState: HistoryState = {
    undoStack: [],
    redoStack: [],
    isApplyingHistory: false,
};

function renameElementIdInOp(op: HistoryOp, oldId: string, newId: string): HistoryOp {
    if (op.type === "updateElement"  && op.elementId        === oldId) return { ...op, elementId: newId };
    if (op.type === "removeElement"  && op.elementId        === oldId) return { ...op, elementId: newId };
    if (op.type === "restoreElement" && op.element.id       === oldId) return { ...op, element: { ...op.element, id: newId } };
    return op;
}

// the values the element had before the given changes (mirrors the helper in canvasModel.ts)
function previousValues(element: CanvasElement, changes: ElementChanges): ElementChanges {
    return {
        ...(changes.x !== undefined && { x: element.x }),
        ...(changes.y !== undefined && { y: element.y }),
        ...(changes.width !== undefined && { width: element.width }),
        ...(changes.height !== undefined && { height: element.height }),
        ...(changes.rotation !== undefined && { rotation: element.rotation }),
        ...(changes.zIndex !== undefined && { zIndex: element.zIndex }),
        ...(changes.color !== undefined && element.type === "shape" && { color: element.color }),
    };
}

export const historyModel = {

    // ========== State ==========

    ...initialState,



    // ========== Methods ==========

    // Called by normal user actions: append to undoStack, clear redoStack.
    // No-op while an undo/redo is executing (prevents recursive history entries).
    pushUndoOp(op: HistoryOp): void {
        if (this.isApplyingHistory) return;
        this.undoStack = [...this.undoStack.slice(-(MAX_HISTORY - 1)), op];
        this.redoStack = [];
    },

    // Called by async redo completions: append to undoStack only.
    appendUndoOp(op: HistoryOp): void {
        this.undoStack = [...this.undoStack.slice(-(MAX_HISTORY - 1)), op];
    },

    // Called by undo: append to redoStack only.
    appendRedoOp(op: HistoryOp): void {
        this.redoStack = [...this.redoStack, op];
    },

    renameElementInRedoStack(oldId: string, newId: string): void {
        this.redoStack = this.redoStack.map(op => renameElementIdInOp(op, oldId, newId));
    },
    renameElementInUndoStack(oldId: string, newId: string): void {
        this.undoStack = this.undoStack.map(op => renameElementIdInOp(op, oldId, newId));
    },

    clearHistory(): void {
        this.undoStack = [];
        this.redoStack = [];
    },

    canUndo(): boolean { return this.undoStack.length > 0; },
    canRedo(): boolean { return this.redoStack.length > 0; },

    // Pop from undoStack, execute the reverse, push the inverse to redoStack.
    undo(): void {
        const op = this.undoStack[this.undoStack.length - 1];
        if (!op) return;
        this.undoStack = this.undoStack.slice(0, -1);
        this.isApplyingHistory = true;

        if (op.type === "removeStroke") {
            const stroke = this.findStroke(op.strokeId);
            if (stroke) {
                this.appendRedoOp({ type: "restoreStroke", stroke });
                this.removeStroke(op.strokeId, true);
            }
        } else if (op.type === "restoreStroke") {
            const model = this;
            this.isApplyingHistory = false;
            this.restoreStroke(op.stroke, function onSavedACB(newId: string) {
                model.appendRedoOp({ type: "removeStroke", strokeId: newId });
            });
            return;
        } else if (op.type === "removeElement") {
            const element = this.findElement(op.elementId);
            if (element) {
                this.appendRedoOp({ type: "restoreElement", element });
                this.removeElement(op.elementId, true);
            }
        } else if (op.type === "restoreElement") {
            const model = this;
            const oldId = op.element.id;
            this.isApplyingHistory = false;
            this.restoreElement(op.element, function onSavedACB(newId: string) {
                model.appendRedoOp({ type: "removeElement", elementId: newId });
                model.renameElementInUndoStack(oldId, newId);
            });
            return;
        } else if (op.type === "updateElement") {
            const element = this.findElement(op.elementId);
            if (element) {
                const currentVals = previousValues(element, op.changes);
                this.appendRedoOp({ type: "updateElement", elementId: op.elementId, changes: currentVals });
                this.updateElement(op.elementId, op.changes);
            }
        }

        this.isApplyingHistory = false;
    },

    // Pop from redoStack, re-execute the action, push the inverse to undoStack.
    redo(): void {
        const op = this.redoStack[this.redoStack.length - 1];
        if (!op) return;
        this.redoStack = this.redoStack.slice(0, -1);
        this.isApplyingHistory = true;

        if (op.type === "removeStroke") {
            const stroke = this.findStroke(op.strokeId);
            if (stroke) {
                this.appendUndoOp({ type: "restoreStroke", stroke });
                this.removeStroke(op.strokeId, true);
            }
        } else if (op.type === "restoreStroke") {
            const model = this;
            this.isApplyingHistory = false;
            this.restoreStroke(op.stroke, function onSavedACB(newId: string) {
                model.appendUndoOp({ type: "removeStroke", strokeId: newId });
            });
            return;
        } else if (op.type === "removeElement") {
            const element = this.findElement(op.elementId);
            if (element) {
                this.appendUndoOp({ type: "restoreElement", element });
                this.removeElement(op.elementId, true);
            }
        } else if (op.type === "restoreElement") {
            const model = this;
            const oldId = op.element.id;
            this.isApplyingHistory = false;
            this.restoreElement(op.element, function onSavedACB(newId: string) {
                model.appendUndoOp({ type: "removeElement", elementId: newId });
                model.renameElementInRedoStack(oldId, newId);
            });
            return;
        } else if (op.type === "updateElement") {
            const element = this.findElement(op.elementId);
            if (element) {
                const currentVals = previousValues(element, op.changes);
                this.appendUndoOp({ type: "updateElement", elementId: op.elementId, changes: currentVals });
                this.updateElement(op.elementId, op.changes);
            }
        }

        this.isApplyingHistory = false;
    },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
