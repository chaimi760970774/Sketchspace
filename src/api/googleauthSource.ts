// "Sign in with Google" (Google Identity Services). Google draws its own button; when the user picks an
// account it gives us an ID token, which the server checks (see loginWithGoogle in authSource.ts).

// the small part of Google's script that is used here
interface GoogleIdentity {
    accounts: {
        id: {
            initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
            renderButton(parent: HTMLElement, options: { type: string; theme: string; size: string; text: string; width: number }): void;
        };
    };
}

declare global {
    interface Window {
        google?: GoogleIdentity;        // set by Google's script once it has loaded
    }
}

const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

// without a client id there is nothing to show, so the login page hides the Google button
export const isGoogleConfigured: boolean = CLIENT_ID !== "";

// Mutation is intended here: Google's script must be added to the page only once, so the promise of
// the first load is remembered and every later call reuses it.
const scriptLoad: { promise: Promise<void> | null } = { promise: null };

function loadGoogleScript(): Promise<void> {
    if (scriptLoad.promise) return scriptLoad.promise;

    function executorACB(resolve: () => void, reject: (error: Error) => void): void {
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = function loadedACB(): void { resolve(); };
        script.onerror = function loadFailedACB(): void {
            scriptLoad.promise = null;      // allow a retry
            reject(new Error("Could not load Google sign-in, please check your connection"));
        };
        document.head.appendChild(script);
    }
    scriptLoad.promise = new Promise<void>(executorACB);
    return scriptLoad.promise;
}

// draws Google's button inside element; onCredential(idToken) is called when the user signs in
export function renderGoogleButton(element: HTMLElement, onCredential: (idToken: string) => void): Promise<void> {
    function scriptReadyACB(): void {
        const google = window.google;
        if (!google) throw new Error("Google sign-in did not start");
        function gotResponseACB(response: { credential: string }): void { onCredential(response.credential); }
        google.accounts.id.initialize({ client_id: CLIENT_ID, callback: gotResponseACB });
        google.accounts.id.renderButton(element, { type: "standard", theme: "outline", size: "large", text: "continue_with", width: 320 });
    }
    return loadGoogleScript().then(scriptReadyACB);
}
