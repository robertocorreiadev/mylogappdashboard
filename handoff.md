# Handoff — MyLog Multi-Tenant

Última atualização: 2026-09-25. Se esta sessão for interrompida, leia este
arquivo primeiro, depois `TODO.md` (histórico detalhado por fase) e o plano
original em
`C:\Users\IOT DEXTER\.claude\plans\vamos-arquitetar-um-sistema-mutable-quail.md`.

## Estado do projeto

Fases 1, 2, 3, 4, 5 **e o modo ADMIN MASTER** estão **implementados, com
`tsc --noEmit` e `npm test` (34/34) limpos, e testados manualmente no
navegador de ponta a ponta** (ver `TODO.md` para o que foi verificado em
cada item). Produção (Neon) já rodou os scripts de migração
`migrate-multitenant-001-schema.sql`,
`migrate-multitenant-001b-dual-role-index.sql` e
`migrate-multitenant-002-backfill-legacy-org.sql` — não precisa rodar de
novo.

**Commit + push já feitos**: `1f9ec5c` em `main`, empurrado pra
`origin/main` (`7fa3ffe..1f9ec5c`) em 2026-09-25. Não repita — confira
`git log --oneline -3` antes de commitar de novo.

Próximos passos em aberto (não implementados, ver seção "Ideias
registradas" no fim deste arquivo e `TODO.md`): exportação CSV/PDF,
painéis customizáveis por organização, rate limit no aceite de convite.

O texto abaixo é o histórico da decisão de arquitetura do ADMIN MASTER —
não precisa reler se `git log --oneline -3` já mostra o commit `1f9ec5c`
(ou um commit posterior). Se a sessão foi interrompida ANTES desse commit
existir, rode `git status`: se as mudanças descritas abaixo ainda estiverem
no working tree sem commit, prossiga direto pro commit + push (permissão já
concedida pelo usuário) em vez de reimplementar do zero.

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

## Ideias registradas, não implementadas (ver TODO.md para detalhe)
- Exportação CSV/PDF de performance (CSV grátis pros dois papéis, PDF como
  add-on pago do gestor).
- Painéis customizáveis por organização (pivot maior — nome próprio por
  painel, 2 grátis + adicionais pagos, rota dinâmica `/painel/[slug]`
  substituindo `/dashboard`+`/panel2` hardcoded). Ainda não planejado em
  detalhe — só discutido.
- Rate limit nas tentativas de aceite de convite (token já é alta entropia,
  então é reforço, não proteção essencial).
