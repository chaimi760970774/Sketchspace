import "/style.css"

export function CanvasView(props){
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
                    <button className="icon-button" onClick={props.onUndo}>←</button>
                    <button className="icon-button" onClick={props.onRedo}>→</button>

                    <div className="topbar-right">
                        <button className="small-button" onClick={props.onSave}>Save</button>
                        <button className="small-button" onClick={props.onExport}>Export</button>
                        <button className="small-button" onClick={props.onShare}>Share</button>
                    </div>
                </div>

                {/* drawing area, replace with <canvas> later */}
                <div className="canvas-area"></div>
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
}