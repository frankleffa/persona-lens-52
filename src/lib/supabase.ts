import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uwvougccbsrnrtnsgert.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dm91Z2NjYnNybnJ0bnNnZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTM2NjAsImV4cCI6MjA4NjUyOTY2MH0.lvUClvJaQRx2YGccRJwLMYpIudf9d-JE9dDwZkq0qh8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
