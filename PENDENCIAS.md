# Pendências para o Assistente Clínico ficar completo

Levantamento feito em 02/11/2026 a partir do código atual. Marque `[x]` conforme for concluindo.

**Legenda de esforço:** **P** = até 1 dia · **M** = 2 a 4 dias · **G** = 1 a 2 semanas

---

## O que já está pronto

| Área | Situação |
|---|---|
| Login por link mágico, onboarding do profissional e perfil | ✅ Funcionando com o Supabase real |
| Pacientes: cadastro, edição, desativação, consentimento de WhatsApp | ✅ |
| Agenda: consultas com repetição semanal, checagem de conflito, status | ✅ |
| Evolução com IA a partir do ditado (Gemini ou Claude) | ✅ Gera e salva como rascunho |
| Apoio ao diagnóstico (agente com hipóteses, diferenciais e perguntas) | ✅ |
| Lembretes no WhatsApp, respostas Confirmar/Cancelar | ⚠️ Código pronto, só testado com o provedor `console` |
| Cobrança Pix (Mercado Pago) e webhook de pagamento | ⚠️ Código pronto, nunca testado com conta real |
| Landing page e identidade visual | ✅ |

---

## P0: obrigatório antes do piloto com um profissional real

### 1. Sessão: sair da conta e renovar o login automaticamente · **P**
- [ ] Botão **Sair** no menu (`supabase.auth.signOut()` e redirecionar para `/login`).
- [ ] Criar `src/proxy.ts` (o antigo `middleware.ts`, renomeado no Next 16) para **renovar o token do Supabase** a cada requisição, como recomenda o `@supabase/ssr`.
  - **Por quê:** hoje a sessão só é renovada quando uma ação do servidor roda. Depois de cerca de 1 hora parado, o usuário cai no login sem motivo aparente.

### 2. Envio de e-mail próprio (SMTP) · **P**
- [ ] Configurar um SMTP próprio no Supabase (Resend, Brevo ou Amazon SES), com domínio verificado.
- [ ] Traduzir os templates de e-mail do login para português.
  - **Por quê:** o SMTP padrão do Supabase só envia para membros da equipe do projeto e com limite baixo por hora. **Um psicólogo de fora não conseguiria fazer login.**

### 3. Revisão da evolução · **M** (item 3 do roadmap)
- [ ] Depois de gerar, permitir **editar cada campo** e **salvar como revisada** (`revisada = true`, `atualizado_em`).
- [ ] Página de detalhe da evolução, com o texto do ditado original e a versão final.
- [ ] Excluir rascunho que não será usado.
- [ ] Bloquear a edição depois de revisada, ou registrar o histórico de alterações, porque prontuário não pode ser alterado sem rastro.
- [ ] Imprimir ou exportar a evolução em PDF.

### 4. Editar e excluir consultas · **M**
- [ ] Remarcar (mudar data e hora) com a mesma checagem de conflito.
- [ ] Excluir consulta agendada por engano.
- [ ] **Cancelar a série recorrente** a partir de uma data. Hoje é preciso cancelar uma por uma. Isso exige guardar um `serie_id` nas consultas criadas juntas (nova migração).
- [ ] Ao remarcar, zerar `lembrete_enviado_em` para o lembrete ser enviado de novo.

### 5. IA com dados reais · **P**
- [ ] Trocar para **camada paga** (Gemini pago ou Anthropic) antes de qualquer dado real de paciente. Na camada gratuita do Gemini, o Google pode usar os dados enviados para treino.
- [ ] **Gerar uma chave nova do Gemini** e apagar a atual, que foi exposta numa conversa.
- [ ] Limite de uso por conta (ex.: X evoluções e análises por dia) para evitar custo descontrolado ou abuso.

### 6. Deploy em produção · **M**
- [ ] Projeto na Vercel com todas as variáveis de ambiente e domínio próprio.
- [ ] No Supabase: `site_url` e `additional_redirect_urls` com o domínio de produção (em `supabase/config.toml` e depois `npx supabase config push`).
- [ ] **Cron dos lembretes:** o plano gratuito da Vercel só roda cron **uma vez por dia**, e o lembrete precisa rodar de hora em hora. As opções são:
  - Vercel Pro;
  - `pg_cron` no Supabase chamando a rota;
  - um agendador externo (cron-job.org).
- [ ] Páginas de erro (404 e erro geral) com a identidade visual.

### 7. Documentos legais mínimos · **P** (texto com apoio jurídico)
- [ ] Termos de Uso e Política de Privacidade publicados e com links na tela de login. Hoje o texto cita os dois, mas sem link.
- [ ] Registro da data e da versão do aceite do profissional.

---

## P1: obrigatório antes de cobrar dos clientes

### 8. Pix caindo na conta do profissional · **G**
- [ ] Hoje existe **um único** `MERCADOPAGO_ACCESS_TOKEN`: **todo Pix cairia na sua conta, não na do psicólogo.**
- [ ] Implementar **OAuth do Mercado Pago**, em que cada profissional conecta a própria conta:
  - tela "Conectar Mercado Pago" no perfil e rota de retorno;
  - guardar `access_token` e `refresh_token` por profissional (criptografados) e renovar o token antes de expirar;
  - usar o token do profissional em `criarCobrancaPix` e `buscarPagamento`;
  - no webhook, identificar de qual profissional é o pagamento.
- [ ] Tratar profissional sem conta conectada: esconder o botão "Cobrar via Pix" e mostrar um aviso.

### 9. Tela de cobranças e financeiro · **M** (item 4 do roadmap)
- [ ] Lista de cobranças com filtro por status (pendente, paga, expirada) e por mês.
- [ ] Reenviar o Pix pelo WhatsApp, cancelar cobrança e marcar como paga manualmente (pagamento em dinheiro).
- [ ] Totais do mês: recebido, pendente e faltas cobradas.

### 10. Recibos e carnê-leão · **M** (item 5 do roadmap)
- [ ] Adicionar o **CPF do profissional** no perfil, exigido em recibo de saúde.
- [ ] Recibo em PDF por pagamento (dados do profissional, paciente, CPF, valor, data, CRP/CRM).
- [ ] Envio do recibo pelo WhatsApp e por e-mail.
- [ ] Exportação mensal no formato do **Receita Saúde / carnê-leão**.

### 11. WhatsApp oficial em produção · **M** (boa parte é burocracia)
- [ ] Conta Meta Business **verificada** (exige CNPJ) e número dedicado.
- [ ] Aprovar os 3 templates: `lembrete_consulta` (com botões Confirmar e Cancelar), `cobranca_sessao` e `pagamento_recebido`.
- [ ] Webhook cadastrado com a URL de produção e testado.
- [ ] **Descadastro:** paciente que responder "SAIR" deixa de receber mensagens (`aceita_whatsapp = false`).
- [ ] **Resposta não reconhecida:** encaminhar ao profissional. Hoje é ignorada; há um `TODO` em `src/lib/dominio/respostas.ts`.
- [ ] Guardar **data e forma do consentimento** do paciente (prova para a LGPD), não só um booleano.
- [ ] Testar o fluxo completo com um número real.

### 12. Assinatura do próprio SaaS · **G** (item 6 do roadmap)
- [ ] Definir plano e preço (posicionamento: plano único de R$ 49 a 59 com tudo incluído) e período de teste.
- [ ] **Mercado Pago Assinaturas** (preapproval) com webhook de status.
- [ ] Estados da conta: em teste, ativa, inadimplente e cancelada.
- [ ] Com a conta inadimplente, deixar o app **somente leitura**, sem bloquear o acesso aos dados. Essa é uma promessa da landing e um diferencial contra o iClinic.
- [ ] Tela "Minha assinatura" (plano, próxima cobrança, cancelar).

### 13. Portabilidade de dados · **M**
- [ ] **Exportar todos os dados** do profissional (pacientes, consultas, evoluções, cobranças) em CSV ou ZIP. A landing promete "seus dados sempre acessíveis".
- [ ] **Importar pacientes** de planilha (CSV), base da "migração assistida", que é o diferencial de venda.

### 14. LGPD, conselhos e regulação · **M** (com apoio jurídico)
- [ ] Contrato de operador de dados (DPA) com os profissionais e lista de suboperadores (Supabase, Vercel, Google ou Anthropic, Meta, Mercado Pago).
- [ ] Relatório de Impacto à Proteção de Dados (RIPD), porque o app trata dados sensíveis de saúde.
- [ ] **Log de acesso a prontuário** (quem viu ou alterou qual evolução e quando).
- [ ] Política de retenção: o prontuário psicológico deve ser guardado por **no mínimo 5 anos** (Resolução CFP 01/2009). Definir o que acontece quando a conta é cancelada (exportar e reter, sem apagar de imediato).
- [ ] Backups: o plano gratuito do Supabase não tem backup diário. Usar o plano Pro antes de ter dados reais.
- [ ] **ANVISA:** validar se o apoio ao diagnóstico se enquadra como software dispositivo médico (RDC 657/2022).
- [ ] **Médicos:** prontuário eletrônico sem papel exige certificação SBIS/CFM e assinatura digital ICP-Brasil (Resolução CFM 1.821/2007). Recomendação: **começar só com psicólogos** e tratar médicos depois.

### 15. Qualidade e operação · **M**
- [ ] Testes automatizados:
  - unitários (conversão de fuso, telefone e valores, checagem de conflito, interpretação de respostas do WhatsApp);
  - ponta a ponta com Playwright (login → paciente → consulta → evolução → cobrança).
- [ ] CI no GitHub Actions rodando `tsc`, testes e build a cada push.
- [ ] Monitoramento de erros (Sentry ou similar) e alertas para falhas de cron e de webhooks.
- [ ] Limite de requisições por usuário nas rotas de IA e cobrança.
- [ ] Gerar os tipos do banco (`npx supabase gen types`) para tirar os `as unknown as` do código.

---

## P2: melhorias depois do lançamento

- [ ] **Calendário semanal visual** (hoje a agenda é uma lista por dia).
- [ ] Busca e filtros na lista de pacientes.
- [ ] Link de teleconsulta (Meet ou Jitsi) nas consultas online, enviado no lembrete.
- [ ] Antecedência do lembrete configurável (24h, 2h, ambos).
- [ ] Resumo diário para o profissional pelo WhatsApp ("Hoje você tem 5 sessões, 1 não confirmada").
- [ ] **PWA instalável no celular**, já que o ditado é feito pelo telefone.
- [ ] Transcrição de áudio (`src/lib/ia/transcricao.ts` está preparado, ainda sem implementação).
- [ ] Modelos de evolução por abordagem (TCC, psicanálise, sistêmica).
- [ ] Painel de indicadores: taxa de faltas, receita do mês, pacientes ativos.
- [ ] Histórico de mensagens de WhatsApp na página do paciente.
- [ ] Modo clínica: vários profissionais, secretária com acesso só à agenda.
- [ ] Revisão de acessibilidade (contraste, navegação por teclado, leitores de tela).

---

## Sequência sugerida

| Etapa | Itens | Resultado |
|---|---|---|
| **1. Piloto fechado** (≈ 2 semanas) | 1 a 7 | Um psicólogo usando de verdade, com dados reais protegidos |
| **2. Primeiros pagantes** (≈ 3 a 4 semanas) | 8 a 12 | Cobra o paciente, recebe na própria conta e paga a assinatura |
| **3. Venda em escala** (contínuo) | 13 a 15, depois P2 | Migração fácil, conformidade documentada e operação monitorada |

**Fora do código, em paralelo:** seguir o critério combinado para o dia 30, que é ter **3 ou mais profissionais pagando** (mesmo que um valor simbólico) antes de investir nas etapas 2 e 3.
