import "/style.css"
import { LogoView } from "/src/views/logoView.jsx";

export function SidebarView(props){
    const isGallery = props.currentPath === "/" || props.currentPath === "/gallery";
    const isMyWork = props.currentPath === "/mywork";
    const isProfile = props.currentPath === "/profile";

    return (
        <div className="sidebar">
            <LogoView onClick={props.onLogoClick}/>
            <button className={itemClass(isGallery)} onClick={props.onGalleryClick}>gallery</button>
            <button className={itemClass(isMyWork)} onClick={props.onMyWorkClick}>My Work</button>
            <button className={itemClass(isProfile) + " sidebar-bottom"} onClick={props.onProfileClick}>Profile</button>
        </div>
    );

    // highlight the current page
    function itemClass(isActive){
        return isActive ? "sidebar-item active" : "sidebar-item";
    }
}