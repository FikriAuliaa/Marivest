"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

export function createClient() {
  const { supabaseUrl, publishableKey } = getSupabasePublicEnv();

  return createBrowserClient(supabaseUrl, publishableKey);
}
