# CORTIX — Onde o projeto está hoje

> Documento de apresentação, sem termos técnicos, para mostrar a clientes e parceiros o que o sistema já faz e o que ainda falta para ele estar pronto para vender.

---

## 1. Resumo em uma frase

O CORTIX já é um sistema funcional de ponta a ponta: o dono da barbearia gerencia o negócio, o barbeiro usa o próprio app para ver a agenda e os clientes, e o cliente final agenda e acompanha seus pontos de fidelidade — tudo com dados reais, salvos em banco de dados, tanto pelo computador quanto pelo celular.

O que falta hoje não é "fazer o sistema funcionar" — é **conectar peças de operação comercial** (cobrança automática, envio de mensagens, IA no chat) que normalmente são plugadas por último, quando já existem clientes reais usando o produto.

---

## 2. O que já funciona hoje

### 2.1 Painel do dono/gerente da barbearia (computador)

| Área | O que já faz |
|---|---|
| Login e conta | Cadastro e login reais, com sessão segura — não é mais uma tela "de mentira" |
| Dashboard | Mostra receita, número de agendamentos, clientes ativos e ticket médio **do dia real**, puxado do banco de dados |
| Agenda | Lista de agendamentos com status (agendado, concluído, cancelado, não compareceu) |
| Clientes | Histórico de visitas e gasto de cada cliente, juntando quem agendou pelo link público com quem foi cadastrado manualmente |
| Equipe | Cadastro de barbeiros, comissão de cada um, quantos atendimentos e quanto cada um gerou de receita no mês |
| Serviços | Cadastro de serviços com preço, duração, categoria e foto |
| Estoque | Cadastro de produtos com aviso automático quando o estoque está acabando |
| Financeiro | Lançamento de receitas e despesas, com gráfico comparando os dois |
| Fidelidade | Cada real gasto vira pontos; o cliente sobe de nível (Bronze/Prata/Ouro) conforme acumula |
| Configurações | Logo, banner e cor da marca da barbearia, horário de funcionamento e plano da conta |

### 2.2 App de celular (Android, iPhone e navegador) — um app para os três perfis

O mesmo aplicativo reconhece quem está logado e mostra a tela certa:

- **Dono/gerente**: praticamente tudo que existe no painel do computador, incluindo os gráficos, dentro do bolso.
- **Barbeiro**: agenda do dia em formato de calendário, cadastro rápido de cliente novo, lista dos próprios clientes e visão de quanto já ganhou de comissão.
- **Cliente final**: agenda um horário escolhendo o barbeiro (com foto) e o serviço, acompanha o histórico de agendamentos e vê seus pontos de fidelidade.

O app já se adapta à identidade visual de cada barbearia (cores, logo, banner) e já funciona em português, incluindo o calendário de escolha de data.

### 2.3 Página pública de agendamento (o link que vai no WhatsApp/Instagram)

Qualquer pessoa, sem precisar de conta, consegue: escolher o serviço → escolher o barbeiro → escolher data e horário (só aparecem horários realmente livres) → informar nome e WhatsApp → confirmar. Isso já está no ar e gravando de verdade no banco de dados da barbearia.

### 2.4 Chatbot

Existe um assistente virtual flutuante que responde perguntas comuns (horário de funcionamento, serviços, preços, como agendar) automaticamente. Hoje ele reconhece **palavras-chave**, não conversa livremente — está descrito no que falta abaixo.

### 2.5 Planos de assinatura (Starter / Pro / White Label)

A estrutura de planos já existe e já diferencia quantos barbeiros e agendamentos cada plano permite. A troca de plano em si já funciona no sistema.

---

## 3. O que falta para o produto ficar pronto para vender

Organizado por impacto — o que trava a venda primeiro aparece no topo.

| # | O que falta | Por que importa | Tamanho do esforço |
|---|---|---|---|
| 1 | **Cobrança automática (gateway de pagamento)** | Hoje a troca de plano é manual, no próprio sistema — não existe cartão de crédito, boleto ou Pix cobrando de verdade. Sem isso, não dá para vender assinatura sem alguém trocar o plano manualmente para cada cliente. | Médio–Alto |
| 2 | **Diferença real entre os planos Pro e White Label** | Hoje os dois planos liberam exatamente as mesmas funções — só o Starter é mais limitado. Antes de cobrar preços diferentes, os planos pagos precisam ter benefícios diferentes de verdade. | Baixo |
| 3 | **Envio real de mensagens (WhatsApp/SMS/e-mail)** | A tela de Marketing já existe (campanhas, lembretes, aniversariantes), mas hoje ela não dispara mensagem de verdade — é preciso contratar e ligar um provedor de envio (ex.: WhatsApp Business API, um serviço de SMS ou e-mail). | Médio |
| 4 | **Chatbot com inteligência artificial** | Hoje o chatbot só reconhece frases parecidas com um roteiro fixo. Ligar a uma IA de verdade (mesmo modelo usado em assistentes modernos) faria ele responder qualquer pergunta do cliente com base nos dados reais da barbearia. | Médio |
| 5 | **Publicação do app nas lojas (Google Play / App Store)** | O app já funciona em Android, iPhone e navegador, mas ainda não está publicado nas lojas — hoje só roda em modo de teste/instalação manual. Publicar exige conta de desenvolvedor nas duas lojas e passar pela revisão de cada uma. | Médio |
| 6 | **Identidade visual própria por cliente grande (White Label)** | Para clientes do plano mais caro, a promessa é o app parecer "deles" (nome, ícone, cores próprias). Hoje a barbearia já personaliza cor/logo dentro do app, mas um app com nome e ícone próprios na loja é um projeto à parte por cliente. | Alto (por cliente) |
| 7 | **Segurança para ambiente de produção** | O sistema hoje libera acesso de forma mais aberta entre partes internas (pensado para desenvolvimento). Antes de colocar dados reais de clientes pagantes, essa liberação precisa ser restringida ao necessário. | Baixo–Médio |
| 8 | **Banco de dados de produção** | Hoje os dados ficam num arquivo local de banco de dados, adequado para testes. Para operar com clientes reais ao mesmo tempo, o banco precisa migrar para um serviço de banco de dados hospedado (a troca é simples, pois o sistema já foi construído pensando nisso). | Baixo–Médio |
| 9 | **Previsão de demanda / relatórios avançados com IA** | Recurso do plano White Label mencionado no projeto original (ex.: prever os dias de maior movimento). Depende de a barbearia já ter uso real acumulado — só faz sentido depois que houver clientes usando o sistema por um tempo. | Alto |
| 10 | **Marketplace entre barbearias** | Ideia de longo prazo do projeto original, sem relação direta com a operação de uma barbearia individual. Não é bloqueio para vender o produto atual. | Alto |

### Como ler esta lista

- Os itens **1 a 4** são o que normalmente separa "sistema funcionando" de "produto vendável em escala" — nenhum deles exige refazer o que já existe, são conexões novas.
- Os itens **5 e 6** só importam no momento de efetivamente distribuir o app para o público final ou fechar um cliente grande.
- Os itens **7 e 8** são etapas de preparação para produção, feitas uma vez só, geralmente pouco antes do lançamento.
- Os itens **9 e 10** são diferenciais de longo prazo, não pré-requisitos de lançamento.

---

## 4. Em resumo

O CORTIX já entrega, hoje, a experiência completa de uso diário: agendar, atender, controlar caixa e estoque, fidelizar cliente — pelo computador ou pelo celular, para os três tipos de usuário da barbearia. O que resta é o conjunto de integrações comerciais (cobrança, mensagens, publicação nas lojas) necessárias para transformar o sistema, que já funciona, em um produto pronto para ser vendido e cobrado de múltiplos clientes ao mesmo tempo.
