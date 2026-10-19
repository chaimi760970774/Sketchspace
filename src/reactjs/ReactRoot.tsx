import { Gallery } from "./galleryPresenter.tsx";
import { Profile } from "./profilePresenter.tsx";
import { Canvas } from "./canvasPresenter.tsx";
import { Login } from "./loginPresenter.tsx";
import { ResetPassword } from "./resetPasswordPresenter.tsx";
import { Sidebar } from "./sidebarPresenter.tsx";
import { Toast } from "./toastPresenter.tsx";

import { observer } from "mobx-react-lite";
import { createHashRouter, RouterProvider, Outlet } from "react-router-dom";
import type { Model, PresenterProps } from "/src/model/types.ts";

type Router = ReturnType<typeof createHashRouter>;

interface ReactRootProps {
    model: Model;
    router: Router;
}


// the router is made once in index.tsx and passed in, so it is not rebuilt on every render
const ReactRoot = observer(
    function ReactRoot(props: ReactRootProps){
        return (
            <div>
                <RouterProvider router={props.router}/>
                <Toast model={props.model}/>
            </div>
        );
    }
);


function LayoutWithSidebar({model}: PresenterProps) {
    return (
        <div className="layout">
            <Sidebar model={model} />
            <div className="main-content">
                <Outlet />
            </div>
        </div>
    );
}


export function makeRouter(model: Model): Router {
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
            // the link in the password reset e-mail opens this with ?token=...
            path: "/reset-password",
            element: <ResetPassword model={model} />,
        },
        {
            path: "/canvas",
            element: <Canvas model={model} />,
        },
        {
            path: "/canvas/:canvasId",
            element: <Canvas model={model} />,
        },
    ]);
}


export { ReactRoot }