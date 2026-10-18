import "/style.css"
import { useRef, useEffect } from "react";
import type { ReactNode, RefObject, ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type Konva from "konva";
import type { PhotoCredit, SaveStatus, Tool } from "/src/model/types.ts";
import type { LiveStatus } from "/src/model/openCanvasModel.ts";
import { downloadStageImage, captureStageThumb } from "/src/utils/exportImage.ts";
import { LogoView } from "/src/views/logoView.tsx";

// typing in these must never delete what is selected on the canvas
const TEXT_FIELD_TAGS = ["INPUT", "TEXTAREA", "SELECT"];


interface CanvasViewProps {
    currentTool: Tool | null;
    liveStatus: LiveStatus;
    peerCount: number;
    liveLabel: string;
    credits: PhotoCredit[];
    canvasName: string;
    isShared: boolean;
    isOwner: boolean;
    busy: boolean;                          // a rename / share request is running
    renaming: boolean;
    nameDraft: string;
    nameError: string;
    saveStatus: SaveStatus | "";            // "" when there is nothing on the canvas
    canDelete: boolean;
    onDeselect: () => void;
    eraserOn: boolean;
    eyedropperOn: boolean;
    canUndo: boolean;
    canRedo: boolean;
    children: ReactNode;                    // the tool panel content
    renderBoard: (stageRef: RefObject<Konva.Stage | null>) => ReactNode;
    renderToolbar: () => ReactNode;
    onHomeClick: () => void;
    onGalleryClick: () => void;
    onMyWorkClick: () => void;
    onProfileClick: () => void;
    onRenameStart: () => void;
    onNameDraftChange: (name: string) => void;
    onRenameSave: () => void;
    onRenameCancel: () => void;
    onToolPanelPress: () => void;
    onClear: () => void;
    onShare: () => void;
    onExport: (succeeded: boolean) => void;
    onDelete: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onCaptureThumbnail: (dataUrl: string | null) => void;
}

export function CanvasView(props: CanvasViewProps){
    // the Konva stage, kept in the view because exporting the picture is pure UI work
    const stageRef = useRef<Konva.Stage>(null);

    // Delete / Backspace removes what is selected. The listener is removed again before the next
    // render adds a fresh one, and when the page closes, so there is never more than one.
    useEffect(listenToDeleteKeyACB, [props.canDelete, props.onDelete]);
    useEffect(listenToUndoRedoKeysACB, [props.onUndo, props.onRedo]);
    useEffect(listenToEscapeKeyACB, [props.onDeselect]);

    return (
        <div className="layout">
            {/* main nav sidebar — unchanged on canvas page */}
            <div className="sidebar">
                <LogoView onClick={homeClickACB}/>
                <button className="sidebar-item" onClick={galleryClickACB}>gallery</button>
                <button className="sidebar-item" onClick={myWorkClickACB}>My Work</button>
                <button className="sidebar-item sidebar-bottom" onClick={profileClickACB}>Profile</button>
            </div>

            <div className="canvas-wrapper" onMouseDown={deselectACB}>
                {/* narrow icon toolbar */}
                {props.renderToolbar()}

                {/* tool panel — floats above the canvas when a tool is active */}
                {props.currentTool !== null && (
                    <div className="tool-panel" onMouseDown={props.onToolPanelPress}>
                        {props.children}
                    </div>
                )}

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
        </div>
    );

    // Captures a thumbnail and navigates; called by every sidebar nav button so the stage
    // is still mounted and stageRef.current is valid when we read it.
    function captureAndGoACB(navigate: () => void): void {
        props.onCaptureThumbnail(captureStageThumb(stageRef.current));
        navigate();
    }
    function homeClickACB(){ captureAndGoACB(props.onHomeClick); }
    function galleryClickACB(){ captureAndGoACB(props.onGalleryClick); }
    function myWorkClickACB(){ captureAndGoACB(props.onMyWorkClick); }
    function profileClickACB(){ captureAndGoACB(props.onProfileClick); }

    function listenToDeleteKeyACB(){
        window.addEventListener("keydown", keyDownACB);
        return stopListeningACB;

        function stopListeningACB(){ window.removeEventListener("keydown", keyDownACB); }
        function keyDownACB(evt: KeyboardEvent){
            if (evt.key !== "Delete" && evt.key !== "Backspace") return;
            if (!props.canDelete || isTyping(evt.target)) return;
            evt.preventDefault();       // Backspace must not do anything else in the browser
            props.onDelete();
        }
    }
    function deselectACB(){ props.onDeselect(); }

    function listenToEscapeKeyACB(){
        window.addEventListener("keydown", keyDownACB);
        return stopListeningACB;

        function stopListeningACB(){ window.removeEventListener("keydown", keyDownACB); }
        function keyDownACB(evt: KeyboardEvent){
            if (evt.key !== "Escape" || isTyping(evt.target)) return;
            props.onDeselect();
        }
    }
    function listenToUndoRedoKeysACB(){
        window.addEventListener("keydown", keyDownACB);
        return stopListeningACB;

        function stopListeningACB(){ window.removeEventListener("keydown", keyDownACB); }
        function keyDownACB(evt: KeyboardEvent){
            if (!evt.ctrlKey || isTyping(evt.target)) return;
            if (!evt.shiftKey && evt.key === "z") {
                evt.preventDefault();
                props.onUndo();
            } else if (evt.key === "y" || (evt.shiftKey && evt.key === "Z")) {
                evt.preventDefault();
                props.onRedo();
            }
        }
    }
    function isTyping(target: EventTarget | null){
        return target instanceof HTMLElement && (target.isContentEditable || TEXT_FIELD_TAGS.includes(target.tagName));
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

        function nameChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onNameDraftChange(evt.target.value); }
        function keyDownACB(evt: ReactKeyboardEvent<HTMLInputElement>){
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

    function creditCB(credit: PhotoCredit, index: number){
        return (
            <span key={credit.link}>
                {index > 0 && ", "}
                <a href={credit.link + "?utm_source=sketchspace&utm_medium=referral"}
                   target="_blank" rel="noreferrer">{credit.name}</a>
            </span>
        );
    }
}
