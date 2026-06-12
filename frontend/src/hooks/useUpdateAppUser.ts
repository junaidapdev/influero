import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { STORAGE } from "@/constants/storage";
import { avatarObjectPath, isAvatarMime } from "@/features/settings/avatar";
import type { AppUser } from "@shared/types/appUser.types";

// The subset of app_users a user can edit from Settings.
type AppUserPatch = Partial<
  Pick<AppUser, "display_name" | "locale" | "reminder_lead_minutes" | "avatar_url">
>;

type UpdateInput = {
  patch: AppUserPatch;
  // Staged avatar file from the dropzone. When present it's uploaded first and
  // its public URL is merged into the patch as avatar_url.
  avatarFile?: File | null;
};

// One mutation for every Settings write: the full-form Save (name + reminder,
// optionally a new avatar) and the locale toggle's immediate persist both call
// it. There's no atomic multi-row requirement here, so a single RLS-gated
// PostgREST update is the correct write path — no edge function.
export function useUpdateAppUser() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({ patch, avatarFile }: UpdateInput): Promise<void> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateAppUser] No authenticated user");

      const finalPatch: AppUserPatch = { ...patch };

      if (avatarFile) {
        if (!isAvatarMime(avatarFile.type)) {
          throw new Error("[useUpdateAppUser] Unsupported avatar type");
        }
        const path = avatarObjectPath(userId, avatarFile.type);
        const { error: uploadError } = await supabase.storage
          .from(STORAGE.AVATARS_BUCKET)
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from(STORAGE.AVATARS_BUCKET)
          .getPublicUrl(path);
        // The path is fixed and upserted, so the public URL is stable — bust the
        // browser/CDN cache so a re-upload actually shows the new image.
        finalPatch.avatar_url = `${publicUrl.publicUrl}?v=${Date.now()}`;
      }

      const { error } = await supabase
        .from("app_users")
        .update(finalPatch)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APP_USER });
    },
  });
}
