import type { Model, Toast, ToastType } from "./types.ts";

// short message at the bottom of the screen, telling the user how an action went

interface ToastState {
    toast: Toast | null;        // null = nothing shown
}

const initialState: ToastState = {
    toast: null,
};

export const toastModel = {

    // ========== Page state ==========

    ...initialState,



    // ========== Methods ==========

    // the toast hides itself after a few seconds
    showToast(message: string, type: ToastType): void {
        const id = crypto.randomUUID();
        this.toast = { id: id, message: message, type: type };

        const model = this;
        function hideLaterACB(){ model.hideToast(id); }
        setTimeout(hideLaterACB, 3000);
    },

    // only hides the toast with this id, so the timer of an older toast does not close a newer one
    hideToast(id: string): void {
        if (this.toast && this.toast.id === id) this.toast = null;
    },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
