import { useMutation } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/constants/routes";
import { OAUTH_PROVIDER } from "@/constants/auth";
import type { SignInInput, SignUpInput } from "@/features/auth/auth.schema";

type SignUpResult = {
  needsEmailConfirmation: boolean;
  user: User | null;
};

// Both OAuth and the email-confirmation link return here; PKCE + the client's
// detectSessionInUrl exchange the code into a session on this page's load.
function callbackUrl(): string {
  return `${window.location.origin}${ROUTES.AUTH_CALLBACK}`;
}

export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: SignInInput): Promise<User> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data.user;
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async ({ email, password }: SignUpInput): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) throw error;
      // When email confirmation is required, Supabase returns no session until
      // the user clicks the link — that's our cue to show the verify notice.
      return { needsEmailConfirmation: data.session === null, user: data.user };
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: OAUTH_PROVIDER.GOOGLE,
        options: { redirectTo: callbackUrl() },
      });
      if (error) throw error;
    },
  });
}

export function useSignOut() {
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}
