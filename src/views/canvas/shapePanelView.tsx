import "/style.css"
import type { ChangeEvent, DragEvent } from "react";
import type { SelectedPhoto, ShapeName } from "/src/model/types.ts";

interface ShapePanelViewProps {
    selectedPhoto: SelectedPhoto | null;
    canCut: boolean;
    canFill: boolean;
    shapeActionHint: string;    // why Mask / Fill is disabled, "" when both work
    fillColor: string;
    onCut: () => void;
    onFill: () => void;
    onFillColorChange: (color: string) => void;
    onShapeClick: (shape: ShapeName) => void;
    onUploadPhoto: () => void;
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

            <div className="panel-box">
                {props.selectedPhoto &&
                    <img className="selected-photo" src={props.selectedPhoto.url}
                         draggable="true" onDragStart={photoDragStartACB}
                         title="Drag into the canvas"/>}
                <button className="text-button" onClick={props.onUploadPhoto}>Find photos on Unsplash</button>
            </div>
            {props.selectedPhoto &&
                <div className="photo-credit">
                    Photo by <a href={props.selectedPhoto.photographerLink + "?utm_source=sketchspace&utm_medium=referral"}
                                target="_blank" rel="noreferrer">{props.selectedPhoto.photographer}</a> on Unsplash
                </div>}
        </>
    );

    function fillColorChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onFillColorChange(evt.target.value); }

    // tell the canvas what is being dropped
    function photoDragStartACB(evt: DragEvent<HTMLImageElement>){ evt.dataTransfer.setData("text/plain", "photo"); }

    // click to add the shape to the middle of the canvas, or drag it to a chosen spot
    function shapeCB(shape: ShapeName){
        function clickShapeACB(){ props.onShapeClick(shape); }
        // tell the canvas which shape is being dropped, e.g. "shape:star"
        function shapeDragStartACB(evt: DragEvent<HTMLButtonElement>){ evt.dataTransfer.setData("text/plain", "shape:" + shape); }

        return <button key={shape} className="shape-btn"
                       aria-label={"Add " + shape} title={"Click or drag to add a " + shape}
                       draggable="true" onDragStart={shapeDragStartACB}
                       onClick={clickShapeACB}>
            <span className={"shape-icon shape-icon-" + shape}></span>
        </button>;
    }
}