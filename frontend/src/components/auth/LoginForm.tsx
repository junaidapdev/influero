import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { VerifyNotice } from "@/components/auth/VerifyNotice";
import { useSignIn, useSignUp, useSignInWithGoogle } from "@/hooks/useAuth";
import { useEnsureAppUser } from "@/hooks/useEnsureAppUser";
import { signInSchema, signUpSchema } from "@/features/auth/auth.schema";
import { authErrorMessageKey } from "@/features/auth/authError";
import { AUTH_MODE, type AuthMode } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";
import { logger } from "@/lib/logger";

type FormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Landing-page CTAs deep-link here: /login?mode=signup opens on the sign-up
  // tab, plain /login opens on sign-in.
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "signup"
      ? AUTH_MODE.SIGN_UP
      : AUTH_MODE.SIGN_IN,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const signIn = useSignIn();
  const signUp = useSignUp();
  const googleSignIn = useSignInWithGoogle();
  const ensureAppUser = useEnsureAppUser();

  const isSignUp = mode === AUTH_MODE.SIGN_UP;
  const isSubmitting =
    signIn.isPending || signUp.isPending || ensureAppUser.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(isSignUp ? signUpSchema : signInSchema),
  });

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isSignUp) {
        const { needsEmailConfirmation, user } = await signUp.mutateAsync(values);
        if (needsEmailConfirmation) {
          setPendingEmail(values.email);
          return;
        }
        if (user) await ensureAppUser.mutateAsync(user);
      } else {
        const user = await signIn.mutateAsync(values);
        await ensureAppUser.mutateAsync(user);
      }
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      logger.error("LoginForm", error);
      setFormError(t(authErrorMessageKey(error)));
    }
  }

  function handleGoogle(): void {
    setFormError(null);
    googleSignIn.mutate(undefined, {
      onError: (error) => {
        logger.error("LoginForm", error);
        setFormError(t("auth.errors.oauth"));
      },
    });
  }

  function switchMode(): void {
    setMode(isSignUp ? AUTH_MODE.SIGN_IN : AUTH_MODE.SIGN_UP);
    setFormError(null);
    reset();
  }

  if (pendingEmail) {
    return (
      <VerifyNotice
        email={pendingEmail}
        onBack={() => {
          setPendingEmail(null);
          setMode(AUTH_MODE.SIGN_IN);
          reset();
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <header className="text-center">
        <h1 className="text-xl font-bold text-text-primary">
          {t(isSignUp ? "auth.signUp.title" : "auth.signIn.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t(isSignUp ? "auth.signUp.subtitle" : "auth.signIn.subtitle")}
        </p>
      </header>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={handleGoogle}
        isLoading={googleSignIn.isPending}
      >
        <GoogleIcon className="size-5" />
        {t("auth.actions.google")}
      </Button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">{t("auth.divider")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-error-light px-3 py-2 text-xs text-error-foreground"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">{t("auth.fields.email")}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={t("auth.fields.emailPlaceholder")}
          hasError={Boolean(errors.email)}
          {...register("email")}
        />
        <FieldError message={errors.email ? t(errors.email.message ?? "") : undefined} />
      </div>

      <div>
        <Label htmlFor="password">{t("auth.fields.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            placeholder={t("auth.fields.passwordPlaceholder")}
            hasError={Boolean(errors.password)}
            className="pe-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={t(showPassword ? "auth.actions.hidePassword" : "auth.actions.showPassword")}
            className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-md text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <FieldError
          message={errors.password ? t(errors.password.message ?? "") : undefined}
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {t(isSignUp ? "auth.actions.signUp" : "auth.actions.signIn")}
      </Button>

      <p className="text-center text-xs text-text-muted">
        <Trans
          i18nKey="auth.agreement"
          components={{
            terms: (
              <Link
                to={ROUTES.TERMS}
                className="font-medium text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            ),
            privacy: (
              <Link
                to={ROUTES.PRIVACY}
                className="font-medium text-accent underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            ),
          }}
        />
      </p>

      <p className="text-center text-sm text-text-secondary">
        {t(isSignUp ? "auth.toggle.haveAccount" : "auth.toggle.noAccount")}{" "}
        <button
          type="button"
          onClick={switchMode}
          className="font-semibold text-accent focus-visible:underline focus-visible:outline-none"
        >
          {t(isSignUp ? "auth.toggle.toSignIn" : "auth.toggle.toSignUp")}
        </button>
      </p>
    </form>
  );
}
