# Handoff — MyLog Multi-Tenant

Última atualização: 2026-09-25. Se esta sessão for interrompida, leia este
arquivo primeiro, depois `TODO.md` (histórico detalhado por fase e da
revisão) e o plano original em
`C:\Users\IOT DEXTER\.claude\plans\vamos-arquitetar-um-sistema-mutable-quail.md`.

## 🎯 Próxima tarefa principal (definida pelo usuário em 2026-09-25)

**Consolidar o contexto de auth repetido** — os 4 achados de
eficiência/redundância que a revisão de código encontrou e que ficaram
deliberadamente sem correção nesta sessão (ver "Revisão de código" em
`TODO.md` pro relatório completo). Nenhum é vulnerabilidade hoje — são
queries redundantes ao banco por request + um ponto de manutenção frágil:

1. `app/gestor/page.tsx`: `getOrgOverview()`, `listPendingInvites()` e
   `listAcceptedInvites()` cada um chama `requireGestor()`
   independentemente dentro do mesmo `Promise.all` → 6 SELECTs (3x user +
   3x membership) em vez de ~2 por carregamento da página.
2. `app/gestor/entregadores/[userId]/page.tsx`: chama `requireUser()`
   (pra checar `isAdminEmail`) e depois `requireGestor()` no branch
   não-admin, que internamente chama `requireUser()` de novo — SELECT de
   `users` duplicado.
3. `app/actions/admin-override.ts` `adminGetTargetMemberData()`: duas
   queries sequenciais (membership+user, depois organizations) que dá
   pra resolver num JOIN só.
4. A checagem "isso é ADMIN MASTER?" (`isAdminEmail(user.email)`) é
   chamada ad-hoc em `app/gestor/entregadores/[userId]/page.tsx` e
   `app/gestor/auditoria/page.tsx` em vez de um helper único tipo
   `resolveViewerMode()` — não é lógica duplicada (ambos delegam pra
   `isAdminEmail()` em `lib/auth.ts`, fonte única), mas é um padrão
   frágil: se o conceito de "admin" mudar no futuro (múltiplos admins,
   flag no banco), tem 3+ lugares pra lembrar de atualizar em vez de um.

**Abordagem sugerida** (discutida com o usuário, não é obrigatória):
estender `requireMembership()`/`requireGestor()` em `app/actions/auth.ts`
pra aceitar opcionalmente um usuário já resolvido (evita o SELECT
duplicado), e criar um helper único de "modo de visualização" que resolve
gestor-normal vs. admin-master de uma vez, chamado no topo de cada página
do `/gestor/*`. É uma mudança pequena e contida, mas toca o contrato de
helpers compartilhados usados em todo o app — testar com `tsc`/`npm test`
+ smoke test manual (dashboard normal, `/gestor`, drill-down como gestor
E como admin) antes de considerar concluído.

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
