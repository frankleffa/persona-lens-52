import { useEffect, useMemo, useState } from "react";
import ClientDashboard from "@/components/ClientDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useManagerClients } from "@/hooks/useManagerClients";

export default function Index() {
  const { role } = useUserRole();
  const { user } = useAuth();

  const isClient = role === "client";
  const isAdmin = role === "admin";

  const { clients, loading: loadingClients } = useManagerClients(isAdmin);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  useEffect(() => {
    if (!isAdmin) {
      setSelectedClientId("");
      return;
    }

    if (clients.length > 0 && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, isAdmin, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const clientId = isClient
    ? user?.id ?? ""
    : isAdmin
    ? selectedClientId
    : "";

  const clientName = isClient
    ? user?.user_metadata?.full_name ?? user?.email ?? "Meu Dashboard"
    : selectedClient?.client_label ?? "Selecione um cliente";

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">
            {isClient ? "Meu Dashboard" : "Visão Geral"}
          </h1>

          {isAdmin && (
            <div className="mt-4 max-w-sm">
              <label className="mb-2 block text-sm font-medium text-foreground">
                Cliente
              </label>

              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                disabled={loadingClients || clients.length === 0}
              >
                {clients.length === 0 ? (
                  <option value="">
                    {loadingClients
                      ? "Carregando clientes..."
                      : "Nenhum cliente vinculado"}
                  </option>
                ) : (
                  clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.client_label}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>

        {clientId ? (
          <ClientDashboard clientId={clientId} clientName={clientName} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione um cliente para visualizar o dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
