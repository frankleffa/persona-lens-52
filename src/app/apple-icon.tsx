import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c9cf0",
          color: "#04141f",
          fontSize: 120,
          fontWeight: 800,
          borderRadius: 40,
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
