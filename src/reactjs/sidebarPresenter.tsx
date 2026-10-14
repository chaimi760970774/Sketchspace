import { observer } from "mobx-react-lite";
import type { PresenterProps } from "/src/model/types.ts";
import { SidebarView } from "/src/views/sidebarView.tsx";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Sidebar(props: PresenterProps){
        const navigate = useNavigate();
        const location = useLocation();

        return <SidebarView
            currentPath={location.pathname}
            onLogoClick={() => navigate("/")}
            onGalleryClick={() => navigate("/gallery")}
            onMyWorkClick={() => navigate("/mywork")}
            onProfileClick={() => navigate("/profile")}
        />;
    }
);

export { Sidebar };