import type { Metadata } from "next";
import { PaginaLegal } from "@/components/pagina-legal";

export const metadata: Metadata = { title: "Política de Privacidade · Assistente Clínico" };

// MODELO: revisar com advogado antes de comercializar (ver PENDENCIAS.md, itens 7 e 14).
export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <h2>1. Papéis na LGPD</h2>
      <ul>
        <li>Dados do profissional (cadastro, assinatura): a plataforma é controladora.</li>
        <li>Dados dos pacientes, inclusive dados de saúde: o profissional é o controlador e a plataforma é operadora, tratando os dados apenas para prestar o serviço contratado.</li>
      </ul>
      <h2>2. Dados tratados</h2>
      <ul>
        <li>Profissional: nome, e-mail, telefone, registro profissional, CPF, chave Pix e dados de assinatura.</li>
        <li>Pacientes: identificação e contato, consultas, evoluções, análises de apoio ao diagnóstico e cobranças.</li>
      </ul>
      <h2>3. Inteligência artificial</h2>
      <p>
        Para gerar evoluções e hipóteses, o texto ditado pelo profissional é enviado a provedores de IA. O nome e os
        documentos do paciente não são enviados no apoio ao diagnóstico. Usamos apenas provedores e planos que não utilizam
        os dados enviados para treinar modelos.
      </p>
      <h2>4. Suboperadores</h2>
      <p>
        Hospedagem e banco de dados (Supabase, Vercel), provedores de IA, Meta (WhatsApp) e Mercado Pago (assinatura da
        plataforma). A lista atualizada é disponibilizada mediante solicitação.
      </p>
      <h2>5. Segurança</h2>
      <ul>
        <li>Isolamento de dados por profissional no banco (Row Level Security).</li>
        <li>Registro de acessos a prontuários e exportações.</li>
        <li>Evoluções revisadas não podem ser alteradas nem excluídas.</li>
      </ul>
      <h2>6. Retenção</h2>
      <p>
        Os dados permanecem disponíveis enquanto a conta existir, inclusive em modo somente leitura. Prontuários devem ser
        guardados pelo prazo exigido pelo conselho profissional (no mínimo 5 anos para psicologia), e o profissional pode
        exportá-los a qualquer momento.
      </p>
      <h2>7. Direitos dos titulares</h2>
      <p>
        Pedidos de pacientes sobre seus dados devem ser direcionados ao profissional responsável, a quem daremos suporte. O
        profissional pode exercer seus direitos pelo e-mail de contato da plataforma.
      </p>
    </PaginaLegal>
  );
}
