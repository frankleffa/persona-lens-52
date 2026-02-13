import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PermissionsProvider } from "@/hooks/usePermissions";
import AppSidebar from "@/components/AppSidebar";
import Index from "./pages/Index";
import Connections from "./pages/Connections";
import Permissions from "./pages/Permissions";
import Preview from "./pages/Preview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PermissionsProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppSidebar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/conexoes" element={<Connections />} />
            <Route path="/permissoes" element={<Permissions />} />
            <Route path="/preview" element={<Preview />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PermissionsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
