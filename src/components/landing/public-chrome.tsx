"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { label: "Recursos", href: "/#recursos" },
  { label: "Preços", href: "/precos" },
  { label: "Depoimentos", href: "/#depoimentos" },
  { label: "FAQ", href: "/#faq" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <span className="text-sm font-bold">A</span>
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">AdScape</span>
    </Link>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/auth">Entrar</Link>
          </Button>
          <Button size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/auth">Começar grátis</Link>
          </Button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="grid size-9 place-items-center rounded-md border border-border bg-surface text-foreground md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Button variant="outline" asChild className="flex-1"><Link href="/auth" onClick={() => setOpen(false)}>Entrar</Link></Button>
              <Button asChild className="flex-1"><Link href="/auth" onClick={() => setOpen(false)}>Começar grátis</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm lg:flex-row lg:px-8">
        <Logo />
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground">
          <Link href="/#recursos" className="hover:text-foreground">Recursos</Link>
          <Link href="/precos" className="hover:text-foreground">Preços</Link>
          <Link href="/auth" className="hover:text-foreground">Entrar</Link>
          <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
          <Link href="/termos" className="hover:text-foreground">Termos</Link>
        </div>
        <p className="text-xs text-soft-foreground">© {new Date().getFullYear()} AdScape</p>
      </div>
    </footer>
  );
}
