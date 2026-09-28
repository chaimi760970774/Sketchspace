import { Gallery } from "./galleryPresenter.jsx";
import { MyWork } from "./myWorkPresenter.jsx";
import { Profile } from "./profilePresenter.jsx";
import { Canvas } from "./canvasPresenter.jsx";
import { Login } from "./loginPresenter.jsx";
import { Sidebar } from "./sidebarPresenter.jsx";

import { observer } from "mobx-react-lite";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";


const ReactRoot = observer(
    function ReactRoot(props){
        return (
            <div>
                <RouterProvider router={makeRouter(props.model)}/>
            </div>
        );
    }
);


function LayoutWithSidebar({model}) {
    return (
        <div>
            <Sidebar model={model} />
            <Outlet />
        </div>
    );
}


export function makeRouter(model){
    return createHashRouter([
        {
            path: "/",
            element: <LayoutWithSidebar model={model} />,
            children: [
                {
                    index: true,
                    element: <Gallery model={model} />,
                },
                {
                    path: "gallery",
                    element: <Gallery model={model} />,
                },
                {
                    path: "mywork",
                    element: <MyWork model={model} />,
                },
                {
                    path: "profile",
                    element: <Profile model={model} />,
                },
            ],
        },
        {
            path: "/login",
            element: <Login model={model} />,
        },
        {
            path: "/canvas",
            element: <Canvas model={model} />,
        },
    ]);
}


export { ReactRoot }