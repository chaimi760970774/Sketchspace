import { observer } from "mobx-react-lite";
import { SidebarView } from "/src/views/sidebarView.jsx";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Sidebar(props){
        const navigate = useNavigate();
        const location = useLocation();

        return <SidebarView
            currentPath={location.pathname}
            onIconClick={() => navigate("/gallery")}
            onGalleryClick={() => navigate("/gallery")}
            onMyWorkClick={() => navigate("/mywork")}
            onProfileClick={() => navigate("/profile")}
        />;
    }
);

export { Sidebar };