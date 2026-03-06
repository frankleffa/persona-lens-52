import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, Eye, BarChart3, Sun, Moon, Plug, LogOut, FileEdit, Menu, X, Building2, Target, FileText, Rocket } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";

const allNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "client"], feature: null },
  { path: "/execucao", label: "Execução", icon: Rocket, roles: ["admin", "manager"], feature: null },
  { path: "/agency", label: "Clientes", icon: Building2, roles: ["admin", "manager"], feature: null },
  { path: "/agency-control", label: "Carteira", icon: Target, roles: ["admin", "manager"], feature: "agency_control_center" as string | null },
  { path: "/relatorios", label: "Relatórios", icon: FileText, roles: ["admin", "manager"], feature: null },
  { path: "/conexoes", label: "Central de Conexões", icon: Plug, roles: ["admin", "manager"], feature: null },
  { path: "/permissoes", label: "Permissões", icon: Settings, roles: ["admin", "manager"], feature: "granular_permissions" as string | null },
  { path: "/admin/landing", label: "Editar Landing Page", icon: FileEdit, roles: ["admin"], feature: null },
];


export default function AppSidebar() {
  const location = useLocation();
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains("light"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { hasFeature } = useSubscription();

  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
    document.documentElement.classList.toggle("dark", !isLight);
  }, [isLight]);

  // Close mobile sidebar and clear optimistic state on route change
  useEffect(() => {
    setMobileOpen(false);
    setOptimisticPath(null);
  }, [location.pathname]);

  const activePath = optimisticPath || location.pathname;

  const handlePrefetch = (path: string) => {
    switch (path) {
      case "/": import("../pages/Index"); break;
      case "/execucao": import("../pages/Execution"); break;
      case "/agency": import("../pages/AgencyControl"); break;
      case "/agency-control": import("../pages/AgencyControlCenter"); break;
      case "/relatorios": import("../pages/Reports"); break;
      case "/conexoes": import("../pages/Connections"); break;
      case "/permissoes": import("../pages/Permissions"); break;
      case "/admin/landing": import("../pages/AdminLandingEditor"); break;
    }
  };

  const navItems = allNavItems.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.feature && !hasFeature(item.feature)) return false;
    return true;
  });

  const initials = user?.user_metadata?.full_name ?
    user.user_metadata.full_name.
      split(" ").
      map((n: string) => n[0]).
      join("").
      slice(0, 2).
      toUpperCase() :
    user?.email?.slice(0, 2).toUpperCase() || "GM";

  const roleLabel = role === "client" ? "Cliente" : role === "admin" ? "Admin" : "Gestor";

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent">

          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-sidebar-foreground">AdScape</span>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen &&
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)} />

      }

      {/* Sidebar */}
      <aside
        className={`sidebar fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
        }>

        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="logo-dot h-2 w-2 rounded-full bg-primary" style={{ boxShadow: '0 0 10px var(--accent)' }}></div>
            </div>
            <div>
              <span className="text-[16px] font-[700] tracking-tight text-sidebar-foreground">AdScape</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOptimisticPath(item.path)}
                onMouseEnter={() => handlePrefetch(item.path)}
                className={`nav-item flex items-center gap-3 px-3 py-2 transition-colors ${isActive ? "active" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );








          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-4">
          <button
            onClick={() => setIsLight(!isLight)}
            className="nav-item flex w-full items-center gap-3 px-3 py-2 transition-colors">
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {isLight ? "Modo Escuro" : "Modo Claro"}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.user_metadata?.full_name || user?.email || "Usuário"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Sair">

              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>);

}