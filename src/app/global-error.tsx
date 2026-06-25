"use client";

import { useEffect } from "react";

/**
 * Captura erros que acontecem no próprio root layout (onde error.tsx
 * normal não alcança). Precisa renderizar <html> e <body> próprios e
 * não pode depender do design system, pois o layout falhou.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#a1a1a1" }}>
            Encontramos um erro inesperado ao carregar o aplicativo.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              borderRadius: "0.375rem",
              border: "none",
              background: "#1c9cf0",
              color: "#fff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
