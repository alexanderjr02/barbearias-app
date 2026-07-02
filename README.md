<div align="center">

# ✂️ CORTIX

### Sistema de Gestão Completo para Barbearias Modernas

**Agendamento online • Chatbot inteligente • Gestão financeira • Multi-tenant SaaS**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)

</div>

---

## 📌 O que é o CORTIX?

O **CORTIX** é uma plataforma SaaS (Software as a Service) criada para barbearias que querem profissionalizar sua gestão. Com ele, o dono da barbearia tem controle total do negócio em um único lugar: agenda online, finanças, estoque, equipe, marketing e um chatbot que atende os clientes automaticamente — 24 horas por dia, 7 dias por semana.

Cada barbearia cadastrada recebe uma **página de agendamento personalizada** com suas cores, logo e identidade visual, que pode ser compartilhada no WhatsApp e redes sociais para que os clientes agendem sem precisar ligar.

---

## 🚀 Funcionalidades Principais

### Para o dono da barbearia (painel administrativo)

| Funcionalidade | Descrição |
|---|---|
| **Dashboard** | Visão geral em tempo real: receita do dia, agendamentos, clientes ativos e ticket médio |
| **Agendamentos** | Lista completa com filtros por status (agendado, em andamento, concluído, cancelado) |
| **Clientes** | Histórico de visitas, gasto total, ticket médio e identificação de clientes VIP |
| **Equipe** | Gestão de barbeiros com controle de comissão, avaliações e performance mensal |
| **Serviços** | Cadastro de serviços com preço, duração e categorias (Corte, Barba, Combo, Tratamento) |
| **Financeiro** | Receitas vs Despesas com gráfico interativo por semana ou mês |
| **Estoque** | Controle de produtos com alerta automático quando o estoque está baixo |
| **Marketing** | Campanhas de WhatsApp/Email/SMS e automações (lembretes, aniversariantes, inativos) |
| **Configurações** | Personalização de cores, horários de funcionamento, plano e notificações |

### Para o cliente final (página pública de agendamento)

O cliente acessa o link da barbearia e passa por um fluxo simples em 5 passos:

1. **Escolhe o serviço** — com preço e duração exibidos
2. **Escolhe o barbeiro** — com avaliações visíveis
3. **Escolhe a data e horário** — apenas slots disponíveis são exibidos
4. **Informa nome e WhatsApp**
5. **Confirma o agendamento** — recebe confirmação no WhatsApp

### Chatbot inteligente

O chatbot aparece em todas as páginas públicas e responde automaticamente perguntas como:
- Horário de funcionamento
- Lista de serviços e preços
- Como agendar
- Informações de contato

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Para que serve |
|---|---|
| **Next.js 16 (App Router)** | Framework React fullstack — controla tanto o frontend quanto as rotas de API |
| **TypeScript** | Tipagem estática que evita erros e melhora a manutenção do código |
| **Tailwind CSS v4** | Estilização moderna com classes utilitárias direto no HTML |
| **Prisma ORM** | Interface para o banco de dados — permite escrever queries como código TypeScript |
| **SQLite** (dev) | Banco de dados local para desenvolvimento, sem necessidade de servidor externo |
| **Recharts** | Biblioteca de gráficos para os dashboards de receita e despesas |
| **Lucide Icons** | Biblioteca de ícones moderna usada em todo o sistema |
| **Radix UI** | Componentes acessíveis (dropdowns, dialogs, switches, etc.) |
| **clsx + tailwind-merge** | Utilitários para compor classes CSS de forma segura |
| **date-fns** | Biblioteca de manipulação de datas em português |
| **React Hook Form + Zod** | Formulários com validação tipada |

---

## 📁 Estrutura do Projeto

```
cortix/
├── prisma/
│   ├── schema.prisma          # Definição de todos os modelos do banco de dados
│   └── seed.ts                # Script para popular o banco com dados de demonstração
│
├── src/
│   ├── app/
│   │   ├── (auth)/            # Grupo de rotas de autenticação (não aparecem na URL)
│   │   │   ├── layout.tsx     # Layout compartilhado: form à esquerda + painel à direita
│   │   │   ├── login/         # Página de login
│   │   │   └── register/      # Página de cadastro (2 etapas: dados pessoais + barbearia)
│   │   │
│   │   ├── (dashboard)/       # Grupo de rotas do painel administrativo
│   │   │   ├── layout.tsx     # Layout com sidebar fixa + topbar + área de conteúdo
│   │   │   └── dashboard/
│   │   │       ├── page.tsx           # Visão geral (métricas + gráfico + agendamentos)
│   │   │       ├── appointments/      # Tabela de agendamentos com filtros
│   │   │       ├── clients/           # Grid de clientes com info de VIPs
│   │   │       ├── staff/             # Cards de barbeiros com performance
│   │   │       ├── services/          # Grid de serviços com toggle ativo/inativo
│   │   │       ├── finance/           # Resumo financeiro com gráfico
│   │   │       ├── inventory/         # Tabela de estoque com alertas
│   │   │       ├── marketing/         # Campanhas e automações
│   │   │       └── settings/          # Configurações em abas (perfil, aparência, etc.)
│   │   │
│   │   ├── booking/
│   │   │   └── [slug]/        # Página pública de agendamento (ex: /booking/minha-barbearia)
│   │   │       └── page.tsx   # Fluxo de 5 passos para o cliente agendar
│   │   │
│   │   ├── api/               # Rotas de API (Next.js Route Handlers)
│   │   │
│   │   ├── layout.tsx         # Layout raiz com <html> e metadados globais
│   │   ├── globals.css        # Estilos globais, variáveis CSS e scroll customizado
│   │   └── page.tsx           # Landing page pública do produto
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Menu lateral retrátil com indicador de página ativa
│   │   │   └── Topbar.tsx     # Barra superior com busca, CTA e perfil do usuário
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx  # Card de métrica reutilizável (ícone + valor + variação)
│   │   │   └── RevenueChart.tsx # Gráfico de área com toggle semanal/mensal
│   │   │
│   │   ├── chatbot/
│   │   │   └── ChatbotWidget.tsx # Widget flutuante com respostas automáticas
│   │   │
│   │   └── ui/                # Componentes base reutilizáveis (Button, Input, Badge, etc.)
│   │
│   ├── lib/
│   │   ├── db.ts              # Instância singleton do PrismaClient
│   │   └── utils.ts           # Funções utilitárias (formatCurrency, formatDate, slugify, etc.)
│   │
│   └── types/                 # Tipos TypeScript globais do projeto
```

---

## 🗄️ Modelos do Banco de Dados

O banco foi desenhado para suportar múltiplas barbearias (multi-tenant):

```
User (usuário)
  └── Barbershop (barbearia) ──┬── Staff (barbeiros)
                                ├── Service (serviços)
                                ├── Appointment (agendamentos)
                                ├── Product (produtos/estoque)
                                ├── FinancialTransaction (transações)
                                ├── WorkingHour (horários de funcionamento)
                                └── ChatMessage (histórico do chatbot)
```

Cada **barbearia** tem um `slug` único (ex: `barbearia-do-joao`) que vira a URL pública de agendamento.

---

## ⚙️ Como Rodar o Projeto Localmente

### Pré-requisitos
- **Node.js 18+** instalado ([baixar aqui](https://nodejs.org))
- **npm** (já vem com o Node.js)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/alexanderjr02/barbearias-app.git
cd barbearias-app

# 2. Instale todas as dependências
npm install

# 3. Configure o banco de dados local
npx prisma migrate dev

# 4. (Opcional) Popule com dados de demonstração
npx tsx prisma/seed.ts

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000** no navegador.

### Credenciais de demonstração
Se você rodou o seed, use:
```
E-mail: demo@cortix.app
Senha:  demo123456
```

Ou use **qualquer e-mail e senha** para entrar diretamente (modo demo).

---

## 📄 Variáveis de Ambiente

O arquivo `.env` é criado automaticamente pelo Prisma. Para produção, configure:

```env
# Banco de dados (SQLite para dev, PostgreSQL para produção)
DATABASE_URL="file:./dev.db"

# Autenticação
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 💰 Planos do Sistema

| Plano | Preço | Barbeiros | Agendamentos | Chatbot |
|---|---|---|---|---|
| **Starter** | Grátis | 1 | 50/mês | Básico |
| **Pro** | R$ 97/mês | Até 10 | Ilimitado | Avançado com IA |
| **Enterprise** | R$ 197/mês | Ilimitado | Ilimitado | WhatsApp Business |

---

## 🌐 Rotas Disponíveis

| URL | Descrição | Acesso |
|---|---|---|
| `/` | Landing page do produto | Público |
| `/login` | Tela de login | Público |
| `/register` | Cadastro (2 etapas) | Público |
| `/dashboard` | Painel principal com métricas | Autenticado |
| `/dashboard/appointments` | Tabela de agendamentos | Autenticado |
| `/dashboard/clients` | Gestão de clientes | Autenticado |
| `/dashboard/staff` | Gestão da equipe | Autenticado |
| `/dashboard/services` | Serviços e preços | Autenticado |
| `/dashboard/finance` | Relatórios financeiros | Autenticado |
| `/dashboard/inventory` | Controle de estoque | Autenticado |
| `/dashboard/marketing` | Campanhas e automações | Autenticado |
| `/dashboard/settings` | Configurações da barbearia | Autenticado |
| `/booking/[slug]` | Página pública de agendamento | Público (qualquer pessoa) |

---

## 🤝 Como Contribuir

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-funcionalidade`
3. Faça suas alterações e commit: `git commit -m "feat: descrição da mudança"`
4. Faça o push: `git push origin feature/minha-funcionalidade`
5. Abra um Pull Request descrevendo o que foi feito

---

## 📝 Licença

MIT © 2025 CORTIX — Feito para barbearias brasileiras.


```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
