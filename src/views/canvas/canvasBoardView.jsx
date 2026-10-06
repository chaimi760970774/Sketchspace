import "/style.css"
import { useRef, useEffect } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import { PhotoNode } from "./nodes/photoNode.jsx";
import { ShapeNode } from "./nodes/shapeNode.jsx";
import { CutoutNode } from "./nodes/cutoutNode.jsx";

// fixed size so every collaborator uses the same coordinates
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

export function CanvasBoardView(props){
    // Konva needs refs to reach the canvas; these are UI-only, all app data stays in the model
    // stageRef comes from the presenter, so it can export the picture
    const stageRef = props.stageRef;
    const transformerRef = useRef(null);

    // attach the resize handles to the selected element
    useEffect(attachTransformerACB, [props.selectedId, props.elements]);

    return (
        <div className="canvas-area" onDragOver={dragOverACB} onDrop={dropACB}>
            <Stage ref={stageRef}
                   className="konva-stage"
                   width={CANVAS_WIDTH}
                   height={CANVAS_HEIGHT}
                   onMouseDown={stageMouseDownACB}
                   onTouchStart={stageMouseDownACB}>
                <Layer>
                    {props.elements.map(elementCB)}
                    <Transformer ref={transformerRef}/>
                </Layer>
            </Stage>
        </div>
    );

    function attachTransformerACB(){
        const node = props.selectedId ? stageRef.current.findOne("#" + props.selectedId) : null;
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

    // clicking on empty canvas clears the selection
    function stageMouseDownACB(evt){
        if (evt.target === evt.target.getStage()) props.onDeselect();
    }

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
            node.scaleX(1);
            node.scaleY(1);
            props.onElementChange(element.id, changes);
        }

        // shared by every element type
        const handlers = {
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
