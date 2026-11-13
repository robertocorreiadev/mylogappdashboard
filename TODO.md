# TODO - JADLOG Dashboard

Status em 2026-08-24 (ver também `handoff.md` pro estado mais recente,
2026-09-25 — consolidação de auth P0 + protótipo de design system + CI).
Histórico de etapas antigas (migração do sistema `PROFILES` para auth por
usuário, indicadores modulares, boleta diária) foi concluído e removido
daqui — consulte o `git log` para o histórico.

## Concluído recentemente (2026-09-25)
- Consolidação do contexto de auth repetido (P0 da revisão de código
  anterior): `requireMembership`/`requireGestor`/`requireEntregador`
  aceitam usuário já resolvido; novo `resolveViewerMode()`; dedupe em
  `/gestor`, `/gestor/entregadores/[userId]`, `/gestor/auditoria`; JOIN
  único em `adminGetTargetMemberData()`. Ver `handoff.md` pro detalhe e o
  que foi testado.
- Protótipo de design system: cor de marca própria (índigo/violeta,
  substituindo o laranja genérico do template), tema claro real (opt-in,
  ainda sem toggle de UI), tipografia serifada + `tabular-nums` nos números
  de KPI (`stats-overview.tsx`). Pendência conhecida: pintura do tema claro
  não reflete os tokens em `<html>`/`<body>` ao testar via DevTools — ver
  `handoff.md`.
- CI (`.github/workflows/ci.yml`): `tsc`/`npm test`/`npm run build` em
  push/PR.

## Concluído anteriormente
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

## Revisão de código (2026-09-25) — `/code-review 7fa3ffe..HEAD high`
Revisão de todos os commits desta sessão (multi-tenant + ADMIN MASTER +
CSV). 5 achados corrigidos, 4 documentados como débito técnico conhecido
(não corrigidos — ver justificativa abaixo).

### Corrigidos
- [x] `app/dashboard/page.tsx`/`app/panel2/page.tsx`: `getDeliveries`/
      `getTransactions`/`getDailyRecords` passaram a exigir
      `requireEntregador()` (Fase 2), mas o `Promise.all` não estava
      dentro do `try/catch` — uma conta só-gestor (sem membership de
      entregador) caindo aqui batia em erro não tratado (500) em vez do
      redirect gracioso. Agora o `Promise.all` também é `try/catch`,
      redirecionando pra `/select`.
- [x] `app/actions/admin-users.ts` `deleteUserAdmin`: `db.delete(users)`
      sem `try/catch`, mas o schema novo tem FKs `NOT NULL` pra
      `users.id` sem `ON DELETE CASCADE` (`audit_logs.actor_user_id`,
      `organizations.owner_user_id`) — de propósito, pra não apagar
      auditoria de outras pessoas em cascata. Isso quebrava a exclusão de
      quase qualquer usuário real (qualquer um que já tenha salvo um
      registro ganha uma linha em `audit_logs`) com um 500 em vez do
      padrão `{error}` esperado pela UI. Agora captura o erro Postgres
      `23503` (foreign_key_violation) e devolve mensagem amigável.
- [x] `app/api/auth/google/route.ts`: o cookie `pending_invite_token` era
      setado quando `?invite=` estava presente, mas nunca limpo quando
      ausente — um cookie de um fluxo de convite abandonado podia
      "pegar carona" num login Google não relacionado dentro da mesma
      janela de 10min, inscrevendo a conta como entregador de uma
      organização sem consentimento. Agora limpa o cookie explicitamente
      quando não há `?invite=`.
- [x] `lib/csv.ts`: `escapeCsvField` não neutralizava prefixos perigosos
      (`=`, `+`, `@`, tab) — um campo digitado por um entregador (ex.
      `recipient`) com `=HYPERLINK(...)` vira fórmula executada quando o
      gestor abre o CSV exportado no Excel (injeção de fórmula entre
      organizações). Corrigido com prefixo de `'` nesses casos — `-` só é
      neutralizado quando NÃO seguido de dígito, pra preservar valores
      monetários negativos legítimos (ex. faturamento líquido no
      vermelho).
- [x] `app/actions/daily-records.ts` `saveDailyRecord`: no branch de
      update, `recordAudit` era chamado com `after: updated` sem checar
      se `updated` veio truthy (diferente de todo write path irmão, que
      sempre guarda o retorno antes de auditar). Corrigido com o mesmo
      guard.
- [x] `components/daily-records-panel.tsx` `handleExport`: reimplementava
      o filtro de ano/mês em vez de reaproveitar `filterByPeriod` de
      `lib/format.ts` (já usado de forma idêntica em `dashboard-tabs.tsx`).
      Trocado pela função compartilhada.

### Documentado, não corrigido (débito técnico conhecido)
Quatro achados de eficiência/redundância (múltiplas chamadas de
`requireUser()`/`requireGestor()` re-derivando o mesmo contexto de auth
por request em `app/gestor/page.tsx`, `app/gestor/entregadores/[userId]/
page.tsx` e `app/actions/admin-override.ts`; verificação `isAdminEmail()`
duplicada em 3+ lugares sem um helper único de "modo de visualização").
São issues reais de performance/manutenibilidade, não bugs de
corretude — cada um custa só 1-2 SELECTs extras rápidos por carregamento
de página. Corrigir direito exigiria mudar o contrato dos helpers
compartilhados (`requireGestor`/`requireMembership` em
`app/actions/auth.ts`) pra aceitar um usuário já resolvido, o que é
melhor feito como uma mudança deliberada e revisada à parte do que
espremido no fim desta revisão.

## Líquido por quinzena no card de KPI (2026-11-09)
- [x] `lib/metrics.ts` (novo): `recordNet()` (bruto − despesas da boleta) e
      `netByQuinzena()` — 1ª quinzena = dias 01–15; 2ª = dia 16 até o último
      dia com boleta. Data lida como texto `YYYY-MM-DD` (sem fuso).
      **Mês de referência** = mês da boleta mais recente do conjunto que o
      card recebe (que já segue o filtro ano/mês da aba ativa): sem filtro →
      último mês trabalhado; mês+ano → esse mês; só ano → último mês do ano;
      só mês → esse mês no ano mais recente; sem boletas → faixa oculta.
- [x] `lib/metrics.test.ts`: 10 testes (limite 15/16, virada de ano, outros
      meses excluídos, `lastDay`, 2ª vazia, negativo, soma = mês).
- [x] `components/stats-overview.tsx`: faixa "Quinzenas · Mmm/AAAA" dentro
      do card "Fat. líquido acumulado" (decisão do usuário: não criar cards
      soltos — a grade continua com 5). No celular o card líquido ocupa a
      linha inteira (`col-span-2 lg:col-span-1`). Vale para entregador,
      `/gestor` e drill-down, porque todos usam o mesmo componente.
      Testado: `tsc --noEmit` limpo (só o artefato stale conhecido),
      `npm test` 44/44, smoke test — `/dashboard` (Nov/2026: R$ 368,00 = resumo
      do mês; filtro Outubro: R$ 958,00 + R$ 978,00 = R$ 1.936,00, faixa
      16–30), largura 375px (grade 2+1+2, sem texto vazando), `/gestor`,
      `/gestor/entregadores/1` e `/4` (o 4 mostra Ago/2026 = último mês dele),
      `/2` e `/8` sem boletas → faixa oculta.
- [x] Revisão de código do `4ce4b63` (etapa 5, 2026-11-09): `/code-review`
      em contexto limpo + revisão de segurança manual (G3; o `/security-review`
      não tinha diff pendente). Segurança: sem achados (sem segredo, injeção,
      chamada nova, mudança de auth ou dependência). Defeitos corrigidos:
  - [x] Valor cortado no `lg` (card com 1/5 da largura + `overflow-hidden`
        do Card): no `lg` as quinzenas empilham. Testado com
        "-R$ 123.456,78" em 1024px e 375px, sem corte.
  - [x] KPIs duplicados no drill-down: `member-panel-tabs.tsx` não chama
        mais `StatsOverview`; fica só o do `DashboardTabs`, que segue o
        filtro (antes uma faixa mostrava Out e a outra Nov). Testado:
        `/gestor/entregadores/4` com filtro Julho → 1 faixa, Jul/2026,
        R$ 99,00 + R$ 189,00 = R$ 288,00 (= card).
  - [x] "N dias com boleta" contava boletas, não datas (no `/gestor` a
        mesma data tem uma boleta por entregador/painel): agora conta datas
        distintas. Teste novo em `lib/metrics.test.ts` (45/45).
  - [x] Estado vazio igual nas duas metades ("sem registros"); 2ª quinzena
        só com o dia 16 mostra "16", não "16–16".
- Decisões do usuário (2026-11-09), sem mudança de código:
  - Período com vários meses (ex.: filtro só de ano): a faixa continua
    mostrando o último mês; o rótulo "Mmm/AAAA" indica qual.
  - Boleta com data futura continua valendo como mês de referência: datas
    futuras podem ser usadas para **simulação**. Ideia, se virar uso real:
    marcar a boleta como "simulação" e deixar o usuário incluir ou não nos
    totais (não bloquear data futura no formulário).
- [x] Débito (fechado 2026-11-09): fórmulas da boleta só em `lib/metrics.ts`
      — `recordGross()` (novo, com teste) e `recordNet()` usados em
      `stats-overview.tsx`, `app/gestor/page.tsx` (2 lugares),
      `overview-panel.tsx` e `daily-records-panel.tsx`. Nenhum
      `delivered * Number(...)` sobrou fora de `lib/metrics.ts`. Testado no
      `/gestor`: painéis R$ 12.442 + R$ 1.937 = entregadores R$ 0 + 350 +
      13.927 + 102 = card líquido R$ 14.379.
- [x] Débito (fechado 2026-11-09): `dashboard-tabs.tsx` memoiza o filtro de
      período dos KPIs (`useMemo`), que criava um `Date` por registro a
      cada render.
- [x] Achado pré-existente (fechado 2026-11-09): cabeçalho em 375px. O grupo
      de botões agora quebra linha (`flex-wrap`) e, abaixo do `sm`,
      "Gestão", "Trocar painel" e "Sair" mostram só o ícone (com
      `aria-label`). Testado: `/dashboard` e `/gestor` em 375px sem rolagem
      horizontal e sem botão fora da tela; texto volta em 1280px.
- [x] Vercel (conferido no painel em 2026-11-09): não estava parada, só
      atrasada. Produção = `9955754` (Ready), que já contém as correções
      (`5c1796a`) e os débitos (`6011e51`); commits intermediários não ganham
      deploy próprio quando um mais novo chega. A API de deployments do
      GitHub demorou a refletir — conferir no painel da Vercel, não só nela.

## Segurança do login Google — D1 e D4 da spec (2026-11-09)
- [x] D1: o login Google só liga ou cria conta pelo e-mail se ele for
      **autoritativo** (`verified_email === true` e `@gmail.com` ou conta
      Workspace com `hd` = domínio). Conta já ligada a outro `google_id` →
      recusa (`google_conflict`). Regras puras em `lib/google-link.ts` (12
      testes). `loginWithGoogle` saiu de `app/actions/auth.ts` (`"use server"`)
      para `lib/google-auth.ts`: confia no perfil recebido, então não pode ser
      Server Action. Callback apaga os cookies de state e convite em toda saída.
- [x] D4: a tela de login mostra os erros `?error=` do Google (tabela fixa).
      Testado com curl: mensagens certas, código desconhecido/`<script>` não
      mostra nada, cookies apagados no cancelamento e no state errado.
      **Não testado:** login Google real (exige conta e credenciais) — testar
      em produção depois do deploy.
- [ ] Débito: cadastro concorrente pelo Google (dois callbacks ao mesmo tempo
      para o mesmo usuário novo) — o 2º `insert` bate na restrição única e o
      usuário vê `google_failed`, embora a conta tenha sido criada. Raro e
      seguro (erro, não acesso errado). Correção: `onConflictDoNothing` + nova
      leitura.
- Efeito colateral aceito: conta Google comum com e-mail de outro domínio
  (ex.: Google criado com @hotmail.com) não cria nem liga conta pelo Google;
  usa e-mail e senha. Contas já ligadas pelo `google_id` não mudam.

## Validação no servidor e "hoje" local — D2, D3, D9 e D12 da spec (2026-11-09)
- [x] D3/D12: todas as actions de escrita (normais e admin) validam no
      servidor com `lib/forms.ts` e devolvem `{ error }` (antes: erro 500 do
      Postgres com texto, valor negativo aceito, exceção sem mensagem na UI).
      Forms mostram o erro (`FormError`) e **mantêm os campos** (`onSubmit`
      em vez de `action`, porque o React 19 limpa o form depois de uma action).
- [x] D2: "hoje" sem UTC — `localDateISO()` no cliente (data padrão dos forms
      e nome dos CSV) e `todayISOIn("America/Sao_Paulo")` no servidor.
- [x] D9: `adminSaveDailyRecord` só audita update que devolveu linha.
- [x] Revisão de código: 8 achados, todos corrigidos (form limpo após erro,
      `in` aceitando "constructor" como painel, ".5"/"3." recusados, update
      de lançamento inexistente dizendo "sucesso", status sem validação no
      update, data via locale `en-CA`, API do id, tipo/caixa de erro repetidos).
- Testado: tsc, 86/86 testes, build; navegador em `/dashboard` só com dados
  **inválidos** (o `.env` local aponta para o Neon): boleta, financeiro e
  rastreio mostram o erro e mantêm os campos; consulta no banco confirmou 0
  linhas de teste gravadas. Não testado: um salvamento válido (gravaria em
  produção) — conferir em uso normal depois do deploy.

## D7, D11 e D13 da spec (2026-11-09)
- [x] D7: `listPendingInvites` não lista convite vencido (`expires_at > now`).
      Sem convites pendentes no banco hoje: efeito não visível com os dados.
- [x] D11: `/panel2` marca o `<body>` com `data-panel` (`PanelTheme`), então
      modais e selects (portal no body) usam o azul do Painel 2. Confirmado
      antes (modal `#8d7bdb`) e depois (`#4f9dff`); `/dashboard` sem a marca.
- [x] D13: excluir boleta, entrega e lançamento pede confirmação
      (`ConfirmDeleteButton`, foco em "Cancelar"). Testado na boleta e no
      financeiro clicando só em Cancelar (nada excluído); rastreio sem
      entregas cadastradas — mesmo componente, não visto na tela.
- [x] Débito fechado em 2026-11-13 (Fase 5): a exclusão de usuário usa o
      `ConfirmDialog` comum.

## D8, D10 e D15 da spec (2026-11-09, fechado em 2026-11-13)
- [x] D8: exclusão de usuário em cascata (`lib/db/delete-user.ts`, regra pura
      em `lib/user-deletion.ts` + teste). Recusa dono de organização com
      outros membros. Revisão de 2026-11-13: a checagem de dono passou para
      dentro da transação, com `FOR UPDATE` na organização (um aceite de
      convite no meio não perde dados). Parâmetro `exec` opcional para
      dry-run com ROLLBACK.
- [x] D8: dry-run no banco real em 2026-11-13 (OK do usuário), transação
      externa + ROLLBACK, 3 caminhos: entregador da org 1 (17 boletas → 0,
      1 meta-registro na org 1), dono de organização individual (org vai
      junto, sem meta-registro), dono da "Legado" com 3 membros (recusa).
      Depois do ROLLBACK, contagens iguais às de antes. O dry-run achou
      queries simultâneas no cliente da transação (deprecated no pg 9):
      contagens agora em sequência.
- [x] D10: `/gestor/auditoria` do admin mostra todas as organizações
      (`getAuditLogGlobal`, 300 mais recentes, selo com o nome da
      organização). Testado no navegador em 2026-11-09 (63/63 entradas).
- [x] D15: não se reproduz em dev nem no build (2026-11-09). Guarda em
      `lib/theme-tokens.test.ts`. Revalidar ao criar o botão de tema.
- [x] `sslmode` resolvido no código (2026-11-13): na Vercel, `DATABASE_URL`
      vem da integração Neon (`sslmode=require`, sem opção de editar), então
      `lib/db/index.ts` passa a URL por `withVerifyFullSsl`
      (`lib/db/ssl-mode.ts` + 3 testes). Conferido num processo novo com o
      `.env` em `require` (igual à produção): conecta e o aviso não aparece.
      O `.env` local voltou a `require`, igual à Vercel.

## Redesign de layout — Fase 1: fundação visual (2026-11-13)
Plano: `C:\Users\IOT DEXTER\.claude\plans\desenvolver-melhorias-de-layouts-cheerful-torvalds.md`.
- [x] Variante `dark:` ligada (`:root:not([data-theme=light]) *`); antes as
      regras `dark:` do shadcn estavam mortas.
- [x] Tema claro com botão (cookie `theme`, `lib/theme.ts` + teste,
      `app/actions/theme.ts`, `components/theme-toggle.tsx`); layout
      escreve `data-theme` no servidor; `generateViewport` com a cor do tema.
      D15 confirmado corrigido: `html`/`body` em `#f4f5f8` no claro.
- [x] Toasts (`sonner` 2.0.8) em todas as mutações; `ConfirmDeleteButton`
      agora mostra o `{ error }` da action em vez de fechar.
- [x] `loading.tsx` (esqueleto) nas rotas de painel, `error.tsx` e
      `not-found.tsx` em português. Efeito colateral documentado na spec §8:
      `redirect()` nessas rotas vira meta refresh (200), sem dado no HTML.
- [x] Dialog rola em tela baixa; larguras com `sm:max-w-*`; "Fechar".
- [x] Alvos de toque de 40 px em tela de toque (`pointer-coarse:`).
- [x] Tokens `--panel-jadlog`, `--panel-2`, `--role-gestor` (uso na Fase 2,
      com a reescrita do `/select`).
- [x] `pnpm-lock.yaml` sincronizado com pnpm 10 numa cópia isolada (spec §2.1).
- [x] Smoke test (2026-11-13): público pelo Chrome DevTools (login nos dois
      temas, 404, Toaster); logado no Chrome do usuário: `/dashboard`,
      `/panel2` (azul no claro), `/gestor`, auditoria (74 entradas, todas as
      organizações), `/gestao`; troca de tema e persistência; modal "Editar
      boleta" com 672 px, rolagem e "Fechar"; modal de excluir → Cancelar
      (nada excluído). Sem salvar nada: o dev usa o banco de produção.
      Achado e corrigido: trocar o tema e navegar logo depois perdia a
      escolha (a navegação cancela a action) → cookie gravado no cliente.
- [ ] Não testado: toasts de sucesso (exigem gravar no banco de produção) e
      a tela em 375 px (a janela do Chrome não redimensionou). Ver na Fase 3.
- [ ] Fase 3: no modal "Editar boleta", a data aparece cortada na grade de 5
      colunas.

## Redesign de layout — Fase 2: navegação fixa por papel (2026-11-13)
- [x] `lib/nav.ts` + teste (`navItems`, `isNavActive`, `drillDownBackHref`).
- [x] `AppShell` (servidor) + `AppNav` (cliente): barra superior no desktop,
      barra inferior no celular, menu de conta (configurações, tema, sair).
      Todas as páginas logadas migradas; `next/link` nos links internos.
- [x] `DashboardHeader` só com título, subtítulo, faixa de modo e ações.
      Modal de configurações em `components/account-settings-dialog.tsx`.
- [x] `/select` refeito: só cartões dos papéis do usuário, cartão Gestão do
      admin, estado vazio sem papel (fim do laço silencioso).
- [x] Drill-down: "Voltar" segue `?from=` (admin vindo do /gestor volta ao
      /gestor). `<a><Button>` aninhado do `users-panel` corrigido.
- [x] `dropdown-menu.tsx` escrito à mão: o CLI do shadcn gerava
      `import { cn } from "cn"` e pedia um pacote npm `cn` (não instalado).
- [x] Smoke test no Chrome do usuário: `/select`, barra e item ativo,
      menu de conta, modal de configurações, tema pelo menu, drill-down pelos
      dois caminhos com o "Voltar" certo, Painel 2 (barra azul), auditoria,
      `/gestao`. Celular simulado num iframe de 375 px: barra inferior com os
      5 itens e JADLOG ativo.
- [ ] Fase 3: em 375 px há 2 px de rolagem horizontal no `/dashboard`: o
      ícone do cartão "Fat. bruto" sai do cartão com valor longo, e a lista de
      abas (`w-fit`) estoura. Já existia antes da Fase 2.

## Redesign de layout — Fase 3: telas do entregador (2026-11-13)
- [x] Filtro de período único na página (`PeriodFilter`, `lib/period.ts`):
      cartões, Boletas, Financeiro e Visão geral. Rastreio sem filtro.
- [x] Cartões do topo: faixa com rolagem lateral abaixo do `lg`; ícone não
      sai do cartão; "Pacotes no rastreio"; saldo com receitas e despesas
      na dica (a faixa repetida do Financeiro saiu). Fim dos 2 px de rolagem
      lateral em 375 px (conferido num iframe de 375 px: 358 = 358).
- [x] Boleta: form `@container` (data inteira no modal), `MoneyInput` /
      `CountInput` (vírgula e teclado numérico), valor por entrega = o da
      última boleta, aviso antes de substituir uma data, data travada na
      edição, form limpo + toast depois de salvar.
- [x] Histórico: cartões por dia no celular, tabela do `sm` para cima,
      resumo anual logo depois do ano, "Com entregas"/"Sem entregas",
      mensagens de vazio com filtro, coluna Ações some no só leitura.
- [x] Rastreio = "Pacotes": busca, chips de status, edição do pacote
      (`updateDelivery` + `adminUpdateDelivery` + `updateDeliveryById`),
      status controlado com reversão na falha.
- [x] Visão geral: eixo em moeda compacta (`formatCurrencyCompact`), tooltip
      em R$ no financeiro, meses de `lib/format`.
- [x] Testes: `lib/ui-helpers.test.ts` (18). Total 128/128.
- [x] Smoke test no Chrome do usuário, sem gravar: filtro Novembro/2026
      (cartões 399 entregas / R$ 798,00, sem resumo anual), aviso "Já existe
      boleta em 12/11/2026" com as server actions bloqueadas no navegador
      (0 chamadas), vírgula nas despesas, edição com data travada, celular
      (form em 1 coluna, cartões do histórico, barra inferior), Financeiro,
      Visão geral.
- [ ] Não testado no navegador: salvar de verdade (grava no banco de
      produção), edição e status de pacote (não há pacotes cadastrados).
- [ ] Limite aceito: digitar "1.234,56" tecla a tecla vira 1,23 (o primeiro
      separador é o decimal); colado de uma vez fica 1234,56.

## Redesign de layout — Fase 4: gestor (2026-11-13)
- [x] D6: `/gestor` com seletor de painel e cartões só do painel escolhido
      (os painéis nunca são somados); filtro de período.
- [x] Entregadores com busca, números por painel e "Última boleta".
- [x] Drill-down: seletor de painel no lugar de abas dentro de abas;
      Painel 2 azul também nos modais.
- [x] Convites: "Compartilhar" (`navigator.share`) e confirmação ao revogar
      (um e todos). `ConfirmButton` genérico (`components/confirm-dialog.tsx`).
- [x] Auditoria: nome do item, data com hora, valores formatados, filtros
      por pessoa e tipo, 50 por vez, confirmação ao excluir.
- [x] Testes: `lib/gestor-helpers.test.ts` (10). Total 138/138.
- [x] Smoke test (DOM, o screenshot do Chrome travou): seletor de painel
      (JADLOG 6608 / Painel 2 908 entregas = os 7516 do cartão somado
      antigo), cartões de entregador por painel, auditoria (itens pelo nome,
      hora, R$, filtro por tipo), drill-down (347 → 0 ao trocar de painel,
      `<body data-panel>` azul).
- [ ] Não testado: criar/compartilhar/revogar convite (grava no banco de
      produção; não há pendentes) e excluir entrada de auditoria.
- [ ] Ideia: convites como seção recolhível (ficou como card abaixo dos
      entregadores).

## Redesign de layout — Fase 5: admin e primeiro acesso (2026-11-13)
- [x] `/gestao`: cartões no celular, tabela do `sm` para cima, menu ⋯ com
      rótulos ("Abrir como ADMIN MASTER", "Editar nome e e-mail", "Redefinir
      senha", "Excluir usuário"; desabilitado para o próprio admin).
      Exclusão pelo `ConfirmDialog` (com Cancelar e foco nele) — fecha o
      débito do modal próprio de exclusão de usuário.
- [x] Login e cadastro: botão de mostrar senha (`PasswordInput`),
      "Esqueci minha senha" (orienta a falar com o gestor ou suporte; sem
      e-mail de recuperação), cartão com 24 px de espaço no celular.
- [x] Convite com sessão: "Você está entrando como {e-mail}" + "Não é você?
      Trocar conta" (sai e volta ao convite). `logout(formData?)` só aceita
      `/convite/{token}` como destino (`lib/auth-redirect.ts` + teste).
- [x] Testes: `lib/auth-redirect.test.ts` (3). Total 141/141.
- [x] Smoke test: menu ⋯ do `/gestao` (itens e "Excluir (é você)"
      desabilitado), modal de exclusão aberto e cancelado com as server
      actions bloqueadas (0 chamadas, Walter continua na lista); login sem
      sessão (Chrome isolado): olho troca `password`→`text`, "Esqueci minha
      senha", 24 px de espaço em tela estreita.
- [ ] Não testado no navegador: convite com sessão ("Trocar conta") — exige
      um convite válido (criar grava no banco de produção). Coberto pelo
      teste do destino seguro e pelo tsc.
- [ ] Ideia futura: recuperação de senha por e-mail (precisa de serviço de
      e-mail).

## Redesign — revisão de código das Fases 4 e 5 (`/code-review medium`, 2026-11-13)
Corrigidos:
- [x] Hora da auditoria dependia do fuso da máquina (servidor UTC ≠
      navegador BRT → erro de hidratação e hora errada): fuso fixo
      `America/Sao_Paulo` + teste da meia-noite UTC.
- [x] `ConfirmDialog` mantinha o erro da tentativa anterior ao reabrir.
- [x] `/gestor`: "dias trabalhados" e "Média/dia" contavam uma boleta por
      entregador por dia (140 → 122 dias no JADLOG); agora datas distintas.
      Já estava errado antes do redesign.
- [x] Auditoria mandava as fotos completas dos registros (endereços,
      valores, entradas aninhadas) para o navegador: o nome do item é
      montado no servidor e as fotos ficam lá.
- [x] Filtro "Quem fez" juntava homônimos: chave = `actorUserId`.
- [x] Depois de excluir tudo sem filtro, aparecia "com esse filtro".
Não é defeito:
- O gatilho do `ConfirmButton` não fica desabilitado durante a ação: o
  modal fica aberto e bloqueado enquanto ela roda; um segundo clique depois
  abre outra confirmação.
Débito (eficiência/repetição, para uma tarefa própria):
- [x] `gestor-overview.tsx` usa `lastBoletaByUser` (um `max` por usuário)
      para a última boleta (2026-11-13).
- [x] Cor do painel numa fonte só (`PANEL_COLORS`/`panelColor` em
      `lib/format.ts`) e busca normalizada numa só (`normalizeSearch`),
      usadas por `app-nav`, `gestor-overview`, `member-panel-tabs` e
      `package-filter` (2026-11-13).
- [x] Textos da auditoria em `lib/audit-format.ts` (`auditEntityPlural`,
      `auditFieldLabel`) (2026-11-13).

## Testes em produção (2026-11-13, autorizados pelo usuário)
Em painelmylog.vercel.app, com a conta do admin, deixando o banco como
estava (a auditoria registra cada passo, 09:21–09:22):
- [x] Boleta no Painel 2 em 02/01/2020 (data sem dados): salvar (toast
      "Boleta de 02/01 salva", form limpo, valor por entrega 2,00 da última
      boleta, vírgula "1,5" → R$ 1,50); salvar a mesma data (aviso "Já
      existe boleta em 02/01/2020" → Substituir); editar (data travada, 9
      entregas); excluir (foco em Cancelar, toast "Excluído"). Ano 2020
      some do filtro depois.
- [x] Pacote TESTE-MYLOG-001: cadastrar (12,5 → R$ 12,50), busca sem
      acento ("sao jose"), sem resultado, chips de status, status "Em
      trânsito" pelo select, editar (cidade), excluir. Cartão volta a 0.
- [x] Convites: gerar com e-mail e genérico; tela do convite com sessão
      ("Você está entrando como…", "Trocar conta" com destino seguro);
      aceitar com outra conta → "Este convite é exclusivo para…" (nada
      aceito); "Revogar os 2 convites pendentes?" → toast; revogar um →
      toast; link revogado → "Este convite foi revogado.".
- [x] Achado e corrigido: "Copiar" falhava calado quando o navegador não
      liberava a área de transferência. Agora avisa e seleciona o link
      (testado com recusa e sucesso simulados).
- [x] "Trocar conta" e login com Google: testados e aprovados pelo usuário
      em 2026-11-13.

## Base de teste de pior caso (decisão do usuário, 2026-11-09; feita 2026-11-13)
- [x] `lib/fixtures/worst-case.ts` + `lib/worst-case.test.ts` (14 testes):
      valores grandes (R$ 354 mil por painel no mês), 3 entregadores e os 2
      painéis na mesma data, mês negativo, só a 1ª quinzena, só o dia 16,
      virada de ano. Mutação conferida: voltar "dias trabalhados" para
      contar boletas faz o teste falhar. Contas dos cartões extraídas para
      `computeKpis` (`lib/kpis.ts`) para poderem ser testadas.
- [x] `scripts/seed-worst-case.ts`: grava a base num banco de TESTE; trava
      `seedTargetAllowed` recusa o host+banco do `DATABASE_URL` (+ testes);
      exige `--yes`. **Nunca rodou** (não existe banco de teste ainda).
- [x] Revisão de código (2026-11-13) do seed, ainda não executado: a trava
      não via o host `-pooler` do Neon como o mesmo banco (o `.env` usa
      `-pooler`: o host direto passaria) e liberava sem `DATABASE_URL`;
      o seed apagava os ids 901–903 sem conferir de quem eram, não apagava
      pacotes e não avançava as sequências. Tudo corrigido + testes
      (`-pooler`, sem `DATABASE_URL`). Também: mês só com a 2ª quinzena
      (vários dias) no fixture, virada de ano pelo `filterByPeriod`,
      `memberStats` sem `lastDate` duplicado, um só "começar por aqui" no
      handoff.
- [ ] Criar um banco Neon de teste (branch do Neon serve), aplicar o DDL da
      spec §4.2 e rodar o seed; depois fazer o smoke test logado nele.

## Pendências conhecidas
- **Sem migração automatizada de schema**: mudanças de banco são feitas via
  SQL manual no Neon SQL Editor (ver `migrate-unique-fix.sql` como exemplo).
  Qualquer alteração de schema precisa desse mesmo fluxo manual antes do
  deploy do código que depende dela.
- **Cobertura de testes ainda parcial**: só funções puras de `lib/` têm
  teste. Server actions (`app/actions/*.ts`) e componentes não são testados
  — dependem de banco/`next/headers`, exigiriam mocks ou um banco de teste.
- ~~Sem CI configurado~~ resolvido em 2026-09-25 (`.github/workflows/ci.yml`).
- ~~Tema claro não pinta `<html>`/`<body>`~~ não se reproduz (D15, 2026-11-09).
