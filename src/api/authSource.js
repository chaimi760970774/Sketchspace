import { request, withJson } from "/src/api/canvasSource.js";

// Accounts. The server sets an httpOnly cookie on register and login; the browser sends it with every request.
// A user: { id, email, displayName, avatarUrl?, createdAt }

// resolves to the new user, who is logged in right away
export function register({ email, password, displayName }){
    return request("/api/auth/register", withJson("POST", { email: email, password: password, displayName: displayName })).then(getUserACB);
}

// resolves to the user
export function login({ email, password }){
    return request("/api/auth/login", withJson("POST", { email: email, password: password })).then(getUserACB);
}

export function logout(){
    return request("/api/auth/logout", { method: "POST" });
}

// the logged-in user; rejects with status 401 when there is no valid login
export function getMe(){
    return request("/api/users/me");
}

// changes: { displayName?, avatarUrl? } (avatarUrl is an https URL, or null to remove it); resolves to the user
export function updateMe(changes){
    return request("/api/users/me", withJson("PUT", changes));
}

function getUserACB(data){ return data.user; }
