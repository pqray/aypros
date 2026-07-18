# Fase 19 - Copiloto de contato

Status: planejada. Implementação pendente.

## Objetivo

Criar um assistente de IA dentro do fluxo de contato do lead, com experiência de chat, para ajudar o vendedor a registrar o que aconteceu na conversa e decidir o próximo passo.

A ideia é o usuário escrever algo natural, por exemplo: "falei com a Rayssa, ela disse que agora não vê necessidade porque já recebe indicação, mas aceitou olhar um diagnóstico mês que vem". A IA deve devolver uma leitura comercial útil, não apenas corrigir texto:

- resumo objetivo do contato;
- objeção principal;
- intenção/sentimento do lead;
- sugestão de resposta ou follow-up;
- próxima ação recomendada;
- sugestão de estágio/status quando fizer sentido;
- nota estruturada pronta para salvar no histórico.

## Specs-base

`00-project-rules.md`, `03-design-system.md`, `12-pipeline-crm.md`, `13-ai-groq.md`, `14-data-fetching-state.md`, `16-testing.md`, `17-security.md`, `19-backend-api.md`.

## UX proposta

- No detalhe do lead, substituir o campo simples de "Nota opcional" em "Registrar contato" por um painel "Copiloto de contato".
- O painel deve parecer uma conversa:
  - mensagens do vendedor;
  - resposta da IA com cards escaneáveis;
  - ações rápidas para aplicar sugestões.
- O vendedor continua no controle: nada deve alterar estágio, status, próxima ação ou notas sem confirmação explícita.
- A IA deve oferecer botões como:
  - "Salvar como nota";
  - "Registrar contato";
  - "Aplicar próxima ação";
  - "Gerar resposta WhatsApp";
  - "Gerar e-mail de follow-up".
- Quando a IA sugerir mudança de estágio/status, mostrar uma confirmação clara antes de aplicar.
- Erros e limites devem aparecer em toast, sem texto feio abaixo do campo.

## Fluxo principal

1. Usuário abre um lead.
2. Em "Registrar contato", escolhe o canal: WhatsApp, e-mail, telefone ou outro.
3. Escreve em linguagem livre o que aconteceu.
4. Clica em "Analisar conversa".
5. API monta input com:
   - empresa;
   - lead;
   - última auditoria/score/briefing quando disponível;
   - notas recentes;
   - atividades recentes;
   - texto livre do usuário;
   - canal do contato.
6. IA retorna JSON estruturado.
7. UI exibe:
   - resumo;
   - objeções;
   - sinais positivos/negativos;
   - resposta sugerida;
   - próxima ação;
   - nota pronta.
8. Usuário salva/aplica apenas o que quiser.

## Contrato de IA

Novo kind proposto: `contact_copilot`.

Prompt versionado inicial: `contact-copilot-v1`.

Saída esperada:

```json
{
  "summary": "",
  "customerPosition": "",
  "objections": [],
  "positiveSignals": [],
  "risks": [],
  "recommendedReply": "",
  "recommendedNextAction": {
    "label": "",
    "dueInDays": 0,
    "reason": ""
  },
  "suggestedLeadPatch": {
    "stage": null,
    "status": null,
    "potentialValue": null
  },
  "noteDraft": "",
  "confidenceNotes": []
}
```

Regras:

- Usar como fato apenas o texto do vendedor e os dados já existentes do lead/empresa.
- Não inventar orçamento, urgência, pessoa decisora, canal social, concorrente ou promessa comercial.
- Se a fala do cliente for ambígua, marcar em `confidenceNotes`.
- Não aplicar alterações automaticamente.
- Não transformar objeção leve em lead perdido sem sinal claro.
- Não insistir agressivamente quando o cliente sinalizar ausência de necessidade; sugerir follow-up consultivo ou nutrição.

## Backend

Rotas propostas:

- `POST /v1/leads/:id/contact-copilot`
  - recebe `{ channel, transcript }`;
  - valida org/membership;
  - monta input estruturado server-side;
  - chama Groq;
  - valida JSON com Zod;
  - retorna análise sem gravar mudanças no lead.
- Opcional, se fizer sentido depois:
  - `POST /v1/leads/:id/contact-copilot/apply`
  - aplica nota, contato e patch do lead em uma operação transacional.

Persistência proposta:

- Reutilizar `ai_generations` com `kind = contact_copilot`, ligado a `business_id` e `lead_id`.
- Guardar `prompt_version`, `input_hash`, `content_json`, `model`, `tokens_used` e status.
- O registro de contato continua em `POST /v1/leads/:id/contacts`.
- A nota final continua em `POST /v1/leads/:id/notes`.

## Frontend

Arquivos prováveis:

- `apps/web/src/features/pipeline/components/contact-copilot-card.tsx`
- `apps/web/src/features/pipeline/components/lead-detail-view.tsx`
- `apps/web/src/features/pipeline/api.ts`
- `apps/web/src/features/pipeline/queries.ts`
- testes do novo card e do fluxo de aplicação.

Comportamento esperado:

- Campo principal com placeholder orientado: "Cole ou descreva como foi a conversa..."
- Botão "Analisar conversa" com loading dentro do botão, sem spinner solto ao lado do ícone.
- Resultado em blocos visuais, não texto corrido.
- Botões de aplicação com estado pendente e rollback via TanStack Query quando necessário.
- Histórico recente do copiloto visível ou acessível, para não perder a análise ao trocar de aba.

## Critérios de aceite

- [ ] Usuário consegue escrever uma conversa livre e receber análise estruturada.
- [ ] IA sugere nota, próxima ação e resposta de follow-up.
- [ ] Usuário consegue salvar a nota sugerida.
- [ ] Usuário consegue registrar o contato a partir da análise.
- [ ] Usuário consegue aplicar próxima ação sugerida com confirmação.
- [ ] Mudança de estágio/status nunca acontece automaticamente.
- [ ] Erros de IA/API aparecem em toast.
- [ ] Resultado não vira bloco gigante de texto.
- [ ] Histórico do lead é invalidado/atualizado corretamente.
- [ ] Rate limit de IA é respeitado por organização.

## Testes automatizados

- [ ] Schema Zod aceita saída válida e rejeita JSON incompleto.
- [ ] Prompt contém regras anti-alucinação e não aplicação automática.
- [ ] API bloqueia lead fora da organização.
- [ ] API retorna 503 amigável quando `GROQ_API_KEY` não existe.
- [ ] UI renderiza empty state, loading, erro e análise.
- [ ] Botões "Salvar nota" e "Registrar contato" chamam mutations corretas.

## Fora do escopo

- Transcrição automática de áudio.
- Envio automático de WhatsApp/e-mail.
- Integração direta com inbox.
- Agente autônomo que muda pipeline sozinho.
- Treinamento customizado por vendedor.

