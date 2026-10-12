import { observer } from "mobx-react-lite";
import { LoginView } from "/src/views/loginView.jsx";
import { useNavigate } from "react-router-dom";

const Login = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function Login(props){
        const navigate = useNavigate();

        return <LoginView email={props.model.loginEmail}
                          password={props.model.loginPassword}

                          onEmailChange={handlerEmailChangeACB}
                          onPasswordChange={handlerPasswordChangeACB}
                          onLogin={handlerLoginACB}
                          onGoogleLogin={handlerGoogleLoginACB}
                          onGuestLogin={handlerGuestLoginACB}
                          onSignUp={handlerSignUpACB}/>;

        function handlerEmailChangeACB(email){ props.model.setLoginEmail(email); }
        function handlerPasswordChangeACB(password){ props.model.setLoginPassword(password); }

        // all go straight to gallery for now, connect to the login API later
        function handlerLoginACB(){ navigate("/gallery"); }
        function handlerGoogleLoginACB(){ navigate("/gallery"); }
        function handlerGuestLoginACB(){ navigate("/gallery"); }
        function handlerSignUpACB(){ navigate("/gallery"); }
    }
);

export { Login };