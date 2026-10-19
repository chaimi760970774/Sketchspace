import "/style.css"
import type { ChangeEvent } from "react";
import type { Brush } from "/src/model/types.ts";
import { ColorWheelPicker } from "./colorWheelPicker.tsx";

interface StrokePanelViewProps {
    strokeType: Brush | string;
    strokeWidth: number;
    strokeColor: string;
    strokeOpacity: number;      // 0 to 1
    onStrokeTypeChange: (type: Brush) => void;
    onStrokeWidthChange: (width: string) => void;
    onStrokeColorChange: (color: string) => void;
    onStrokeOpacityChange: (opacity: number) => void;
}

export function StrokePanelView(props: StrokePanelViewProps){
    const strokeTypes: Brush[] = ["pencil", "pen"];
    const opacityPercent = Math.round(props.strokeOpacity * 100);

    return (
        <>
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
            <ColorWheelPicker color={props.strokeColor} onChange={props.onStrokeColorChange}/>
        </>
    );

    function strokeWidthChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onStrokeWidthChange(evt.target.value); }
    function opacityChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onStrokeOpacityChange(Number(evt.target.value) / 100); }

    function strokeTypeCB(type: Brush){
        function clickStrokeTypeACB(){ props.onStrokeTypeChange(type); }

        const className = type === props.strokeType ? "stroke-type selected" : "stroke-type";
        return <button key={type} className={className} onClick={clickStrokeTypeACB}>{type}</button>;
    }
}