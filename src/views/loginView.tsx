import "/style.css"
import { LogoView } from "/src/views/logoView.tsx";
import type { ChangeEvent, FormEvent, RefObject } from "react";

interface LoginViewProps {
    email: string;
    password: string;
    name: string;               // display name, only shown when signing up
    signingUp: boolean;
    error: string;
    busy: boolean;
    googleEnabled: boolean;                         // false: no Google client id, so no Google button
    googleSlotRef: RefObject<HTMLDivElement | null>;   // Google draws its own button in here
    onEmailChange: (email: string) => void;
    onPasswordChange: (password: string) => void;
    onNameChange: (name: string) => void;
    onLogin: () => void;
    onGuestLogin: () => void;
    onToggleSignUp: () => void;
}

export function LoginView(props: LoginViewProps){
    return (
        <div className="login-page">
            <LogoView/>
            <h2 className="login-title">Welcome to Sketchspace</h2>

            {/* a real form, so the browser knows the password field belongs to it and Enter logs in */}
            <form className="login-form" onSubmit={submitACB}>
                {props.googleEnabled && <div className="login-google" ref={props.googleSlotRef}></div>}

                {props.signingUp &&
                    <>
                        <label>Name</label>
                        <input className="login-input" autoComplete="nickname" value={props.name} onChange={nameChangeACB}/>
                    </>}

                <label>User Email</label>
                <input className="login-input" autoComplete="email" value={props.email} onChange={emailChangeACB}/>

                <label>Password</label>
                <input className="login-input" type="password" autoComplete={props.signingUp ? "new-password" : "current-password"} value={props.password} onChange={passwordChangeACB}/>

                {props.error && <div className="field-error login-error" role="alert">{props.error}</div>}

                <div className="login-buttons">
                    <button type="submit" className="login-button" disabled={props.busy}>
                        {props.busy ? "Please wait..." : props.signingUp ? "Sign up" : "Login"}
                    </button>
                    <button type="button" className="login-button" onClick={props.onGuestLogin}>Log As Guest</button>
                </div>
            </form>

            <div>
                {props.signingUp ? "Already have an account? " : "Don't have an account? "}
                <span className="link" onClick={props.onToggleSignUp}>{props.signingUp ? "Log in" : "Sign up"}</span>
            </div>
        </div>
    );

    function submitACB(evt: FormEvent<HTMLFormElement>){
        evt.preventDefault();       // stay in the app instead of reloading the page
        props.onLogin();
    }
    function nameChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onNameChange(evt.target.value); }
    function emailChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onEmailChange(evt.target.value); }
    function passwordChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onPasswordChange(evt.target.value); }
}