import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { FilterChips } from "@/components/ui/FilterChips";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { VerifyNotice } from "@/components/auth/VerifyNotice";
import {
  useSignIn,
  useSignUp,
  useSignInWithPhone,
  useSignUpWithPhone,
  useSignInWithGoogle,
} from "@/hooks/useAuth";
import { useEnsureAppUser } from "@/hooks/useEnsureAppUser";
import {
  signInSchema,
  signUpSchema,
  signInPhoneSchema,
  signUpPhoneSchema,
  toE164Saudi,
} from "@/features/auth/auth.schema";
import { authErrorMessageKey } from "@/features/auth/authError";
import { AUTH_MODE, IDENTIFIER, type AuthMode, type Identifier } from "@/constants/auth";
import { ROUTES } from "@/constants/routes";
import { logger } from "@/lib/logger";

type FormValues = {
  email: string;
  phone: string;
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
  // Which identifier the password pairs with. Email is primary; phone is the
  // alternative. Google stays a separate button below.
  const [identifier, setIdentifier] = useState<Identifier>(IDENTIFIER.EMAIL);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const signIn = useSignIn();
  const signUp = useSignUp();
  const signInPhone = useSignInWithPhone();
  const signUpPhone = useSignUpWithPhone();
  const googleSignIn = useSignInWithGoogle();
  const ensureAppUser = useEnsureAppUser();

  const isSignUp = mode === AUTH_MODE.SIGN_UP;
  const isPhone = identifier === IDENTIFIER.PHONE;
  const isSubmitting =
    signIn.isPending ||
    signUp.isPending ||
    signInPhone.isPending ||
    signUpPhone.isPending ||
    ensureAppUser.isPending;

  // The active schema follows both axes (identifier × mode). Each schema
  // validates only its own identifier field; the resolver is recreated on every
  // render so toggling either axis picks up the right one. Cast to the form's
  // shape because each schema covers a subset of the fields (email OR phone).
  const resolver = zodResolver(
    isPhone
      ? isSignUp
        ? signUpPhoneSchema
        : signInPhoneSchema
      : isSignUp
        ? signUpSchema
        : signInSchema,
  ) as Resolver<FormValues>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver });

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);
    try {
      if (isPhone) {
        const phone = toE164Saudi(values.phone);
        // The schema already rejects an unnormalizable number; this guards the
        // type narrowing without trusting it.
        if (phone === null) return;
        const user = isSignUp
          ? await signUpPhone.mutateAsync({ phone, password: values.password })
          : await signInPhone.mutateAsync({ phone, password: values.password });
        if (user) await ensureAppUser.mutateAsync(user);
      } else if (isSignUp) {
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

  function switchIdentifier(next: Identifier): void {
    if (next === identifier) return;
    setIdentifier(next);
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

      <FilterChips<Identifier>
        label={t("auth.identifier.label")}
        value={identifier}
        onChange={switchIdentifier}
        items={[
          { value: IDENTIFIER.EMAIL, label: t("auth.identifier.email") },
          { value: IDENTIFIER.PHONE, label: t("auth.identifier.phone") },
        ]}
      />

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md bg-error-light px-3 py-2 text-xs text-error-foreground"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      ) : null}

      {isPhone ? (
        <div>
          <Label htmlFor="phone">{t("auth.fields.phone")}</Label>
          <Input
            id="phone"
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("auth.fields.phonePlaceholder")}
            hasError={Boolean(errors.phone)}
            {...register("phone")}
          />
          <FieldError message={errors.phone ? t(errors.phone.message ?? "") : undefined} />
        </div>
      ) : (
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
      )}

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
        {isPhone ? (
          <p className="mt-2 text-xs text-text-muted">{t("auth.phone.noRecovery")}</p>
        ) : null}
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
