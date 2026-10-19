import { request, withJson, getLoginToken, setLoginToken } from "/src/api/canvasSource.ts";
import type { ServerUser } from "/src/model/types.ts";

// Accounts. Register and login answer with the user and a login token; the token is kept (see canvasSource.ts) and sent with every request.

interface UserResponse {
    user: ServerUser;
    token: string;
}

// the answer of GET /api/auth/session: the user, or null for a guest
interface SessionResponse {
    user: ServerUser | null;
}

interface Registration {
    email: string;
    password: string;
    displayName: string;
}

interface Credentials {
    email: string;
    password: string;
}

// avatarUrl is an https URL, a data:image/png|jpeg|webp;base64 URL (at most 204800 characters), or null to remove it
interface UserChanges {
    displayName?: string;
    avatarUrl?: string | null;
}

// resolves to the new user, who is logged in right away
export function register({ email, password, displayName }: Registration): Promise<ServerUser> {
    return request<UserResponse>("/api/auth/register", withJson("POST", { email: email, password: password, displayName: displayName })).then(getUserACB);
}

// resolves to the user
export function login({ email, password }: Credentials): Promise<ServerUser> {
    return request<UserResponse>("/api/auth/login", withJson("POST", { email: email, password: password })).then(getUserACB);
}

// idToken: the "credential" Google gives after the user picks an account (see googleSource.ts)
// resolves to the user, who is logged in right away (a new account is made the first time)
export function loginWithGoogle(idToken: string): Promise<ServerUser> {
    return request<UserResponse>("/api/auth/google", withJson("POST", { idToken: idToken })).then(getUserACB);
}

// asks the server to e-mail a link for choosing a new password. It resolves for any valid address, whether or not
// an account has it: the server does not tell, so the form cannot be used to find out who has an account
export function requestPasswordReset(email: string): Promise<unknown> {
    return request<unknown>("/api/auth/forgot-password", withJson("POST", { email: email }));
}

// token: the one in the link from that e-mail. The link works once; the user logs in with the new password afterwards
export function resetPassword(token: string, password: string): Promise<unknown> {
    return request<unknown>("/api/auth/reset-password", withJson("POST", { token: token, password: password }));
}

// the token only lives in this browser, so forgetting it is the whole logout
export function logout(): Promise<unknown> {
    setLoginToken(null);
    return Promise.resolve();
}

// who is logged in right now: the user, or null for a guest. Unlike getMe it never answers 401, so
// nothing shows up as an error in the browser console when someone who is not logged in opens the app
export function getSession(): Promise<ServerUser | null> {
    if (!getLoginToken()) return Promise.resolve(null);       // never logged in here: nothing to ask
    return request<SessionResponse>("/api/auth/session").then(getSessionUserACB);
}

// the logged-in user; rejects with status 401 when there is no valid login
export function getMe(): Promise<ServerUser> {
    return request<ServerUser>("/api/users/me");
}

// resolves to the user
export function updateMe(changes: UserChanges): Promise<ServerUser> {
    return request<ServerUser>("/api/users/me", withJson("PUT", changes));
}

// sends the picture file itself as the request body (not JSON); the server saves it and resolves to the user
// with the new avatarUrl, a path on the server like "/uploads/avatars/..."
export function uploadAvatar(file: File): Promise<ServerUser> {
    return request<ServerUser>("/api/users/me/avatar", { method: "PUT", headers: { "Content-Type": file.type }, body: file });
}

// removes the avatar; resolves to the user
export function deleteAvatar(): Promise<ServerUser> {
    return request<ServerUser>("/api/users/me/avatar", { method: "DELETE" });
}

// deletes the logged-in account for good, with its canvases and folders
export function deleteMe(): Promise<unknown> {
    function forgetTokenACB(data: unknown): unknown {
        setLoginToken(null);
        return data;
    }
    return request<unknown>("/api/users/me", { method: "DELETE" }).then(forgetTokenACB);
}

// keeps the login token, so the next requests come as this user
function getUserACB(data: UserResponse): ServerUser {
    setLoginToken(data.token);
    return data.user;
}
// a token the server no longer accepts (expired, or the account is gone) is dropped
function getSessionUserACB(data: SessionResponse): ServerUser | null {
    if (!data.user) setLoginToken(null);
    return data.user;
}
