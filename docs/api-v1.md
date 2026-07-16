# API v1 — contrato para clientes (web + Flutter)

Base URL: `/api/v1`. Todas as respostas seguem o envelope:

```json
{ "data": <payload ou null>, "error": <mensagem ou null> }
```

Erros usam o status HTTP apropriado (400/401/404/409/500) com `data: null` e `error` preenchido.

## Autenticação

JWT de acesso (15 min) + refresh token (30 dias), rotacionado a cada refresh.

- `POST /api/v1/auth/register` — `{ name, email, password, phone?, barbershopName?, barbershopSlug?, city?, plan? }` → cria conta (e barbearia, se informado) e já retorna sessão.
- `POST /api/v1/auth/login` — `{ email, password }` → `{ user, accessToken, refreshToken }`. Também seta cookies httpOnly (usados pela sessão web); o Flutter guarda `accessToken`/`refreshToken` via `flutter_secure_storage` (nativo) ou `shared_preferences` (web) e ignora os cookies.
- `POST /api/v1/auth/refresh` — `{ refreshToken }` (ou cookie) → novo par de tokens. O refresh antigo é revogado.
- `POST /api/v1/auth/logout` — revoga o refresh token atual.
- `GET /api/v1/me` — retorna `{ id, name, email, role, barbershopId }` do usuário autenticado.

Enviar o access token em requisições autenticadas via cookie (web) ou via header `Authorization: Bearer <accessToken>` (Flutter — `getSession()` em `src/lib/auth.ts` aceita ambos, cookie tem prioridade).

Papéis (`role`): `SUPER_ADMIN | OWNER | MANAGER | BARBER | CLIENT` (string simples — SQLite não suporta enum nativo no Prisma).

## Recursos — papel gestor (OWNER/MANAGER)

Todos abaixo exigem sessão válida vinculada a uma barbearia.

- `GET /api/v1/barbershop` — dados da barbearia do usuário logado (inclui `workingHours`). `PATCH` aceita campos de perfil/branding + `workingHours: [{dayOfWeek, isOpen, openTime, closeTime}]`. Campos recentes: `pixKey` (gorjetas), `faqText` (base do chatbot).
- `GET /api/v1/appointments?barbershopId=...` — últimos 50 agendamentos. `POST` cria um agendamento (`status` sempre inicia `SCHEDULED`). `PATCH /api/v1/appointments/{id}` atualiza status/dados.
- `GET /api/v1/staff` — equipe com contagem de atendimentos e receita do mês. `POST { name, role?, specialties?, commissionRate? }`. `PATCH/DELETE /api/v1/staff/{id}`.
- `GET /api/v1/services` — serviços com contagem de agendamentos. `POST { name, duration, price, category?, description?, image? }`. `PATCH /api/v1/services/{id}` (campos parciais, incl. `isActive`). `DELETE /api/v1/services/{id}` (falha com 409 se houver agendamentos vinculados).
- `GET /api/v1/products` — estoque. `POST { name, price, quantity?, minQuantity?, ... }`.
- `GET /api/v1/finance/transactions` — lançamentos manuais + resumo (`summary.income` já soma agendamentos concluídos + lançamentos tipo `INCOME`). `POST { type: "INCOME"|"EXPENSE", category, description, amount, date?, paymentMethod? }`.
- `GET /api/v1/clients` — lista de clientes da barbearia. Mescla clientes pré-cadastrados (`BarbershopClient`, ex.: cadastrados pelo barbeiro sem agendamento ainda) com clientes derivados de `Appointment` (por `clientId` ou `clientPhone`, para quem agendou como convidado). `POST /api/v1/clients` pré-cadastra um cliente sem agendamento.
- `GET /api/v1/dashboard/summary` — snapshot do dia + mês para a home do gestor.
- `GET /api/v1/dashboard/reports?range=week|month` — série temporal, distribuição de serviços, performance da equipe e novos×retornantes.
- `GET /api/v1/loyalty` — configuração e visão geral do programa de fidelidade da barbearia.
- `POST /api/v1/upload` — upload de imagem (logo, banner, foto de serviço/produto/staff), devolve a URL pública em `/uploads/...`.

### Copiloto (IA de negócio — Pro+)

Exclusivo dos planos com IA (`planHasAI` em `src/lib/billing.ts`). Fora do Pro+ retornam `locked: true` / 403.

- `GET /api/v1/copilot/briefing` — resumo proativo do dia (sumidos, horários vazios, agendamentos a confirmar, estoque baixo, faturamento) como cards com `action` de 1 toque. Funciona com dados reais mesmo sem chave de IA.
- `POST /api/v1/copilot/action` — `{ action }` executa uma ação: `confirm_tomorrow` | `winback_churned` | `notify_waitlist`.
- `POST /api/v1/copilot/chat` — `{ messages: [{role, content}] }` → `{ reply, aiPowered, suggestions, note }`. Role-aware (gestor vs barbeiro). Com IA ligada, também administra por conversa (cadastrar serviço, mudar preço, dar folga). Sem chave, responde em modo simulado (determinístico).
- `POST /api/v1/copilot/marketing` — `{ occasion }` → texto de campanha pronto (redator de marketing com IA).

## Recursos — papel barbeiro (BARBER)

- `GET /api/v1/barber/appointments?from=&to=` — agenda do barbeiro logado (filtros de data opcionais, usados pelo calendário do app).
- `GET /api/v1/barber/stats` — resumo de ganhos/comissão e atendimentos do período.
- `GET /api/v1/barber/tips` — gorjetas (PIX) do barbeiro no mês.
- `GET /api/v1/barber/clients/ranking` — clientes do barbeiro ordenados por número de visitas (usado no pódio de "top clientes").
- `GET /api/v1/barber/clients/history` — histórico de atendimentos por cliente.
- `GET /api/v1/barber/client-preferences?clientId=` — preferências (ficha) do cliente, mostradas no atendimento.
- `GET /api/v1/barber/last-recipe?clientId=` — "receita" do último corte do cliente, pré-carregada na finalização.
- `POST /api/v1/barber/analyze-reference` — `{ imageUrl }` → descrição técnica da foto de referência via IA (Pro+; `{available:false}` sem chave).
- Finalização do atendimento: `PATCH /api/v1/appointments/{id}` aceita, além de `status`, os campos `resultPhoto` (foto do "depois", que cai na Carteira do cliente) e `recipeMachine/recipeFinish/recipeProducts/recipeNotes` (receita do corte). Status de check-in ao vivo: `ARRIVED` → `IN_PROGRESS` → `COMPLETED`.
- `GET /api/v1/clients` — mesma rota do gestor: também devolve os clientes pré-cadastrados pelo próprio barbeiro (via `BarbershopClient`), mesmo com zero visitas.
- Copiloto pessoal: usa `POST /api/v1/copilot/chat` (o servidor resolve o papel BARBER pela sessão).

## Recursos — papel cliente (CLIENT)

- `GET /api/v1/client/barbershops` — barbearias com as quais o cliente já tem vínculo (agendou ou foi cadastrado).
- `GET /api/v1/barbershop?slug=...` — detalhe público de uma barbearia para montar a tela de agendamento (serviços, equipe com foto/especialidade, horários, cores da marca).
- `GET /api/v1/client/appointments` — histórico e próximos agendamentos do cliente logado (inclui `hasTip`, `resultPhoto`, `referencePhoto`).
- `GET /api/v1/client/loyalty` — saldo de pontos e nível do cliente por barbearia.
- `GET/POST /api/v1/client/reviews` — avaliação (nota + comentário) de um agendamento concluído.
- `GET /api/v1/client/cuts` · `POST` · `DELETE /api/v1/client/cuts/{id}` — Carteira de Cortes (fotos de referência do cliente).
- `GET/PUT /api/v1/client/preferences` — ficha de preferências do cliente (máquina, produtos, alergias, conversa...).
- `GET /api/v1/client/queue?appointmentId=` — fila ao vivo: posição, pessoas à frente e espera estimada (consultado em polling).
- `GET/POST /api/v1/client/tips` — gorjeta via PIX (info da chave + registro da gorjeta de um atendimento concluído).
- `POST /api/v1/client/waitlist` — entra na fila de espera da barbearia (Auto-avise).
- `POST /api/v1/appointments` — criação de agendamento (wizard público `/booking/[slug]` e app do cliente); aceita `referencePhoto`.
- `POST /api/v1/chatbot` — `{ message, sessionId, barbershopId }` → `{ response }`. Assistente do cliente: IA com tool-use (agendar/remarcar/cancelar/fila/upsell + FAQ) quando Pro+ e chave configurada; senão respostas prontas.

## Notas importantes para quem for consumir esta API

- CORS está liberado (`*`) em `src/proxy.ts` para `/api/v1/*` e `/uploads/*` (necessário porque o Flutter Web busca imagens via XHR, sujeito a CORS) — **revisar antes de produção real** (restringir origem).
- Os handlers reais de boa parte das rotas do gestor vivem nas rotas legadas (`/api/staff`, `/api/services`, etc.), usadas hoje pelo próprio painel web. As rotas `/api/v1/*` equivalentes são wrappers finos (`src/lib/api/relay.ts`) que chamam a mesma lógica e reformatam a resposta no envelope acima — não há duas implementações para manter. Barbeiro e cliente têm rotas nativas em `/api/v1` (sem equivalente legado, pois não existiam antes da API v1).
- Não existe cobrança automática — o campo `Barbershop.plan` é alterado diretamente (`PATCH /api/v1/barbershop`); a estrutura de Mercado Pago existe mas o gateway ainda não cobra a mensalidade sozinho.
- **IA**: Copiloto e chatbot usam o Claude (Anthropic) e só ligam com `ANTHROPIC_API_KEY` definido **e** plano Pro+. Sem isso, tudo cai em modo simulado/respostas prontas (nada quebra). Modelo configurável via `CHATBOT_MODEL`.
- **Webhooks/cron (fora do `/api/v1`)**: `GET/POST /api/webhooks/whatsapp` (bot 24/7 de entrada — requer credenciais da Meta + `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BARBERSHOP_ID`); `GET /api/cron/weekly-report?secret=` (relatório semanal, protegido por `CRON_SECRET`, agendado no `render.yaml`).
