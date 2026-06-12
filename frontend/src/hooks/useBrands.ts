import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { BrandFormInput } from "@/features/brands/brand.schema";
import type { Brand } from "@shared/types/brand.types";

// The writable subset of a brands row (everything the user enters).
type BrandColumns = Omit<Brand, "id" | "user_id" | "created_at">;

type UpdateBrandInput = {
  id: string;
  input: BrandFormInput;
};

// Maps the all-string form input to brands columns: trims, and turns empty
// optional fields into null so blanks persist as NULL rather than "".
function toBrandColumns(input: BrandFormInput): BrandColumns {
  const orNull = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  };
  return {
    name_en: input.nameEn.trim(),
    name_ar: input.nameAr.trim(),
    contact_name: orNull(input.contactName),
    contact_email: orNull(input.contactEmail),
    contact_phone: orNull(input.contactPhone),
    notes: orNull(input.notes),
  };
}

// The brand directory, newest first. RLS scopes the read to the caller; the
// user_id filter is convenience. The browser client is untyped (no generated
// Database types yet), so the row shape is asserted as Brand — the sanctioned
// pattern here, matching useAppUser.
export function useBrands() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: QUERY_KEYS.BRANDS,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Brand[]> => {
      if (!userId) throw new Error("[useBrands] No authenticated user");

      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data ?? []) as Brand[];
    },
  });
}

// A single brand for the detail page. maybeSingle() so a missing row — or one
// owned by another user (RLS returns zero rows) — resolves to null, which the
// route renders as a friendly not-found rather than an error.
export function useBrand(id: string | undefined) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...QUERY_KEYS.BRANDS, id],
    enabled: Boolean(userId && id),
    queryFn: async (): Promise<Brand | null> => {
      if (!userId || !id) throw new Error("[useBrand] Missing user or brand id");

      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;

      return (data as Brand | null) ?? null;
    },
  });
}

// Insert a brand under the caller's id. user_id is passed explicitly (RLS still
// enforces it); the column also defaults to auth.uid() as a safety net.
export function useCreateBrand() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (input: BrandFormInput): Promise<Brand> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useCreateBrand] No authenticated user");

      const { data, error } = await supabase
        .from("brands")
        .insert({ ...toBrandColumns(input), user_id: userId })
        .select("*")
        .single();
      if (error) throw error;

      return data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BRANDS });
    },
  });
}

// Update a brand by id. RLS gates the write to the owner; the id is never
// trusted to imply ownership on its own.
export function useUpdateBrand() {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateBrandInput): Promise<Brand> => {
      const userId = session?.user.id;
      if (!userId) throw new Error("[useUpdateBrand] No authenticated user");

      const { data, error } = await supabase
        .from("brands")
        .update(toBrandColumns(input))
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) throw error;

      return data as Brand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BRANDS });
    },
  });
}
