import { MOCK_CLIENTS } from "@/lib/types";
import ClientDashboard from "@/components/ClientDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { role, managerId } = useUserRole();
  const { user } = useAuth();

  // For clients: use their own user id as the client identifier
  // For managers: use the first mock client (will be replaced with real client selector)
  const isClient = role === "client";
  const clientId = isClient ? (user?.id || "c1") : MOCK_CLIENTS[0].id;
  const clientName = isClient ? (user?.user_metadata?.full_name || user?.email || "Meu Dashboard") : MOCK_CLIENTS[0].company;

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">
            {isClient ? "Meu Dashboard" : "Visão Geral"}
          </h1>
        </div>
        <ClientDashboard clientId={clientId} clientName={clientName} />
      </div>
    </div>
  );
}
