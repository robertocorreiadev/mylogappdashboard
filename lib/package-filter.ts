// Busca e filtro da aba Rastreio (pacotes).
import { normalizeSearch as norm } from "@/lib/format"

type PackageLike = { trackingCode: string; recipient: string; city: string | null; status: string }

/** Busca no código, destinatário e cidade (sem maiúsculas nem acentos) + status ("all" = todos). */
export function filterPackages<T extends PackageLike>(items: T[], query: string, status: string): T[] {
  const q = norm(query.trim())
  return items.filter((p) => {
    if (status !== "all" && p.status !== status) return false
    if (!q) return true
    return [p.trackingCode, p.recipient, p.city ?? ""].some((f) => norm(f).includes(q))
  })
}
