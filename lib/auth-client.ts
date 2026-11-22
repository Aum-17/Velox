"use client";
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [usernameClient(), passkeyClient()] });
export const { useSession, signIn, signUp, signOut } = authClient;

export const NO_EMAIL_DOMAIN = "no-email.invalid";
export const hasRealEmail = (email?: string | null) => !!email && !email.endsWith("@" + NO_EMAIL_DOMAIN);
