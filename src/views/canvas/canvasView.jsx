import "/style.css"
import { useRef, useEffect } from "react";
import { downloadStageImage } from "/src/utils/exportImage.js";
import { LogoView } from "/src/views/logoView.jsx";

// typing in these must never delete what is selected on the canvas
const TEXT_FIELD_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

export function CanvasView(props){
    // the Konva stage, kept in the view because exporting the picture is pure UI work
    const stageRef = useRef(null);

    // Delete / Backspace removes what is selected. The listener is removed again before the next
    // render adds a fresh one, and when the page closes, so there is never more than one.
    useEffect(listenToDeleteKeyACB, [props.canDelete, props.onDelete]);

    return (
        <div className="layout">
            {/* canvas page's own sidebar */}
            <div className="sidebar">
                <LogoView onClick={props.onHomeClick}/>
                <button className={toolClass("shape")} onClick={clickShapeToolACB}>Shape</button>
                <button className={toolClass("stroke")} onClick={clickStrokeToolACB}>Stroke</button>
                <button className="sidebar-item sidebar-bottom" onClick={props.onProfileClick}>Profile</button>
            </div>

            {/* left tool panel, the presenter decides which panel to show; using it switches the eraser off */}
            <div className="tool-panel" onMouseDown={props.onToolPanelPress}>
                {props.children}
            </div>

            <div className="canvas-main">
                <div className="canvas-topbar">
                    <div className="collaborators" role="status" title="People in this canvas right now">
                        <span className={"live-dot live-" + props.liveStatus}></span>
                        {props.liveStatus === "live" && <span className="collaborator-count">{props.peerCount}</span>}
                        <span className="live-label">{props.liveLabel}</span>
                    </div>

                    <div className="canvas-title-group">
                        {renderName()}
                        {renderSaveStatus()}
                    </div>

                    <button className="small-button" aria-pressed={props.eraserOn}
                            title="Eraser: drag over lines, photos and shapes to delete them" onClick={props.onEraserToggle}>
                        Eraser
                    </button>

                    <div className="topbar-right">
                        {props.isOwner &&
                            <button className="small-button danger-button" title="Remove everything from this canvas"
                                    onClick={clearACB}>Clear canvas</button>}
                        <button className="small-button" onClick={exportACB}>Export</button>
                        <div className="coming-soon-group">
                            <button className="small-button" disabled={props.busy} onClick={props.onShare}
                                    title="Share this canvas with others">
                                Share
                            </button>
                            <span className="coming-soon">{props.isShared ? "Shared in Gallery" : "Private"}</span>
                        </div>
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

    function listenToDeleteKeyACB(){
        window.addEventListener("keydown", keyDownACB);
        return stopListeningACB;

        function stopListeningACB(){ window.removeEventListener("keydown", keyDownACB); }
        function keyDownACB(evt){
            if (evt.key !== "Delete" && evt.key !== "Backspace") return;
            if (!props.canDelete || isTyping(evt.target)) return;
            evt.preventDefault();       // Backspace must not do anything else in the browser
            props.onDelete();
        }
    }
    function isTyping(target){
        return Boolean(target) && (target.isContentEditable || TEXT_FIELD_TAGS.includes(target.tagName));
    }

    // removes everything for everybody, so ask first
    function clearACB(){
        if (window.confirm("Remove every line, photo and shape from this canvas for everyone? This cannot be undone.")) props.onClear();
    }

    // download the picture, then tell the presenter whether it worked
    function exportACB(){
        const succeeded = downloadStageImage(stageRef.current, "sketchspace.png");
        props.onExport(succeeded);
    }

    // the canvas name; click it to rename (Enter saves, Esc cancels, clicking away saves)
    function renderName(){
        if (!props.renaming)
            return (
                <button className="canvas-name" title="Click to rename" disabled={props.busy} onClick={props.onRenameStart}>
                    {props.canvasName}
                    {props.busy && <span className="spinner spinner-small" role="status" aria-label="Saving"></span>}
                </button>
            );

        function nameChangeACB(evt){ props.onNameDraftChange(evt.target.value); }
        function keyDownACB(evt){
            if (evt.key === "Enter") props.onRenameSave();
            if (evt.key === "Escape") props.onRenameCancel();
        }

        return (
            <>
                <input className="canvas-name-input" autoFocus aria-label="Canvas name"
                       aria-invalid={Boolean(props.nameError)}
                       value={props.nameDraft} onChange={nameChangeACB}
                       onKeyDown={keyDownACB} onBlur={props.onRenameSave}/>
                {props.nameError && <span className="field-error">{props.nameError}</span>}
            </>
        );
    }

    // whether the strokes drawn here reached the server
    function renderSaveStatus(){
        if (props.saveStatus === "saving")
            return (
                <span className="save-status">
                    <span className="spinner spinner-small" aria-hidden="true"></span> Saving...
                </span>
            );
        if (props.saveStatus === "failed")
            return <span className="save-status save-status-failed" role="alert">Some strokes were not saved (shown faded)</span>;
        if (props.saveStatus === "saved")
            return <span className="save-status">All changes saved</span>;
        return null;
    }

    function toolClass(tool){
        return props.currentTool === tool ? "sidebar-item tool-active" : "sidebar-item";
    }
    function clickShapeToolACB(){ props.onToolChange("shape"); }
    function clickStrokeToolACB(){ props.onToolChange("stroke"); }

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