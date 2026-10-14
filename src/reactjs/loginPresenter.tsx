import { observer } from "mobx-react-lite";
import type { PresenterProps } from "/src/model/types.ts";
import { LoginView } from "/src/views/loginView.tsx";
import { useNavigate } from "react-router-dom";

const Login = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Login(props: PresenterProps){
        const navigate = useNavigate();

        return <LoginView email={props.model.loginEmail}
                          password={props.model.loginPassword}
                          name={props.model.loginName}
                          signingUp={props.model.signingUp}
                          error={props.model.loginError}
                          busy={props.model.loggingIn}

                          onEmailChange={handlerEmailChangeACB}
                          onPasswordChange={handlerPasswordChangeACB}
                          onNameChange={handlerNameChangeACB}
                          onLogin={handlerLoginACB}
                          onGoogleLogin={handlerGoogleLoginACB}
                          onGuestLogin={handlerGuestLoginACB}
                          onToggleSignUp={handlerToggleSignUpACB}/>;

        function handlerEmailChangeACB(email: string){ props.model.setLoginEmail(email); }
        function handlerPasswordChangeACB(password: string){ props.model.setLoginPassword(password); }

        function handlerNameChangeACB(name: string){ props.model.setLoginName(name); }
        function handlerToggleSignUpACB(){ props.model.toggleSignUp(); }

        // logging in (or signing up) goes to the gallery once the server accepted it
        function handlerLoginACB(){ props.model.submitLogin().then(goToGalleryACB); }
        function goToGalleryACB(loggedIn: boolean){ if (loggedIn) navigate("/gallery"); }
        function handlerGoogleLoginACB(){ props.model.googleLogin(); }
        function handlerGuestLoginACB(){ props.model.continueAsGuest().then(() => navigate("/gallery")); }
    }
);

export { Login };