import { Link } from "react-router-dom";

export function SidebarView(props) {
    return (
        <div>
            <Link to="/gallery">gallery</Link>
            <Link to="/mywork">My Work</Link>
            <Link to="/profile">Profile</Link>
        </div>
    );
}