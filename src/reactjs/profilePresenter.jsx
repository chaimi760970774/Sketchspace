import { observer } from "mobx-react-lite";
import { ProfileView } from "/src/views/profileView.jsx";
import { useNavigate } from "react-router-dom";

const Profile = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Profile(props){
        const navigate = useNavigate();

        return <ProfileView user={props.model.user}
                            isLoggedIn={props.model.isLoggedIn}
                            editingField={props.model.editingField}
                            draft={props.model.profileDraft}
                            error={props.model.getProfileError()}
                            hasUnsavedDraft={props.model.hasUnsavedDraft()}

                            onModify={handlerModifyACB}
                            onDraftChange={handlerDraftChangeACB}
                            onSave={handlerSaveACB}
                            onPhotoUpload={handlerPhotoUploadACB}
                            onLogin={handlerLoginACB}
                            onLogout={handlerLogoutACB}/>;

        function handlerModifyACB(field){ props.model.startEdit(field); }
        function handlerDraftChangeACB(text){ props.model.setProfileDraft(text); }
        function handlerSaveACB(){ props.model.saveEdit(); }

        function handlerPhotoUploadACB(file){ props.model.uploadPhoto(file); }

        function handlerLoginACB(){ navigate("/login"); }
        function handlerLogoutACB(){ props.model.logoutUser().then(() => navigate("/login")); }
    }
);

export { Profile };