import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PermissionsProvider } from "@/hooks/usePermissions";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppSidebar from "@/components/AppSidebar";
import Index from "./pages/Index";
import Connections from "./pages/Connections";
import Permissions from "./pages/Permissions";
import Preview from "./pages/Preview";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <PermissionsProvider>
      <AppSidebar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/conexoes" element={<Connections />} />
        <Route path="/permissoes" element={<Permissions />} />
        <Route path="/preview" element={<Preview />} />
        <Route path="*" element={<NotFound />} />
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
