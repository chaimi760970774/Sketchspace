import "/style.css"

// the Sketchspace logo, shared by the sidebar and the canvas page; clicking it goes home
export function LogoView(props){
    return (
        <button className="logo" aria-label="Sketchspace, go to home page" onClick={props.onClick}>
            {/* two overlapping shapes, like pieces of a collage */}
            <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="16" cy="18" r="12" fill="#f4a261"/>
                <polygon points="26,8 38,32 14,32" fill="white" opacity="0.9"/>
            </svg>
            <span className="logo-text">Sketchspace</span>
        </button>
    );
}
