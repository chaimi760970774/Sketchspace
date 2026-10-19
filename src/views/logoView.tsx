import "/style.css"

interface LogoViewProps {
    onClick: () => void;
}

// the two overlapping shapes of the logo, like pieces of a collage
export function LogoMark(props: { className?: string }){
    return (
        <svg className={props.className} viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="16" cy="18" r="12" fill="#f4a261"/>
            <polygon points="26,8 38,32 14,32" fill="white" opacity="0.9"/>
        </svg>
    );
}

// the Sketchspace logo, shared by the sidebar and the canvas page; clicking it goes home
export function LogoView(props: LogoViewProps){
    return (
        <button className="logo" aria-label="Sketchspace, go to home page" onClick={props.onClick}>
            <LogoMark className="logo-mark"/>
            <span className="logo-text">Sketchspace</span>
        </button>
    );
}
