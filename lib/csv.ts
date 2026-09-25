// Exportação CSV — grátis pros dois papéis (entregador e gestor), já que é
// portabilidade do próprio dado, não uma feature de valor agregado. Ponto
// único usado pelos 3 painéis (daily-records/deliveries/finance), que já
// são compartilhados entre o dashboard do entregador e o drill-down
// somente-leitura do gestor — implementar aqui cobre os dois de graça.
//
// Delimitador ";" de propósito: Excel em locale pt-BR espera ";" (a vírgula
// é o separador decimal nesse locale) para abrir o CSV direto sem assistente
// de importação manual.
type Column<T> = {
  key: keyof T | ((row: T) => string | number | null | undefined)
  label: string
}

// Campos livres (destinatário, descrição, endereço...) são digitados por
// entregadores e lidos por gestores em outra conta — sem isso, um campo tipo
// `=HYPERLINK("http://evil","x")` vira fórmula executada quando o CSV abre
// no Excel/Sheets (injeção de fórmula entre organizações). "-" só é
// neutralizado quando NÃO seguido de dígito, pra não estragar valores
// monetários negativos legítimos (ex.: faturamento líquido no vermelho).
const DANGEROUS_LEADING = /^[=+@]|^-(?!\d)|^[\t\r]/

function escapeCsvField(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value)
  if (DANGEROUS_LEADING.test(str)) {
    str = `'${str}`
  }
  if (/["\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const header = columns.map((c) => escapeCsvField(c.label)).join(";")
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCsvField(typeof c.key === "function" ? c.key(row) : row[c.key]))
      .join(";")
  )
  return [header, ...lines].join("\r\n")
}

// BOM UTF-8 no início — sem isso o Excel no Windows abre acentuação (ã, ç,
// á...) quebrada.
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
