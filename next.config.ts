import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dados de saúde: nunca deixar o navegador cachear páginas autenticadas.
  async headers() {
    return [
      {
        source: "/(agenda|pacientes|evolucoes)(.*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        // Recibo aberto pelo paciente: o link é a credencial, então não pode vazar nem ser indexado.
        source: "/r/:token*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
