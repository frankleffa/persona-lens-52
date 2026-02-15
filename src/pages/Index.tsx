import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientDashboard from "@/components/ClientDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useManagerClients } from "@/hooks/useManagerClients";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();
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
        <div className="pt-16 lg:pt-6 lg:ml-64 p-4 sm:p-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 lg:mb-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {isClient ? "Meu Dashboard" : "Visão Geral"}
                </h1>
                {!isClient && clientId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/clients/${clientId}/reports/new`)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Criar Relatório</span>
                  </Button>
                )}
              </div>

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
              <ClientDashboard clientId={clientId} clientName={clientName} isDemo={selectedClient?.is_demo} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um cliente para visualizar o dashboard.
              </p>
            )}
          </div>
        </div>
      </div>
  );
}
