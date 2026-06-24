import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para o browser (client components). */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
