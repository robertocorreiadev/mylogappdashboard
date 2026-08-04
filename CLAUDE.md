# QA / Revisão de consistência

Antes de considerar qualquer alteração de código concluída, sempre:
- Revisar o diff em busca de inconsistências (tipos, props não utilizadas/faltando, nomes divergentes entre componentes que se comunicam).
- Verificar se build/typecheck (`npm run build` ou `tsc --noEmit`) passa, quando aplicável.
- Checar se a mudança quebra algo relacionado que não foi tocado diretamente (buscar por outros usos do símbolo alterado).

Isso é rotina obrigatória, não opcional — não pular esta etapa mesmo em mudanças aparentemente pequenas.
