import "/style.css"

interface LogoViewProps {
    onClick?: () => void;     // omit where there is nowhere to go (login page): renders a plain logo
}

// the Sketchspace logo, shared by the sidebar and the canvas page; clicking it goes home
export function LogoView(props: LogoViewProps){
    const mark = (
        <>
            {/* two overlapping shapes, like pieces of a collage */}
            <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="16" cy="18" r="12" fill="#f4a261"/>
                <polygon points="26,8 38,32 14,32" fill="none" stroke="#242424" strokeWidth="1.8" strokeDasharray="3 2.5" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">Sketchspace</span>
        </>
    );

    if (!props.onClick) return <div className="logo">{mark}</div>;
    return <button className="logo" aria-label="Sketchspace, go to home page" onClick={props.onClick}>{mark}</button>;
}
