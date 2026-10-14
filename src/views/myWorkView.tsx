import "/style.css"
import { formatDate } from "/src/utils/formatDate.ts";
import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent } from "react";
import type { Canvas, Folder } from "/src/model/types.ts";

interface MyWorkViewProps {
    canvases: Canvas[];
    folders: Folder[];
    searchText: string;
    loading: boolean;
    error: string;
    creating: boolean;
    busyCanvasIds: string[];            // canvases with a request running, their controls wait
    selectedFolderId: string | null;    // null = "All"
    dragOverTab: string | null;         // "all", a folder id, or null
    newFolderOpen: boolean;
    newFolderName: string;
    newFolderError: string;
    onSearchChange: (text: string) => void;
    onRetry: () => void;
    onFolderClick: (folderId: string | null) => void;
    onNewFolderOpen: () => void;
    onNewFolderNameChange: (name: string) => void;
    onNewFolderCreate: () => void;
    onNewFolderCancel: () => void;
    onNewFolderLeave: () => void;
    onDeleteFolder: (folderId: string) => void;
    onDragOverTab: (tab: string | null) => void;
    onMoveCanvas: (canvasId: string, folderId: string | null) => void;
    onDeleteCanvas: (canvasId: string) => void;
    onShareChange: (canvasId: string, isShared: boolean) => void;
    onNewCanvas: () => void;
    onCardClick: (canvas: Canvas) => void;
}

export function MyWorkView(props: MyWorkViewProps){
    return (
        <div className="page-content">
            <button className="new-canvas-big" aria-label="New canvas" disabled={props.creating} onClick={props.onNewCanvas}>
                {props.creating ? <div className="spinner" role="status" aria-label="Creating canvas"></div> : "+"}
            </button>

            <input className="search-input" placeholder="Search" aria-label="Search canvases"
                   value={props.searchText} onChange={searchChangeACB}/>

            <div className="folder-bar">
                <div className="folder-tabs">
                    {renderTab(null, "All")}
                    {props.folders.map(folderTabCB)}
                </div>
                {renderNewFolder()}
            </div>

            {renderCanvases()}
        </div>
    );

    function searchChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onSearchChange(evt.target.value); }

    function renderCanvases(){
        if (props.loading) return <div className="spinner" role="status" aria-label="Loading canvases"></div>;
        if (props.error)
            return (
                <div className="load-error" role="alert">
                    <span>Could not load canvases: {props.error}</span>
                    <button className="small-button" onClick={props.onRetry}>Retry</button>
                </div>
            );
        if (props.canvases.length === 0) return <div className="empty-text">{emptyText()}</div>;

        return <div className="card-list">{props.canvases.map(cardCB)}</div>;
    }

    function emptyText(){
        if (props.searchText) return "No canvas found";
        if (props.selectedFolderId) return "Drag a canvas onto this folder to add it";
        return "No canvas yet";
    }

    // Folder tabs
    function folderTabCB(folder: Folder){ return renderTab(folder.id, folder.name); }

    // folderId null is the "All" tab; dropping a canvas on it takes the canvas out of its folder
    function renderTab(folderId: string | null, label: string){
        const tabKey = folderId || "all";
        const isActive = folderId === props.selectedFolderId;

        const activeClass = isActive ? " active" : "";
        const dragOverClass = tabKey === props.dragOverTab ? " drag-over" : "";
        const className = "folder-tab" + activeClass + dragOverClass;

        function clickTabACB(){ props.onFolderClick(folderId); }

        // preventDefault on dragover is what allows dropping here
        function dragOverACB(evt: DragEvent<HTMLButtonElement>){
            evt.preventDefault();
            if (props.dragOverTab !== tabKey) props.onDragOverTab(tabKey);
        }
        function dragLeaveACB(){ props.onDragOverTab(null); }
        function dropACB(evt: DragEvent<HTMLButtonElement>){
            evt.preventDefault();
            const canvasId = evt.dataTransfer.getData("text/plain");
            props.onDragOverTab(null);
            if (canvasId) props.onMoveCanvas(canvasId, folderId);
        }

        function deleteFolderACB(evt: MouseEvent<HTMLSpanElement>){
            evt.stopPropagation();      // do not also open the tab
            const confirmed = window.confirm("Delete folder \"" + label + "\"? Its canvases stay in All.");
            if (confirmed && folderId) props.onDeleteFolder(folderId);
        }

        return (
            <button key={tabKey} className={className} onClick={clickTabACB}
                    onDragOver={dragOverACB} onDragLeave={dragLeaveACB} onDrop={dropACB}>
                {label}
                {folderId && isActive &&
                    <span className="folder-delete" title="Delete folder" onClick={deleteFolderACB}>×</span>}
            </button>
        );
    }

    // "+" button, or the name input after clicking it (Enter creates, Esc cancels, clicking away creates if a name was typed)
    function renderNewFolder(){
        if (!props.newFolderOpen)
            return <button className="folder-add" title="New folder" onClick={props.onNewFolderOpen}>+</button>;

        function nameChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onNewFolderNameChange(evt.target.value); }
        function keyDownACB(evt: KeyboardEvent<HTMLInputElement>){
            if (evt.key === "Enter") props.onNewFolderCreate();
            if (evt.key === "Escape") props.onNewFolderCancel();
        }

        return (
            <>
                <input className="folder-name-input" placeholder="Folder name" autoFocus
                       aria-label="New folder name" aria-invalid={Boolean(props.newFolderError)}
                       value={props.newFolderName} onChange={nameChangeACB}
                       onKeyDown={keyDownACB} onBlur={props.onNewFolderLeave}/>
                {props.newFolderError && <span className="field-error">{props.newFolderError}</span>}
            </>
        );
    }

    // Canvas cards (draggable onto folder tabs), with a share switch and a delete button
    function cardCB(canvas: Canvas){
        const busy = props.busyCanvasIds.includes(canvas._id);     // a request for this canvas is running

        function clickCardACB(){ props.onCardClick(canvas); }
        function dragStartACB(evt: DragEvent<HTMLDivElement>){
            evt.dataTransfer.setData("text/plain", canvas._id);
            evt.dataTransfer.effectAllowed = "move";     // browser drag API, can only be set by assignment
        }
        function dragEndACB(){ props.onDragOverTab(null); }     // also clears the highlight if dropped elsewhere

        // the controls sit on the card, so clicks on them must not also open the canvas
        function stopClickACB(evt: MouseEvent<HTMLLabelElement>){ evt.stopPropagation(); }
        function shareChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onShareChange(canvas._id, evt.target.checked); }
        function deleteACB(evt: MouseEvent<HTMLButtonElement>){
            evt.stopPropagation();
            const confirmed = window.confirm("Delete \"" + canvas.name + "\"? This cannot be undone.");
            if (confirmed) props.onDeleteCanvas(canvas._id);
        }

        return (
            <div key={canvas._id} className="card-item" draggable={!busy} aria-busy={busy}
                 onClick={clickCardACB} onDragStart={dragStartACB} onDragEnd={dragEndACB}>
                <button className="card-delete" aria-label={"Delete " + canvas.name} title="Delete canvas"
                        disabled={busy} onClick={deleteACB}>×</button>

                <div className="card-name">{canvas.name}</div>
                <div className="card-date">Updated {formatDate(canvas.updatedAt)}</div>

                <label className="card-share" onClick={stopClickACB}>
                    <input type="checkbox" checked={canvas.isShared} disabled={busy} onChange={shareChangeACB}/>
                    {canvas.isShared ? "Shared" : "Private"}
                </label>

                {busy && <div className="spinner spinner-small" role="status" aria-label="Saving"></div>}
            </div>
        );
    }
}
