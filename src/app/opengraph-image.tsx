import { ImageResponse } from "next/og";

export const alt = "AdScape — O superapp do gestor de tráfego";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          backgroundImage:
            "radial-gradient(60% 60% at 80% 0%, rgba(28,156,240,0.22), transparent 60%)",
          padding: 72,
          color: "#f1efe9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#1c9cf0",
              color: "#04141f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            A
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>AdScape</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 920 }}>
            O superapp do gestor de tráfego
          </div>
          <div style={{ fontSize: 30, color: "rgba(241,239,233,0.6)", maxWidth: 820 }}>
            Campanhas, clientes, CRM e relatórios no WhatsApp — em um só lugar.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 24, color: "rgba(241,239,233,0.7)" }}>
          <span>Google Ads</span>
          <span>·</span>
          <span>Meta Ads</span>
          <span>·</span>
          <span>GA4</span>
          <span>·</span>
          <span>WhatsApp</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
