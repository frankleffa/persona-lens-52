import { Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface EmptyDashboardStateProps {
    clientName?: string;
    showConnectButton?: boolean;
}

export default function EmptyDashboardState({ clientName, showConnectButton = true }: EmptyDashboardStateProps) {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
                <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                        Nenhuma conta conectada
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {clientName
                            ? `${clientName} ainda não possui contas de anúncios vinculadas.`
                            : "Este cliente ainda não possui contas de anúncios vinculadas."
                        }
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Conecte contas do Google Ads, Meta Ads ou GA4 para visualizar métricas.
                    </p>
                </div>

                {showConnectButton && (
                    <Button
                        onClick={() => navigate("/conexoes")}
                        className="gap-2 mt-4"
                        variant="outline"
                    >
                        <Link2 className="h-4 w-4" />
                        Conectar Conta
                    </Button>
                )}
            </div>
        </div>
    );
}
