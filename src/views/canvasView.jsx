import "/style.css"
import { useRef, useEffect } from "react";

// fixed logical drawing size, so strokes look the same on every screen
const WIDTH = 1000;
const HEIGHT = 600;

export function CanvasView(props){
    const canvasRef = useRef(null);
    const pathRef = useRef(null);       // points of the stroke being drawn, null when not drawing

    useEffect(redrawACB, [props.strokes]);

    return (
        <div className="layout">
            {/* canvas page's own sidebar */}
            <div className="sidebar">
                <button className="sidebar-item sidebar-icon" onClick={props.onHomeClick}>Home</button>
                <button className={toolClass("shape")} onClick={clickShapeToolACB}>Shape</button>
                <button className={toolClass("stroke")} onClick={clickStrokeToolACB}>Stroke</button>
                <button className="sidebar-item sidebar-bottom" onClick={props.onProfileClick}>Profile</button>
            </div>

            {/* left tool panel, the presenter decides which panel to show */}
            <div className="tool-panel">
                {props.children}
            </div>

            <div className="canvas-main">
                <div className="canvas-topbar">
                    <div className="collaborators">
                        {props.collaborators.map(collaboratorCB)}
                        <span className="collaborator-count">{props.peers}</span>
                    </div>
                    <button className="icon-button" onClick={props.onUndo}>←</button>
                    <button className="icon-button" onClick={props.onRedo}>→</button>

                    <div className="topbar-right">
                        <button className="small-button" onClick={props.onSave}>Save</button>
                        <button className="small-button" onClick={props.onExport}>Export</button>
                        <button className="small-button" onClick={props.onShare}>Share</button>
                    </div>
                </div>

                {props.error && <div className="canvas-error">{props.error}</div>}

                <div className="canvas-area">
                    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="drawing-canvas"
                            onPointerDown={pointerDownACB}
                            onPointerMove={pointerMoveACB}
                            onPointerUp={pointerUpACB}
                            onPointerCancel={pointerUpACB}/>
                </div>
            </div>
        </div>
    );

    function toolClass(tool){
        return props.currentTool === tool ? "sidebar-item tool-active" : "sidebar-item";
    }
    function clickShapeToolACB(){ props.onToolChange("shape"); }
    function clickStrokeToolACB(){ props.onToolChange("stroke"); }

    function collaboratorCB(person){
        return <div key={person.id} className="collaborator-avatar" title={person.name}></div>;
    }

    // ---- drawing ----

    function pointOf(evt){
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: Math.round((evt.clientX - rect.left) * WIDTH / rect.width),
            y: Math.round((evt.clientY - rect.top) * HEIGHT / rect.height),
        };
    }

    function drawStroke(ctx, stroke){
        if (!stroke.path.length) return;
        ctx.save();
        ctx.globalAlpha = stroke.opacity;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
        if (stroke.path.length === 1) ctx.lineTo(stroke.path[0].x, stroke.path[0].y);   // a click draws a dot
        stroke.path.forEach(function lineToCB(p){ ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        ctx.restore();
    }

    function redrawACB(){
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        props.strokes.forEach(function drawCB(stroke){ drawStroke(ctx, stroke); });
    }

    function pointerDownACB(evt){
        if (props.currentTool !== "stroke") return;
        canvasRef.current.setPointerCapture(evt.pointerId);
        pathRef.current = [pointOf(evt)];
    }

    function pointerMoveACB(evt){
        if (!pathRef.current) return;
        const previous = pathRef.current[pathRef.current.length - 1];
        const point = pointOf(evt);
        pathRef.current.push(point);
        // draw the new segment right away, the finished stroke is only sent on release
        const ctx = canvasRef.current.getContext("2d");
        drawStroke(ctx, { path: [previous, point], color: props.strokeColor, size: props.strokeWidth, opacity: 1 });
    }

    function pointerUpACB(){
        const path = pathRef.current;
        pathRef.current = null;
        if (path) props.onStrokeFinished(path);
    }
}
