import { resolvePromise } from "/src/utils/resolvePromise.js";
import { searchPhotos, trackDownload } from "/src/api/unsplashSource.js";
import { toLocalPoint, getCentre, isPointInside } from "/src/utils/geometry.js";

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
    selectedShape: null,        // "triangle" / "star" / "circle" / "square"
    strokeColor: "#000000",
    strokeWidth: 4,
    strokeType: "pencil",       // "pencil" / "pen"
    fillColor: "#f4a261",       // colour used by the Fill button in the shape panel

    // Unsplash photo search
    photoSearchOpen: false,
    photoSearchQuery: "",
    photoSearchPromiseState: {},
    selectedPhoto: null,        // photo used to fill the selected shape: { id, url, photographer, photographerLink }


    // Elements on the current canvas (photos, shapes, cutouts)
    // photo:  { id, type: "photo", url, photographer, photographerLink, x, y, width, height, rotation }
    // shape:  { id, type: "shape", shape: "star", x, y, width, height, rotation, color }
    //         color null = dashed template, waiting to be cut or filled
    // cutout: { id, type: "cutout", shape, url, photographer, photographerLink, x, y, width, height, rotation,
    //           cutWidth, cutHeight, photo: { x, y, width, height, rotation } }   (see cutWithSelectedShape)

    elements: [],
    selectedElementId: null,    // element selected on the canvas (shows resize handles)



    // ========== Methods ==========

    // Tools
    setCurrentTool(tool){ this.currentTool = tool; },
    selectShape(shape){ this.selectedShape = shape; },
    setStrokeColor(color){ this.strokeColor = color; },
    setStrokeWidth(width){ this.strokeWidth = width; },
    setStrokeType(type){ this.strokeType = type; },
    setFillColor(color){ this.fillColor = color; },

    // Unsplash photo search
    openPhotoSearch(){ this.photoSearchOpen = true; },
    closePhotoSearch(){ this.photoSearchOpen = false; },
    setPhotoSearchQuery(query){ this.photoSearchQuery = query; },
    doPhotoSearch(){
        if (!this.photoSearchQuery) return;
        resolvePromise(searchPhotos(this.photoSearchQuery), this.photoSearchPromiseState);
    },
    selectPhoto(photo){
        this.selectedPhoto = {
            id: photo.id,
            url: photo.urls.small,
            ratio: photo.height / photo.width,      // keeps the original shape when added to canvas
            photographer: photo.user.name,
            photographerLink: photo.user.links.html,
        };
        trackDownload(photo.links.download_location);
        this.photoSearchOpen = false;
    },

    // Canvas elements
    addElement(element){
        this.elements.push(element);
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

    updateElement(id, changes){
        function isTargetCB(element){ return element.id === id; }
        const index = this.elements.findIndex(isTargetCB);
        if (index === -1) return;
        // replace the whole object so the presenter notices the change
        this.elements[index] = { ...this.elements[index], ...changes };
    },
    selectElement(id){ this.selectedElementId = id; },

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

    // one credit per photographer used on the canvas, required by Unsplash guidelines
    getPhotoCredits(){
        const credits = [];
        function addCreditCB(element){
            if (!element.photographer) return;      // shapes have no photographer
            function isSameCB(credit){ return credit.link === element.photographerLink; }
            if (credits.some(isSameCB)) return;
            credits.push({ name: element.photographer, link: element.photographerLink });
        }
        this.elements.forEach(addCreditCB);
        return credits;
    },
};
