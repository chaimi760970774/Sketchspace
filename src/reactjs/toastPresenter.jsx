import { observer } from "mobx-react-lite";
import { ToastView } from "/src/views/toastView.jsx";

const Toast = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Toast(props){
        const toast = props.model.toast;
        if (!toast) return null;

        return <ToastView message={toast.message}
                          type={toast.type}

                          onClose={handlerCloseACB}/>;

        function handlerCloseACB(){ props.model.hideToast(toast.id); }
    }
);

export { Toast };
