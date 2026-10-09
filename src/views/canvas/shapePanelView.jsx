import "/style.css"

export function ShapePanelView(props){
    const shapes = ["triangle", "star", "circle", "square"];

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

            <div className="panel-box">
                {props.selectedPhoto &&
                    <img className="selected-photo" src={props.selectedPhoto.url}
                         draggable="true" onDragStart={photoDragStartACB}
                         title="Drag into the canvas"/>}
                <button className="text-button" onClick={props.onUploadPhoto}>Upload a photo</button>
            </div>
            {props.selectedPhoto &&
                <div className="photo-credit">
                    Photo by <a href={props.selectedPhoto.photographerLink + "?utm_source=sketchspace&utm_medium=referral"}
                                target="_blank" rel="noreferrer">{props.selectedPhoto.photographer}</a> on Unsplash
                </div>}
        </>
    );

    function fillColorChangeACB(evt){ props.onFillColorChange(evt.target.value); }

    // tell the canvas what is being dropped
    function photoDragStartACB(evt){ evt.dataTransfer.setData("text/plain", "photo"); }

    function shapeCB(shape){
        function clickShapeACB(){ props.onShapeSelect(shape); }
        // tell the canvas which shape is being dropped, e.g. "shape:star"
        function shapeDragStartACB(evt){ evt.dataTransfer.setData("text/plain", "shape:" + shape); }

        const selected = shape === props.selectedShape ? " selected" : "";
        return <button key={shape} className={"shape shape-" + shape + selected}
                       draggable="true" onDragStart={shapeDragStartACB}
                       onClick={clickShapeACB}></button>;
    }
}