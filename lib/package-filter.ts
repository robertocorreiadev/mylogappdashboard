// Busca e filtro da aba Rastreio (pacotes).

type PackageLike = { trackingCode: string; recipient: string; city: string | null; status: string }

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** Busca no código, destinatário e cidade (sem maiúsculas nem acentos) + status ("all" = todos). */
export function filterPackages<T extends PackageLike>(items: T[], query: string, status: string): T[] {
  const q = norm(query.trim())
  return items.filter((p) => {
    if (status !== "all" && p.status !== status) return false
    if (!q) return true
    return [p.trackingCode, p.recipient, p.city ?? ""].some((f) => norm(f).includes(q))
  })
}
