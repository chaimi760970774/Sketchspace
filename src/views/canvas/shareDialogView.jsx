import "/style.css"

// popup opened by the Share button: the canvas id to give to other people
export function ShareDialogView(props){
    return (
        // clicking the dark background closes the popup
        <div className="modal-overlay" onClick={props.onClose}>
            <div className="modal share-modal" role="dialog" aria-label="Share this canvas" onClick={stopClickACB}>
                <div className="modal-header">
                    <span>Share this canvas</span>
                    <button className="icon-button" aria-label="Close" onClick={props.onClose}>×</button>
                </div>

                <p>Send this canvas id to anyone. They paste it into <b>Join canvas</b> on the Gallery page to draw with you.</p>

                <div className="share-id-row">
                    <input className="search-input" readOnly aria-label="Canvas id" value={props.canvasId} onFocus={focusACB}/>
                    <button className="small-button" onClick={props.onCopy}>{props.copied ? "Copied ✓" : "Copy"}</button>
                </div>

                {props.isOwner &&
                    <div className="share-private-row">
                        <button className="small-button danger-button" disabled={props.busy} onClick={props.onMakePrivate}>Make private</button>
                        <span className="coming-soon">Stops sharing and removes everyone else from the canvas</span>
                    </div>}
            </div>
        </div>
    );

    function stopClickACB(evt){ evt.stopPropagation(); }
    function focusACB(evt){ evt.target.select(); }
}
