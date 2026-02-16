import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, Eye, BarChart3, Sun, Moon, Plug, LogOut, FileEdit, Menu, X, Building2, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

const allNavItems = [
{ path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "client"] },
{ path: "/agency", label: "Agency Control", icon: Building2, roles: ["admin", "manager"] },
{ path: "/agency-control", label: "Control Center", icon: Target, roles: ["admin", "manager"] },
{ path: "/conexoes", label: "Central de Conexões", icon: Plug, roles: ["admin", "manager"] },
{ path: "/permissoes", label: "Permissões", icon: Settings, roles: ["admin", "manager"] },

{ path: "/admin/landing", label: "Editar Landing Page", icon: FileEdit, roles: ["admin"] }];


export default function AppSidebar() {
  const location = useLocation();
  const [isLight, setIsLight] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = allNavItems.filter((item) => item.roles.includes(role));

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
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"}`
        }>

        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">AdScape</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden">

            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
          const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">

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