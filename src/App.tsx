
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import AppSidebar from "@/components/AppSidebar";
import Index from "./pages/Index";
import Connections from "./pages/Connections";
import Permissions from "./pages/Permissions";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import AdminLandingEditor from "./pages/AdminLandingEditor";

// Novos imports da branch testes
import ReportCreate from "./pages/ReportCreate";
import ReportPreview from "./pages/ReportPreview";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AgencyControl from "./pages/AgencyControl";
import AgencyControlCenter from "./pages/AgencyControlCenter";
import Reports from "./pages/Reports";

// Imports da branch main (Métricas)
import { DashboardExample } from "@/components/DashboardExample";
import WhatsAppDemo from "@/components/WhatsAppDemo";
import Execution from "./pages/Execution";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const isManager = role === "manager" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <PermissionsProvider>
      <AppSidebar />
      <Routes>
        <Route path="/" element={<Index />} />

        {/* Rotas de Métricas (main) */}
        <Route path="/metrics-demo" element={<DashboardExample />} />
        <Route path="/whatsapp-demo" element={<WhatsAppDemo />} />

        {/* Execução */}
        {isManager && <Route path="/execucao" element={<Execution />} />}

        {/* Rotas de Agência (testes) */}
        {isManager && <Route path="/agency" element={<AgencyControl />} />}
        {isManager && <Route path="/agency-control" element={<AgencyControlCenter />} />}
        {isManager && <Route path="/relatorios" element={<Reports />} />}

        {isManager && <Route path="/conexoes" element={<Connections />} />}
        {isManager && <Route path="/permissoes" element={<Permissions />} />}

        {isAdmin && <Route path="/admin/landing" element={<AdminLandingEditor />} />}
        {isManager && <Route path="/clients/:clientId/reports/new" element={<ReportCreate />} />}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PermissionsProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reports/:reportId/preview" element={<ReportPreview />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
