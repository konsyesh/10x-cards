/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: { id: string; email?: string } | null;
      session?: { access_token: string; expires_at?: number } | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENAI_API_KEY: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly ENV_NAME?: "local" | "integration" | "production";
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
