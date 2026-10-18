import "/style.css"
import { LogoView } from "/src/views/logoView.tsx";

interface SidebarViewProps {
    currentPath: string;
    onLogoClick: () => void;
    onGalleryClick: () => void;
    onProfileClick: () => void;
}

export function SidebarView(props: SidebarViewProps){
    const isGallery = props.currentPath === "/" || props.currentPath === "/gallery";
    const isProfile = props.currentPath === "/profile";

    return (
        <div className="sidebar">
            <LogoView onClick={props.onLogoClick}/>
            <button className={itemClass(isGallery)} onClick={props.onGalleryClick}>Gallery</button>
            <button className={itemClass(isProfile)} onClick={props.onProfileClick}>Profile</button>
        </div>
    );

    // highlight the current page
    function itemClass(isActive: boolean){
        return isActive ? "sidebar-item active" : "sidebar-item";
    }
}