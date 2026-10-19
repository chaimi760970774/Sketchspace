import "/style.css"
import type { ChangeEvent, DragEvent } from "react";
import type { ShapeName } from "/src/model/types.ts";

interface ShapePanelViewProps {
    canCut: boolean;
    canFill: boolean;
    shapeActionHint: string;    // why Mask / Fill is disabled, "" when both work
    fillColor: string;
    onCut: () => void;
    onFill: () => void;
    onFillColorChange: (color: string) => void;
    onShapeClick: (shape: ShapeName) => void;
}

export function ShapePanelView(props: ShapePanelViewProps){
    const shapes: ShapeName[] = ["triangle", "star", "circle", "square"];

    return (
        <>
            <div className="panel-box">Collage instruction</div>
            <div className="shape-grid">
                {shapes.map(shapeCB)}
            </div>

            {/* a dashed shape on the canvas is either cut out of a photo or filled with a colour */}
            <div className="shape-actions">
                {/* only works when a dashed shape is selected and placed on top of a photo */}
                <button className="small-button" disabled={!props.canCut} onClick={props.onCut}
                        title="Put a shape on a photo, select the shape, then cut">Mask</button>
                <span>or</span>
                <input className="fill-color" type="color" value={props.fillColor} onChange={fillColorChangeACB}/>
                <button className="small-button" disabled={!props.canFill} onClick={props.onFill}
                        title="Select a shape, pick a colour, then fill">Fill</button>
            </div>
            {/* tells the user why a button above is disabled */}
            {props.shapeActionHint && <div className="action-hint">{props.shapeActionHint}</div>}
        </>
    );

    function fillColorChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onFillColorChange(evt.target.value); }

    // click to add the shape to the middle of the canvas, or drag it to a chosen spot
    function shapeCB(shape: ShapeName){
        function clickShapeACB(){ props.onShapeClick(shape); }
        // tell the canvas which shape is being dropped, e.g. "shape:star"
        function shapeDragStartACB(evt: DragEvent<HTMLButtonElement>){ evt.dataTransfer.setData("text/plain", "shape:" + shape); }

        return <button key={shape} className="shape-btn"
                       aria-label={"Add " + shape} title={"Click or drag to add a " + shape}
                       draggable="true" onDragStart={shapeDragStartACB}
                       onClick={clickShapeACB}>
            {shapeIconSVG(shape)}
        </button>;
    }

    function shapeIconSVG(shape: ShapeName){
        const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeDasharray: "4 3", strokeLinecap: "round" as const };
        return (
            <svg className="shape-icon" viewBox="0 0 52 52" aria-hidden="true">
                {shape === "circle"   && <circle cx="26" cy="26" r="22" {...common}/>}
                {shape === "square"   && <rect x="4" y="4" width="44" height="44" {...common}/>}
                {shape === "triangle" && <polygon points="26,3 49,49 3,49" strokeLinejoin="round" {...common}/>}
                {shape === "star"     && <polygon points="26,3 31.1,19.1 48.1,19.1 34.3,29.2 39.3,44.9 26,35.2 12.7,44.9 17.7,29.2 3.9,19.1 20.9,19.1" strokeLinejoin="round" {...common}/>}
            </svg>
        );
    }
}