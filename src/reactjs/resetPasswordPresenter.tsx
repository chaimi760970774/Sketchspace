import { observer } from "mobx-react-lite";
import type { PresenterProps } from "/src/model/types.ts";
import { ResetPasswordView } from "/src/views/resetPasswordView.tsx";
import { useNavigate, useSearchParams } from "react-router-dom";

const ResetPassword = observer(// observer needed for the presenter to update (its view) when relevant parts of the model change

    function ResetPassword(props: PresenterProps){
        const navigate = useNavigate();
        // the link in the e-mail is .../#/reset-password?token=...; without a token the page asks for the e-mail
        const [searchParams] = useSearchParams();
        const token = searchParams.get("token") ?? "";

        return <ResetPasswordView hasToken={token !== ""}
                                  email={props.model.resetEmail}
                                  newPassword={props.model.resetNewPassword}
                                  error={props.model.resetError}
                                  busy={props.model.resetBusy}
                                  emailSent={props.model.resetEmailSent}

                                  onEmailChange={handlerEmailChangeACB}
                                  onNewPasswordChange={handlerNewPasswordChangeACB}
                                  onSendLink={handlerSendLinkACB}
                                  onChoosePassword={handlerChoosePasswordACB}
                                  onAskNewLink={handlerAskNewLinkACB}
                                  onBackToLogin={handlerBackToLoginACB}/>;

        function handlerEmailChangeACB(email: string){ props.model.setResetEmail(email); }
        function handlerNewPasswordChangeACB(password: string){ props.model.setResetNewPassword(password); }
        function handlerSendLinkACB(){ props.model.sendResetLink(); }

        // after a change the user logs in with the new password
        function handlerChoosePasswordACB(){ props.model.chooseNewPassword(token).then(changedACB); }
        function changedACB(changed: boolean){ if (changed) navigate("/login"); }

        // an old or used link: start again from the e-mail step
        function handlerAskNewLinkACB(){
            props.model.startPasswordReset();
            navigate("/reset-password");
        }
        function handlerBackToLoginACB(){ navigate("/login"); }
    }
);

export { ResetPassword };
