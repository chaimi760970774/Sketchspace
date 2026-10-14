import { setTokenOwner, getOwnedCanvasIds, claimCanvas } from "/src/api/canvasSource.ts";
import { register as registerRequest, login as loginRequest, logout as logoutRequest, getMe, updateMe } from "/src/api/authSource.ts";
import type { Model, ProfileField, ServerUser, User } from "./types.ts";

// simple check: something@something.something
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// same rule as the server: 2-30 characters, letters, digits, spaces and _ . -
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N} _.-]{2,30}$/u;

// someone who is not logged in: canvases are owned through this browser's owner tokens
const GUEST: User = { id: "guest", name: "Guest", email: "", photoURL: null };

// the server's user, in the shape the pages use
function toUser(serverUser: ServerUser): User {
    return { id: serverUser.id, name: serverUser.displayName, email: serverUser.email, photoURL: serverUser.avatarUrl || null };
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

    // Profile
    editingField: ProfileField | null;      // field being edited, null = none
    profileDraft: string;                   // input value while editing
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
    editingField: null,
    profileDraft: "",
};

// user, login, profile
export const userModel = {

    // ========== Data and page state ==========

    ...initialState,



    // ========== Methods ==========

    // Session
    // called once when the app starts: a login cookie from an earlier visit may still be valid
    restoreSession(): Promise<void> {
        const model = this;
        return getMe().then(loggedInACB).catch(notLoggedInACB);

        function loggedInACB(serverUser: ServerUser): void { model.setLoggedInUser(serverUser); }
        function notLoggedInACB(): void {}      // 401 = nobody logged in; anything else: stay a guest
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
        if (!this.isLoggedIn) {
            this.loadCanvases();
            return;
        }
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
    googleLogin(): void {
        this.showToast("Google sign-in is not set up yet", "info");
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
    setPhotoURL(url: string): void {
        this.user = { ...this.user, photoURL: url };
        this.showToast("Profile photo updated", "success");
    },

    // local preview only: the server keeps an avatar as an https link, not an uploaded file
    uploadPhoto(file: File): void {
        const oldURL = this.user.photoURL;
        this.setPhotoURL(URL.createObjectURL(file));
        // a "blob:" URL keeps the old file in memory until it is revoked; other URLs are left alone
        if (oldURL && oldURL.startsWith("blob:")) URL.revokeObjectURL(oldURL);
    },
} satisfies ThisType<Model>;    // inside the methods, `this` is the whole merged model
