import { resolvePromise } from "/src/utils/resolvePromise.ts";
import { searchPhotos, trackDownload } from "/src/api/unsplashSource.ts";
import { toLocalPoint, getCentre, isPointInside, isOnPath } from "/src/utils/geometry.ts";
import { addElement as addElementRequest, updateElement as updateElementRequest, deleteElement as deleteElementRequest } from "/src/api/canvasSource.ts";
import { sendElement, changeElementLive, deleteElementLive } from "/src/api/socketSource.ts";
import { toServerElement, toServerChanges, toLocalElement } from "/src/utils/elementFields.ts";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "/src/utils/canvasSize.ts";
import type { Brush, CanvasElement, ServerElement, CutoutElement, ElementChanges, Model, PhotoCredit, PhotoElement, Point, PromiseState,
              SelectedPhoto, ShapeElement, Stroke, Tool, UnsplashPhoto } from "./types.ts";

// names used in messages, e.g. "Photo deleted"
const ELEMENT_LABELS: Record<CanvasElement["type"], string> = { photo: "Photo", shape: "Shape", cutout: "Cutout" };

interface CanvasState {
    // Tools
    currentTool: Tool | null;       // the icon toolbar; null = no panel open
    eraserOn: boolean;              // the topbar eraser button; while on, clicks and drags erase whatever the left panel shows
    eraserTarget: "strokes" | "elements" | null;    // what the current erasing drag deletes, null before the first hit
    eyedropperOn: boolean;          // when on, the next canvas click samples the pixel colour into strokeColor
    strokeColor: string;
    strokeWidth: number;
    strokeType: Brush;
    strokeOpacity: number;          // 0 (invisible) to 1 (solid), used for new strokes
    fillColor: string;              // colour used by the Fill button in the shape panel

    // Unsplash photo search
    photoSearchOpen: boolean;
    photoSearchQuery: string;
    photoSearchHint: string;        // shown when Search is clicked without a keyword
    photoSearchOrientation: string; // "any" / "landscape" / "portrait" / "squarish"
    photoSearchColor: string;       // "any" or an Unsplash colour, e.g. "blue", "black_and_white"
    photoSearchPromiseState: PromiseState<UnsplashPhoto[]>;
    selectedPhotos: SelectedPhoto[];            // photos confirmed for use on the canvas
    pendingPhotoSelection: SelectedPhoto[];     // selection being built inside the open modal

    // Elements on the current canvas (photos, shapes, cutouts), see CanvasElement in types.ts
    // status (frontend only): "saving" until the server gives a new element its id, then "saved"
    elements: CanvasElement[];
    // changes to an element that is still saving, sent once it has its real id: temporary id -> changes
    pendingElementChanges: Record<string, ElementChanges>;
    // what is selected on the canvas: the id of an element (shows resize handles) or of a stroke
    // (highlighted); only one thing at a time, null = nothing
    selectedElementId: string | null;
}

const initialState: CanvasState = {
    currentTool: null,
    eraserOn: false,
    eraserTarget: null,
    eyedropperOn: false,
    strokeColor: "#000000",
    strokeWidth: 4,
    strokeType: "pencil",
    strokeOpacity: 1,
    fillColor: "#f4a261",
    photoSearchOpen: false,
    photoSearchQuery: "",
    photoSearchHint: "",
    photoSearchOrientation: "any",
    photoSearchColor: "any",
    photoSearchPromiseState: {},
    selectedPhotos: [],
    pendingPhotoSelection: [],
    elements: [],
    pendingElementChanges: {},
    selectedElementId: null,
};

// the pending changes without the ones for this element
function withoutPending(pending: Record<string, ElementChanges>, id: string): Record<string, ElementChanges> {
    function isOtherCB(entry: [string, ElementChanges]): boolean { return entry[0] !== id; }
    return Object.fromEntries(Object.entries(pending).filter(isOtherCB));
}

// the values the element had before these changes, to undo them if the server refuses
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

// a new element, before it gets its place on top and its status
type NewElement = Omit<PhotoElement, "zIndex" | "status"> | Omit<ShapeElement, "zIndex" | "status"> | Omit<CutoutElement, "zIndex" | "status">;

// elements, tools, cutting, Unsplash
export const canvasModel = {

    // ========== Page state ==========

    ...initialState,



    // ========== Methods ==========

    // Tools
    setCurrentTool(tool: Tool): void {
        this.currentTool = this.currentTool === tool ? null : tool;
        this.eraserOn = false;      // choosing a tool switches the eraser off
        this.eyedropperOn = false;  // choosing a tool switches the eyedropper off
        // with the stroke tool, clicks draw instead of select, so nothing stays selected
        if (this.currentTool === "stroke") this.selectedElementId = null;
    },
    turnEraserOff(): void { this.eraserOn = false; },
    toggleEraser(): void {
        this.eraserOn = !this.eraserOn;
        if (this.eraserOn) {
            this.eyedropperOn = false;  // eraser and eyedropper are mutually exclusive
            this.selectedElementId = null;      // clicks erase instead of select
        }
    },
    toggleEyedropper(): void {
        this.eyedropperOn = !this.eyedropperOn;
        if (this.eyedropperOn) {
            this.eraserOn = false;  // eraser and eyedropper are mutually exclusive
            this.selectedElementId = null;
        }
    },
    turnEyedropperOff(): void { this.eyedropperOn = false; },

    // Erasing: deletes whole lines, photos, shapes and cutouts under the pointer, where a click would hit them.
    // One drag deletes one kind only: lines if it first touches a line, otherwise elements,
    // so rubbing out a line that crosses a photo leaves the photo.
    // Things still being saved are skipped until the server has them.
    eraseAt(point: Point): void {
        if (!this.currentCanvas) return;
        function isSavedCB(item: Stroke | CanvasElement): boolean { return item.status !== "saving"; }
        function touchesStrokeCB(stroke: Stroke): boolean { return isSavedCB(stroke) && isOnPath(stroke.path, stroke.size, point); }
        function touchesElementCB(element: CanvasElement): boolean { return isSavedCB(element) && isPointInside(element, point); }

        const strokes = this.strokes.filter(touchesStrokeCB);
        const element = this.elements.findLast(touchesElementCB);     // the top-most one
        if (!this.eraserTarget) {
            if (strokes.length > 0) this.eraserTarget = "strokes";
            else if (element) this.eraserTarget = "elements";
            else return;
        }

        if (this.eraserTarget === "strokes") {
            const model = this;
            function removeStrokeCB(stroke: Stroke): void { model.removeStroke(stroke.id, true); }
            strokes.forEach(removeStrokeCB);
        } else if (element) {
            this.removeElement(element.id, true);
        }
    },
    // the drag is over: the next one may delete the other kind
    endErase(): void { this.eraserTarget = null; },
    setStrokeColor(color: string): void { this.strokeColor = color; },
    setStrokeWidth(width: number): void { this.strokeWidth = width; },
    setStrokeType(type: Brush): void { this.strokeType = type; },
    setStrokeOpacity(opacity: number): void { this.strokeOpacity = opacity; },
    setFillColor(color: string): void { this.fillColor = color; },

    // Unsplash photo search
    openPhotoSearch(): void {
        this.pendingPhotoSelection = [...this.selectedPhotos];
        this.photoSearchOpen = true;
    },
    closePhotoSearch(): void { this.photoSearchOpen = false; },
    setPhotoSearchQuery(query: string): void {
        this.photoSearchQuery = query;
        this.photoSearchHint = "";
    },
    doPhotoSearch(): void {
        const query = this.photoSearchQuery.trim();
        if (!query) {
            this.photoSearchHint = "Please type a keyword first, e.g. forest";
            return;
        }
        const filters = { orientation: this.photoSearchOrientation, color: this.photoSearchColor };
        resolvePromise(searchPhotos(query, filters), this.photoSearchPromiseState);
    },

    // changing a filter searches again if results are already shown
    setPhotoSearchOrientation(orientation: string): void {
        this.photoSearchOrientation = orientation;
        if (this.photoSearchPromiseState.promise) this.doPhotoSearch();
    },
    setPhotoSearchColor(color: string): void {
        this.photoSearchColor = color;
        if (this.photoSearchPromiseState.promise) this.doPhotoSearch();
    },
    togglePendingPhoto(photo: UnsplashPhoto): void {
        const idx = this.pendingPhotoSelection.findIndex(p => p.id === photo.id);
        if (idx >= 0) {
            this.pendingPhotoSelection = this.pendingPhotoSelection.filter((_, i) => i !== idx);
            return;
        }
        if (this.pendingPhotoSelection.length >= 8) return;
        this.pendingPhotoSelection = [...this.pendingPhotoSelection, {
            id: photo.id,
            url: photo.urls.small,
            ratio: photo.height / photo.width,
            photographer: photo.user.name,
            photographerLink: photo.user.links.html,
            downloadLocation: photo.links.download_location,
        }];
    },
    removeSelectedPhoto(id: string): void {
        this.selectedPhotos = this.selectedPhotos.filter(p => p.id !== id);
    },
    clearPendingSelection(): void {
        this.pendingPhotoSelection = [];
    },
    confirmPhotoSelection(): void {
        this.selectedPhotos = this.pendingPhotoSelection;
        this.pendingPhotoSelection = [];
        this.photoSearchOpen = false;
        const model = this;
        this.selectedPhotos.forEach(trackACB);
        function trackACB(photo: SelectedPhoto): void {
            trackDownload(photo.downloadLocation).catch(failedACB);
        }
        function failedACB(): void {}
    },

    // Canvas elements
    // shown at once under a temporary id, saved in the background
    addElement(element: NewElement): void {
        const newElement: CanvasElement = { ...element, zIndex: this.getNextZIndex(), status: "saving" };
        this.elements = [...this.elements, newElement];
        this.selectedElementId = newElement.id;
        this.saveNewElement(newElement);
    },
    getNextZIndex(): number {
        function highestCB(highest: number, element: CanvasElement): number { return Math.max(highest, element.zIndex || 0); }
        return this.elements.reduce(highestCB, 0) + 1;      // elements added later are drawn on top
    },

    isCanvasOpenNow(canvasId: string): boolean { return Boolean(this.currentCanvas) && this.currentCanvas?._id === canvasId; },

    // over the socket when joined, otherwise REST
    saveNewElement(element: CanvasElement): void {
        if (!this.currentCanvas) return;
        const model = this;
        const canvasId = this.currentCanvas._id;
        const temporaryId = element.id;
        const body = toServerElement(element);
        const sending = this.isLive() ? sendElement({ ...body, canvasId: canvasId }) : addElementRequest(canvasId, body);
        sending.then(savedACB).catch(failedACB);

        function savedACB(elementId: string): void {
            if (!model.isCanvasOpenNow(canvasId)) return;
            function isTemporaryCB(other: CanvasElement): boolean { return other.id === temporaryId; }
            function isOtherCB(other: CanvasElement): boolean { return other.id !== temporaryId; }
            function renameCB(other: CanvasElement): CanvasElement { return isTemporaryCB(other) ? { ...other, id: elementId, status: "saved" } : other; }
            if (model.findElement(elementId)) {
                // a REST element can come back through "element:added" first: keep one
                model.elements = model.elements.filter(isOtherCB);
            } else {
                model.elements = model.elements.map(renameCB);
            }
            if (model.selectedElementId === temporaryId) model.selectedElementId = elementId;

            // send the changes made while saving
            const pending = model.pendingElementChanges[temporaryId];
            model.pendingElementChanges = withoutPending(model.pendingElementChanges, temporaryId);
            if (pending) model.sendElementChanges(elementId, pending, {});
        }
        function failedACB(error: Error): void {
            if (!model.isCanvasOpenNow(canvasId)) return;
            model.pendingElementChanges = withoutPending(model.pendingElementChanges, temporaryId);
            model.removeElementLocally(temporaryId);
            model.showToast("Could not save the " + ELEMENT_LABELS[element.type].toLowerCase() + " (" + error.message + "), it was removed", "error");
        }
    },
    addPhotoElement(photoId: string, position: Point): void {
        function isTargetCB(p: SelectedPhoto): boolean { return p.id === photoId; }
        const photo = this.selectedPhotos.find(isTargetCB);
        if (!photo) return;
        const width = 200;
        const height = width * photo.ratio;
        this.addElement({
            id: crypto.randomUUID(),
            type: "photo",
            url: photo.url,
            photographer: photo.photographer,
            photographerLink: photo.photographerLink,
            x: position.x - width / 2,
            y: position.y - height / 2,
            width,
            height,
            rotation: 0,
        });
    },

    addShapeElement(shape: string, position: Point): void {
        const size = 150;
        this.addElement({
            id: crypto.randomUUID(),
            type: "shape",
            shape: shape,               // "triangle" / "star" / "circle" / "square"
            x: position.x - size / 2,
            y: position.y - size / 2,
            width: size,
            height: size,
            rotation: 0,
            color: null,                // null = dashed template, a colour = filled shape
        });
    },

    // clicking a shape in the panel puts it in the middle of the canvas
    addShapeAtCentre(shape: string): void {
        this.addShapeElement(shape, { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
    },

    // shown at once and saved; the old values come back if the server refuses
    updateElement(id: string, changes: ElementChanges): void {
        const element = this.findElement(id);
        if (!element) return;
        const previous = previousValues(element, changes);

        this.changeElementLocally(id, changes);
        if (!this.currentCanvas) return;
        // still saving: no real id yet
        if (element.status === "saving") {
            this.pendingElementChanges = { ...this.pendingElementChanges, [id]: { ...this.pendingElementChanges[id], ...changes } };
            return;
        }
        this.sendElementChanges(id, changes, previous);
    },
    sendElementChanges(id: string, changes: ElementChanges, previous: ElementChanges): void {
        if (!this.currentCanvas) return;
        const model = this;
        const canvasId = this.currentCanvas._id;
        const body = toServerChanges(changes);
        if (Object.keys(body).length === 0) return;
        const sending = this.isLive() ? changeElementLive(id, body) : updateElementRequest(canvasId, id, body);
        sending.catch(failedACB);

        function failedACB(error: Error): void {
            if (!model.isCanvasOpenNow(canvasId)) return;
            if (model.findElement(id)) model.changeElementLocally(id, previous);
            model.showToast("Could not save the change (" + error.message + "), it was undone", "error");
        }
    },
    // a new object, so the presenter notices the change
    changeElementLocally(id: string, changes: ElementChanges): void {
        function updateCB(element: CanvasElement): CanvasElement {
            if (element.id !== id) return element;
            return { ...element, ...changes };
        }
        this.elements = this.elements.map(updateCB);
    },
    selectElement(id: string | null): void { this.selectedElementId = id; },

    findElement(id: string | null): CanvasElement | undefined {
        function isTargetCB(element: CanvasElement): boolean { return element.id === id; }
        return this.elements.find(isTargetCB);
    },

    // removed at once, then deleted on the server; put back if the server refuses
    // quiet: no "deleted" message (a cut replaces its shape)
    removeElement(id: string, quiet?: boolean): void {
        const model = this;
        const element = this.findElement(id);
        if (!element) return;
        if (element.status === "saving") {
            if (!quiet) this.showToast(ELEMENT_LABELS[element.type] + " is still saving, try again in a moment", "info");
            return;
        }
        const removed: CanvasElement = element;     // kept for failedACB below, which may run much later
        function isTargetCB(other: CanvasElement): boolean { return other.id === id; }
        const position = this.elements.findIndex(isTargetCB);
        this.removeElementLocally(id);
        if (!quiet) this.showToast(ELEMENT_LABELS[element.type] + " deleted", "success");
        if (!this.currentCanvas) return;

        const canvasId = this.currentCanvas._id;
        const sending = this.isLive() ? deleteElementLive(id) : deleteElementRequest(canvasId, id);
        sending.catch(failedACB);

        function failedACB(error: Error): void {
            if (!model.isCanvasOpenNow(canvasId) || model.findElement(id)) return;
            model.elements = [...model.elements.slice(0, position), removed, ...model.elements.slice(position)];
            model.showToast("Could not delete the " + ELEMENT_LABELS[removed.type].toLowerCase() + " (" + error.message + "), it was put back", "error");
        }
    },
    removeElementLocally(id: string): void {
        function isOtherCB(other: CanvasElement): boolean { return other.id !== id; }
        this.elements = this.elements.filter(isOtherCB);
        if (this.selectedElementId === id) this.selectedElementId = null;
    },

    // changes made by other people
    addRemoteElement(serverElement: ServerElement): void {
        if (!this.currentCanvas || serverElement.canvasId !== this.currentCanvas._id) return;
        if (this.findElement(serverElement.id)) return;     // our own REST element, announced to everyone
        this.elements = [...this.elements, toLocalElement(serverElement)];
    },
    // carries the full new state
    updateRemoteElement(serverElement: ServerElement): void {
        if (!this.currentCanvas || serverElement.canvasId !== this.currentCanvas._id) return;
        const element = toLocalElement(serverElement);
        if (!this.findElement(element.id)) {
            this.elements = [...this.elements, element];
            return;
        }
        // merged, so fields the server does not keep survive
        function replaceCB(other: CanvasElement): CanvasElement { return other.id === element.id ? { ...other, ...element } : other; }
        this.elements = this.elements.map(replaceCB);
    },

    // Deleting whatever is selected (element or stroke), used by the Delete key and the Delete button
    // false while the photo search popup is open, so keys typed there never delete anything behind it
    canDeleteSelection(): boolean {
        return Boolean(this.getSelectionLabel()) && !this.photoSearchOpen;
    },
    // "Photo", "Shape", "Cutout", "Line", or "" when nothing is selected
    getSelectionLabel(): string {
        const element = this.findElement(this.selectedElementId);
        if (element) return ELEMENT_LABELS[element.type];
        if (this.findStroke(this.selectedElementId)) return "Line";
        return "";
    },
    deleteSelection(): void {
        const id = this.selectedElementId;
        if (!id || !this.canDeleteSelection()) return;
        if (this.findElement(id)) this.removeElement(id);
        else this.removeStroke(id);
    },

    // A new shape is a dashed template. It then either cuts a photo (becomes a cutout)
    // or gets filled with a colour (becomes a filled shape).

    // the selected element, if it is a shape (template or filled), otherwise null
    getSelectedShape(): ShapeElement | null {
        const id = this.selectedElementId;
        function isSelectedCB(element: CanvasElement): boolean { return element.id === id; }
        const element = this.elements.find(isSelectedCB);

        if (element && element.type === "shape") return element;
        return null;
    },

    // the selected element, if it is a dashed template, otherwise null
    getSelectedTemplate(): ShapeElement | null {
        const shape = this.getSelectedShape();
        if (shape && !shape.color) return shape;
        return null;
    },

    // Filling
    // filled shapes can be filled again to change their colour
    canFill(): boolean { return Boolean(this.getSelectedShape()); },

    fillSelectedShape(): void {
        const shape = this.getSelectedShape();
        if (!shape) return;
        this.updateElement(shape.id, { color: this.fillColor });
    },

    // Cutting

    // the top-most photo under the centre of the shape, or undefined
    findPhotoUnder(shape: ShapeElement): PhotoElement | undefined {
        const centre = getCentre(shape);
        function isPhotoUnderCB(element: CanvasElement): element is PhotoElement {
            return element.type === "photo" && isPointInside(element, centre);
        }
        return this.elements.findLast(isPhotoUnderCB);      // elements added later are drawn on top
    },

    canCut(): boolean {
        const template = this.getSelectedTemplate();
        return Boolean(template && this.findPhotoUnder(template));
    },

    // cut the photo under the selected template into a new cutout element
    cutWithSelectedShape(): void {
        const template = this.getSelectedTemplate();
        if (!template) return;
        const photo = this.findPhotoUnder(template);
        if (!photo) return;
        if (template.status === "saving") {
            this.showToast("Shape is still saving, try again in a moment", "info");
            return;
        }

        // where the photo sits inside the template's box, so the cutout can draw the same part of it
        const photoCorner = toLocalPoint(template, { x: photo.x, y: photo.y });

        const cutout: NewElement = {
            id: crypto.randomUUID(),
            type: "cutout",
            shape: template.shape,
            url: photo.url,
            photographer: photo.photographer,
            photographerLink: photo.photographerLink,
            x: template.x,
            y: template.y,
            width: template.width,
            height: template.height,
            rotation: template.rotation,
            // size when it was cut; if the cutout is resized later, the photo is stretched by the same amount
            cutWidth: template.width,
            cutHeight: template.height,
            photo: {
                x: photoCorner.x,
                y: photoCorner.y,
                width: photo.width,
                height: photo.height,
                rotation: photo.rotation - template.rotation,
            },
        };

        // the template is used up, the cutout takes its place (the photo stays)
        this.removeElement(template.id, true);
        this.addElement(cutout);
    },

    // why Mask / Fill cannot be used right now, empty when both can be used
    getShapeActionHint(): string {
        const shape = this.getSelectedShape();
        if (!shape) return "Select a shape on the canvas to mask or fill it";
        if (shape.color) return "Only dashed shapes can mask a photo";       // Fill still works, it changes the colour
        if (!this.findPhotoUnder(shape)) return "Move the shape onto a photo to mask it";
        return "";
    },

    // Export
    showExportResult(succeeded: boolean): void {
        if (succeeded) this.showToast("Canvas exported as PNG", "success");
        else this.showToast("Export failed, please try again", "error");
    },

    // one credit per photographer used on the canvas, required by Unsplash guidelines
    getPhotoCredits(): PhotoCredit[] {
        // keyed by the photographer's link, so the same photographer is only listed once; shapes have no photographer
        function toCreditEntriesCB(element: CanvasElement): [string, PhotoCredit][] {
            if (element.type === "shape" || !element.photographer || !element.photographerLink) return [];
            return [[element.photographerLink, { name: element.photographer, link: element.photographerLink }]];
        }
        const creditsByLink = new Map(this.elements.flatMap(toCreditEntriesCB));
        return [...creditsByLink.values()];
    },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
