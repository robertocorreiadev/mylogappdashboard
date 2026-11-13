# Handoff — MyLog Multi-Tenant

Última atualização: 2026-11-13. Se esta sessão for interrompida, leia este
arquivo primeiro, depois `TODO.md` (histórico detalhado por fase e da
revisão) e o plano original em
`C:\Users\IOT DEXTER\.claude\plans\vamos-arquitetar-um-sistema-mutable-quail.md`.

## ✅ Líquido por quinzena — implementado (2026-11-09), commit + push feitos

O card "Fat. líquido acumulado" ganhou a faixa "Quinzenas · Mmm/AAAA" com
**1ª quinzena** (dias 01–15) e **2ª quinzena** (16 até o último dia com
boleta), em R$. Cálculo em `lib/metrics.ts` (`netByQuinzena`), testes em
`lib/metrics.test.ts`, UI em `components/stats-overview.tsx`. Regra do mês
de referência, testes e achados: seção "Líquido por quinzena" do `TODO.md`.
Plano: `C:\Users\IOT DEXTER\.claude\plans\majestic-dancing-crystal.md`.

Verificado: `tsc --noEmit` limpo (só artefato stale), `npm test` 44/44,
smoke test no navegador (valores batem com o resumo mensal da tabela).
Commit `feat: líquido por quinzena no card de KPI` enviado para
`origin/main` em 2026-11-09, em cima do merge do PR #1 (`875c4c6`:
design system + CI + consolidação de auth `35235bd`).

Revisão de código + segurança feita em 2026-11-09: 4 defeitos corrigidos
(valor cortado no `lg`, KPIs duplicados no drill-down, contagem de dias,
estado vazio) — detalhe no `TODO.md`. Regra de QA do projeto agora no
`CLAUDE.md`.

Débitos da faixa fechados em 2026-11-09 (`recordGross`/`recordNet` como
fonte única das fórmulas, `useMemo` no filtro dos KPIs, cabeçalho em 375px).

Vercel conferida no painel em 2026-11-09: produção = `9955754` (Ready), com
todas as correções e débitos. Nada pendente da faixa de quinzenas.

## 🚧 Redesign de layout e intuitividade (iniciado em 2026-11-13)

Plano aprovado: `C:\Users\IOT DEXTER\.claude\plans\desenvolver-melhorias-de-layouts-cheerful-torvalds.md`
(fases 0 a 6: fechar D8/D10/D15 → fundação visual e tema claro com botão →
navegação fixa por papel → entregador → gestor (inclui D6) → admin e
primeiro acesso → fechamento). Um commit por fase; push só com OK do usuário.

**Fase 0 (D8, D10, D15) — pronta para commit (2026-11-13).** Revisão do diff:
a checagem de "dono de organização com outros membros" foi para dentro da
transação, com `FOR UPDATE`. Spec §7.2, §8, §9.6, §11.9, §11.11, §13 e §15
atualizadas; `TODO.md` com a seção "D8, D10 e D15". tsc limpo, 93/93,
build ok. Dry-run do D8 no banco real com ROLLBACK (OK do usuário): os 3
caminhos certos (detalhe no `TODO.md`). Commit + push da Fase 0 em 2026-11-13.
**Próximo:** Fase 1 do plano (fundação visual).

**⏭️ Próxima sessão — começar por aqui:** testar o **login com Google em
produção** (D1 corrigido em 2026-11-09: só liga/cria conta com e-mail
autoritativo; não deu para testar o fluxo real aqui, exige credenciais).
Entrar com uma conta já ligada e conferir que segue funcionando. Conferir
também um salvamento normal de boleta, entrega e lançamento (validação nova
no servidor, D3). Depois: defeitos restantes da §15.
Branches antigas apagadas em 2026-11-09 (local e GitHub): só resta `main`.

O commit local
`bcda5e7` fazia a mesma consolidação de auth em paralelo e nunca foi
enviado; saiu do `main` em favor da versão do PR e ficou guardado no
branch local `backup/auth-consolidacao-local`. **Próximo passo:** conferir o deploy na Vercel e
escolher um item do `TODO.md` (débito de `recordNet()`, KPIs duplicados no
drill-down, cabeçalho estourando em 375px).

## Auditoria do prompt do painel (2026-11-09)

**Fonte única da descrição do sistema: `docs/00-spec-painel.md`** (base
`a99e63f`). Ela basta para reconstruir o painel inteiro: DDL, regras,
rotas, actions, telas com textos exatos, tema e testes. Os prompts antigos
(`DASHBOARD PROMPT.txt` v1 e `v2.txt`) e o schema inicial (`SQL FUNC.txt`)
estão em `docs/historico/`. Commitados em 2026-11-09.
- Toda mudança de comportamento DEVE atualizar a spec no mesmo commit.
- Defeitos abertos na §15: D6, D8, D10 e D15 (os outros corrigidos em
  2026-11-09). D6, D8 e D10 pedem decisão do dono; D15 só importa quando
  houver botão de tema.
- Decisões do dono: Q1–Q3 na §16.

## 🎯 Próxima tarefa principal

Nenhuma tarefa P0 pendente — a consolidação de auth (abaixo) foi concluída
e testada nesta sessão. Próximo passo natural: revisar o PR/branch
`worktree-mylog-p0-design-system` (indigo/violeta como cor de marca +
tema claro opt-in + KPI serifado) e decidir se propaga a tipografia/tema
pros outros componentes compartilhados (`daily-records-panel.tsx`,
`deliveries-panel.tsx`, `finance-panel.tsx`, `dashboard-header.tsx`) —
ver "Design system" abaixo antes de propagar.

## ✅ Concluído nesta sessão (2026-09-25) — consolidação de auth (P0)

Os 4 achados de eficiência/redundância da revisão de código anterior
(chamadas repetidas de `requireGestor()`/`requireUser()` por request) —
resolvidos com abordagem retrocompatível (parâmetro opcional, default =
comportamento antigo, nada quebra pra quem não passar o contexto já
resolvido):

1. `app/actions/auth.ts`: `requireMembership()`/`requireGestor()`/
   `requireEntregador()` agora aceitam um `knownUser` opcional (usuário já
   resolvido no mesmo request) — evita o SELECT duplicado de `users`.
2. Novo `resolveViewerMode()` em `app/actions/auth.ts` — ponto único que
   decide "admin master ou gestor normal?" pra telas onde os dois modos
   são EXCLUSIVOS (ex.: `/gestor/entregadores/[userId]`). Telas onde
   "é admin" é só um flag ADICIONAL sobre um `requireGestor()` sempre
   obrigatório (ex.: `/gestor/auditoria`) continuam resolvendo os dois
   fatos separadamente — não force-encaixado no mesmo helper.
3. `app/gestor/page.tsx`: `getOrgOverview()`/`listPendingInvites()`/
   `listAcceptedInvites()` (em `app/actions/gestor.ts` e
   `app/actions/invites.ts`) agora aceitam um `MembershipContext` já
   resolvido opcional — a página resolve uma vez, repassa pras 3.
4. `app/actions/admin-override.ts` `adminGetTargetMemberData()`: as duas
   queries sequenciais (membership+user, depois organizations) viraram um
   JOIN só.
5. `app/gestor/entregadores/[userId]/page.tsx` migrado pra
   `resolveViewerMode()` (era `requireUser()` + `isAdminEmail()` ad-hoc +
   `requireGestor()` duplicado). `app/gestor/auditoria/page.tsx` reaproveita
   o `user` já resolvido em vez de rechamar `requireUser()`.

**Testado:** `tsc --noEmit` limpo, `npm test` 34/34, `npm run build`
(produção) limpo, smoke test manual no navegador — dashboard normal
(`/dashboard`), `/gestor` (KPIs + composição por painel + entregadores),
drill-down como ADMIN MASTER (`/gestor/entregadores/2`, banner correto),
`/gestor/auditoria` (histórico + botões de exclusão do admin). Todos os
fluxos renderizaram e navegaram corretamente após a mudança.

## ✅ Concluído nesta sessão — design system (protótipo, Seção 4 do doc de planejamento)

Decisão de cor de marca (raciocínio tese/antítese/síntese, documentado no
doc "MyLog — Plano de Aprimoramento & Design UI/UX",
https://claude.ai/artifact/DAxwSunF5mGc7RSkNy4naZ, comentário respondido
por delegação do usuário em 2026-09-25 — "tome as decisões por si"): laranja
já é a cor de conteúdo do painel "jadlog" (colidiria marca-vs-dado), azul já
é `panel2`, verde já é semântica de saldo positivo, vermelho já é
`destructive` — **índigo/violeta (`#8d7bdb` escuro / `#5b3fa8` claro)**
ficou como família de matiz mais distante das quatro já reservadas, evitando
também o roxo-azulado genérico de SaaS (Stripe/Linear, hue ~265) ao puxar
mais pro violeta/ameixa (hue ~255).

Implementado em `app/globals.css` (mesmos nomes de variável de sempre,
só valores novos — zero mudança de código nos componentes que já usam
`bg-primary`/`text-primary`/etc.):
- Tema escuro continua o padrão incondicional (comportamento inalterado
  pro usuário atual) — `--primary`/`--ring`/`--chart-1`/`--sidebar-primary`
  trocaram de laranja pra índigo.
- Tema claro real, novo, **opt-in via `[data-theme="light"]`** (ainda sem
  toggle de UI — só os tokens, prontos pra quando o toggle for construído).
- `--font-display` (stack de sistema serifado, sem webfont, mesma lógica
  de peso zero-custo-de-rede) aplicado só no número de destaque dos cards
  de KPI (`stats-overview.tsx`) + `tabular-nums` — hierarquia vem do
  tamanho/tipografia, não do peso.

**Testado:** `tsc`/`npm test`/`npm run build` limpos. Smoke test visual no
navegador confirmou o índigo aplicado corretamente em `/select`, `/gestor`
e `/dashboard`, e o número de KPI renderizando serifado. **Pendência
identificada, não bloqueante:** ao testar o tema claro ao vivo via
`document.documentElement.setAttribute('data-theme','light')` no
DevTools, o valor de `--background` resolve corretamente (`#f4f5f8`,
confirmado via `getComputedStyle`), mas a pintura final de `background-color`
de `<html>`/`<body>` não mudou — há alguma regra com especificidade maior
(possivelmente do `shadcn/tailwind.css` importado) ganhando a cascata pro
`background-color` literal. Não afeta o tema escuro (default, já testado
visualmente) nem bloqueia nada hoje (não existe toggle de UI ainda) — mas
precisa ser investigado/corrigido antes de construir o toggle real.

## ✅ Concluído nesta sessão — CI

`.github/workflows/ci.yml` novo — roda `tsc --noEmit`, `npm test` e
`npm run build` em push/PR pra `main`. Confirmado que o build não precisa
de banco real (todas as rotas são dinâmicas, nenhuma prerenderiza com
acesso a dado) — `DATABASE_URL` no workflow é uma string fictícia só pra
satisfazer o construtor do `pg.Pool`, nunca aponta pro Neon de produção.

## Deliberadamente fora de escopo desta sessão

P3 do roadmap (exportação PDF, painéis customizáveis por organização) —
"pivot maior" que precisa de planejamento dedicado antes de começar, não
um encaixe incremental (ver Seção 5 do doc de planejamento). Cobertura de
teste pra server actions também não avançou nesta sessão (ainda só
`lib/` tem teste automatizado) — mockar banco/`next/headers` é um esforço
à parte.

## Estado do projeto

Fases 1, 2, 3, 4, 5 **e o modo ADMIN MASTER** estão **implementados, com
`tsc --noEmit` e `npm test` (34/34) limpos, e testados manualmente no
navegador de ponta a ponta** (ver `TODO.md` para o que foi verificado em
cada item). Produção (Neon) já rodou os scripts de migração
`migrate-multitenant-001-schema.sql`,
`migrate-multitenant-001b-dual-role-index.sql` e
`migrate-multitenant-002-backfill-legacy-org.sql` — não precisa rodar de
novo.

**Commit + push já feitos** (mais recente primeiro): `1683934` (correções
da revisão de código) → `496662b` (exportação CSV) → `2b5cf56`/`1f9ec5c`
(multi-tenant + ADMIN MASTER), todos em `origin/main`. Confira
`git log --oneline -5` antes de commitar de novo — se a "Próxima tarefa
principal" acima ainda não tem commit correspondente, é ela que falta
fazer.

O texto abaixo é o histórico da decisão de arquitetura do ADMIN MASTER —
contexto de fundo, não precisa reler pra começar a próxima tarefa.

## ADMIN MASTER — concluído (histórico da decisão)

Pedido do usuário (confirmado explicitamente): o login `ADMIN_EMAIL` deve
poder editar/apagar dado de QUALQUER organização — boletas, entregas,
transações e o próprio `audit_logs` — **usando as mesmas telas que já
existem** (não uma tela admin separada), sem as restrições normais
(`requireEntregador()`/append-only). Toda alteração feita nesse modo fica
registrada no próprio `audit_logs` (ator = o admin), para nunca virar
caixa-preta.

**Decisão de escopo tomada durante a implementação** (dentro da autonomia
dada pelo usuário): "editar" uma entrada de `audit_logs` virou
especificamente **apagar** (com um meta-registro de auditoria documentando
a exclusão) — reescrever o texto histórico de uma entrada já existente não
tem caso de uso legítimo claro e cria risco de fabricação de histórico.
"Editar/apagar dado de qualquer organização" nas boletas/entregas/
transações continua igual ao pedido: acesso completo via override.

### Arquitetura escolhida
- `app/actions/admin-override.ts` (novo): actions só-admin
  (`requireAdmin()`), paralelas às normais mas recebendo `organizationId`/
  `targetUserId` explícitos em vez de inferir do usuário logado — nunca
  reaproveita nem modifica as actions normais de entregador
  (`app/actions/daily-records.ts` etc.), para não arriscar a garantia de
  isolamento de tenant que já está testada e funcionando.
- `components/daily-records-panel.tsx` / `deliveries-panel.tsx` /
  `finance-panel.tsx`: ganham props opcionais de override de ação
  (`onSave`/`onDelete`/etc., default = a action normal já importada) em vez
  de import hardcoded — permite reaproveitar a MESMA UI em modo admin sem
  duplicar componentes.
- `components/dashboard-tabs.tsx` / `components/member-panel-tabs.tsx`:
  threadam esses overrides para baixo.
- `app/gestor/entregadores/[userId]/page.tsx`: quando o usuário logado é
  `isAdminEmail()`, usa `adminGetTargetMemberData()` (sem restrição de
  organização) em vez de `getMemberDashboardData()`, renderiza com
  `readOnly={false}` e passa as actions admin (via `.bind()` do Next.js
  para pré-preencher `organizationId`/`targetUserId` — server actions
  suportam bind).
- Banner do `DashboardHeader` em modo admin fica visualmente diferente do
  modo "visualizando como gestor" (cor de alerta, não verde) — sinal de
  que ali há capacidade destrutiva ativa.
- `/gestor/auditoria`: quando visitado pelo admin, cada entrada ganha um
  botão de excluir (chama `adminDeleteAuditLogEntry`, que grava um
  meta-registro antes de remover).
- Ponto de entrada: link em `/gestao` (painel de usuários) para abrir
  qualquer usuário em modo admin, independente da organização dele.

### Testado manualmente (2026-09-25)
Criei uma boleta pra Cláudio Amorim (userId 2, org Legado) via
`/gestor/entregadores/2` em modo admin → apareceu em `/gestor/auditoria`
atribuída a "Roberto Correia" (o admin), não ao Cláudio. Apaguei a boleta
pela mesma UI, exclusão também auditada corretamente. Apaguei a entrada de
auditoria da criação (botão só-admin) → apareceu um meta-registro "excluiu
entrada de auditoria #3", confirmando que a exclusão de histórico também
deixa rastro. `npm test` 34/34, `tsc --noEmit` só com o artefato stale
conhecido de `.next/types/validator.ts` (referencia a rota antiga
`/usuarios`, autolimpa quando o dev server recompila — não é erro real).

Nota à parte: durante os testes, screenshots via Claude-in-Chrome travaram
algumas vezes (CDP timeout) sem relação com o código — `curl` confirmou o
servidor sempre respondendo rápido. Quando isso acontecer, use
`get_page_text` (mais leve) em vez de `screenshot`, ou abra uma aba nova.

## Convenções importantes desta sessão (não redescobrir)
- Schema/migração: sempre manual via SQL no Neon (não existe migration
  runner). Ver `migrate-unique-fix.sql` como padrão de referência.
- Dual-role: usuário pode ter membership `gestor` E `entregador` ativas ao
  mesmo tempo (índice `memberships_one_active_role_per_user`), nunca duas
  do mesmo papel.
- `lib/db/scopes.ts` é o ÚNICO lugar permitido para queries diretas nas
  tabelas `dailyRecords`/`deliveries`/`transactions` — `lib/db/scopes.test.ts`
  garante isso via grep. Qualquer action nova nessas tabelas precisa passar
  por lá.
- Painéis (`jadlog`/`panel2`) NUNCA são mesclados nas telas do gestor —
  sempre mostrados separados (ver `components/member-panel-tabs.tsx` e a
  seção "Composição por painel" em `app/gestor/page.tsx`).
- Next.js 16 nessa versão tem breaking changes vs. treinamento — checar
  `node_modules/next/dist/docs/` antes de mexer em convenções de rotas
  (`params` é `Promise<...>`, confirmado nesta sessão).
- `ADMIN_EMAIL` = contatorobertocorreia@gmail.com (não é segredo dentro
  deste projeto, mas não espalhar em código como string solta fora de
  `lib/auth.ts`/`.env`).
- Credenciais reais (senha de app, DB) NÃO ficam neste arquivo nem em
  nenhum arquivo versionado — estão em `.env` (gitignored) e em
  `..\MY LOG KEYS.txt` (fora do repo git).

## Concluído — exportação CSV (2026-09-25)
`lib/csv.ts` (`toCsv`/`downloadCsv`) + botão "Exportar CSV" em
`daily-records-panel.tsx`/`deliveries-panel.tsx`/`finance-panel.tsx` —
cobre entregador e gestor de graça, já que esses componentes já são
compartilhados entre os dois modos. PDF fica como ideia futura (add-on
pago), não implementado.

## Ideias registradas, não implementadas (ver TODO.md para detalhe)
- **PDF** (relatório formatado) — candidato a add-on pago do gestor, mais
  trabalho que o CSV (biblioteca de renderização).
- Painéis customizáveis por organização (pivot maior — nome próprio por
  painel, 2 grátis + adicionais pagos, rota dinâmica `/painel/[slug]`
  substituindo `/dashboard`+`/panel2` hardcoded). Ainda não planejado em
  detalhe — só discutido.
- Rate limit nas tentativas de aceite de convite: **avaliado e descartado**
  — o token tem 256 bits de entropia (`crypto.randomBytes(32)`), então
  força bruta já é inviável sem rate limit; expiração/revogação (já
  implementados) resolvem o problema real (ciclo de vida do link), que é
  diferente do que rate limit resolveria.
