import "/style.css"

export function LoginView(props){
    return (
        <div className="login-page">
            <div className="login-logo">Logo</div>
            <h2 className="login-title">Welcome to Sketchspace</h2>

            <div className="login-form">
                <button className="login-button login-google" onClick={props.onGoogleLogin}>
                    <span className="google-g">G</span> Log in with Google
                </button>

                <label>User Email</label>
                <input className="login-input" value={props.email} onChange={emailChangeACB}/>

                <label>Password</label>
                <input className="login-input" type="password" value={props.password} onChange={passwordChangeACB}/>

                <div className="login-buttons">
                    <button className="login-button" onClick={props.onLogin}>Login</button>
                    <button className="login-button" onClick={props.onGuestLogin}>Log As Guest</button>
                </div>
            </div>

            <div>
                Don't have an account? <span className="link" onClick={props.onSignUp}>Sign up</span>
            </div>
        </div>
    );

    function emailChangeACB(evt){ props.onEmailChange(evt.target.value); }
    function passwordChangeACB(evt){ props.onPasswordChange(evt.target.value); }
}