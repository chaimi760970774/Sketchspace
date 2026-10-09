import "/style.css"

export function MyWorkView(props){
    return (
        <div className="page-content">
            <button className="new-canvas-big" onClick={props.onNewCanvas}>+</button>

            <input className="search-input" placeholder="Search"
                   value={props.searchText} onChange={searchChangeACB}/>

            <div className="folder-bar">
                <div className="folder-tabs">
                    {renderTab(null, "All")}
                    {props.folders.map(folderTabCB)}
                </div>
                {renderNewFolder()}
            </div>

            {props.canvases.length === 0 && <div className="empty-text">{emptyText()}</div>}

            <div className="card-list">
                {props.canvases.map(cardCB)}
            </div>
        </div>
    );

    function searchChangeACB(evt){ props.onSearchChange(evt.target.value); }

    function emptyText(){
        if (props.searchText) return "No canvas found";
        if (props.selectedFolderId) return "Drag a canvas onto this folder to add it";
        return "No canvas yet";
    }

    // Folder tabs
    function folderTabCB(folder){ return renderTab(folder.id, folder.name); }

    // folderId null is the "All" tab; dropping a canvas on it takes the canvas out of its folder
    function renderTab(folderId, label){
        const tabKey = folderId || "all";
        const isActive = folderId === props.selectedFolderId;

        let className = "folder-tab";
        if (isActive) className += " active";
        if (tabKey === props.dragOverTab) className += " drag-over";

        function clickTabACB(){ props.onFolderClick(folderId); }

        // preventDefault on dragover is what allows dropping here
        function dragOverACB(evt){
            evt.preventDefault();
            if (props.dragOverTab !== tabKey) props.onDragOverTab(tabKey);
        }
        function dragLeaveACB(){ props.onDragOverTab(null); }
        function dropACB(evt){
            evt.preventDefault();
            const canvasId = evt.dataTransfer.getData("text/plain");
            props.onDragOverTab(null);
            if (canvasId) props.onMoveCanvas(canvasId, folderId);
        }

        function deleteFolderACB(evt){
            evt.stopPropagation();      // do not also open the tab
            props.onDeleteFolder(folderId);
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

    // "+" button, or the name input after clicking it (Enter creates, Esc cancels)
    function renderNewFolder(){
        if (!props.newFolderOpen)
            return <button className="folder-add" title="New folder" onClick={props.onNewFolderOpen}>+</button>;

        function nameChangeACB(evt){ props.onNewFolderNameChange(evt.target.value); }
        function keyDownACB(evt){
            if (evt.key === "Enter") props.onNewFolderCreate();
            if (evt.key === "Escape") props.onNewFolderCancel();
        }

        return <input className="folder-name-input" placeholder="Folder name" autoFocus
                      value={props.newFolderName} onChange={nameChangeACB}
                      onKeyDown={keyDownACB} onBlur={props.onNewFolderCreate}/>;
    }

    // Canvas cards (draggable onto folder tabs)
    function cardCB(canvas){
        function clickCardACB(){ props.onCardClick(canvas); }
        function dragStartACB(evt){
            evt.dataTransfer.setData("text/plain", canvas.id);
            evt.dataTransfer.effectAllowed = "move";
        }
        function dragEndACB(){ props.onDragOverTab(null); }     // also clears the highlight if dropped elsewhere

        return (
            <div key={canvas.id} className="card-item" draggable
                 onClick={clickCardACB} onDragStart={dragStartACB} onDragEnd={dragEndACB}>
                {canvas.title}
            </div>
        );
    }
}
