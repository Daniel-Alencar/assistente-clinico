import type { Metadata } from "next";
import { PaginaLegal } from "@/components/pagina-legal";

export const metadata: Metadata = { title: "Termos de Uso · Assistente Clínico" };

// MODELO: revisar com advogado antes de comercializar (ver PENDENCIAS.md, item 7).
export default function Termos() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <h2>1. O serviço</h2>
      <p>
        O Assistente Clínico é uma plataforma para profissionais de saúde organizarem agenda, lembretes aos pacientes,
        registros de sessão, cobranças e apoio à decisão clínica com inteligência artificial.
      </p>
      <h2>2. Quem pode usar</h2>
      <p>
        Profissionais de saúde com registro ativo no respectivo conselho. O profissional é responsável pelas informações
        que cadastra e pelo uso que faz da plataforma em sua prática.
      </p>
      <h2>3. Assinatura</h2>
      <ul>
        <li>O acesso aos recursos é feito por assinatura mensal, com período de teste gratuito.</li>
        <li>Sem assinatura ativa, a conta fica em modo somente leitura: os dados continuam acessíveis e exportáveis.</li>
        <li>O cancelamento pode ser feito a qualquer momento pela própria plataforma.</li>
      </ul>
      <h2>4. Inteligência artificial</h2>
      <p>
        As evoluções e as hipóteses diagnósticas geradas por IA são sugestões a partir do relato do profissional. Elas não
        substituem a avaliação clínica: a revisão, o diagnóstico e as condutas são de responsabilidade exclusiva do
        profissional. Os registros só passam a valer como prontuário após a revisão do profissional.
      </p>
      <h2>5. Cobranças aos pacientes</h2>
      <p>
        O Pix das sessões é gerado com a chave do próprio profissional e o valor é pago diretamente a ele. A plataforma não
        recebe, retém nem intermedeia esses valores, e não emite documentos fiscais em nome do profissional.
      </p>
      <h2>6. Mensagens aos pacientes</h2>
      <p>
        O profissional declara ter obtido o consentimento de cada paciente antes de ativar o envio de mensagens pelo
        WhatsApp. O paciente pode deixar de receber mensagens a qualquer momento respondendo &quot;SAIR&quot;.
      </p>
      <h2>7. Dados e privacidade</h2>
      <p>
        O tratamento de dados pessoais segue a <a href="/privacidade" className="text-marca underline">Política de Privacidade</a>.
        Em relação aos dados dos pacientes, o profissional é o controlador e a plataforma atua como operadora.
      </p>
      <h2>8. Alterações</h2>
      <p>Mudanças relevantes nestes termos serão comunicadas e exigirão novo aceite.</p>
    </PaginaLegal>
  );
}
