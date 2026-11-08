# WhatsApp oficial: passo a passo

Como colocar o WhatsApp oficial da Meta (Cloud API) em produção. Levantado em 08/11/2026; as regras da Meta mudam com frequência, então confira limites e preços no painel.

Dá para **começar o piloto antes da verificação com CNPJ**: portfólios novos costumam ter limite de 250 destinatários por dia. A verificação serve para subir esse limite.

## O que ter em mãos

- [ ] App no ar, com HTTPS.
- [ ] Número exclusivo, que receba SMS ou ligação e não esteja em uso no WhatsApp comum. Um chip pré-pago serve.
- [ ] Para a verificação: CNPJ, documento da empresa e um site no domínio dela.

## 1. Criar a conta e o app

- [ ] Criar o portfólio em business.facebook.com.
- [ ] Em developers.facebook.com, criar um app do tipo **Business** e adicionar o produto **WhatsApp**.

## 2. Cadastrar o número

- [ ] Em **WhatsApp → API Setup**, adicionar o número, confirmar por SMS e definir o nome de exibição.
- [ ] Anotar o **Phone Number ID**.
- [ ] Cadastrar uma forma de pagamento no WhatsApp Manager. Sem ela, os templates não são enviados.

## 3. Verificar a empresa (pode ficar para depois do piloto)

- [ ] Em **Configurações do negócio → Central de Segurança**, enviar os documentos. O prazo é da Meta, então vale iniciar cedo.

## 4. Criar os templates

Em **WhatsApp Manager → Modelos de mensagem**, usar categoria **Utilidade** e idioma **Português (BR)**.

A Meta recusa textos que começam ou terminam com variável, e a numeração precisa ser crescente. **Use os textos abaixo, não os do README:** os de `cobranca_sessao` e `aviso_profissional` no README terminam com variável e seriam rejeitados. Os daqui mantêm a ordem dos parâmetros que o código envia.

| Nome | Corpo |
|---|---|
| `lembrete_consulta` | Olá, {{1}}! Lembrete da sua consulta com {{2}} {{3}} às {{4}}. Use os botões abaixo para responder. |
| `cobranca_sessao` | Olá, {{1}}! Segue o Pix da sessão ({{2}}). Copia e cola: {{3}}. Em caso de dúvida, responda esta mensagem. |
| `pagamento_recebido` | Olá, {{1}}! Recebemos seu pagamento de {{2}}. Obrigado! |
| `aviso_profissional` | Olá, {{1}}! A mensagem de {{2}} não foi respondida automaticamente: {{3}}. Fale diretamente com o paciente. |
| `recibo_sessao` | Olá, {{1}}! Seu recibo de {{2}} está disponível em {{3}} e pode ser salvo em PDF. O link vale por 30 dias. |

- [ ] No `lembrete_consulta`, adicionar dois botões de **resposta rápida**: `Confirmar` e `Cancelar`.
- [ ] Preencher os exemplos com dados fictícios, nunca com dados de pacientes.
- [ ] Enviar os 5 para aprovação.

## 5. Gerar o token permanente

- [ ] Em **Configurações do negócio → Usuários do sistema**, criar um usuário Admin.
- [ ] Atribuir a ele o app e a conta do WhatsApp.
- [ ] Gerar um token sem validade, com `whatsapp_business_messaging` e `whatsapp_business_management`.

## 6. Configurar a Vercel e fazer o redeploy

```
WHATSAPP_PROVIDER=meta
META_WHATSAPP_TOKEN=<token do passo 5>
META_WHATSAPP_PHONE_NUMBER_ID=<ID do passo 2>
META_APP_SECRET=<Configurações do app → Básico>
META_WEBHOOK_VERIFY_TOKEN=<valor aleatório criado por você>
RECIBO_LINK_SECRET=<outro valor aleatório, para o link do recibo>
```

## 7. Cadastrar o webhook

- [ ] Em **WhatsApp → Configuração**, usar a URL `https://seudominio/api/webhooks/whatsapp` e o mesmo verify token.
- [ ] Assinar o campo **`messages`**.
- [ ] Colocar o app em modo **Live**. A página `/privacidade` serve como política de privacidade.

## 8. Testar com um número real

Cadastre a si mesmo como paciente, com autorização de WhatsApp, e crie uma consulta para as próximas 24h. Como o cron roda uma vez por dia, dispare o lembrete manualmente:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seudominio/api/cron/lembretes
```

- [ ] O botão **Confirmar** muda o status na agenda.
- [ ] Escrever **SAIR** descadastra o paciente.
- [ ] Uma mensagem qualquer chega ao profissional pelo `aviso_profissional`.
- [ ] A cobrança Pix chega ao paciente.
- [ ] Em **Financeiro**, marcar a cobrança como paga e usar **Enviar no WhatsApp**: o link abre o recibo sem login.

## Avisos

- **Custo:** cada lembrete é cobrado, porque normalmente sai fora da janela de 24h de conversa. Estimativas de terceiros ficam entre R$ 0,04 e R$ 0,08 por mensagem; confirme na tabela oficial.
- **Possível bug com quebra de linha:** `src/lib/dominio/respostas.ts:75` envia o texto do paciente como veio, e guias de terceiros dizem que a Meta recusa quebras de linha em variáveis. Se isso se confirmar, mensagens com mais de uma linha não chegariam ao profissional. Trocar as quebras por espaço resolve.

## Fontes

- [Revisão de templates (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review/)
- [Aprovação de templates (Twilio)](https://live.docs.dev.twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses.md)
- [Limites de mensagens (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)
- [Preços (Meta)](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)
- [Calculadora de preços Brasil (Hyperleap)](https://hyperleap.ai/whatsapp-pricing-calculator-brazil)
- [Preços 2026 (Blueticks)](https://blueticks.co/blog/whatsapp-business-api-pricing-2026)
- [Envio pela API e token de usuário do sistema (Chatarmin)](https://chatarmin.com/en/blog/whats-app-api-send-messages)
