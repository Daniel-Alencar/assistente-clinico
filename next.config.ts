import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dados de saúde: nunca deixar o navegador cachear páginas autenticadas.
  async headers() {
    return [
      {
        source: "/(agenda|pacientes|evolucoes)(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
