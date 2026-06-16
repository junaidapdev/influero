import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { ENV } from "@/config/env";
import { logger } from "@/lib/logger";
import {
  getExistingSubscription,
  getNotificationPermission,
  isPushSupported,
  requestPermissionAndSubscribe,
  unsubscribeFromPush,
} from "@/lib/pushClient";

// Owns the web-push toggle for the current device: browser capability + this
// device's subscription state (local, read straight from the Push API — not
// server state, so not a TanStack query), plus the two mutations that subscribe
// or unsubscribe and mirror the row into push_subscriptions via PostgREST (RLS
// gates the write; a single-table upsert needs no edge function).
export function usePushNotifications() {
  const { session } = useSession();
  const supported = isPushSupported();
  const isConfigured = ENV.VAPID_PUBLIC_KEY.length > 0;

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? getNotificationPermission() : "denied",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Reconcile with the browser's actual subscription on mount.
  useEffect(() => {
    if (!supported) return;
    let active = true;
    void getExistingSubscription().then((sub) => {
      if (active) setIsSubscribed(sub !== null);
    });
    return () => {
      active = false;
    };
  }, [supported]);

  const enable = useMutation({
    mutationFn: async (): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[usePushNotifications] No authenticated user");

      const sub = await requestPermissionAndSubscribe(ENV.VAPID_PUBLIC_KEY);

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setPermission(getNotificationPermission());
    },
    onError: (error) => {
      logger.error("usePushNotifications.enable", error);
      // Surface a denied prompt as the blocked state.
      setPermission(getNotificationPermission());
    },
  });

  const disable = useMutation({
    mutationFn: async (): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[usePushNotifications] No authenticated user");

      const endpoint = await unsubscribeFromPush();
      if (endpoint) {
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => setIsSubscribed(false),
    onError: (error) => logger.error("usePushNotifications.disable", error),
  });

  return {
    isSupported: supported,
    isConfigured,
    permission,
    isSubscribed,
    enable,
    disable,
    isBusy: enable.isPending || disable.isPending,
  };
}
