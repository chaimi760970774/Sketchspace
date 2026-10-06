import { observer } from "mobx-react-lite";
import { ProfileView } from "/src/views/profileView.jsx";

const Profile = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Profile(props){

        return <ProfileView user={props.model.user}
                            editingField={props.model.editingField}
                            draft={props.model.profileDraft}

                            onModify={handlerModifyACB}
                            onDraftChange={handlerDraftChangeACB}
                            onSave={handlerSaveACB}
                            onPhotoUpload={handlerPhotoUploadACB}/>;

        function handlerModifyACB(field){ props.model.startEdit(field); }
        function handlerDraftChangeACB(text){ props.model.setProfileDraft(text); }
        function handlerSaveACB(){ props.model.saveEdit(); }

        // local preview only, upload to backend later
        function handlerPhotoUploadACB(file){
            props.model.setPhotoURL(URL.createObjectURL(file));
        }
    }
);

export { Profile };