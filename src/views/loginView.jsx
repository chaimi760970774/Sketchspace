import "/style.css"

export function LoginView(props){
    return (
        <div className="login-page">
            <div className="login-logo">Logo</div>
            <h2 className="login-title">Welcome to Sketchspace</h2>

            {/* a real form, so the browser knows the password field belongs to it and Enter logs in */}
            <form className="login-form" onSubmit={submitACB}>
                <button type="button" className="login-button login-google" onClick={props.onGoogleLogin}>
                    <span className="google-g">G</span> Log in with Google
                </button>

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

    function submitACB(evt){
        evt.preventDefault();       // stay in the app instead of reloading the page
        props.onLogin();
    }
    function nameChangeACB(evt){ props.onNameChange(evt.target.value); }
    function emailChangeACB(evt){ props.onEmailChange(evt.target.value); }
    function passwordChangeACB(evt){ props.onPasswordChange(evt.target.value); }
}