import "/style.css"
import type { ChangeEvent } from "react";
import type { ProfileField, User } from "/src/model/types.ts";

interface ProfileViewProps {
    user: User;
    isLoggedIn: boolean;
    editingField: ProfileField | null;
    draft: string;
    error: string;
    hasUnsavedDraft: boolean;
    onModify: (field: ProfileField) => void;
    onDraftChange: (text: string) => void;
    onSave: () => void;
    onPhotoUpload: (file: File) => void;
    onLogin: () => void;
    onLogout: () => void;
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
                    ? <img className="profile-avatar" src={props.user.photoURL} alt="Profile photo"/>
                    : <div className="profile-avatar"></div>}

                <div className="profile-name">{props.user.name}</div>

                <label className="upload-label">
                    Upload photo
                    <input type="file" accept="image/*" onChange={photoChangeACB}/>
                </label>
            </div>

            {fields.map(fieldRowCB)}

            {props.isLoggedIn
                ? <button className="pill-button" onClick={props.onLogout}>Log out</button>
                : <button className="pill-button" onClick={props.onLogin}>Log in or sign up</button>}
        </div>
    );

    function photoChangeACB(evt: ChangeEvent<HTMLInputElement>){
        const file = evt.target.files?.[0];
        if (file) props.onPhotoUpload(file);
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