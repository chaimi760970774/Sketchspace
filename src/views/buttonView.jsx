import "/style.css"

// a general button in the app's style
// props: onClick, children (the label), and optionally danger (red, for deleting), disabled, title, ariaLabel
export function ButtonView(props){
    const className = props.danger ? "small-button danger-button" : "small-button";

    return (
        <button type="button" className={className} disabled={props.disabled}
                title={props.title} aria-label={props.ariaLabel} onClick={props.onClick}>
            {props.children}
        </button>
    );
}
