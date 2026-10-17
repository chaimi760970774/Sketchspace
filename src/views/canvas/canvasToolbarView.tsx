import "/style.css";
import { Stamp, Paintbrush, Eraser, Pipette, Image } from "lucide-react";
import type { Tool } from "/src/model/types.ts";

interface CanvasToolbarViewProps {
    currentTool: Tool | null;
    eraserOn: boolean;
    eyedropperOn: boolean;
    onToolClick: (tool: Tool) => void;
    onEraserClick: () => void;
    onEyedropperClick: () => void;
}

export function CanvasToolbarView(props: CanvasToolbarViewProps) {
    return (
        <div className="canvas-toolbar">
            <button className={btnClass("shape")} title="Shapes" onClick={() => props.onToolClick("shape")}>
                <Stamp size={22} />
            </button>
            <button className={btnClass("stroke")} title="Brush / Pen" onClick={() => props.onToolClick("stroke")}>
                <Paintbrush size={22} />
            </button>
            <button className={"canvas-tool-btn" + (props.eraserOn ? " active" : "")}
                    title="Eraser" onClick={props.onEraserClick}>
                <Eraser size={22} />
            </button>
            <button className={"canvas-tool-btn" + (props.eyedropperOn ? " active" : "")}
                    title="Eyedropper" onClick={props.onEyedropperClick}>
                <Pipette size={22} />
            </button>
            <button className={btnClass("photo")} title="Find photos" onClick={() => props.onToolClick("photo")}>
                <Image size={22} />
            </button>
        </div>
    );

    function btnClass(tool: Tool): string {
        return "canvas-tool-btn" + (props.currentTool === tool ? " active" : "");
    }
}
