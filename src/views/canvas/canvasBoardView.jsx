import "/style.css"
import { useRef, useEffect, useState } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import { PhotoNode } from "./nodes/photoNode.jsx";
import { ShapeNode } from "./nodes/shapeNode.jsx";
import { CutoutNode } from "./nodes/cutoutNode.jsx";
import { StrokeNode } from "./nodes/strokeNode.jsx";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "/src/utils/canvasSize.js";
import { MAX_STROKE_POINTS } from "/src/utils/validateStroke.js";

// while drawing, a new point is only kept if the pointer moved at least this far (keeps strokes small)
const MIN_POINT_DISTANCE = 2;

export function CanvasBoardView(props){
    // Konva needs refs to reach the canvas; these are UI-only, all app data stays in the model
    // stageRef comes from CanvasView, which uses it to export the picture
    const stageRef = props.stageRef;
    const transformerRef = useRef(null);

    // Stroke tool: the points of the stroke being drawn right now, null when not drawing.
    // Kept in the view because it changes on every mouse move; the finished stroke goes to the model.
    const [draftPoints, setDraftPoints] = useState(null);
    const isStrokeTool = props.currentTool === "stroke";

    // attach the resize handles to the selected element (only with the shape tool)
    useEffect(attachTransformerACB, [props.selectedId, props.elements, isStrokeTool]);

    const stageClass = isStrokeTool ? "konva-stage drawing" : "konva-stage";

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

                {/* strokes are drawn above photos and shapes, oldest first */}
                <Layer listening={false}>
                    {props.strokes.map(strokeCB)}
                    {draftPoints && <StrokeNode stroke={makeDraftStroke()}/>}
                </Layer>
            </Stage>
        </div>
    );

    function attachTransformerACB(){
        const node = props.selectedId && !isStrokeTool ? stageRef.current.findOne("#" + props.selectedId) : null;
        transformerRef.current.nodes(node ? [node] : []);
    }

    // needed so the browser allows dropping
    function dragOverACB(evt){ evt.preventDefault(); }

    function dropACB(evt){
        evt.preventDefault();
        const stage = stageRef.current;
        stage.setPointersPositions(evt);                      // convert mouse position to canvas coordinates
        const position = stage.getPointerPosition();
        const type = evt.dataTransfer.getData("text/plain");  // set by the panel when dragging starts
        props.onDropItem(type, position);
    }

    function getPointer(){
        const position = stageRef.current.getPointerPosition();
        return { x: position.x, y: position.y };
    }

    // Shape tool: clicking on empty canvas clears the selection. Stroke tool: start a stroke.
    function pointerDownACB(evt){
        if (!isStrokeTool) {
            if (evt.target === evt.target.getStage()) props.onDeselect();
            return;
        }
        setDraftPoints([getPointer()]);
    }

    function pointerMoveACB(){
        if (!isStrokeTool || !draftPoints) return;
        const point = getPointer();

        // the updater gets the newest points, even if several moves happen before the next render
        function addPointCB(points){
            if (!points || points.length >= MAX_STROKE_POINTS) return points;   // the server takes at most this many
            const last = points[points.length - 1];
            if (Math.hypot(point.x - last.x, point.y - last.y) < MIN_POINT_DISTANCE) return points;
            return [...points, point];
        }
        setDraftPoints(addPointCB);
    }

    // releasing the mouse (or leaving the canvas) finishes the stroke
    function pointerUpACB(){
        if (!draftPoints) return;
        props.onStrokeEnd(draftPoints);
        setDraftPoints(null);
    }

    // the stroke being drawn looks like it will look once finished
    function makeDraftStroke(){
        return {
            path: draftPoints,
            brush: props.brush,
            size: props.strokeWidth,
            color: props.strokeColor,
            opacity: props.strokeOpacity,
            status: "drawing",
        };
    }

    function strokeCB(stroke){ return <StrokeNode key={stroke.id} stroke={stroke}/>; }

    function elementCB(element){
        function selectACB(){ props.onSelect(element.id); }

        function dragEndACB(evt){
            props.onElementChange(element.id, { x: evt.target.x(), y: evt.target.y() });
        }

        function transformEndACB(evt){
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

        // shared by every element type; with the stroke tool, elements ignore the mouse
        // so drawing on top of them does not select or move them
        const handlers = {
            interactive: !isStrokeTool,
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
