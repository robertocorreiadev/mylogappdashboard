# TODO - JADLOG Dashboard

Status em 2026-08-24. Histórico de etapas antigas (migração do sistema
`PROFILES` para auth por usuário, indicadores modulares, boleta diária) foi
concluído e removido daqui — consulte o `git log` para o histórico.

## Concluído recentemente
- Auth por e-mail/senha (scrypt) + OAuth Google, cookie de sessão assinado (HMAC).
- Migração silenciosa de hashes de senha do formato legado para scrypt no login.
- Gestão de usuários (`/usuarios`, restrita a `ADMIN_EMAIL`).
- Filtro de período (ano/mês) refletido nos KPIs do topo.
- Normalização de e-mail (lowercase) consistente entre login/registro/perfil/admin.
- Rate limit em memória para tentativas de login (`lib/rate-limit.ts`) — 5
  tentativas / 15 min por e-mail. Ver comentário no arquivo sobre a limitação
  (estado não é compartilhado entre instâncias/deploys).
- Suíte de testes unitários com Vitest (`npm test`) cobrindo `lib/auth.ts`,
  `lib/format.ts` e `lib/rate-limit.ts`.

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
