"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

function initials(s: string) {
  return s.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setName((u.user_metadata?.full_name as string) ?? "");
        setEmail(u.email ?? "");
      }
    });
  }, []);

  const display = name || email || "Conta";

  async function signOut() {
    setOpen(false);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignora — segue pro login de qualquer forma */
    }
    toast.success("Você saiu da conta.");
    router.push("/auth");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Conta"
        className="grid size-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2/70"
      >
        {initials(display)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-md border border-border bg-popover p-1 shadow-xl">
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium text-foreground">{name || "Sua conta"}</p>
              <p className="truncate text-xs text-soft-foreground">{email}</p>
            </div>
            <div className="my-1 border-t border-border" />
            <MenuLink href="/configuracoes" icon={<User className="size-4" />} onClick={() => setOpen(false)}>
              Perfil
            </MenuLink>
            <MenuLink href="/configuracoes" icon={<Settings className="size-4" />} onClick={() => setOpen(false)}>
              Configurações
            </MenuLink>
            <div className="my-1 border-t border-border" />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-surface-2"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("flex items-center gap-2.5 rounded px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-surface-2")}
    >
      {icon}
      {children}
    </Link>
  );
}
