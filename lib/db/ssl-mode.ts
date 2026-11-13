/**
 * Pede `sslmode=verify-full` explicitamente.
 *
 * A integração Neon da Vercel gera `DATABASE_URL` com `sslmode=require` e
 * não deixa editar a variável. O `pg` 8.22 já trata `require`, `prefer` e
 * `verify-ca` como `verify-full`, mas avisa que no `pg` 9 eles passam a ser
 * mais fracos. Trocar aqui mantém o comportamento de hoje, tira o aviso e
 * protege a conexão quando o `pg` for atualizado. `disable` (banco local)
 * e URLs sem `sslmode` ficam como estão.
 */
export function withVerifyFullSsl(url: string | undefined): string | undefined {
  if (!url) return url
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full")
}
