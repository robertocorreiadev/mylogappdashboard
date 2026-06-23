# TODO - JADLOG Dashboard (Implementação completa)

## Etapa 1 — Revisão do código existente (feito)
- Entender fluxo atual de auth por `PROFILES` (cookie `jadlog_profile`).
- Confirmar que boleta diária e indicadores já existem no `daily-records-panel.tsx`.

## Etapa 2 — Localização exata de UI pedida (pendente)
- Encontrar/alterar rodapé/topo com texto “Painel individual 2026 + nuvem” e “sincronizado…”.
- Atualizar: indicador no rodapé superior esquerdo (sem “+nuvem”) e dinâmica por ano.
- Remover “nome do usuário” na página inicial.

## Etapa 3 — Auth unificada
- Remover sistema `PROFILES`.
- Implementar login individual por email/senha (users + password_hash).
- Manter OAuth Google (Auth0/Google) e criar/ajustar callback.
- Trocar sessão/cookie para identificar `userId`.

## Etapa 4 — Boleta diária & Ações
- Garantir que `daily-records-panel.tsx` chama a action correta `app/actions/daily-records.ts`.
- Implementar/ajustar `saveDailyRecord`, `deleteDailyRecord` e `getDailyRecords`.

## Etapa 5 — Indicadores modulares (mensal + anual)
- Garantir “linha indicativa embaixo do último dia do mês”.
- Indicador anual equivalente.
- Garantir que os módulos recalculam conforme os dias são registrados.

## Etapa 6 — Teste/Build
- Rodar `npm run build` e `npm run lint` (ou equivalente do projeto).

## Entrega final
- Gerar lista de arquivos adicionais estáveis para adicionar no projeto.
- Informar comando para commit/push no GitHub.

