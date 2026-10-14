import "/style.css"
import { useRef, useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent, RefObject } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { CanvasElement, DraftStroke, ElementChanges, Point, Stroke, Tool } from "/src/model/types.ts";
import { Stage, Layer, Transformer } from "react-konva";
import { PhotoNode } from "./nodes/photoNode.tsx";
import { ShapeNode } from "./nodes/shapeNode.tsx";
import { CutoutNode } from "./nodes/cutoutNode.tsx";
import { StrokeNode } from "./nodes/strokeNode.tsx";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "/src/utils/canvasSize.ts";
import { MAX_STROKE_POINTS } from "/src/utils/validateStroke.ts";

// while drawing, a new point is only kept if the pointer moved at least this far (keeps strokes small)
const MIN_POINT_DISTANCE = 2;

// while erasing, the path of a move is checked every this many pixels, so nothing is skipped
const ERASE_STEP = 5;

interface CanvasBoardViewProps {
    stageRef: RefObject<Konva.Stage | null>;
    currentTool: Tool;
    eraserOn: boolean;
    elements: CanvasElement[];
    strokes: Stroke[];
    selectedId: string | null;              // a selected element or stroke
    brush: string;                          // brush, size, colour and opacity of the stroke being drawn
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;
    onDropItem: (type: string, position: Point) => void;
    onSelect: (id: string) => void;
    onDeselect: () => void;
    onElementChange: (id: string, changes: ElementChanges) => void;
    onStrokeEnd: (path: Point[]) => void;
    onErase: (point: Point) => void;
    onEraseEnd: () => void;
}

export function CanvasBoardView(props: CanvasBoardViewProps){
    // Konva needs refs to reach the canvas; these are UI-only, all app data stays in the model
    // stageRef comes from CanvasView, which uses it to export the picture
    const stageRef = props.stageRef;
    const transformerRef = useRef<Konva.Transformer>(null);

    // Stroke tool: the points of the stroke being drawn right now, null when not drawing.
    // Kept in the view because it changes on every mouse move; the finished stroke goes to the model.
    const [draftPoints, setDraftPoints] = useState<Point[] | null>(null);
    // the eraser is switched on in the topbar and works on top of whichever tool the left panel shows
    const isEraserTool = props.eraserOn;
    const isStrokeTool = props.currentTool === "stroke" && !isEraserTool;
    // with the stroke tool or the eraser, photos, shapes and lines ignore the mouse
    const isPassive = isStrokeTool || isEraserTool;

    // Eraser tool: whether the button is down, and where the last erase check was, so a fast move does not skip over things
    const erasing = useRef(false);
    const lastErasePoint = useRef<Point | null>(null);

    // attach the resize handles to the selected element (only with the shape tool)
    useEffect(attachTransformerACB, [props.selectedId, props.elements, isPassive]);

    const stageClass = isStrokeTool ? "konva-stage drawing" : isEraserTool ? "konva-stage erasing" : "konva-stage";

    return (
        <div className="canvas-area" onDragOver={dragOverACB} onDrop={dropACB}>
            <Stage ref={stageRef}
                   className={stageClass}
                   width={CANVAS_WIDTH}
                   height={CANVAS_HEIGHT}
                   onMouseDown={pointerDownACB}
                   onTouchStart={pointerDownACB}
                   onMouseMove={pointerMoveACB}
                   onTouchMove={pointerMoveACB}
                   onMouseUp={pointerUpACB}
                   onTouchEnd={pointerUpACB}
                   onMouseLeave={pointerUpACB}>
                {/* photos, shapes and cutouts */}
                <Layer>
                    {props.elements.map(elementCB)}
                    <Transformer ref={transformerRef}/>
                </Layer>

                {/* strokes are drawn above photos and shapes, oldest first; clickable only with the shape tool */}
                <Layer listening={!isPassive}>
                    {props.strokes.map(strokeCB)}
                    {draftPoints && <StrokeNode stroke={makeDraftStroke()}/>}
                </Layer>

            </Stage>
        </div>
    );

    // only photos, shapes and cutouts get resize handles; a selected stroke is just highlighted
    function attachTransformerACB(){
        const stage = stageRef.current;
        const transformer = transformerRef.current;
        if (!stage || !transformer) return;     // not drawn yet
        function isSelectedCB(element: CanvasElement){ return element.id === props.selectedId; }
        const elementSelected = !isPassive && props.elements.some(isSelectedCB);
        const node = elementSelected ? stage.findOne("#" + props.selectedId) : undefined;
        transformer.nodes(node ? [node] : []);
    }

    // needed so the browser allows dropping
    function dragOverACB(evt: ReactDragEvent<HTMLDivElement>){ evt.preventDefault(); }

    function dropACB(evt: ReactDragEvent<HTMLDivElement>){
        evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        stage.setPointersPositions(evt);                      // convert mouse position to canvas coordinates
        const position = stage.getPointerPosition();
        const type = evt.dataTransfer.getData("text/plain");  // set by the panel when dragging starts
        if (position) props.onDropItem(type, position);
    }

    // where the pointer is on the canvas, null if Konva does not know (e.g. before the first move)
    function getPointer(): Point | null {
        const position = stageRef.current?.getPointerPosition();
        return position ? { x: position.x, y: position.y } : null;
    }

    // Shape tool: clicking on empty canvas clears the selection. Stroke tool: start a stroke. Eraser: start erasing.
    function pointerDownACB(evt: KonvaEventObject<MouseEvent | TouchEvent>){
        if (isEraserTool) {
            const point = getPointer();
            if (!point) return;
            erasing.current = true;
            lastErasePoint.current = point;
            props.onErase(point);
            return;
        }
        if (!isStrokeTool) {
            if (evt.target === evt.target.getStage()) props.onDeselect();
            return;
        }
        const start = getPointer();
        if (start) setDraftPoints([start]);
    }

    // Erasing: every point on the way from the last position is checked, so a fast move deletes what it crosses
    function eraseMoveTo(point: Point){
        const last = lastErasePoint.current;
        if (!last) return;
        const from: Point = last;       // a const the callback below can use
        const distance = Math.hypot(point.x - from.x, point.y - from.y);
        const steps = Math.ceil(distance / ERASE_STEP);
        // the points 1/steps, 2/steps ... steps/steps of the way from the last position to this one
        function stepPointCB(_: unknown, index: number): Point {
            const along = (index + 1) / steps;
            return { x: from.x + (point.x - from.x) * along, y: from.y + (point.y - from.y) * along };
        }
        Array.from({ length: steps }, stepPointCB).forEach(props.onErase);
        lastErasePoint.current = point;
    }

    function pointerMoveACB(){
        if (isEraserTool) {
            const erasePoint = getPointer();
            if (erasing.current && erasePoint) eraseMoveTo(erasePoint);
            return;
        }
        if (!isStrokeTool || !draftPoints) return;
        const pointer = getPointer();
        if (!pointer) return;
        const point = pointer;      // a const the updater below can use

        // the updater gets the newest points, even if several moves happen before the next render
        function addPointCB(points: Point[] | null){
            if (!points || points.length >= MAX_STROKE_POINTS) return points;   // the server takes at most this many
            const last = points[points.length - 1];
            if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_POINT_DISTANCE) return points;
            return [...points, point];
        }
        setDraftPoints(addPointCB);
    }

    // releasing the mouse (or leaving the canvas) finishes the stroke
    function pointerUpACB(){
        if (erasing.current) {
            erasing.current = false;
            props.onEraseEnd();
        }
        if (!draftPoints) return;
        props.onStrokeEnd(draftPoints);
        setDraftPoints(null);
    }

    // the stroke being drawn looks like it will look once finished
    function makeDraftStroke(): DraftStroke {
        return {
            path: draftPoints ?? [],
            brush: props.brush,
            size: props.strokeWidth,
            color: props.strokeColor,
            opacity: props.strokeOpacity,
            status: "drawing",
        };
    }

    function strokeCB(stroke: Stroke){
        function selectACB(){ props.onSelect(stroke.id); }
        return <StrokeNode key={stroke.id} stroke={stroke}
                           interactive={!isPassive}
                           selected={stroke.id === props.selectedId}
                           onSelect={selectACB}/>;
    }

    function elementCB(element: CanvasElement){
        function selectACB(){ props.onSelect(element.id); }

        function dragEndACB(evt: KonvaEventObject<DragEvent>){
            props.onElementChange(element.id, { x: evt.target.x(), y: evt.target.y() });
        }

        function transformEndACB(evt: KonvaEventObject<Event>){
            // Konva resizes by scaling, turn the scale back into width/height
            const node = evt.target;
            const changes = {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
                rotation: node.rotation(),
            };
            // Konva keeps its own node state; the scale must be reset on the node itself,
            // otherwise the new width/height would be scaled a second time
            node.scaleX(1);
            node.scaleY(1);
            props.onElementChange(element.id, changes);
        }

        // shared by every element type; with the stroke or eraser tool, elements ignore the mouse
        // so drawing on top of them does not select or move them
        const handlers = {
            interactive: !isPassive,
            onSelect: selectACB,
            onDragEnd: dragEndACB,
            onTransformEnd: transformEndACB,
        };

        if (element.type === "photo") return <PhotoNode key={element.id} element={element} {...handlers}/>;
        if (element.type === "shape") return <ShapeNode key={element.id} element={element} {...handlers}/>;
        if (element.type === "cutout") return <CutoutNode key={element.id} element={element} {...handlers}/>;
        return null;
    }
}
