# TODO - JADLOG Dashboard (Implementação completa)

## Etapa 1 — Revisão do código existente (feito)
- Entender fluxo atual de auth por `PROFILES` (cookie `jadlog_profile`).
- Confirmar que boleta diária e indicadores já existem no `daily-records-panel.tsx`.

## Etapa 2 — UI/rodapé e remoção de “nome do usuário” (feito parcial)
- Identificar componentes que renderizam textos do topo/rodapé.
- Remover “nome do usuário” na página inicial.
- Atualizar indicador no rodapé superior esquerdo (sem “+nuvem”) e dinâmica por ano.

## Etapa 3 — Auth unificada (feito)
- Remover sistema `PROFILES`.
- Implementar login individual por email/senha (users + password_hash).
- Manter OAuth Google (Auth0/Google) e criar/ajustar callback.
- Trocar sessão/cookie para identificar `userId`.

## Etapa 4 — Boleta diária & Ações (feito)
- Garantir que `daily-records-panel.tsx` chama a action correta `app/actions/daily-records.ts`.
- Implementar/ajustar `saveDailyRecord`, `deleteDailyRecord` e `getDailyRecords`.

## Etapa 5 — Indicadores modulares (mensal + anual) (feito)
- Garantir “linha indicativa embaixo do último dia do mês”.
- Indicador anual equivalente.
- Garantir que os módulos recalculam conforme os dias são registrados.

## Etapa 6 — Teste/Build (parcial)
- Rodar `npm run build` e `npm run lint` (ou equivalente do projeto).
- Tratar erros de ESLint/comandos se necessário.

## Entrega final
- Gerar lista de arquivos adicionais estáveis para adicionar no projeto.
- Informar comando para commit/push no GitHub.

