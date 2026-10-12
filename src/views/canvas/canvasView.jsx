import "/style.css"
import { useRef } from "react";
import { downloadStageImage } from "/src/utils/exportImage.js";

export function CanvasView(props){
    // the Konva stage, kept in the view because exporting the picture is pure UI work
    const stageRef = useRef(null);

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
                        <span className="collaborator-count">{props.collaborators.length}</span>
                    </div>

                    {/* not built yet, disabled with a visible note */}
                    <div className="coming-soon-group">
                        <div>
                            <button className="icon-button" disabled aria-label="Undo">←</button>
                            <button className="icon-button" disabled aria-label="Redo">→</button>
                        </div>
                        <span className="coming-soon">Coming soon</span>
                    </div>

                    <div className="topbar-right">
                        {renderComingSoon("Save")}
                        <button className="small-button" onClick={exportACB}>Export</button>
                        {renderComingSoon("Share")}
                    </div>
                </div>

                {/* drawing board, the presenter decides what is on it */}
                {props.renderBoard(stageRef)}

                {/* photographer credits for every photo on the canvas, required by Unsplash guidelines */}
                {props.credits.length > 0 &&
                    <div className="canvas-credit">Photos by {props.credits.map(creditCB)} on Unsplash</div>}
            </div>
        </div>
    );

    // download the picture, then tell the presenter whether it worked
    function exportACB(){
        const succeeded = downloadStageImage(stageRef.current, "sketchspace.png");
        props.onExport(succeeded);
    }

    function renderComingSoon(label){
        return (
            <div className="coming-soon-group">
                <button className="small-button" disabled>{label}</button>
                <span className="coming-soon">Coming soon</span>
            </div>
        );
    }

    function toolClass(tool){
        return props.currentTool === tool ? "sidebar-item tool-active" : "sidebar-item";
    }
    function clickShapeToolACB(){ props.onToolChange("shape"); }
    function clickStrokeToolACB(){ props.onToolChange("stroke"); }

    function collaboratorCB(person){
        return <div key={person.id} className="collaborator-avatar" title={person.name}></div>;
    }

    function creditCB(credit, index){
        return (
            <span key={credit.link}>
                {index > 0 && ", "}
                <a href={credit.link + "?utm_source=sketchspace&utm_medium=referral"}
                   target="_blank" rel="noreferrer">{credit.name}</a>
            </span>
        );
    }
}