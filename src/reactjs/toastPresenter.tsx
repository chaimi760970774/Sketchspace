import { observer } from "mobx-react-lite";
import type { PresenterProps } from "/src/model/types.ts";
import { ToastView } from "/src/views/toastView.tsx";

const Toast = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Toast(props: PresenterProps){
        const toast = props.model.toast;
        if (!toast) return null;
        const toastId = toast.id;       // kept here, the handler below runs later

        return <ToastView message={toast.message}
                          type={toast.type}

                          onClose={handlerCloseACB}/>;

        function handlerCloseACB(){ props.model.hideToast(toastId); }
    }
);

export { Toast };
