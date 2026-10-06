// user, login, profile
export const userModel = {

    // ========== Fake data ==========

    // Current logged-in user (replace with the user returned by the login API later)
    user: {
        id: "u1",
        name: "Yuewei",
        email: "yuewei@example.com",
        photoURL: null,     // null shows an empty white avatar
    },



    // ========== Page state ==========

    // Login
    loginEmail: "",
    loginPassword: "",

    // Profile
    editingField: null,         // field being edited: "name" / "email" / null
    profileDraft: "",           // input value while editing



    // ========== Methods ==========

    // Login
    setLoginEmail(email){ this.loginEmail = email; },
    setLoginPassword(password){ this.loginPassword = password; },

    // Profile
    startEdit(field){
        this.editingField = field;
        this.profileDraft = this.user[field];
    },
    setProfileDraft(text){ this.profileDraft = text; },
    saveEdit(){
        this.user[this.editingField] = this.profileDraft;
        this.editingField = null;
    },
    setPhotoURL(url){ this.user.photoURL = url; },
};
