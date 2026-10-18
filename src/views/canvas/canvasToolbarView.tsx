import "/style.css";
import { useRef } from "react";
import { Stamp, Paintbrush, Eraser, Pipette, Image, Upload, Undo2, Redo2 } from "lucide-react";
import type { Tool } from "/src/model/types.ts";

interface CanvasToolbarViewProps {
    currentTool: Tool | null;
    eraserOn: boolean;
    eyedropperOn: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onToolClick: (tool: Tool) => void;
    onEraserClick: () => void;
    onEyedropperClick: () => void;
    onUploadLocalFile: (file: File) => void;
    onUndo: () => void;
    onRedo: () => void;
}

export function CanvasToolbarView(props: CanvasToolbarViewProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            <button className="canvas-tool-btn" title="Upload image from computer"
                    onClick={() => fileInputRef.current?.click()}>
                <Upload size={22} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                   onChange={handleFileChangeCB} />
            <button className="canvas-tool-btn" title="Undo (Ctrl+Z)"
                    disabled={!props.canUndo} onClick={props.onUndo}>
                <Undo2 size={22} />
            </button>
            <button className="canvas-tool-btn" title="Redo (Ctrl+Y)"
                    disabled={!props.canRedo} onClick={props.onRedo}>
                <Redo2 size={22} />
            </button>
        </div>
    );

    function handleFileChangeCB(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0];
        if (file) props.onUploadLocalFile(file);
        e.target.value = "";
    }

    function btnClass(tool: Tool): string {
        return "canvas-tool-btn" + (props.currentTool === tool ? " active" : "");
    }
}
