import Konva from "konva";
import { drawShapePath } from "/src/utils/drawShapePath.ts";
import { getBrushProps } from "/src/utils/brushStyles.ts";
import { captureStageThumb } from "/src/utils/exportImage.ts";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "/src/utils/canvasSize.ts";
import type { ServerElement, ServerStroke } from "/src/model/types.ts";

// Draws a canvas that is not open (photos, shapes and cutouts below, strokes on top, like the board)
// on a stage that is not on the page, and returns a small JPEG data URL for its card in the Gallery.
// Resolves null if the picture could not be made.
export function renderCanvasThumbnail(strokes: ServerStroke[], elements: ServerElement[]): Promise<string | null> {
    // Konva needs a container element, but it is never added to the page
    const stage = new Konva.Stage({ container: document.createElement("div"), width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    const elementLayer = new Konva.Layer();
    const strokeLayer = new Konva.Layer();
    stage.add(elementLayer);
    stage.add(strokeLayer);

    function byZIndexCB(a: ServerElement, b: ServerElement): number { return (a.zIndex || 0) - (b.zIndex || 0); }
    function addElementCB(element: ServerElement): Promise<void> { return addElement(elementLayer, element); }
    strokes.forEach(addStrokeCB);

    function finishedACB(): string | null {
        stage.draw();
        const thumbnail = captureStageThumb(stage);
        stage.destroy();
        return thumbnail;
    }
    return Promise.all([...elements].sort(byZIndexCB).map(addElementCB)).then(finishedACB);

    function addStrokeCB(stroke: ServerStroke): void {
        // a single point (a click) is a dot: the second point is moved a hair, same as StrokeNode
        const first = stroke.path[0];
        if (!first) return;
        const path = stroke.path.length === 1 ? [first, { x: first.x + 0.01, y: first.y }] : stroke.path;
        function toNumbersCB(point: { x: number; y: number }): number[] { return [point.x, point.y]; }
        strokeLayer.add(new Konva.Line({ points: path.flatMap(toNumbersCB), ...getBrushProps(stroke), opacity: stroke.opacity, listening: false }));
    }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise(executorACB);
    function executorACB(resolve: (image: HTMLImageElement | null) => void): void {
        const image = new Image();
        image.crossOrigin = "anonymous";        // otherwise the picture could not be exported
        image.onload = function loadedACB(): void { resolve(image); };
        image.onerror = function failedACB(): void { resolve(null); };
        image.src = url;
    }
}

// adds one element to the layer, resolves when it (and its photo) is ready
function addElement(layer: Konva.Layer, element: ServerElement): Promise<void> {
    function doneACB(): void {}
    const base = { x: element.x, y: element.y, width: element.width, height: element.height, rotation: element.rotation, listening: false };

    if (element.type === "shape"){
        const isTemplate = !element.color;
        const shapeName = element.shape;
        function drawShapeACB(context: Konva.Context, konvaShape: Konva.Shape): void {
            drawShapePath(context, shapeName, konvaShape.width(), konvaShape.height());
            context.fillStrokeShape(konvaShape);
        }
        layer.add(new Konva.Shape({
            ...base, sceneFunc: drawShapeACB,
            fill: isTemplate ? undefined : element.color ?? undefined,
            stroke: isTemplate ? "#333" : undefined, strokeWidth: 2, dash: [8, 6], strokeScaleEnabled: false,
        }));
        return Promise.resolve();
    }

    // reserve the place now so photos keep their order while they load
    const placeholder = new Konva.Group();
    layer.add(placeholder);

    if (element.type === "photo"){
        function addPhotoACB(image: HTMLImageElement | null): void {
            if (image) placeholder.add(new Konva.Image({ ...base, image: image }));
        }
        return loadImage(element.url).then(addPhotoACB).then(doneACB);
    }

    return addCutout(placeholder, element, base);
}

// a cutout is clipped by its shape, same as CutoutNode
function addCutout(group: Konva.Group, element: Extract<ServerElement, { type: "cutout" }>, base: Konva.NodeConfig): Promise<void> {
    function addCutoutACB(image: HTMLImageElement | null): void {
        if (!image) return;
        function drawCutoutACB(context: Konva.Context, konvaShape: Konva.Shape): void {
            context.save();
            context.scale(konvaShape.width() / element.cutWidth, konvaShape.height() / element.cutHeight);
            drawShapePath(context, element.shape, element.cutWidth, element.cutHeight);
            context.clip();
            context.translate(element.photo.x, element.photo.y);
            context.rotate(element.photo.rotation * Math.PI / 180);
            context.drawImage(image as HTMLImageElement, 0, 0, element.photo.width, element.photo.height);
            context.restore();
        }
        group.add(new Konva.Shape({ ...base, sceneFunc: drawCutoutACB }));
    }
    function doneACB(): void {}
    return loadImage(element.url).then(addCutoutACB).then(doneACB);
}
