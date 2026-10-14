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
    savingPhoto: boolean;               // true while the photo is uploaded or removed
    onModify: (field: ProfileField) => void;
    onDraftChange: (text: string) => void;
    onSave: () => void;
    onPhotoUpload: (file: File) => void;
    onPhotoRemove: () => void;
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
                <div className="profile-avatar-box">
                    {props.user.photoURL
                        ? <img className="profile-avatar" src={props.user.photoURL} alt="Profile photo"/>
                        : <div className="profile-avatar"></div>}
                    {props.savingPhoto && <div className="spinner profile-avatar-spinner" role="status" aria-label="Saving photo"></div>}
                </div>

                <div className="profile-name">{props.user.name}</div>

                {props.isLoggedIn
                    ? <div className="profile-photo-actions">
                          <label className={props.savingPhoto ? "upload-label disabled" : "upload-label"}>
                              Upload photo
                              <input type="file" accept="image/*" disabled={props.savingPhoto} onChange={photoChangeACB}/>
                          </label>
                          {props.user.photoURL &&
                              <button className="pill-button" disabled={props.savingPhoto} onClick={props.onPhotoRemove}>Remove photo</button>}
                      </div>
                    : <div className="profile-value">Log in to upload a profile photo</div>}
            </div>

            {fields.map(fieldRowCB)}

            {props.isLoggedIn
                ? <button className="pill-button" onClick={props.onLogout}>Log out</button>
                : <button className="pill-button" onClick={props.onLogin}>Log in or sign up</button>}
        </div>
    );

    function photoChangeACB(evt: ChangeEvent<HTMLInputElement>){
        const file = evt.target.files?.[0];
        // clear the input so picking the same file again (e.g. after an error) still fires onChange;
        // the file input can only be reset by changing its value
        evt.target.value = "";
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