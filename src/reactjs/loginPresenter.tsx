import { observer } from "mobx-react-lite";
import type { PresenterProps } from "/src/model/types.ts";
import { LoginView } from "/src/views/loginView.tsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

const Login = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Login(props: PresenterProps){
        const navigate = useNavigate();
        const googleSlotRef = useRef<HTMLDivElement>(null);

        // Google draws its button inside the slot, once, when the page opens
        useEffect(drawGoogleButtonACB, []);

        return <LoginView email={props.model.loginEmail}
                          password={props.model.loginPassword}
                          name={props.model.loginName}
                          signingUp={props.model.signingUp}
                          error={props.model.loginError}
                          busy={props.model.loggingIn}
                          googleEnabled={props.model.googleEnabled}
                          googleSlotRef={googleSlotRef}

                          onEmailChange={handlerEmailChangeACB}
                          onPasswordChange={handlerPasswordChangeACB}
                          onNameChange={handlerNameChangeACB}
                          onLogin={handlerLoginACB}
                          onGuestLogin={handlerGuestLoginACB}
                          onToggleSignUp={handlerToggleSignUpACB}
                          onForgotPassword={handlerForgotPasswordACB}/>;

        function handlerEmailChangeACB(email: string){ props.model.setLoginEmail(email); }
        function handlerPasswordChangeACB(password: string){ props.model.setLoginPassword(password); }

        function handlerNameChangeACB(name: string){ props.model.setLoginName(name); }
        function handlerToggleSignUpACB(){ props.model.toggleSignUp(); }
        function handlerForgotPasswordACB(){
            props.model.startPasswordReset();
            navigate("/reset-password");
        }

        // logging in (or signing up) goes to the gallery once the server accepted it
        function handlerLoginACB(){ props.model.submitLogin().then(goToGalleryACB); }
        function goToGalleryACB(loggedIn: boolean){ if (loggedIn) navigate("/gallery"); }

        function drawGoogleButtonACB(){
            if (props.model.googleEnabled && googleSlotRef.current)
                props.model.drawGoogleButton(googleSlotRef.current, handlerGoogleCredentialACB);
        }
        // Google gives an id token once the user picked an account; the gallery opens when the server accepted it
        function handlerGoogleCredentialACB(idToken: string){ props.model.loginWithGoogle(idToken).then(goToGalleryACB); }
        function handlerGuestLoginACB(){ props.model.continueAsGuest().then(() => navigate("/gallery")); }
    }
);

export { Login };