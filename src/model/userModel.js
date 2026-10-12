// simple check: something@something.something
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_LABELS = { name: "Name", email: "Email" };

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

    // error message for the field being edited, empty if the draft can be saved
    getProfileError(){
        const value = this.profileDraft.trim();
        if (this.editingField === "name" && !value) return "Name cannot be empty";
        if (this.editingField === "email" && !EMAIL_PATTERN.test(value)) return "Please enter a valid email, e.g. name@example.com";
        return "";
    },

    // true if the user typed something that is not saved yet
    hasUnsavedDraft(){
        if (!this.editingField) return false;
        return this.profileDraft !== this.user[this.editingField];
    },

    saveEdit(){
        if (!this.editingField || this.getProfileError()) return;
        const field = this.editingField;
        this.user = { ...this.user, [field]: this.profileDraft.trim() };
        this.editingField = null;
        this.showToast(FIELD_LABELS[field] + " saved", "success");
    },
    setPhotoURL(url){
        this.user = { ...this.user, photoURL: url };
        this.showToast("Profile photo updated", "success");
    },
};
