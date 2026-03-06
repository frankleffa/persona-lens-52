
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import React, { Suspense } from "react";
import AppSidebar from "@/components/AppSidebar";
import PageSkeleton from "@/components/PageSkeleton";

// Dynamic imports for code splitting
const Index = React.lazy(() => import("./pages/Index"));
const Connections = React.lazy(() => import("./pages/Connections"));
const Permissions = React.lazy(() => import("./pages/Permissions"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const AdminLandingEditor = React.lazy(() => import("./pages/AdminLandingEditor"));
const ReportCreate = React.lazy(() => import("./pages/ReportCreate"));
const ReportPreview = React.lazy(() => import("./pages/ReportPreview"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const AgencyControl = React.lazy(() => import("./pages/AgencyControl"));
const AgencyControlCenter = React.lazy(() => import("./pages/AgencyControlCenter"));
const Reports = React.lazy(() => import("./pages/Reports"));
const DashboardExample = React.lazy(() => import("./components/DashboardExample").then(module => ({ default: module.DashboardExample })));
const WhatsAppDemo = React.lazy(() => import("./components/WhatsAppDemo"));
const Execution = React.lazy(() => import("./pages/Execution"));
const CheckoutSuccess = React.lazy(() => import("./pages/CheckoutSuccess"));
const CampaignManagement = React.lazy(() => import("./pages/CampaignManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 2,
      placeholderData: undefined
    }
  }
});

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
      <Suspense fallback={<PageSkeleton />}>
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
      </Suspense>
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
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/checkout-success" element={<CheckoutSuccess />} />
              <Route path="/reports/:reportId/preview" element={<ReportPreview />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
