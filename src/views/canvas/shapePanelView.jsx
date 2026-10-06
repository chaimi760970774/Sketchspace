import "/style.css"

export function ShapePanelView(props){
    const shapes = ["triangle", "star", "circle", "square"];

    return (
        <>
            <div className="panel-box">Collage instruction</div>
            <div className="shape-grid">
                {shapes.map(shapeCB)}
            </div>
            <button className="panel-box" onClick={props.onUploadPhoto}>Upload a photo</button>
            <button className="panel-box" onClick={props.onFillColor}>Or just fill in a color</button>
        </>
    );

    function shapeCB(shape){
        function clickShapeACB(){ props.onShapeSelect(shape); }

        const selected = shape === props.selectedShape ? " selected" : "";
        return <button key={shape} className={"shape shape-" + shape + selected} onClick={clickShapeACB}></button>;
    }
}