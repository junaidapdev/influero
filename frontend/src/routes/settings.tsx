import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { SupportSection } from "@/components/settings/SupportSection";
import { DeleteAccountSection } from "@/components/settings/DeleteAccountSection";
import { AvatarDropzone } from "@/components/settings/AvatarDropzone";
import { LocaleToggle } from "@/components/ui/LocaleToggle";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { FieldError } from "@/components/ui/FieldError";
import { Button } from "@/components/ui/Button";
import { useSignOut } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUpdateAppUser } from "@/hooks/useUpdateAppUser";
import { useToast } from "@/hooks/useToast";
import { validateAvatarFile } from "@/features/settings/avatar";
import { settingsSchema, type SettingsInput } from "@/features/settings/settings.schema";
import { ROUTES } from "@/constants/routes";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  CHECKOUT_SUCCESS_PARAM,
  CHECKOUT_SUCCESS_VALUE,
} from "@/constants/billing";
import type { Locale } from "@/constants/locale";
import type { Entitlement } from "@shared/types/subscription.types";
import { logger } from "@/lib/logger";

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg bg-border motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function SettingsRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const appUserQuery = useAppUser();
  const updateAppUser = useUpdateAppUser();
  const signOut = useSignOut();

  const appUser = appUserQuery.data;

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | undefined>(undefined);

  // Drives the post-checkout entitlement poll (below). Refs, not state, so the
  // poll survives the re-render that strips the ?checkout param.
  const checkoutHandledRef = useRef(false);
  const checkoutPollRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    // `values` (not defaultValues) re-syncs the form once the query resolves and
    // after a successful save invalidates + refetches.
    values: {
      displayName: appUser?.display_name ?? "",
    },
  });

  // Revoke the previous object URL when the preview changes or on unmount.
  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  // Returning from a successful LS checkout: confirm, strip the param so a reload
  // doesn't re-toast, then POLL entitlement until Pro lands. The webhook +
  // realtime are the real flip, but they can lag a few seconds behind the
  // redirect — a single invalidate often still reads "Free" right after payment,
  // which looks like "I paid and got nothing". The poll is capped (~60s) and the
  // ref guard makes it run once even as the param-strip re-renders.
  useEffect(() => {
    if (checkoutHandledRef.current) return;
    if (searchParams.get(CHECKOUT_SUCCESS_PARAM) !== CHECKOUT_SUCCESS_VALUE) return;
    checkoutHandledRef.current = true;

    showToast("billing.toast.checkoutSuccess", "success");
    const next = new URLSearchParams(searchParams);
    next.delete(CHECKOUT_SUCCESS_PARAM);
    setSearchParams(next, { replace: true });

    let attempts = 0;
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENT });
    checkoutPollRef.current = window.setInterval(() => {
      attempts += 1;
      const entitlement = queryClient.getQueryData<Entitlement>(QUERY_KEYS.ENTITLEMENT);
      if (entitlement?.is_pro || attempts >= 30) {
        if (checkoutPollRef.current !== null) {
          window.clearInterval(checkoutPollRef.current);
          checkoutPollRef.current = null;
        }
        return;
      }
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ENTITLEMENT });
    }, 2000);
  }, [searchParams, setSearchParams, showToast, queryClient]);

  // Stop the checkout poll if the user leaves Settings before Pro lands.
  useEffect(
    () => () => {
      if (checkoutPollRef.current !== null) {
        window.clearInterval(checkoutPollRef.current);
      }
    },
    [],
  );

  function handleAvatarSelect(file: File): void {
    const error = validateAvatarFile(file);
    if (error) {
      setAvatarError(error);
      return;
    }
    setAvatarError(undefined);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function onSubmit(data: SettingsInput): void {
    updateAppUser.mutate(
      {
        patch: {
          display_name: data.displayName === "" ? null : data.displayName,
        },
        avatarFile,
      },
      {
        onSuccess: () => {
          showToast("settings.toast.saved", "success");
          // The refetched avatar_url now drives the dropzone; drop the staged file.
          setAvatarFile(null);
        },
        onError: (error) => {
          logger.error("SettingsRoute.save", error);
          showToast("settings.toast.error", "error");
        },
      },
    );
  }

  // Locale already switched live (i18n + <html dir>); here we persist it. UI
  // stays in the new locale even on failure — the error toast is the signal.
  function handleLocaleChange(next: Locale): void {
    updateAppUser.mutate(
      { patch: { locale: next } },
      {
        onSuccess: () => showToast("settings.toast.saved", "success"),
        onError: (error) => {
          logger.error("SettingsRoute.locale", error);
          showToast("settings.toast.error", "error");
        },
      },
    );
  }

  function handleSignOut(): void {
    signOut.mutate(undefined, {
      onSuccess: () => navigate(ROUTES.LOGIN, { replace: true }),
      onError: (error) => logger.error("SettingsRoute.signOut", error),
    });
  }

  return (
    <main className="min-h-dvh bg-background px-4 pb-8">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader
          title={t("settings.title")}
          // `location.key === "default"` means this is the first entry (opened
          // directly / refreshed), so there's no in-app history to pop — fall
          // back to the dashboard instead of stranding the user.
          onBack={() =>
            location.key === "default"
              ? navigate(ROUTES.DASHBOARD)
              : navigate(-1)
          }
        />

        {appUserQuery.isLoading ? (
          <SettingsSkeleton />
        ) : appUserQuery.isError ? (
          <Card>
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-error-foreground">{t("settings.loadError")}</p>
              <Button
                variant="secondary"
                onClick={() => void appUserQuery.refetch()}
                isLoading={appUserQuery.isFetching}
              >
                {t("settings.actions.retry")}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <SettingsSection
              title={t("settings.language.title")}
              description={t("settings.language.help")}
            >
              <LocaleToggle onLocaleChange={handleLocaleChange} />
            </SettingsSection>

            <NotificationsSection />

            <BillingSection />

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
              <SettingsSection title={t("settings.profile.title")}>
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="displayName">
                      {t("settings.profile.displayName")}
                    </Label>
                    <Input
                      id="displayName"
                      placeholder={t("settings.profile.displayNamePlaceholder")}
                      hasError={Boolean(errors.displayName)}
                      {...register("displayName")}
                    />
                    <FieldError
                      message={
                        errors.displayName?.message
                          ? t(errors.displayName.message)
                          : undefined
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("settings.profile.avatar")}</Label>
                    <AvatarDropzone
                      name={appUser?.display_name}
                      currentUrl={appUser?.avatar_url}
                      previewUrl={avatarPreview}
                      onSelect={handleAvatarSelect}
                      errorKey={avatarError}
                      disabled={updateAppUser.isPending}
                    />
                  </div>
                </div>
              </SettingsSection>

              <Button
                type="submit"
                className="w-full"
                isLoading={updateAppUser.isPending}
              >
                {t("settings.actions.save")}
              </Button>
            </form>
          </>
        )}

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
          isLoading={signOut.isPending}
        >
          {t("settings.actions.signOut")}
        </Button>

        <SupportSection />

        <DeleteAccountSection />
      </div>
    </main>
  );
}
