# API v1 — contrato para clientes (web + Flutter)

Base URL: `/api/v1`. Todas as respostas seguem o envelope:

```json
{ "data": <payload ou null>, "error": <mensagem ou null> }
```

Erros usam o status HTTP apropriado (400/401/404/409/500) com `data: null` e `error` preenchido.

## Autenticação

JWT de acesso (15 min) + refresh token (30 dias), rotacionado a cada refresh.

- `POST /api/v1/auth/register` — `{ name, email, password, phone?, barbershopName?, barbershopSlug?, city?, plan? }` → cria conta (e barbearia, se informado) e já retorna sessão.
- `POST /api/v1/auth/login` — `{ email, password }` → `{ user, accessToken, refreshToken }`. Também seta cookies httpOnly (usados pela sessão web); o Flutter deve guardar `accessToken`/`refreshToken` via `flutter_secure_storage` e ignorar os cookies.
- `POST /api/v1/auth/refresh` — `{ refreshToken }` (ou cookie) → novo par de tokens. O refresh antigo é revogado.
- `POST /api/v1/auth/logout` — revoga o refresh token atual.
- `GET /api/v1/me` — retorna `{ id, name, email, role, barbershopId }` do usuário autenticado.

Enviar o access token em requisições autenticadas via cookie (web) ou via header `Authorization: Bearer <accessToken>` (Flutter — `getSession()` em `src/lib/auth.ts` aceita ambos, cookie tem prioridade).

Papéis (`role`): `SUPER_ADMIN | OWNER | MANAGER | BARBER | CLIENT` (string simples — SQLite não suporta enum nativo no Prisma).

## Recursos (papel gestor — OWNER/MANAGER)

Todos abaixo exigem sessão válida vinculada a uma barbearia.

- `GET /api/v1/barbershop` — dados da barbearia do usuário logado (inclui `workingHours`). `PATCH` aceita campos de perfil/branding + `workingHours: [{dayOfWeek, isOpen, openTime, closeTime}]`.
- `GET /api/v1/appointments?barbershopId=...` — últimos 50 agendamentos. `POST` cria um agendamento (`status` sempre inicia `SCHEDULED`).
- `GET /api/v1/staff` — equipe com contagem de atendimentos e receita do mês. `POST { name, role?, specialties?, commissionRate? }`.
- `GET /api/v1/services` — serviços com contagem de agendamentos. `POST { name, duration, price, category?, description? }`. `PATCH /api/v1/services/{id}` (campos parciais, incl. `isActive`). `DELETE /api/v1/services/{id}` (falha com 409 se houver agendamentos vinculados).
- `GET /api/v1/products` — estoque. `POST { name, price, quantity?, minQuantity?, ... }`.
- `GET /api/v1/finance/transactions` — lançamentos manuais + resumo (`summary.income` já soma agendamentos concluídos + lançamentos tipo `INCOME`). `POST { type: "INCOME"|"EXPENSE", category, description, amount, date?, paymentMethod? }`.
- `GET /api/v1/clients` — clientes derivados dos agendamentos (ainda não existe uma entidade Cliente própria — ver nota abaixo).
- `GET /api/v1/dashboard/summary` — snapshot do dia + mês para a home do gestor.
- `GET /api/v1/dashboard/reports?range=week|month` — série temporal, distribuição de serviços, performance da equipe e novos×retornantes.

## Notas importantes para quem for consumir esta API (ex.: app Flutter)

- **Não existe entidade `Client` própria ainda.** `/api/v1/clients` agrupa `Appointment` por `clientId` (se vinculado a um `User`) ou por `clientPhone`. Isso é uma limitação conhecida, não um bug.
- **Não existem endpoints para papel `BARBER` ou `CLIENT` ainda** (ex.: "minha agenda", "meu histórico"). Esses nascem na Fase 3 do plano, junto com o app Flutter.
- CORS está liberado (`*`) em `src/proxy.ts` para todo `/api/v1/*` — revisar antes de produção real (restringir origem).
- Os handlers reais vivem nas rotas legadas (`/api/staff`, `/api/services`, etc.), usadas hoje pelo próprio dashboard web. As rotas `/api/v1/*` são wrappers finos (`src/lib/api/relay.ts`) que chamam a mesma lógica e reformatam a resposta no envelope acima — não há duas implementações para manter.
