import "/style.css"

export function StrokePanelView(props){
    const strokeTypes = ["pencil", "pen"];
    const opacityPercent = Math.round(props.strokeOpacity * 100);

    return (
        <>
            <div className="panel-box">Collage instruction</div>

            <div className="panel-label">Stroke textual</div>
            <div className="stroke-type-list">
                {strokeTypes.map(strokeTypeCB)}
            </div>

            <div className="panel-label">Stroke weight</div>
            <input type="range" min="1" max="30" aria-label="Stroke weight"
                   value={props.strokeWidth} onChange={strokeWidthChangeACB}/>

            {/* the model stores 0-1, the slider shows 0-100 % */}
            <div className="panel-label">Opacity</div>
            <div className="slider-row">
                <input type="range" min="0" max="100" aria-label="Opacity"
                       value={opacityPercent} onChange={opacityChangeACB}/>
                <span className="slider-value">{opacityPercent}%</span>
            </div>

            <div className="panel-label">Stroke Color</div>
            {/* native color picker for now, can be replaced with a color wheel later */}
            <input className="color-picker" type="color" value={props.strokeColor} onChange={strokeColorChangeACB}/>
        </>
    );

    function strokeWidthChangeACB(evt){ props.onStrokeWidthChange(evt.target.value); }
    function strokeColorChangeACB(evt){ props.onStrokeColorChange(evt.target.value); }
    function opacityChangeACB(evt){ props.onStrokeOpacityChange(Number(evt.target.value) / 100); }

    function strokeTypeCB(type){
        function clickStrokeTypeACB(){ props.onStrokeTypeChange(type); }

        const className = type === props.strokeType ? "stroke-type selected" : "stroke-type";
        return <button key={type} className={className} onClick={clickStrokeTypeACB}>{type}</button>;
    }
}