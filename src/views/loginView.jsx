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

                <label>User Email</label>
                <input className="login-input" autoComplete="email" value={props.email} onChange={emailChangeACB}/>

                <label>Password</label>
                <input className="login-input" type="password" autoComplete="current-password" value={props.password} onChange={passwordChangeACB}/>

                <div className="login-buttons">
                    <button type="submit" className="login-button">Login</button>
                    <button type="button" className="login-button" onClick={props.onGuestLogin}>Log As Guest</button>
                </div>
            </form>

            <div>
                Don't have an account? <span className="link" onClick={props.onSignUp}>Sign up</span>
            </div>
        </div>
    );

    function submitACB(evt){
        evt.preventDefault();       // stay in the app instead of reloading the page
        props.onLogin();
    }
    function emailChangeACB(evt){ props.onEmailChange(evt.target.value); }
    function passwordChangeACB(evt){ props.onPasswordChange(evt.target.value); }
}