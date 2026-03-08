/**
 * Service for fetching manager clients from Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Client } from "@/lib/types";

export interface ManagerClient extends Client {
    email?: string;
}

/** Fetch all clients linked to a manager user. */
export async function fetchManagerClients(userId: string): Promise<ManagerClient[]> {
    // Fetch clients from client_manager_links join
    const { data, error } = await supabase
        .from("client_manager_links")
        .select(`
      client_user_id,
      profiles:client_user_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
        .eq("manager_id", userId);

    if (error) throw error;

    // Also fetch demo clients
    const { data: demoClients } = await supabase
        .from("demo_clients")
        .select("*")
        .eq("manager_id", userId);

    const clients: ManagerClient[] = [];

    // Map linked profiles to Client shape
    for (const row of data || []) {
        const profile = row.profiles as any;
        if (profile) {
            const name = profile.full_name || profile.email || "Cliente";
            const initials = name
                .split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
            clients.push({
                id: profile.id,
                name,
                company: "",
                avatarInitials: initials,
                email: profile.email,
            });
        }
    }

    // Add demo clients
    for (const demo of demoClients || []) {
        clients.push({
            id: demo.id,
            name: demo.name || "Demo",
            company: demo.company || "",
            avatarInitials: (demo.name || "D").slice(0, 2).toUpperCase(),
        });
    }

    return clients;
}
