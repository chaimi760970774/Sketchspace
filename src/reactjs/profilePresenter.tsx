import { observer } from "mobx-react-lite";
import type { PresenterProps, ProfileField } from "/src/model/types.ts";
import { ProfileView } from "/src/views/profileView.tsx";
import { useNavigate } from "react-router-dom";

const Profile = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Profile(props: PresenterProps){
        const navigate = useNavigate();

        return <ProfileView user={props.model.user}
                            isLoggedIn={props.model.isLoggedIn}
                            editingField={props.model.editingField}
                            draft={props.model.profileDraft}
                            error={props.model.getProfileError()}
                            hasUnsavedDraft={props.model.hasUnsavedDraft()}
                            savingPhoto={props.model.savingPhoto}

                            onModify={handlerModifyACB}
                            onDraftChange={handlerDraftChangeACB}
                            onSave={handlerSaveACB}
                            onPhotoUpload={handlerPhotoUploadACB}
                            onPhotoRemove={handlerPhotoRemoveACB}
                            onLogin={handlerLoginACB}
                            onLogout={handlerLogoutACB}/>;

        function handlerModifyACB(field: ProfileField){ props.model.startEdit(field); }
        function handlerDraftChangeACB(text: string){ props.model.setProfileDraft(text); }
        function handlerSaveACB(){ props.model.saveEdit(); }

        function handlerPhotoUploadACB(file: File){ props.model.uploadPhoto(file); }
        function handlerPhotoRemoveACB(){ props.model.removePhoto(); }

        function handlerLoginACB(){ navigate("/login"); }
        function handlerLogoutACB(){ props.model.logoutUser().then(() => navigate("/login")); }
    }
);

export { Profile };