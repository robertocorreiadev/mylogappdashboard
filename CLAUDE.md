@AGENTS.md

# QA / Revisão de consistência

Antes de considerar qualquer alteração de código concluída, sempre:

- Revisar o diff em busca de inconsistências (tipos, props não utilizadas ou faltando, nomes divergentes entre componentes que se comunicam).
- Buscar outros usos do símbolo alterado, para ver se a mudança quebra algo que não foi tocado diretamente.
- Rodar `npx tsc --noEmit`, `npm test -- --run` e `npm run build`. Os três precisam passar: o CI (`.github/workflows/ci.yml`) roda os mesmos comandos a cada push.
- Testar a funcionalidade no navegador (smoke test manual), não só os tipos e os testes unitários.

Isso é rotina obrigatória, não opcional: não pular esta etapa mesmo em mudanças aparentemente pequenas.
