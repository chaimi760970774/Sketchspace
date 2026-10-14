import "/style.css"

interface CanvasStatusViewProps {
    loading?: boolean;          // true: spinner with the message; false: the title, message and buttons
    title?: string;
    message?: string;
    onRetry?: () => void;       // no Retry button when missing
    onHome?: () => void;
}

// full page shown instead of the canvas while it is being created / opened, or when that failed
export function CanvasStatusView(props: CanvasStatusViewProps){
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
