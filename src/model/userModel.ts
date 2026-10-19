import { API_URL, setTokenOwner, getOwnedCanvasIds, claimCanvas } from "/src/api/canvasSource.ts";
import { register as registerRequest, login as loginRequest, loginWithGoogle as googleRequest, logout as logoutRequest, getSession, updateMe, requestPasswordReset as sendResetLinkRequest, resetPassword as resetPasswordRequest, uploadAvatar, deleteAvatar, deleteMe } from "/src/api/authSource.ts";
import { isGoogleConfigured, renderGoogleButton } from "/src/api/googleauthSource.ts";
import { resolvePromise } from "/src/utils/resolvePromise.ts";
import { resizeToSquare } from "/src/utils/resizeImage.ts";
import type { Model, ProfileField, ServerUser, User } from "./types.ts";

// simple check: something@something.something
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// same rule as the server: 2-30 characters, letters, digits, spaces and _ . -
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _.-]{2,30}$/u;

// same rule as the server: 8-128 characters with at least one letter and one digit
const PASSWORD_PATTERN = /^(?=.*\p{L})(?=.*\d).{8,128}$/u;

// someone who is not logged in: canvases are owned through this browser's owner tokens
const GUEST: User = { id: "guest", name: "Guest", email: "", photoURL: null, hasCustomPhoto: false };

// pictures uploaded here: what the server accepts (it checks the file itself too)
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;     // of the file chosen; what is sent is resized and far smaller
const PHOTO_SIZE = 256;                        // pixels: every profile photo is made PHOTO_SIZE x PHOTO_SIZE

// An uploaded picture is a path on the server ("/uploads/avatars/..."), so it needs the server's address to load
// from the page. A Google picture is already a full https link.
function toPhotoURL(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl) return null;
    return avatarUrl.startsWith("/") ? API_URL + avatarUrl : avatarUrl;
}

// the server's user, in the shape the pages use
function toUser(serverUser: ServerUser): User {
    return { id: serverUser.id, name: serverUser.displayName, email: serverUser.email, photoURL: toPhotoURL(serverUser.avatarUrl), hasCustomPhoto: Boolean(serverUser.hasCustomAvatar) };
}

interface UserState {
    // Data
    user: User;                 // the logged-in account, or a guest
    isLoggedIn: boolean;

    // Login and sign up share one form
    loginEmail: string;
    loginPassword: string;
    loginName: string;          // display name, only asked when signing up
    signingUp: boolean;
    loginError: string;         // why the last login / sign up failed, "" if it did not
    loggingIn: boolean;         // true while the request runs
    googleEnabled: boolean;     // false without a Google client id: the login page then has no Google button

    // Forgotten password: first an e-mail with a link is asked for, then the link opens the page to choose a new one
    resetEmail: string;
    resetNewPassword: string;
    resetError: string;         // why the last step failed, "" if it did not
    resetBusy: boolean;         // true while the request runs
    resetEmailSent: boolean;    // true once the server accepted the address

    // Profile
    editingField: ProfileField | null;      // field being edited, null = none
    profileDraft: string;                   // input value while editing
    savingPhoto: boolean;                   // true while a photo is uploaded or removed
}

const initialState: UserState = {
    user: { ...GUEST },
    isLoggedIn: false,
    loginEmail: "",
    loginPassword: "",
    loginName: "",
    signingUp: false,
    loginError: "",
    loggingIn: false,
    googleEnabled: isGoogleConfigured,
    resetEmail: "",
    resetNewPassword: "",
    resetError: "",
    resetBusy: false,
    resetEmailSent: false,
    editingField: null,
    profileDraft: "",
    savingPhoto: false,
};

// user, login, profile
export const userModel = {

    // ========== Data and page state ==========

    ...initialState,



    // ========== Methods ==========

    // Session
    // called once when the app starts: a login from an earlier visit may still be valid
    restoreSession(): Promise<void> {
        const model = this;
        return getSession().then(sessionACB).catch(failedACB);

        // the server answers 200 for a guest too (user is null), so a first visit prints no error in the console
        function sessionACB(serverUser: ServerUser | null): void { if (serverUser) model.setLoggedInUser(serverUser); }
        function failedACB(): void {}       // the server could not be reached: stay a guest
    },
    setLoggedInUser(serverUser: ServerUser): void {
        this.user = toUser(serverUser);
        this.isLoggedIn = true;
        this.switchedUser();
    },
    setGuest(): void {
        this.user = { ...GUEST };
        this.isLoggedIn = false;
        this.editingField = null;
        this.switchedUser();
    },
    // each user has their own owner tokens, so the canvas list has to be loaded again for the new user
    switchedUser(): void {
        const model = this;
        setTokenOwner(this.isLoggedIn ? this.user.id : null);
        this.canvases = [];
        this.myCanvasIds = [];
        // folders belong to the account: the next one loads its own
        this.folders = [];
        this.selectedFolderId = null;
        this.cancelNewFolder();
        resolvePromise(null, this.foldersPromiseState);
        if (!this.isLoggedIn) {
            this.loadCanvases();
            return;
        }
        // e.g. after a page refresh My Work opened before the login was restored: load the account's folders now
        this.loadFolders();
        // canvases this account made before the server knew accounts (held by owner token) become the account's
        function claimCB(canvasId: string): Promise<unknown> { return claimCanvas(canvasId).catch(ignoreCB); }
        function ignoreCB(): void {}      // deleted, or already someone else's: nothing to do
        function loadCB(): void { model.loadCanvases(); }
        Promise.all(getOwnedCanvasIds().map(claimCB)).then(loadCB);
    },

    // Login and sign up
    setLoginEmail(email: string): void { this.loginEmail = email; this.loginError = ""; },
    setLoginPassword(password: string): void { this.loginPassword = password; this.loginError = ""; },
    setLoginName(name: string): void { this.loginName = name; this.loginError = ""; },
    toggleSignUp(): void {
        this.signingUp = !this.signingUp;
        this.loginError = "";
    },

    // resolves to true when the user is logged in, otherwise loginError says why
    submitLogin(): Promise<boolean> {
        if (this.loggingIn) return Promise.resolve(false);
        const model = this;
        const email = this.loginEmail.trim();
        const displayName = this.loginName.trim();
        if (!EMAIL_PATTERN.test(email)) return this.failLogin("Please enter a valid email, e.g. name@example.com");
        if (!this.loginPassword) return this.failLogin("Please enter your password");
        if (this.signingUp && !DISPLAY_NAME_PATTERN.test(displayName))
            return this.failLogin("Name must be 2-30 characters: letters, digits, spaces, _ . -");

        this.loggingIn = true;
        this.loginError = "";
        const sending = this.signingUp
            ? registerRequest({ email: email, password: this.loginPassword, displayName: displayName })
            : loginRequest({ email: email, password: this.loginPassword });
        return sending.then(loggedInACB).catch(failedACB).finally(doneACB);

        function loggedInACB(serverUser: ServerUser): boolean {
            model.setLoggedInUser(serverUser);
            model.resetLiveConnection();
            model.loginPassword = "";       // not kept once it is no longer needed
            model.showToast("Welcome, " + model.user.name, "success");
            return true;
        }
        function failedACB(error: Error): Promise<boolean> { return model.failLogin(error.message); }
        function doneACB(): void { model.loggingIn = false; }
    },
    failLogin(message: string): Promise<boolean> {
        this.loginError = message;
        return Promise.resolve(false);
    },

    // Forgotten password
    // the page starts empty, except that the e-mail typed on the login page is already filled in
    startPasswordReset(): void {
        this.resetEmail = this.loginEmail;
        this.resetNewPassword = "";
        this.resetError = "";
        this.resetEmailSent = false;
    },
    setResetEmail(email: string): void { this.resetEmail = email; this.resetError = ""; },
    setResetNewPassword(password: string): void { this.resetNewPassword = password; this.resetError = ""; },

    // asks for the e-mail with the link; resetEmailSent tells when the server accepted the address
    sendResetLink(): Promise<void> {
        if (this.resetBusy) return Promise.resolve();
        const model = this;
        const email = this.resetEmail.trim();
        if (!EMAIL_PATTERN.test(email)) {
            this.resetError = "Please enter a valid email, e.g. name@example.com";
            return Promise.resolve();
        }

        this.resetBusy = true;
        this.resetError = "";
        return sendResetLinkRequest(email).then(sentACB).catch(failedACB).finally(doneACB);

        function sentACB(): void { model.resetEmailSent = true; }
        function failedACB(error: Error): void { model.resetError = error.message; }
        function doneACB(): void { model.resetBusy = false; }
    },

    // token: from the link in the e-mail. Resolves to true when the password was changed (the user then logs in)
    chooseNewPassword(token: string): Promise<boolean> {
        if (this.resetBusy) return Promise.resolve(false);
        const model = this;
        if (!PASSWORD_PATTERN.test(this.resetNewPassword)) {
            this.resetError = "Password must be 8-128 characters and contain a letter and a digit";
            return Promise.resolve(false);
        }

        this.resetBusy = true;
        this.resetError = "";
        return resetPasswordRequest(token, this.resetNewPassword).then(changedACB).catch(failedACB).finally(doneACB);

        function changedACB(): boolean {
            model.resetNewPassword = "";       // not kept once it is no longer needed
            model.showToast("Password changed, you can log in now", "success");
            return true;
        }
        function failedACB(error: Error): boolean {
            model.resetError = error.message;
            return false;
        }
        function doneACB(): void { model.resetBusy = false; }
    },

    // "Log as guest": no account, canvases are owned through this browser (a login that is still open ends)
    continueAsGuest(): Promise<void> {
        const model = this;
        function guestACB(): void {
            model.setGuest();
            model.resetLiveConnection();
        }
        return logoutRequest().then(guestACB, guestACB);
    },
    logoutUser(): Promise<void> {
        const model = this;
        function loggedOutACB(): void {
            model.setGuest();
            model.resetLiveConnection();
            model.showToast("Logged out", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not log out: " + error.message, "error"); }
        return logoutRequest().then(loggedOutACB).catch(failedACB);
    },

    // Google draws its own sign-in button inside element, and calls onCredential(idToken) when the user signs in
    drawGoogleButton(element: HTMLElement, onCredential: (idToken: string) => void): void {
        const model = this;
        function failedACB(error: Error): void { model.loginError = error.message; }
        renderGoogleButton(element, onCredential).catch(failedACB);
    },

    // idToken: what Google gave after the user picked an account; the server checks it with Google
    // resolves to true when the user is logged in, otherwise loginError says why
    loginWithGoogle(idToken: string): Promise<boolean> {
        if (this.loggingIn) return Promise.resolve(false);
        const model = this;
        this.loggingIn = true;
        this.loginError = "";
        return googleRequest(idToken).then(loggedInACB).catch(failedACB).finally(doneACB);

        function loggedInACB(serverUser: ServerUser): boolean {
            model.setLoggedInUser(serverUser);
            model.resetLiveConnection();
            model.showToast("Welcome, " + model.user.name, "success");
            return true;
        }
        function failedACB(error: Error): Promise<boolean> { return model.failLogin(error.message); }
        function doneACB(): void { model.loggingIn = false; }
    },

    // Profile
    startEdit(field: ProfileField): void {
        this.editingField = field;
        this.profileDraft = this.user[field];
    },
    setProfileDraft(text: string): void { this.profileDraft = text; },

    // error message for the field being edited, empty if the draft can be saved
    getProfileError(): string {
        const value = this.profileDraft.trim();
        if (this.editingField === "name" && !DISPLAY_NAME_PATTERN.test(value))
            return "Name must be 2-30 characters: letters, digits, spaces, _ . -";
        return "";
    },

    // true if the user typed something that is not saved yet
    hasUnsavedDraft(): boolean {
        if (!this.editingField) return false;
        return this.profileDraft !== this.user[this.editingField];
    },

    // only the name can be changed; the server keeps the email
    saveEdit(): Promise<void> {
        if (!this.editingField || this.getProfileError() || !this.isLoggedIn) return Promise.resolve();
        const model = this;
        const name = this.profileDraft.trim();
        if (name === this.user.name) {
            this.editingField = null;
            return Promise.resolve();
        }
        return updateMe({ displayName: name }).then(savedACB).catch(failedACB);

        function savedACB(serverUser: ServerUser): void {
            model.user = { ...model.user, name: toUser(serverUser).name };
            model.editingField = null;
            model.showToast("Name saved", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not save the name: " + error.message, "error"); }
    },
    setUserPhoto(serverUser: ServerUser): void {
        this.user = { ...this.user, photoURL: toPhotoURL(serverUser.avatarUrl), hasCustomPhoto: Boolean(serverUser.hasCustomAvatar) };
    },

    // the picture is saved on the server, so it is still there after a refresh or on another device
    uploadPhoto(file: File): Promise<void> {
        if (!this.isLoggedIn) {
            this.showToast("Log in to save a profile photo", "info");
            return Promise.resolve();
        }
        if (!PHOTO_TYPES.includes(file.type)) {
            this.showToast("Please choose a PNG, JPEG or WebP image", "error");
            return Promise.resolve();
        }
        if (file.size > MAX_PHOTO_BYTES) {
            this.showToast("The image is too large, 10 MB at most", "error");
            return Promise.resolve();
        }
        const model = this;
        return resizeToSquare(file, PHOTO_SIZE).then(uploadAvatar).then(savedACB).catch(failedACB);

        function savedACB(serverUser: ServerUser): void {
            model.setUserPhoto(serverUser);
            model.showToast("Profile photo updated", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not upload the photo: " + error.message, "error"); }
    },

    deletePhoto(): Promise<void> {
        if (!this.isLoggedIn || !this.user.hasCustomPhoto) return Promise.resolve();
        const model = this;
        return deleteAvatar().then(deletedACB).catch(failedACB);

        function deletedACB(serverUser: ServerUser): void {
            model.setUserPhoto(serverUser);
            model.showToast("Profile photo removed", "success");
        }
        function failedACB(error: Error): void { model.showToast("Could not remove the photo: " + error.message, "error"); }
    },

    // deletes the account on the server (with its canvases and folders) and goes back to being a guest
    deleteAccount(): Promise<boolean> {
        if (!this.isLoggedIn) return Promise.resolve(false);
        const model = this;
        return deleteMe().then(deletedACB).catch(failedACB);

        function deletedACB(): boolean {
            model.setGuest();
            model.resetLiveConnection();
            model.showToast("Your account was deleted", "success");
            return true;
        }
        function failedACB(error: Error): boolean {
            model.showToast("Could not delete the account: " + error.message, "error");
            return false;
        }
    },

} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
