import "/style.css"
import type { ChangeEvent } from "react";
import type { ProfileField, User } from "/src/model/types.ts";
import { DefaultAvatar } from "/src/views/defaultAvatarView.tsx";

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

interface FieldRow {
    key: ProfileField;
    label: string;
    editable: boolean;
}

export function ProfileView(props: ProfileViewProps){
    const fields: FieldRow[] = [
        { key: "name", label: "Name", editable: props.isLoggedIn },
        { key: "email", label: "Email", editable: false },      // the server keeps the email
    ];

    return (
        <div className="profile-card">
            <div className="profile-header">
                {props.user.photoURL
                    ? <img className="profile-avatar" src={props.user.photoURL} alt="Profile photo" referrerPolicy="no-referrer"/>
                    : <DefaultAvatar/>}

                <div className="profile-name">{props.user.name}</div>

                {props.isLoggedIn && <label className="upload-label">
                    Upload photo
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={photoChangeACB}/>
                </label>}

                {props.isLoggedIn && props.user.hasCustomPhoto
                    && <button className="pill-button" onClick={clickDeletePhotoACB}>Remove photo</button>}
            </div>

            {fields.map(fieldRowCB)}

            <div className="profile-row">
                <div className="profile-field">
                    <div>Appearance</div>
                </div>
                <div className="theme-toggle">
                    <button
                        className={"pill-button" + (props.theme === 'light' ? "" : " pill-button-outline")}
                        onClick={() => props.onThemeChange('light')}>
                        Light
                    </button>
                    <button
                        className={"pill-button" + (props.theme === 'dark' ? "" : " pill-button-outline")}
                        onClick={() => props.onThemeChange('dark')}>
                        Dark
                    </button>
                </div>
            </div>

            <div className="profile-actions">
                {props.isLoggedIn
                    ? <button className="pill-button" onClick={props.onLogout}>Log out</button>
                    : <button className="pill-button" onClick={props.onLogin}>Log in or sign up</button>}

                {props.isLoggedIn && <button className="pill-button danger-button" onClick={clickDeleteAccountACB}>Delete account</button>}
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

    function fieldRowCB(field: FieldRow){
        const isEditing = props.editingField === field.key;

        // ask first, so switching to another field does not silently throw away what was typed
        function clickModifyACB(){
            if (props.hasUnsavedDraft && !window.confirm("You have unsaved changes. Discard them?")) return;
            props.onModify(field.key);
        }
        function draftChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onDraftChange(evt.target.value); }

        return (
            <div key={field.key} className="profile-row">
                <div className="profile-field">
                    <div>{field.label}</div>
                    {isEditing
                        ? <input className="profile-input" aria-label={field.label} aria-invalid={Boolean(props.error)}
                                 value={props.draft} onChange={draftChangeACB}/>
                        : <div className="profile-value">{props.user[field.key]}</div>}
                    {isEditing && props.error && <div className="field-error">{props.error}</div>}
                </div>

                {isEditing && <button className="pill-button" disabled={Boolean(props.error)} onClick={props.onSave}>Save</button>}
                {!isEditing && field.editable && <button className="pill-button" onClick={clickModifyACB}>Modify</button>}
            </div>
        );
    }
}