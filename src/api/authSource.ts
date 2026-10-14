import { request, withJson } from "/src/api/canvasSource.ts";
import type { ServerUser } from "/src/model/types.ts";

// Accounts. The server sets an httpOnly cookie on register and login; the browser sends it with every request.

interface UserResponse {
    user: ServerUser;
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

export function logout(): Promise<unknown> {
    return request<unknown>("/api/auth/logout", { method: "POST" });
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
