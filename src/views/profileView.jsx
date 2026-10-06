import "/style.css"

export function ProfileView(props){
    const fields = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
    ];

    return (
        <div className="profile-card">
            <div className="profile-header">
                {props.user.photoURL
                    ? <img className="profile-avatar" src={props.user.photoURL}/>
                    : <div className="profile-avatar"></div>}

                <div className="profile-name">{props.user.name}</div>

                <label className="upload-label">
                    Upload photo
                    <input type="file" accept="image/*" onChange={photoChangeACB}/>
                </label>
            </div>

            {fields.map(fieldRowCB)}
        </div>
    );

    function photoChangeACB(evt){
        const file = evt.target.files[0];
        if (file) props.onPhotoUpload(file);
    }

    function fieldRowCB(field){
        const isEditing = props.editingField === field.key;

        function clickModifyACB(){ props.onModify(field.key); }
        function draftChangeACB(evt){ props.onDraftChange(evt.target.value); }

        return (
            <div key={field.key} className="profile-row">
                <div className="profile-field">
                    <div>{field.label}</div>
                    {isEditing
                        ? <input className="profile-input" value={props.draft} onChange={draftChangeACB}/>
                        : <div className="profile-value">{props.user[field.key]}</div>}
                </div>

                {isEditing
                    ? <button className="pill-button" onClick={props.onSave}>Save</button>
                    : <button className="pill-button" onClick={clickModifyACB}>Modify</button>}
            </div>
        );
    }
}