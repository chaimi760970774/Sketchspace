import { resolvePromise } from "/src/utils/resolvePromise.js";
import { searchPhotos, trackDownload } from "/src/api/unsplashSource.js";
import { toLocalPoint, getCentre, isPointInside } from "/src/utils/geometry.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "/src/utils/canvasSize.js";

// names used in messages, e.g. "Photo deleted"
const ELEMENT_LABELS = { photo: "Photo", shape: "Shape", cutout: "Cutout" };

// elements, tools, cutting, Unsplash
export const canvasModel = {

    // ========== Fake data ==========

    // Collaborators on the current canvas (replace with WebSocket data later)
    collaborators: [
        { id: "u1", name: "Yuewei" },
        { id: "u2", name: "Friend" },
    ],



    // ========== Page state ==========

    // Tools
    currentTool: "shape",       // left panel: "shape" / "stroke"
    strokeColor: "#000000",
    strokeWidth: 4,
    strokeType: "pencil",       // "pencil" / "pen"
    strokeOpacity: 1,           // 0 (invisible) to 1 (solid), used for new strokes
    fillColor: "#f4a261",       // colour used by the Fill button in the shape panel

    // Unsplash photo search
    photoSearchOpen: false,
    photoSearchQuery: "",
    photoSearchHint: "",        // shown when Search is clicked without a keyword
    photoSearchOrientation: "any",  // "any" / "landscape" / "portrait" / "squarish"
    photoSearchColor: "any",        // "any" or an Unsplash colour, e.g. "blue", "black_and_white"
    photoSearchPromiseState: {},
    selectedPhoto: null,        // photo used to fill the selected shape: { id, url, photographer, photographerLink }


    // Elements on the current canvas (photos, shapes, cutouts)
    // photo:  { id, type: "photo", url, photographer, photographerLink, x, y, width, height, rotation }
    // shape:  { id, type: "shape", shape: "star", x, y, width, height, rotation, color }
    //         color null = dashed template, waiting to be cut or filled
    // cutout: { id, type: "cutout", shape, url, photographer, photographerLink, x, y, width, height, rotation,
    //           cutWidth, cutHeight, photo: { x, y, width, height, rotation } }   (see cutWithSelectedShape)

    elements: [],
    // what is selected on the canvas: the id of an element (shows resize handles) or of a stroke
    // (highlighted); only one thing at a time, null = nothing
    selectedElementId: null,



    // ========== Methods ==========

    // Tools
    setCurrentTool(tool){
        this.currentTool = tool;
        // with the stroke tool, clicks draw instead of select, so nothing stays selected
        if (tool === "stroke") this.selectedElementId = null;
    },
    setStrokeColor(color){ this.strokeColor = color; },
    setStrokeWidth(width){ this.strokeWidth = width; },
    setStrokeType(type){ this.strokeType = type; },
    setStrokeOpacity(opacity){ this.strokeOpacity = opacity; },
    setFillColor(color){ this.fillColor = color; },

    // Unsplash photo search
    openPhotoSearch(){ this.photoSearchOpen = true; },
    closePhotoSearch(){ this.photoSearchOpen = false; },
    setPhotoSearchQuery(query){
        this.photoSearchQuery = query;
        this.photoSearchHint = "";
    },
    doPhotoSearch(){
        const query = this.photoSearchQuery.trim();
        if (!query) {
            this.photoSearchHint = "Please type a keyword first, e.g. forest";
            return;
        }
        const filters = { orientation: this.photoSearchOrientation, color: this.photoSearchColor };
        resolvePromise(searchPhotos(query, filters), this.photoSearchPromiseState);
    },

    // changing a filter searches again if results are already shown
    setPhotoSearchOrientation(orientation){
        this.photoSearchOrientation = orientation;
        if (this.photoSearchPromiseState.promise) this.doPhotoSearch();
    },
    setPhotoSearchColor(color){
        this.photoSearchColor = color;
        if (this.photoSearchPromiseState.promise) this.doPhotoSearch();
    },
    selectPhoto(photo){
        this.selectedPhoto = {
            id: photo.id,
            url: photo.urls.small,
            ratio: photo.height / photo.width,      // keeps the original shape when added to canvas
            photographer: photo.user.name,
            photographerLink: photo.user.links.html,
        };
        trackDownload(photo.links.download_location).catch(trackingFailedACB);
        this.photoSearchOpen = false;

        // only statistics for Unsplash, the user can keep working with the photo, so the error is ignored
        function trackingFailedACB(){}
    },

    // Canvas elements
    addElement(element){
        this.elements = [...this.elements, element];
        this.selectedElementId = element.id;
    },
    addPhotoElement(position){
        if (!this.selectedPhoto) return;
        const width = 200;
        const height = width * this.selectedPhoto.ratio;
        // position is where the photo was dropped, centre the photo there
        this.addElement({
            id: crypto.randomUUID(),
            type: "photo",
            url: this.selectedPhoto.url,
            photographer: this.selectedPhoto.photographer,          // kept so the credit stays after picking another photo
            photographerLink: this.selectedPhoto.photographerLink,
            x: position.x - width / 2,
            y: position.y - height / 2,
            width: width,
            height: height,
            rotation: 0,
        });
    },

    addShapeElement(shape, position){
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
    addShapeAtCentre(shape){
        this.addShapeElement(shape, { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
    },

    updateElement(id, changes){
        // a new object for the changed element, so the presenter notices the change
        function updateCB(element){
            if (element.id !== id) return element;
            return { ...element, ...changes };
        }
        this.elements = this.elements.map(updateCB);
    },
    selectElement(id){ this.selectedElementId = id; },

    findElement(id){
        function isTargetCB(element){ return element.id === id; }
        return this.elements.find(isTargetCB);
    },

    // photos, shapes and cutouts only live in the frontend, so no request is needed
    removeElement(id){
        const element = this.findElement(id);
        if (!element) return;
        function isOtherCB(other){ return other.id !== id; }
        this.elements = this.elements.filter(isOtherCB);
        this.selectedElementId = null;
        this.showToast(ELEMENT_LABELS[element.type] + " deleted", "success");
    },

    // Deleting whatever is selected (element or stroke), used by the Delete key and the Delete button
    // false while the photo search popup is open, so keys typed there never delete anything behind it
    canDeleteSelection(){
        return Boolean(this.getSelectionLabel()) && !this.photoSearchOpen;
    },
    // "Photo", "Shape", "Cutout", "Line", or "" when nothing is selected
    getSelectionLabel(){
        const element = this.findElement(this.selectedElementId);
        if (element) return ELEMENT_LABELS[element.type];
        if (this.findStroke(this.selectedElementId)) return "Line";
        return "";
    },
    deleteSelection(){
        if (!this.canDeleteSelection()) return;
        if (this.findElement(this.selectedElementId)) this.removeElement(this.selectedElementId);
        else this.removeStroke(this.selectedElementId);
    },

    // A new shape is a dashed template. It then either cuts a photo (becomes a cutout)
    // or gets filled with a colour (becomes a filled shape).

    // the selected element, if it is a shape (template or filled), otherwise null
    getSelectedShape(){
        const id = this.selectedElementId;
        function isSelectedCB(element){ return element.id === id; }
        const element = this.elements.find(isSelectedCB);

        if (element && element.type === "shape") return element;
        return null;
    },

    // the selected element, if it is a dashed template, otherwise null
    getSelectedTemplate(){
        const shape = this.getSelectedShape();
        if (shape && !shape.color) return shape;
        return null;
    },

    // Filling
    // filled shapes can be filled again to change their colour
    canFill(){ return Boolean(this.getSelectedShape()); },

    fillSelectedShape(){
        const shape = this.getSelectedShape();
        if (!shape) return;
        this.updateElement(shape.id, { color: this.fillColor });
    },

    // Cutting

    // the top-most photo under the centre of the shape, or undefined
    findPhotoUnder(shape){
        const centre = getCentre(shape);
        function isPhotoUnderCB(element){
            return element.type === "photo" && isPointInside(element, centre);
        }
        return this.elements.findLast(isPhotoUnderCB);      // elements added later are drawn on top
    },

    canCut(){
        const template = this.getSelectedTemplate();
        return Boolean(template && this.findPhotoUnder(template));
    },

    // cut the photo under the selected template into a new cutout element
    cutWithSelectedShape(){
        const template = this.getSelectedTemplate();
        if (!template) return;
        const photo = this.findPhotoUnder(template);
        if (!photo) return;

        // where the photo sits inside the template's box, so the cutout can draw the same part of it
        const photoCorner = toLocalPoint(template, { x: photo.x, y: photo.y });

        const cutout = {
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
        function isNotTemplateCB(element){ return element.id !== template.id; }
        this.elements = this.elements.filter(isNotTemplateCB);
        this.addElement(cutout);
    },

    // why Mask / Fill cannot be used right now, empty when both can be used
    getShapeActionHint(){
        const shape = this.getSelectedShape();
        if (!shape) return "Select a shape on the canvas to mask or fill it";
        if (shape.color) return "Only dashed shapes can mask a photo";       // Fill still works, it changes the colour
        if (!this.findPhotoUnder(shape)) return "Move the shape onto a photo to mask it";
        return "";
    },

    // Export
    showExportResult(succeeded){
        if (succeeded) this.showToast("Canvas exported as PNG", "success");
        else this.showToast("Export failed, please try again", "error");
    },

    // one credit per photographer used on the canvas, required by Unsplash guidelines
    getPhotoCredits(){
        function hasPhotographerCB(element){ return element.photographer; }     // shapes have no photographer
        // keyed by the photographer's link, so the same photographer is only listed once
        function toCreditEntryCB(element){
            return [element.photographerLink, { name: element.photographer, link: element.photographerLink }];
        }
        const creditsByLink = new Map(this.elements.filter(hasPhotographerCB).map(toCreditEntryCB));
        return [...creditsByLink.values()];
    },
};
