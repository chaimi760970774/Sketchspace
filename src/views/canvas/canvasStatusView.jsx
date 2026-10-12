import "/style.css"

// full page shown instead of the canvas while it is being created / opened, or when that failed
export function CanvasStatusView(props){
    if (props.loading)
        return (
            <div className="canvas-status">
                <div className="spinner" role="status" aria-label={props.message}></div>
                <div>{props.message}</div>
            </div>
        );

    return (
        <div className="canvas-status" role="alert">
            <h2>{props.title}</h2>
            {props.message && <div>{props.message}</div>}
            <div className="canvas-status-buttons">
                {props.onRetry && <button className="small-button" onClick={props.onRetry}>Retry</button>}
                <button className="small-button" onClick={props.onHome}>Back to home</button>
            </div>
        </div>
    );
}
