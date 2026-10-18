import "/style.css"
import { formatDate } from "/src/utils/formatDate.ts";
import { getThumbnail } from "/src/utils/thumbnailStore.ts";
import type { ChangeEvent, DragEvent, KeyboardEvent, MouseEvent } from "react";
import type { Canvas, Folder } from "/src/model/types.ts";

interface GalleryViewProps {
    canvases: Canvas[];
    folders: Folder[];
    searchText: string;
    loading: boolean;
    error: string;
    creating: boolean;
    busyCanvasIds: string[];
    selectedFolderId: string | null;
    dragOverTab: string | null;
    newFolderOpen: boolean;
    newFolderName: string;
    newFolderError: string;
    canUseFolders: boolean;
    foldersLoading: boolean;
    foldersError: string;
    creatingFolder: boolean;
    busyFolderIds: string[];
    joinText: string;
    joinError: string;
    onSearchChange: (text: string) => void;
    onRetry: () => void;
    onFoldersRetry: () => void;
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
    onJoinTextChange: (text: string) => void;
    onJoin: () => void;
    onNewCanvas: () => void;
    onCardClick: (canvas: Canvas) => void;
}

export function GalleryView(props: GalleryViewProps){
    return (
        <div>
            <div className="hero">
                <h1 className="hero-title">Making Collage Together!</h1>
                <button className="outline-button" disabled={props.creating} onClick={props.onNewCanvas}>
                    {props.creating ? "Creating..." : "Start doodling"}
                </button>
            </div>

            <div className="page-content">
                <input className="search-input" placeholder="Search canvases" aria-label="Search canvases"
                       value={props.searchText} onChange={searchChangeACB}/>

                <div className="toolbar-title">Draw together with others</div>
                <div className="join-row">
                    <input className="search-input" placeholder="Insert canvas ID" aria-label="Canvas id to join"
                           value={props.joinText} onChange={joinTextChangeACB} onKeyDown={joinKeyDownACB}/>
                    <button className="small-button" onClick={joinClickACB}>Join canvas</button>
                    {props.joinError && <span className="join-error" role="alert">{props.joinError}</span>}
                </div>

                <div className="toolbar-title">My canvases</div>
                <div className="folder-bar">
                    {renderFolderBar()}
                </div>

                {renderCanvases()}
            </div>
        </div>
    );

    function searchChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onSearchChange(evt.target.value); }
    function joinTextChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onJoinTextChange(evt.target.value); }
    function joinKeyDownACB(evt: KeyboardEvent<HTMLInputElement>){ if (evt.key === "Enter") props.onJoin(); }
    function joinClickACB(){ props.onJoin(); }

    function renderCanvases(){
        if (props.loading) return <div className="spinner" role="status" aria-label="Loading canvases"></div>;
        if (props.error)
            return (
                <div className="load-error" role="alert">
                    <span>Could not load canvases: {props.error}</span>
                    <button className="small-button" onClick={props.onRetry}>Retry</button>
                </div>
            );

        return (
            <>
                <div className="card-list">
                    <button className="card-new" aria-label="New canvas"
                            disabled={props.creating} onClick={props.onNewCanvas}>
                        {props.creating
                            ? <div className="spinner spinner-small" role="status" aria-label="Creating canvas"></div>
                            : <span className="card-new-icon">+</span>}
                    </button>
                    {props.canvases.map(cardCB)}
                </div>
                {props.canvases.length === 0 &&
                    <div className="empty-text">{emptyText()}</div>}
            </>
        );
    }

    function emptyText(){
        if (props.searchText) return "No canvas found";
        if (props.selectedFolderId) return "Drag a canvas onto this folder to add it";
        return "No canvas yet";
    }

    function renderFolderBar(){
        if (!props.canUseFolders)
            return <span className="folder-hint">Log in to organise canvases into folders</span>;
        if (props.foldersLoading)
            return <div className="spinner spinner-small" role="status" aria-label="Loading folders"></div>;
        if (props.foldersError)
            return (
                <div className="load-error folder-load-error" role="alert">
                    <span>Could not load folders: {props.foldersError}</span>
                    <button className="small-button" onClick={props.onFoldersRetry}>Retry</button>
                </div>
            );
        return (
            <>
                <div className="folder-tabs">
                    {renderTab(null, "All")}
                    {props.folders.map(folderTabCB)}
                </div>
                {renderNewFolder()}
            </>
        );
    }

    function folderTabCB(folder: Folder){ return renderTab(folder.id, folder.name); }

    function renderTab(folderId: string | null, label: string){
        const tabKey = folderId || "all";
        const isActive = folderId === props.selectedFolderId;

        const activeClass = isActive ? " active" : "";
        const dragOverClass = tabKey === props.dragOverTab ? " drag-over" : "";
        const className = "folder-tab" + activeClass + dragOverClass;

        function clickTabACB(){ props.onFolderClick(folderId); }

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

        const deleting = folderId !== null && props.busyFolderIds.includes(folderId);

        function deleteFolderACB(evt: MouseEvent<HTMLSpanElement>){
            evt.stopPropagation();
            if (deleting) return;
            const confirmed = window.confirm("Delete folder \"" + label + "\"? Its canvases stay in All.");
            if (confirmed && folderId) props.onDeleteFolder(folderId);
        }

        return (
            <button key={tabKey} className={className} onClick={clickTabACB}
                    onDragOver={dragOverACB} onDragLeave={dragLeaveACB} onDrop={dropACB}>
                {label}
                {folderId && isActive && !deleting &&
                    <span className="folder-delete" title="Delete folder" onClick={deleteFolderACB}>×</span>}
                {deleting && <span className="spinner spinner-small folder-spinner" role="status" aria-label="Deleting folder"></span>}
            </button>
        );
    }

    function renderNewFolder(){
        if (!props.newFolderOpen)
            return <button className="folder-add" title="New folder" onClick={props.onNewFolderOpen}>+</button>;

        function nameChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onNewFolderNameChange(evt.target.value); }
        function keyDownACB(evt: KeyboardEvent<HTMLInputElement>){
            if (props.creatingFolder) return;
            if (evt.key === "Enter") props.onNewFolderCreate();
            if (evt.key === "Escape") props.onNewFolderCancel();
        }

        return (
            <>
                <input className="folder-name-input" placeholder="Folder name" autoFocus
                       aria-label="New folder name" aria-invalid={Boolean(props.newFolderError)}
                       readOnly={props.creatingFolder} aria-busy={props.creatingFolder}
                       value={props.newFolderName} onChange={nameChangeACB}
                       onKeyDown={keyDownACB} onBlur={props.onNewFolderLeave}/>
                {props.creatingFolder && <span className="spinner spinner-small" role="status" aria-label="Creating folder"></span>}
                {props.newFolderError && <span className="field-error" role="alert">{props.newFolderError}</span>}
            </>
        );
    }

    function cardCB(canvas: Canvas){
        const busy = props.busyCanvasIds.includes(canvas._id);
        const thumb = getThumbnail(canvas._id);

        function clickCardACB(){ props.onCardClick(canvas); }
        function dragStartACB(evt: DragEvent<HTMLDivElement>){
            evt.dataTransfer.setData("text/plain", canvas._id);
            evt.dataTransfer.effectAllowed = "move";
        }
        function dragEndACB(){ props.onDragOverTab(null); }

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

                <div className="card-preview">
                    {thumb && <img className="card-thumbnail" src={thumb} alt="" aria-hidden="true"/>}
                </div>

                <div className="card-info">
                    <div className="card-name">{canvas.name}</div>
                    <div className="card-date">Updated {formatDate(canvas.updatedAt)}</div>
                    <div className="card-shared">{canvas.isShared ? "Shared" : "Private"}</div>
                </div>

                {busy && <div className="spinner spinner-small" role="status" aria-label="Saving"></div>}
            </div>
        );
    }
}
