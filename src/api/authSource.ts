import { request, withJson } from "/src/api/canvasSource.ts";
import type { ServerUser } from "/src/model/types.ts";

// Accounts. The server sets an httpOnly cookie on register and login; the browser sends it with every request.

interface UserResponse {
    user: ServerUser;
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

// avatarUrl is an https URL, or null to remove it
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

export function logout(): Promise<unknown> {
    return request<unknown>("/api/auth/logout", { method: "POST" });
}

// who is logged in right now: the user, or null for a guest. Unlike getMe it never answers 401, so
// nothing shows up as an error in the browser console when someone who is not logged in opens the app
export function getSession(): Promise<ServerUser | null> {
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

function getUserACB(data: UserResponse): ServerUser { return data.user; }
function getSessionUserACB(data: SessionResponse): ServerUser | null { return data.user; }
