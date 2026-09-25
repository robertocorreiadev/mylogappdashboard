# TODO - JADLOG Dashboard

Status em 2026-08-24. Histórico de etapas antigas (migração do sistema
`PROFILES` para auth por usuário, indicadores modulares, boleta diária) foi
concluído e removido daqui — consulte o `git log` para o histórico.

## Concluído recentemente
- Auth por e-mail/senha (scrypt) + OAuth Google, cookie de sessão assinado (HMAC).
- Migração silenciosa de hashes de senha do formato legado para scrypt no login.
- Gestão de usuários (`/gestao`, restrita a `ADMIN_EMAIL`).
- Filtro de período (ano/mês) refletido nos KPIs do topo.
- Normalização de e-mail (lowercase) consistente entre login/registro/perfil/admin.
- Rate limit em memória para tentativas de login (`lib/rate-limit.ts`) — 5
  tentativas / 15 min por e-mail. Ver comentário no arquivo sobre a limitação
  (estado não é compartilhado entre instâncias/deploys).
- Suíte de testes unitários com Vitest (`npm test`) cobrindo `lib/auth.ts`,
  `lib/format.ts` e `lib/rate-limit.ts`.

## Em andamento — multi-tenant (gestor/entregador)
Arquitetura completa em `C:\Users\IOT DEXTER\.claude\plans\vamos-arquitetar-um-sistema-mutable-quail.md`.
Objetivo: permitir que gestores/empresas terceiras criem sua própria
organização, convidem seus próprios entregadores, e tenham um painel
agregado + drill-down somente-leitura sobre a operação deles, com
histórico de auditoria das edições dos entregadores.

- [x] Fase 1 — Schema (`lib/db/schema.ts`: tabelas `organizations`,
      `memberships`, `invites`, `audit_logs` + coluna `organization_id`
      `NOT NULL` em `daily_records`/`deliveries`/`transactions`).
      **Já rodado em produção (Neon) em 2026-09-24**: script 001, backfill
      002 (org "Legado" + memberships + backfill de `organization_id`,
      confirmado 0 linhas órfãs) e os `ALTER ... SET NOT NULL`.
      Decisão tomada durante a execução: dual-role — um usuário pode ter
      as duas memberships ativas (`gestor` + `entregador`) simultaneamente
      na mesma organização (índice `memberships_one_active_role_per_user`,
      1 por papel em vez de 1 por usuário). Motivo: o próprio `ADMIN_EMAIL`
      tinha 107 boletas próprias — sem dual-role, viraria gestor e perderia
      a escrita. Ver seção 2/2.0 do plano.
- [x] Fase 2 — Isolamento de tenant nas queries existentes.
      `requireMembership`/`requireGestor`/`requireEntregador` em
      `app/actions/auth.ts`; `lib/db/scopes.ts` (único ponto de acesso às
      3 tabelas operacionais, com teste de arquitetura em
      `lib/db/scopes.test.ts` proibindo query direta fora dele);
      `daily-records.ts`/`deliveries.ts`/`transactions.ts` refatorados.
      Adiantado da Fase 3 (necessário para não quebrar cadastro público):
      `lib/db/onboarding.ts` (`createSoloOrgForNewUser`) — todo novo
      cadastro (`register`/`loginWithGoogle` em `app/actions/auth.ts`)
      ganha automaticamente sua própria organização solo como entregador,
      sem nenhum vínculo de gestor.
      `npm test` (30/30) e `tsc --noEmit` verdes.
      Adiantado da Fase 4: `getActiveRoles()` + `/select` mostra um 3º
      botão "Painel do Gestor" para conta dual-role; `app/gestor/page.tsx`
      é só um placeholder ("em construção") pra não deixar conta gestor
      sem destino — os KPIs agregados reais ainda são Fase 4; logo do
      `DashboardHeader` agora linka de volta pra `/select`.
      Adiantado da Fase 4 (provisionamento pelo admin): botão "Gestão"
      no header (rota renomeada de `/usuarios` para `/gestao`) → diálogo
      "Nova organização" (`app/actions/organizations.ts`,
      `components/create-organization-panel.tsx`) — super-admin cria uma
      organização e torna um usuário (existente ou novo) seu gestor.
- [x] Fase 3 — Onboarding via convite. `lib/invites.ts` (token de alta
      entropia, hash sha256, `acceptInvite()` transacional — reconfirma
      validade + garante que o usuário não tem outra membership
      'entregador' ativa antes de vincular, respeitando o dual-role da
      Fase 1). `app/actions/invites.ts` (`createInvite`, `revokeInvite`,
      `revokeAllPendingInvites`, `listPendingInvites`,
      `listAcceptedInvites`, `acceptInviteForCurrentUser`).
      `app/convite/[token]/page.tsx` (novo) — erro amigável se inválido/
      expirado/revogado/usado; visitante deslogado vê `LoginForm`/
      `RegisterForm` com o token embutido; visitante já logado precisa de
      clique explícito em "Aceitar convite" (nunca aceita sozinho num GET).
      `register`/`login`/`loginWithGoogle` (`app/actions/auth.ts`) recebem
      `inviteToken` opcional; Google OAuth carrega o token via cookie
      `pending_invite_token` (`app/api/auth/google/route.ts` e
      `.../callback/route.ts`, já que o `state` do OAuth é só anti-CSRF).
      Controles do gestor em `components/invites-panel.tsx`: expiração
      customizável (1/7/30 dias ou "sem expiração" — simulado com data
      100 anos no futuro, já que `expires_at` é `NOT NULL` no schema),
      convite restrito a um e-mail específico (validado em
      `acceptInvite`), revogação individual E em massa, histórico de
      convites aceitos (quem entrou, via qual convite, quando).
      Testado manualmente: link gerado, aceite bloqueado corretamente
      quando a conta já é entregador de outra org, expiração "sem
      expiração" gerou data 100 anos à frente.
- [x] Fase 4 — Painel do gestor de verdade. `app/actions/gestor.ts`
      (`getOrgOverview()` agregado da org, `getMemberDashboardData()` com
      checagem anti-IDOR — só retorna dado se o `userId` alvo tiver
      membership de entregador ativa na MESMA org do gestor logado, `
      getAuditLog()` para a Fase 5).
      `lib/db/scopes.ts` ganhou `dailyRecordsForUserAllPanels`/
      `deliveriesForUserAllPanels`/`transactionsForUserAllPanels`.
      **Correção pós-implementação**: a primeira versão mesclava os
      painéis (jadlog/panel2) num total só no drill-down — corrigido para
      NUNCA mesclar: `getMemberDashboardData()` agrupa por `panel` e
      `app/gestor/entregadores/[userId]/page.tsx` usa
      `components/member-panel-tabs.tsx` (novo) para mostrar uma aba por
      painel, cada uma com seu próprio `StatsOverview`+`DashboardTabs`
      read-only — espelha exatamente o que o entregador vê em
      `/dashboard` vs `/panel2`. `/gestor/page.tsx` ganhou "Composição por
      painel" (mesma lógica, nunca soma painéis diferentes num número só).
      `lib/format.ts`: `PANEL_LABELS`/`panelLabel()` (nomes fixos por
      enquanto — vira dinâmico quando "painéis customizáveis" for feito).
      `app/gestor/entregadores/[userId]/page.tsx` (`params` é Promise
      nessa versão do Next — checar `node_modules/next/dist/docs` antes
      de mexer em rotas dinâmicas) renderiza os painéis em modo `readOnly`
      (prop nova, threaded por `DashboardTabs`/`DailyRecordsPanel`/
      `DeliveriesPanel`/`FinancePanel` — omite formulários e botões de
      editar/excluir). `DashboardHeader` ganhou `viewerMode` — banner
      "Visualizando como gestor: `<nome>`" + esconde engrenagem/Gestão/
      Trocar painel.
      Testado manualmente: KPIs agregados batem com a soma dos 4
      entregadores da org Legado, composição por painel bate com os
      totais de `/dashboard` e `/panel2` individualmente, drill-down por
      aba mostra dado read-only correto, `/gestor/entregadores/9999`
      retorna 404 (anti-IDOR confirmado).
- [x] Fase 5 — Auditoria de edições visível ao gestor. `lib/audit.ts`
      (`recordAudit()` — diff campo a campo, ignora colunas de
      housekeeping). `lib/db/scopes.ts`: todo insert/update/delete nas 3
      tabelas operacionais agora usa `.returning()` (e há
      `findDailyRecord`/`findDeliveryById`/`findTransactionById` para
      capturar o "antes" em updates) — as 9 actions de escrita em
      `daily-records.ts`/`deliveries.ts`/`transactions.ts` chamam
      `recordAudit()` logo após cada escrita. `app/gestor/auditoria/page.tsx`
      (novo) lista as 200 entradas mais recentes da organização, só
      leitura — nenhuma UI/action deste app edita ou apaga uma linha de
      `audit_logs` (append-only por convenção de código).
      Testado manualmente: editei uma boleta real (despesas 0→15,
      depois revertido 15→0) e o histórico mostrou exatamente o campo
      que mudou em cada edição, sem ruído dos campos que não mudaram.
- [x] **ADMIN MASTER**. `app/actions/admin-override.ts` (novo) — actions
      só-admin (`requireAdmin()`) paralelas às normais de entregador, mas
      recebendo `organizationId`/`targetUserId` explícitos em vez de
      inferir do usuário logado; nunca reaproveita nem modifica as actions
      normais (`daily-records.ts`/`deliveries.ts`/`transactions.ts`), pra
      não arriscar o isolamento de tenant já testado.
      `adminGetTargetMemberData()` busca o alvo em QUALQUER organização
      (sem restrição, ao contrário de `getMemberDashboardData()`).
      `adminSave/Delete DailyRecord`, `adminCreate/Update/Delete Delivery`,
      `adminCreate/Update/Delete Transaction` espelham as 9 actions normais,
      sempre chamando `recordAudit()` com `actorUserId` = o admin.
      `adminDeleteAuditLogEntry()` — decisão de escopo: "editar" uma
      entrada virou especificamente **apagar** (reescrever texto histórico
      não tem caso de uso legítimo e cria risco de fabricar histórico);
      apaga a entrada e grava um meta-registro (`entityType:
      "audit_log_entry"`) documentando a própria exclusão.
      UI: `components/daily-records-panel.tsx`/`deliveries-panel.tsx`/
      `finance-panel.tsx` ganharam props opcionais de override de ação
      (`onSave`/`onCreate`/`onUpdate`/`onDelete`/etc., default = a action
      normal já importada) em vez de import hardcoded — a MESMA UI do
      entregador é reaproveitada em modo admin sem duplicar componentes.
      `components/dashboard-tabs.tsx` exporta o tipo `PanelActions` e
      threada os overrides; `components/member-panel-tabs.tsx` repassa.
      `app/gestor/entregadores/[userId]/page.tsx`: quando
      `isAdminEmail(user.email)`, usa `adminGetTargetMemberData()` (sem
      checar org do gestor) e passa as actions admin via `.bind(null,
      organizationId, targetUserId)` — server actions suportam bind pra
      pré-preencher argumentos. `DashboardHeader` ganhou
      `viewerMode.mode: "admin"` — banner vermelho "⚠ Modo ADMIN MASTER"
      em vez do banner verde "somente leitura" do gestor normal.
      `/gestor/auditoria`: cada entrada ganha botão de excluir
      (`components/audit-log-row.tsx`, novo) quando `canDelete` (só admin).
      Ponto de entrada: ícone de escudo por linha em `/gestao`
      (`components/users-panel.tsx`) linkando pra
      `/gestor/entregadores/{id}`.
      **Testado manualmente de ponta a ponta**: criei uma boleta pra
      Cláudio Amorim (id 2, org Legado) via admin, confirmei que apareceu
      atribuída a "Roberto Correia" (o admin) na auditoria — não ao
      Cláudio; apaguei a boleta pela mesma UI, confirmei a exclusão
      auditada; apaguei a entrada de auditoria da criação, confirmei que
      apareceu um meta-registro "excluiu entrada de auditoria #3". `npm
      test` (34/34) e `tsc --noEmit` limpos (só o artefato stale conhecido
      de `.next/types/validator.ts`).

## Concluído — exportação CSV
- [x] **Exportação CSV** dos dados de performance. `lib/csv.ts` (novo):
      `toCsv()` (genérico, delimitador `;` de propósito — Excel pt-BR
      espera `;` porque a vírgula é o separador decimal nesse locale) +
      `downloadCsv()` (Blob + BOM UTF-8, senão acentuação quebra no Excel
      no Windows). Botão "Exportar CSV" adicionado direto em
      `components/daily-records-panel.tsx` (respeita o filtro de ano/mês
      ativo), `deliveries-panel.tsx` e `finance-panel.tsx` (idem, usa o
      array já filtrado) — como esses 3 componentes já são compartilhados
      entre o dashboard do entregador (modo escrita) e o drill-down do
      gestor (modo `readOnly`), a exportação cobre os dois papéis de graça,
      sem código duplicado. Testado manualmente: exportei boletas e
      lançamentos financeiros reais, conferi CSV com cabeçalho em
      português, `;` como delimitador e acentuação (Ocorrências) intacta.
      PDF (relatório formatado) segue como ideia não implementada — mais
      trabalho (biblioteca de renderização) e mais cara de add-on pago do
      gestor do que de portabilidade de dado grátis.
- **Painéis customizáveis por organização** (pivot maior, discutido mas
  ainda não planejado em detalhe): hoje `panel` é uma string fixa
  ("jadlog"/"panel2") hardcoded em `app/dashboard/page.tsx`/
  `app/panel2/page.tsx`/`app/select/page.tsx` e nos 3 componentes de
  dados. Ideia: virar uma tabela `panels` por organização (2 grátis por
  padrão, nomeáveis pelo gestor, adicionais pagos), com `/dashboard` e
  `/panel2` substituídos por uma rota dinâmica `/painel/[slug]`. Ver
  discussão de permissões seguras vs. add-ons pagos no histórico da
  sessão de 2026-09-24 antes de planejar isso em detalhe.

## Pendências conhecidas
- **Sem migração automatizada de schema**: mudanças de banco são feitas via
  SQL manual no Neon SQL Editor (ver `migrate-unique-fix.sql` como exemplo).
  Qualquer alteração de schema precisa desse mesmo fluxo manual antes do
  deploy do código que depende dela.
- **Cobertura de testes ainda parcial**: só funções puras de `lib/` têm
  teste. Server actions (`app/actions/*.ts`) e componentes não são testados
  — dependem de banco/`next/headers`, exigiriam mocks ou um banco de teste.
- Sem CI configurado rodando `npm test` / `tsc --noEmit` / `npm run build`
  automaticamente em PRs.
