import "/style.css"

export function ToastView(props){
    // screen readers read "alert" messages right away, "status" messages when they are free
    const role = props.type === "error" ? "alert" : "status";

    return (
        <div className={"toast toast-" + props.type} role={role}>
            <span>{props.message}</span>
            <button className="toast-close" aria-label="Close message" onClick={props.onClose}>×</button>
        </div>
    );
}
