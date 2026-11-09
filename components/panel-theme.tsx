"use client"

import { useEffect } from "react"

// D11: modais e menus (Dialog, Select) renderizam num portal direto no <body>,
// fora do <main data-panel>. Marcar o <body> faz eles herdarem as cores do
// painel. Some ao sair da página, para não pintar outras rotas.
export function PanelTheme({ panel }: { panel: string }) {
  useEffect(() => {
    document.body.dataset.panel = panel
    // Só apaga se a marca ainda for a deste painel (outra instância pode ter trocado).
    return () => { if (document.body.dataset.panel === panel) delete document.body.dataset.panel }
  }, [panel])
  return null
}
