import "/style.css"
import { LogoMark } from "/src/views/logoView.tsx";
import type { ChangeEvent, FormEvent } from "react";

interface ResetPasswordViewProps {
    hasToken: boolean;              // true: opened from the link in the e-mail (choose a new password); false: ask for the e-mail
    email: string;
    newPassword: string;
    error: string;
    busy: boolean;
    emailSent: boolean;
    onEmailChange: (email: string) => void;
    onNewPasswordChange: (password: string) => void;
    onSendLink: () => void;
    onChoosePassword: () => void;
    onAskNewLink: () => void;
    onBackToLogin: () => void;
}

export function ResetPasswordView(props: ResetPasswordViewProps){
    return (
        <div className="login-page">
            <div className="login-logo" role="img" aria-label="Sketchspace"><LogoMark className="login-logo-mark"/></div>
            {props.hasToken ? chooseView() : props.emailSent ? sentView() : askView()}
        </div>
    );

    // step 1: the e-mail address
    function askView(){
        return (
            <>
                <h2 className="login-title">Forgot your password?</h2>
                <form className="login-form" onSubmit={submitSendACB}>
                    <p className="login-note">Enter the email of your account and we will send you a link to choose a new password.</p>

                    <label>User Email</label>
                    <input className="login-input" autoComplete="email" value={props.email} onChange={emailChangeACB}/>

                    {props.error && <div className="field-error login-error" role="alert">{props.error}</div>}

                    <div className="login-buttons">
                        <button type="submit" className="login-button" disabled={props.busy}>{props.busy ? "Please wait..." : "Send reset link"}</button>
                    </div>
                </form>
                {backLink()}
            </>
        );
    }

    // step 2: told to check the mail
    function sentView(){
        return (
            <>
                <h2 className="login-title">Check your email</h2>
                <p className="login-note">If an account exists for <strong>{props.email.trim()}</strong>, a link to choose a new password is on its way.
                    It works for one hour. Look in your spam folder too.</p>
                {backLink()}
            </>
        );
    }

    // step 3: the link from the e-mail
    function chooseView(){
        return (
            <>
                <h2 className="login-title">Choose a new password</h2>
                <form className="login-form" onSubmit={submitChooseACB}>
                    <label>New Password</label>
                    <input className="login-input" type="password" autoComplete="new-password" value={props.newPassword} onChange={newPasswordChangeACB}/>

                    <p className="login-note">8-128 characters, with at least one letter and one digit.</p>

                    {props.error && <div className="field-error login-error" role="alert">{props.error}</div>}

                    <div className="login-buttons">
                        <button type="submit" className="login-button" disabled={props.busy}>{props.busy ? "Please wait..." : "Change password"}</button>
                    </div>
                </form>
                <div>Link not working? <span className="link" onClick={props.onAskNewLink}>Ask for a new one</span></div>
            </>
        );
    }

    function backLink(){
        return <div><span className="link" onClick={props.onBackToLogin}>Back to login</span></div>;
    }

    function submitSendACB(evt: FormEvent<HTMLFormElement>){
        evt.preventDefault();
        props.onSendLink();
    }
    function submitChooseACB(evt: FormEvent<HTMLFormElement>){
        evt.preventDefault();
        props.onChoosePassword();
    }
    function emailChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onEmailChange(evt.target.value); }
    function newPasswordChangeACB(evt: ChangeEvent<HTMLInputElement>){ props.onNewPasswordChange(evt.target.value); }
}
