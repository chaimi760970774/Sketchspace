// short message at the bottom of the screen, telling the user how an action went
export const toastModel = {

    // ========== Page state ==========

    toast: null,                // { id, message, type: "success" / "error" / "info" }, null = nothing shown



    // ========== Methods ==========

    // the toast hides itself after a few seconds
    showToast(message, type){
        const id = crypto.randomUUID();
        this.toast = { id: id, message: message, type: type };

        const model = this;
        function hideLaterACB(){ model.hideToast(id); }
        setTimeout(hideLaterACB, 3000);
    },

    // only hides the toast with this id, so the timer of an older toast does not close a newer one
    hideToast(id){
        if (this.toast && this.toast.id === id) this.toast = null;
    },
};
