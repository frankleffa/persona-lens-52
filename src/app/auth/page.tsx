"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

const bullets = [
  "Google Ads, Meta Ads e GA4 em um só painel",
  "Gestão de campanhas, clientes e CRM",
  "Relatórios e automações para sua carteira",
];

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  // Destino pós-login: respeita ?next= deixado pelo AuthGuard (sem cair fora do app).
  function nextDest() {
    if (typeof window === "undefined") return "/dashboard";
    const raw = new URLSearchParams(window.location.search).get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return "/dashboard";
  }

  function validate() {
    const e: { email?: string; password?: string; name?: string } = {};
    if (!isLogin && fullName.trim().length < 2) e.name = "Informe seu nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido.";
    if (password.length < 6) e.password = "A senha precisa de ao menos 6 caracteres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // Já autenticado? vai direto pro app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(nextDest());
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso.");
        router.replace(nextDest());
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo:
              typeof window !== "undefined" ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso.");
          router.replace(nextDest());
        } else {
          toast.success("Conta criada! Confirme seu e-mail para entrar.");
          setIsLogin(true);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 10%, var(--primary-soft), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            AdScape
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="eyebrow mb-4">Inteligência de tráfego pago</p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
            O superapp do gestor de tráfego.
          </h2>
          <ul className="mt-8 flex flex-col gap-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-soft-foreground">
          © {new Date().getFullYear()} AdScape
        </p>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center bg-background px-6 py-12">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="text-base font-bold">A</span>
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isLogin ? "Entrar na sua conta" : "Criar sua conta"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isLogin
              ? "Acesse seu painel de gestão de tráfego."
              : "Comece a gerenciar suas campanhas e clientes."}
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
            {!isLogin && (
              <Field label="Nome completo" error={errors.name}>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  className={errors.name ? "border-destructive focus:border-destructive" : ""}
                />
              </Field>
            )}
            <Field label="E-mail" error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                className={errors.email ? "border-destructive focus:border-destructive" : ""}
              />
            </Field>
            <Field label="Senha" error={errors.password}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                aria-invalid={!!errors.password}
                className={errors.password ? "border-destructive focus:border-destructive" : ""}
              />
            </Field>

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading && <Loader2 className="animate-spin" />}
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
