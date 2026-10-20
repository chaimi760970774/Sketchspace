import "/style.css"
import type { ChangeEvent } from "react";
import type { ProfileField, User } from "/src/model/types.ts";
import { DefaultAvatar } from "/src/views/defaultAvatarView.tsx";
import { Camera, Sun, Moon } from "lucide-react";

interface ProfileViewProps {
    user: User;
    isLoggedIn: boolean;
    editingField: ProfileField | null;
    draft: string;
    error: string;
    hasUnsavedDraft: boolean;
    savingPhoto: boolean;               // true while the photo is uploaded or removed
    theme: 'light' | 'dark';
    onModify: (field: ProfileField) => void;
    onDraftChange: (text: string) => void;
    onSave: () => void;
    onPhotoUpload: (file: File) => void;
    onPhotoDelete: () => void;
    onDeleteAccount: () => void;
    onLogin: () => void;
    onLogout: () => void;
    onThemeChange: (theme: 'light' | 'dark') => void;
}

export function ProfileView(props: ProfileViewProps){
    const isEditingName = props.editingField === "name";

    return (
        <div className="profile-card">

            {/* Section A — Header (peach background) */}
            <div className="profile-header">
                <div className="profile-avatar-box">
                    {props.user.photoURL
                        ? <img className="profile-avatar" src={props.user.photoURL} alt="Profile photo" referrerPolicy="no-referrer"/>
                        : <DefaultAvatar/>}
                    {props.savingPhoto && <div className="profile-avatar-spinner spinner spinner-small"/>}
                </div>

                <div className="profile-header-info">
                    <div className="profile-header-eyebrow">Your Account</div>
                    <h1 className="profile-header-name">{props.user.name}</h1>
                    <div className="profile-header-subtitle">Manage your personal details and preferences.</div>
                </div>

                {props.isLoggedIn && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <label className={"upload-photo-btn" + (props.savingPhoto ? " disabled" : "")}>
                            <Camera size={17}/>
                            Upload photo
                            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={photoChangeACB} disabled={props.savingPhoto}/>
                        </label>
                        {props.user.hasCustomPhoto && (
                            <button className="remove-photo-btn" onClick={clickDeletePhotoACB} disabled={props.savingPhoto}>
                                Remove photo
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Section B — Content rows */}
            <div className="profile-content">

                {/* Row 1 — Full Name */}
                <div className="profile-row">
                    <div className="profile-field">
                        <div className="profile-field-label">Full Name</div>
                        {isEditingName
                            ? <input className="profile-input" aria-label="Full name" aria-invalid={Boolean(props.error)}
                                     value={props.draft} onChange={draftChangeACB}/>
                            : <div className="profile-value">{props.user.name}</div>}
                        {isEditingName && props.error && <div className="field-error">{props.error}</div>}
                    </div>
                    {isEditingName
                        ? <button className="pill-button" disabled={Boolean(props.error)} onClick={props.onSave}>Save</button>
                        : props.isLoggedIn && <button className="pill-button" onClick={clickModifyNameACB}>Edit name</button>}
                </div>

                {/* Row 2 — Email Address (read-only) */}
                <div className="profile-row">
                    <div className="profile-field">
                        <div className="profile-field-label">Email Address</div>
                        <div className="profile-value">{props.user.email}</div>
                    </div>
                </div>

                {/* Row 3 — Appearance */}
                <div className="profile-row">
                    <div className="profile-field">
                        <div className="profile-field-label">Appearance</div>
                        <div className="profile-field-sublabel">Choose how your account looks</div>
                    </div>
                    <div className="appearance-toggle">
                        <button
                            className={"appearance-toggle-btn" + (props.theme === 'light' ? " active" : "")}
                            onClick={() => props.onThemeChange('light')}>
                            <Sun size={17}/>
                            Light
                        </button>
                        <button
                            className={"appearance-toggle-btn" + (props.theme === 'dark' ? " active" : "")}
                            onClick={() => props.onThemeChange('dark')}>
                            <Moon size={17}/>
                            Dark
                        </button>
                    </div>
                </div>

            </div>

            {/* Section C — Footer */}
            <div className="profile-footer">
                <div className="profile-footer-text">{props.isLoggedIn ? "Need a break? You can log back in at any time." : "Sign up or log in to save your creations."}</div>
                <div className="profile-footer-actions">
                    {props.isLoggedIn
                        ? <>
                            <button className="pill-button-white" onClick={props.onLogout}>Log out</button>
                            <button className="pill-button danger-button" onClick={clickDeleteAccountACB}>Delete account</button>
                          </>
                        : <button className="pill-button" onClick={props.onLogin}>Log in or sign up</button>}
                </div>
            </div>

        </div>
    );

    function photoChangeACB(evt: ChangeEvent<HTMLInputElement>){
        const file = evt.target.files?.[0];
        evt.target.value = "";      // so choosing the same file again still counts as a change
        if (file) props.onPhotoUpload(file);
    }

    function clickDeletePhotoACB(){
        if (window.confirm("Remove your uploaded photo?")) props.onPhotoDelete();
    }

    function clickDeleteAccountACB(){
        if (window.confirm("Delete your account? Your canvases and folders are deleted too. This cannot be undone.")) props.onDeleteAccount();
    }

    function clickModifyNameACB(){
        if (props.hasUnsavedDraft && !window.confirm("You have unsaved changes. Discard them?")) return;
        props.onModify("name");
    }

    function draftChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onDraftChange(evt.target.value); }
}
