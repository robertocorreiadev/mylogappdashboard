# MyLog — especificação completa do painel

> **Contrato deste arquivo.** Este documento sozinho deve bastar para reconstruir o sistema inteiro: banco, regras, rotas, telas e textos.
> Ele descreve o sistema **como ele é hoje**. Não é uma lista de desejos.
>
> - **Base:** commit `a99e63f` em `main`. Ele inclui o merge do PR #1 (`875c4c6`: consolidação de auth, protótipo de design system e CI), a faixa de quinzenas (`4ce4b63`), as correções da revisão dela (`5c1796a`) e os débitos fechados (`6011e51`).
> - **Revisão:** 2026-11-09. Auditoria feita linha a linha contra o código.
> - **Substitui:** `docs/historico/DASHBOARD PROMPT.txt` (v1, 2026-06-23) e `docs/historico/DASHBOARD PROMPT v2.txt` (2026-11-09).
> - **Segredos:** este arquivo não contém nenhum. Os valores reais ficam em `.env`, que não é versionado.

## Legenda

| Marca | Significado |
|---|---|
| **DEVE** | Obrigatório. A reconstrução falha sem isto. |
| `"texto"` | Texto exato que aparece na tela. Copiar letra por letra. |
| **[DEFEITO Dn]** | Comportamento atual errado. Reconstruir **sem** o defeito. A lista está na §15. |
| **[DECIDIR Qn]** | Ponto aberto. Vale a regra atual até o dono decidir (§16). |
| `arquivo.ts` | Arquivo de origem no repositório. |

---

## 1. Produto

1.1 O MyLog é um painel web para **entregadores autônomos**. O entregador registra uma **boleta diária**: entregas feitas, valor por entrega e despesas. O painel calcula o faturamento bruto e o líquido e mostra resumos por mês e por ano.

1.2 Cada entregador tem **dois painéis independentes**, um por contrato:

| Chave (`panel`) | Nome na tela | Rota | Cor primária |
|---|---|---|---|
| `jadlog` | `"JADLOG"` / `"Painel JADLOG"` | `/dashboard` | cor de marca índigo `#8d7bdb` (tema padrão, §12) |
| `panel2` | `"Painel 2"` | `/panel2` | azul `#4f9dff` |

Os dados de um painel nunca se misturam com os do outro.

1.3 Cada painel tem 4 abas: **Boletas** (o registro do dia), **Rastreio** (pacotes), **Financeiro** (receitas e despesas avulsas) e **Visão geral** (gráficos).

1.4 Camada de empresas (multi-tenant):
- uma **organização** tem membros com o papel `gestor` ou `entregador`;
- o **gestor** convida entregadores por link e vê os dados deles **só para leitura**;
- toda alteração de um entregador fica em uma **auditoria** que o gestor pode ler.

1.5 **ADMIN MASTER:** o usuário cujo e-mail é igual a `ADMIN_EMAIL`. Ele:
- gerencia todos os usuários;
- cria organizações;
- edita dados de qualquer entregador de qualquer organização, nas mesmas telas;
- pode excluir entradas da auditoria. Cada exclusão grava um novo registro que documenta a própria exclusão.

1.6 Idioma: português do Brasil. Moeda: BRL, `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`. `<html lang="pt-BR">`.

---

## 2. Pilha, versões e configuração

### 2.1 Dependências (`package.json`)

```json
{
  "name": "my-project", "version": "0.1.0", "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint .", "test": "vitest run" },
  "dependencies": {
    "@base-ui/react": "^1.5.0", "@vercel/analytics": "1.6.1", "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1", "drizzle-orm": "^0.45.2", "lucide-react": "^1.16.0", "next": "16.3.2",
    "pg": "^8.22.0", "react": "^19", "react-dom": "^19", "recharts": "3.8.0", "shadcn": "^4.8.0", "sonner": "2.0.8",
    "tailwind-merge": "^3.3.1", "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.0", "@types/node": "^24", "@types/pg": "^8.20.0", "@types/react": "^19",
    "@types/react-dom": "^19", "postcss": "^8.5", "tailwindcss": "^4.2.0", "typescript": "5.7.3", "vitest": "^4.1.11"
  },
  "pnpm": { "overrides": { "hono": "4.12.25" } }
}
```

- O deploy é na **Vercel** e usa **pnpm**. `pnpm-lock.yaml` DEVE ficar em sincronia com `package.json`, senão o deploy falha.
  - O lock foi gerado com **pnpm 10** (tem campos `libc`; o pnpm 9 apaga esses campos). Para sincronizar sem mexer no `node_modules` (que é do npm), copiar `package.json` e `pnpm-lock.yaml` para uma pasta temporária, rodar `npx pnpm@10 install --lockfile-only` lá e trazer só o lock de volta. Rodar o pnpm na pasta do projeto pede para apagar e reinstalar o `node_modules`.
- O CI usa **npm**. `package-lock.json` também DEVE ficar em sincronia.
- **CI** (`.github/workflows/ci.yml`): roda em todo push para `main` e em todo PR, em `ubuntu-latest` com Node 22 (cache npm). Passos:
  1. `npm ci`;
  2. `npx tsc --noEmit`;
  3. `npm test -- --run`;
  4. `npm run build`.

  O CI usa `DATABASE_URL: postgres://ci:ci@localhost:5432/ci`, um valor fictício. Ele nunca aponta para produção. O build não consulta o banco, porque todas as rotas são dinâmicas.
- **Next.js 16 muda APIs em relação a versões anteriores.** Exemplos: `params` de rota dinâmica é `Promise<...>` e `cookies()` é `async`. Antes de mexer em convenções de rota, ler `node_modules/next/dist/docs/`.

### 2.2 Arquivos de configuração

| Arquivo | Conteúdo essencial |
|---|---|
| `next.config.mjs` | `{ images: { unoptimized: true } }` |
| `postcss.config.mjs` | `plugins: { '@tailwindcss/postcss': {} }` |
| `tsconfig.json` | `strict: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `target: "ES6"`, alias `"@/*": ["./*"]`, plugin `next` |
| `vitest.config.ts` | alias `@` → raiz; `environment: "node"`; `include: ["**/*.test.ts"]`; `exclude: ["node_modules", ".next", ".claude"]` |
| `components.json` | shadcn `style: "base-nova"`, `rsc: true`, `baseColor: "neutral"`, `cssVariables: true`, `iconLibrary: "lucide"`, css em `app/globals.css` |
| `.gitignore` | `.env`, `.env*.local`, `client_secret*.json`, `node_modules`, `.next/`, `.claude/`, `*.lnk`, arquivos internos do v0 (`__v0_*`, `.snowflake/`, `.v0-trash/`), `.vercel/` |

### 2.3 Componentes de UI (`components/ui/`)

Gerados pelo shadcn com o estilo `base-nova` sobre **Base UI** (`@base-ui/react`), não Radix: `badge`, `button`, `card`, `chart`, `dialog`, `input`, `label`, `select`, `table`, `tabs`. Para gerar de novo: `npx shadcn add badge button card chart dialog input label select table tabs`.

Escritos à mão (sem o CLI):
- `dropdown-menu.tsx`: `DropdownMenu`, `Trigger`, `Content` (portal + positioner, `align="end"`, `min-w-56`), `Group`, `Label`, `Item` (`variant` `default`/`destructive`), `Separator`, sobre `@base-ui/react/menu`. O `npx shadcn add dropdown-menu` de 2026-11-13 gerava `import { cn } from "cn"` e pedia um pacote npm `cn` estranho ao projeto: **não usar o CLI para este componente**.
- `skeleton.tsx`: `div` com `animate-pulse rounded-md bg-muted` e `aria-hidden`.
- `sonner.tsx`: `Toaster` do `sonner` que recebe o tema do layout (prop `theme`, não `next-themes`), `position="top-center"`, `closeButton`, `richColors` e as cores `--normal-bg/text/border` ligadas a `--popover`, `--popover-foreground` e `--border`.

Ajustes locais nos gerados (DEVE manter ao regenerar):
- `dialog.tsx`: o conteúdo tem `max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain` (rola em celular baixo). O padrão é `sm:max-w-sm`; quem precisa de mais largura passa `sm:max-w-*` (um `max-w-*` sem prefixo perde para o `sm:max-w-sm`). O botão de fechar diz `"Fechar"`.
- `button.tsx` e `tabs.tsx`: em tela de toque (`pointer-coarse:`) os tamanhos sobem para 40 px (`default`, `icon`, `icon-sm`; `sm` = 36 px; lista de abas = 40 px).

Contratos do Base UI que o código usa (DEVE manter):
- `DialogTrigger` recebe o botão pela prop `render={<Button .../>}`. Não usa `asChild`, porque `asChild` causava botão dentro de botão e erro de hidratação.
- `Select.onValueChange` recebe `value | null`.
- `SelectValue` aceita uma função como filho: `(value) => rótulo`.
- `DialogContent` é renderizado num **portal** em `<body>`.

`lib/utils.ts`: `cn(...inputs) = twMerge(clsx(inputs))`.

### 2.4 Layout raiz (`app/layout.tsx`)

- Fontes Google `Geist` e `Geist_Mono`, nas variáveis `--font-geist-sans` e `--font-geist-mono`.
- Metadados:
  - `title: "MYLOG · Painel de Controle"`;
  - `description: "Portal de gestão de entregas e financeiro MYLOG"`;
  - ícones `/icon-light-32x32.png` (tema claro), `/icon-dark-32x32.png` (tema escuro), `/icon.svg` e `apple: /apple-icon.png`.
- O layout é `async`: lê o cookie `theme` (`parseTheme`, `lib/theme.ts`: só `"light"` vale claro; qualquer outro valor ou nenhum = escuro).
- `generateViewport()` (não o objeto `viewport`): `colorScheme` = o tema; `themeColor` = `#0f1117` (escuro) ou `#f4f5f8` (claro), a cor de `--background`.
- `<html lang="pt-BR" data-theme="{tema}" className="{fontes} bg-background">` e `<body className="font-sans antialiased">`.
- `<Toaster theme={tema}/>` (`components/ui/sonner.tsx`) logo depois do conteúdo.
- Sem `generator` nos metadados.
- `<Analytics/>` da Vercel só quando `NODE_ENV === "production"`.

---

## 3. Variáveis de ambiente (`.env`)

| Nome | Uso |
|---|---|
| `DATABASE_URL` | String de conexão Postgres (Neon, com pool). `lib/db/index.ts` usa esta. |
| `DATABASE_URL_UNPOOLED` | Conexão direta. Existe no `.env`, mas o código não a lê. |
| `SESSION_SECRET` | Chave HMAC do cookie de sessão. Sem ela, `getSecret()` lança `"SESSION_SECRET não configurado"`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth do Google. |
| `NEXT_PUBLIC_BASE_URL` | URL pública, sem `/` no fim. Monta o redirect do OAuth e o link de convite. |
| `ADMIN_EMAIL` | E-mail do ADMIN MASTER. A comparação ignora maiúsculas e minúsculas. Vazio = ninguém é admin. |

No Google Cloud Console, a URI de redirecionamento autorizada é `{NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`.

---

## 4. Banco de dados (Postgres)

### 4.1 Regras

- **Não existe migration runner.** Toda mudança de schema é SQL manual, rodado no editor SQL do Neon **antes** do deploy do código que depende dela.
- ORM: Drizzle (`drizzle-orm/node-postgres` com `pg.Pool`). O schema TypeScript fica em `lib/db/schema.ts` e DEVE refletir o DDL abaixo.
- `lib/db/scopes.ts` é o **único** arquivo que consulta ou grava `daily_records`, `deliveries` e `transactions` (§10.10). Um teste de arquitetura garante isso (§13).

### 4.2 DDL consolidado (instalação do zero)

```sql
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,          -- sempre gravado em minúsculas pelo app
  password_hash  TEXT,                          -- NULL = conta só Google
  google_id      TEXT UNIQUE,
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  owner_user_id  INTEGER NOT NULL REFERENCES users(id),        -- SEM cascade, de propósito
  status         TEXT NOT NULL DEFAULT 'active',               -- 'active' | 'suspended' (o app não usa 'suspended')
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memberships (
  id                  SERIAL PRIMARY KEY,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,                            -- 'gestor' | 'entregador'
  status              TEXT NOT NULL DEFAULT 'active',           -- 'active' | 'removed' (o app não grava 'removed')
  invited_by_user_id  INTEGER REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at          TIMESTAMPTZ
);
-- Dual-role: no máximo 1 membership ATIVA por (usuário, papel).
CREATE UNIQUE INDEX memberships_one_active_role_per_user ON memberships(user_id, role) WHERE status = 'active';
CREATE INDEX memberships_org_id_idx ON memberships(organization_id);

CREATE TABLE invites (
  id                   SERIAL PRIMARY KEY,
  organization_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash           TEXT NOT NULL UNIQUE,                    -- sha256(token) em hex; o token puro nunca é gravado
  role                 TEXT NOT NULL DEFAULT 'entregador',
  email                TEXT,                                    -- opcional: só esse e-mail pode aceitar
  created_by_user_id   INTEGER NOT NULL REFERENCES users(id),
  expires_at           TIMESTAMPTZ NOT NULL,
  accepted_at          TIMESTAMPTZ,
  accepted_by_user_id  INTEGER REFERENCES users(id),
  revoked_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX invites_org_id_idx ON invites(organization_id);

CREATE TABLE audit_logs (
  id               BIGSERIAL PRIMARY KEY,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id    INTEGER NOT NULL REFERENCES users(id),       -- SEM cascade, de propósito
  entity_type      TEXT NOT NULL,   -- 'daily_record' | 'delivery' | 'transaction' | 'audit_log_entry'
  entity_id        INTEGER NOT NULL,
  action           TEXT NOT NULL,   -- 'create' | 'update' | 'delete'
  field_changes    JSONB,           -- só em 'update': [{ "field", "old", "new" }]
  snapshot_before  JSONB,
  snapshot_after   JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX audit_logs_org_entity_idx  ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX audit_logs_org_created_idx ON audit_logs(organization_id, created_at DESC);

CREATE TABLE daily_records (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id     INTEGER NOT NULL REFERENCES organizations(id),
  panel               TEXT NOT NULL DEFAULT 'jadlog',            -- 'jadlog' | 'panel2'
  date                DATE NOT NULL,
  value_per_delivery  NUMERIC(10,2) NOT NULL DEFAULT 3.50,
  delivered           INTEGER NOT NULL DEFAULT 0,
  scheduled           INTEGER NOT NULL DEFAULT 0,
  occurrences         INTEGER NOT NULL DEFAULT 0,
  expenses            NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_records_user_id_panel_date_key UNIQUE (user_id, panel, date)
);
CREATE INDEX daily_records_org_idx ON daily_records(organization_id);

CREATE TABLE deliveries (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id),
  panel            TEXT NOT NULL DEFAULT 'jadlog',
  tracking_code    TEXT NOT NULL,
  recipient        TEXT NOT NULL,
  address          TEXT,
  city             TEXT,
  status           TEXT NOT NULL DEFAULT 'pendente',             -- 'pendente' | 'em_transito' | 'entregue' | 'cancelada'
  value            NUMERIC(10,2) NOT NULL DEFAULT 0,
  deadline         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX deliveries_org_idx ON deliveries(organization_id);

CREATE TABLE transactions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id  INTEGER NOT NULL REFERENCES organizations(id),
  panel            TEXT NOT NULL DEFAULT 'jadlog',
  type             TEXT NOT NULL DEFAULT 'receita',              -- 'receita' | 'despesa'
  description      TEXT NOT NULL,
  category         TEXT,
  amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX transactions_org_idx ON transactions(organization_id);
```

### 4.3 Histórico das migrações (só para bancos antigos)

Um banco novo usa só a §4.2. Estes scripts ficam no repositório para registrar como o banco de produção evoluiu:

| Ordem | Script | O que faz |
|---|---|---|
| 0 | `docs/historico/SQL FUNC.txt` | Schema inicial: `users`, `daily_records` com `UNIQUE(user_id, date)`, `deliveries`, `transactions`, todos sem `panel` e sem `organization_id`. |
| 1 | *(sem arquivo)* | Coluna `panel TEXT NOT NULL DEFAULT 'jadlog'` nas 3 tabelas operacionais. |
| 2 | `migrate-unique-fix.sql` | Troca `UNIQUE(user_id, date)` por `daily_records_user_id_panel_date_key UNIQUE(user_id, panel, date)`. |
| 3 | `migrate-multitenant-001-schema.sql` | Cria `organizations`, `memberships`, `invites` e `audit_logs`, mais `organization_id` (ainda NULL) nas 3 tabelas operacionais. |
| 3b | `migrate-multitenant-001b-dual-role-index.sql` | Troca o índice antigo de 1 organização por usuário pelo índice de 1 membership por papel. |
| 4 | `migrate-multitenant-002-backfill-legacy-org.sql` | Cria a organização "Legado" (slug `legado`, dona = admin). Dá ao admin os papéis gestor e entregador, e a todos os outros o papel entregador. Preenche `organization_id`. Depois de conferir que nenhuma linha ficou sem organização, aplica `SET NOT NULL`. |

Produção (Neon) já rodou todos os scripts. Não rodar de novo.

---

## 5. Regras de negócio e fórmulas (fonte única)

### 5.1 Boleta diária

```
bruto(r)   = r.delivered × Number(r.valuePerDelivery)
liquido(r) = bruto(r) − Number(r.expenses)
```

- `scheduled` ("agendadas sem sucesso") e `occurrences` ("com ocorrência") são **só contagem**. Não entram em nenhum valor em R$. **[DECIDIR Q3]**
- Cada boleta guarda o **próprio** valor por entrega. O padrão é `3.50`.
- **Uma boleta por (usuário, painel, data).** Salvar uma data que já tem boleta **substitui** os campos dela (`update`). Não soma e não duplica.
- Implementação de referência: `recordGross()` e `recordNet()` em `lib/metrics.ts`. São a **única** implementação das duas contas: `stats-overview.tsx`, `daily-records-panel.tsx`, `overview-panel.tsx` e `app/gestor/page.tsx` chamam essas funções. Uma reconstrução DEVE fazer o mesmo.

### 5.2 Agregados

| Indicador | Definição |
|---|---|
| Entregas no período | Σ `delivered` |
| Bruto no período | Σ bruto(r) |
| Despesas no período | Σ `expenses` |
| Líquido no período | Bruto − Despesas |
| Dias com boleta / "dias trabalhados" | número de boletas, **incluindo boletas com 0 entregas** |
| Média/dia | Líquido ÷ dias com boleta (0 se não houver boleta) |
| Positivo / Negativo | Líquido ≥ 0 → positivo |

### 5.3 Quinzenas (`netByQuinzena`, `lib/metrics.ts`)

- Recebe as boletas **já filtradas** pelo período da tela.
- **Mês de referência** = mês da boleta de data mais recente. A data é comparada como texto `AAAA-MM-DD`, sem `Date`, para não depender de fuso.
- 1ª quinzena = dias 01 a 15 desse mês. 2ª quinzena = dia 16 até o último dia **com boleta** (`lastDay`; `null` se a 2ª quinzena estiver vazia).
- `days` de cada quinzena = número de **datas distintas** com boleta (não de boletas). No `/gestor` a mesma data tem uma boleta por entregador e por painel; 3 entregadores em 10 datas dão `days = 10`.
- Boletas de outros meses ficam fora. Lista vazia → `null`.

### 5.4 Financeiro

- `saldo = Σ amount(receita) − Σ amount(despesa)`.
- O financeiro é **separado** da boleta. As despesas da boleta não entram no saldo financeiro, e os lançamentos financeiros não entram no líquido da boleta.

### 5.5 Rastreio

- Status possíveis, com rótulo (`STATUS_OPTIONS`): `pendente` → `"Pendente"`, `em_transito` → `"Em trânsito"`, `entregue` → `"Entregue"`, `cancelada` → `"Cancelada"`.
- Status desconhecido: `statusLabel()` devolve o próprio valor.
- "Em aberto" = `pendente` + `em_transito`.
- Depois de criada, uma entrega só pode mudar de **status** ou ser **excluída**. Não há edição dos outros campos.

### 5.6 Painéis

- `PANEL_LABELS = { jadlog: "JADLOG", panel2: "Painel 2" }`. `panelLabel(p)` devolve o rótulo ou a própria chave.
- **Nunca** somar painéis diferentes num número só nas telas do entregador ou do drill-down. **[DEFEITO D6]**: os cartões do `/gestor` somam os painéis.

### 5.7 Datas

- Banco: `DATE` no formato `AAAA-MM-DD`. Para exibir: `new Date(s + "T00:00:00")`, ou seja, meia-noite **local**.
- `formatDate(v)`: `Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })`. `null` ou data inválida → `"—"`.
- Mês é sempre índice 0–11. `MONTHS = ["Janeiro", …, "Dezembro"]`.
- `filterByPeriod(items, year, month)`: `null` em ambos → tudo. Senão filtra pelo ano e/ou mês locais.
- "Hoje" (`lib/dates.ts`): no cliente, `localDateISO()` (data local via `getFullYear`/`getMonth`/`getDate`); no servidor, `todayISOIn("America/Sao_Paulo")` (a Vercel roda em UTC). **Nunca** `toISOString().slice(0, 10)`: no Brasil, das 21:00 às 23:59 ela já é a data de amanhã.

---

## 6. Autenticação e sessão

### 6.1 Senha (`lib/auth.ts`)

- `hashPassword(p)` = `"scrypt:" + salt + ":" + hash`.
  - `salt` = 16 bytes aleatórios em hex.
  - `hash` = `scryptSync(p, salt, 64)` em hex.
- `verifyPassword(p, stored)`:
  - 3 partes com prefixo `scrypt` → compara com `timingSafeEqual`;
  - 2 partes `salt:hash` (formato **legado**) → compara `HMAC-SHA256(key = salt, data = p)` em hex;
  - qualquer outro formato → `false`.
- `isLegacyHash(stored)` = tem exatamente 2 partes.
- `isAdminEmail(email)` = `ADMIN_EMAIL` definido **e** os dois e-mails iguais em minúsculas.

### 6.2 Sessão (`lib/session.ts`)

- Cookie `jadlog_user` = `"{userId}.{HMAC-SHA256(SESSION_SECRET, userId) em hex}"`.
- Atributos: `httpOnly`, `sameSite: "lax"`, `secure: true`, `path: "/"`, `maxAge: 365 dias`.
- `getUserId()`:
  - devolve o id se o MAC confere (`timingSafeEqual`) e o id é um número finito > 0;
  - devolve `null` nos outros casos.
- `setUserId(id)` grava o cookie. `clearUserId()` apaga o cookie.
- Não existe revogação de sessão no servidor.

### 6.3 Limite de tentativas de login (`lib/rate-limit.ts`)

- O estado fica num `Map` em memória, com chave = e-mail em minúsculas e sem espaços.
- `MAX_ATTEMPTS = 5` e `WINDOW_MS = 15 min`.
- `registerFailedAttempt(email)`:
  - sem entrada, ou com a 1ª falha há mais de 15 min → reinicia com `count = 1`;
  - senão, faz `count + 1`. Quando `count ≥ 5`, define `lockedUntil = agora + 15 min`.
- `isLocked(email)`:
  - devolve `{ locked, retryAfterMs }`;
  - quando o bloqueio vence, apaga a entrada.
- `clearAttempts(email)` apaga a entrada.
- Limite aceito: o estado não é compartilhado entre instâncias e zera a cada cold start ou deploy.

### 6.4 Ações de conta (`app/actions/auth.ts`, `"use server"`)

| Ação | Comportamento exato |
|---|---|
| `login(fd)` | 1. `email` = trim + minúsculas. Sem e-mail ou sem senha → `{ error: "E-mail e senha são obrigatórios." }`.<br>2. Bloqueado → `{ error: "Muitas tentativas. Tente novamente em {ceil(ms/60000)} min." }`.<br>3. Usuário inexistente, sem `password_hash` ou com senha errada → `registerFailedAttempt` e `{ error: "E-mail ou senha inválidos." }`.<br>4. Senha certa → `clearAttempts`. Hash legado → regrava em scrypt.<br>5. `setUserId`. Se veio `inviteToken` → `acceptInvite` (melhor esforço: uma falha não bloqueia o login).<br>6. `redirect("/select")`. |
| `register(fd)` | Validações, nesta ordem, com estas mensagens:<br>`"Nome é obrigatório."` · `"E-mail é obrigatório."` · `"Senha deve ter no mínimo 6 caracteres."` · `"As senhas não conferem."` (campo `confirm`) · `"Este e-mail já está cadastrado."`<br>Depois: cria o usuário com scrypt. Com `inviteToken` válido → entra na organização do convite. Sem convite, ou se o aceite falhar → `createSoloOrgForNewUser`. Por fim `setUserId` e `redirect("/select")`. |
| `logout()` | `clearUserId()` e `redirect("/")`. |
| `updateProfile(fd)` | Nome e e-mail obrigatórios: `"Nome e e-mail são obrigatórios."`. E-mail de outro usuário → `"Este e-mail já está em uso."`. Sucesso → `{ success: true }`. |
| `changePassword(fd)` | Campos `current`, `newPass`, `confirmPass`. Mensagens, nesta ordem:<br>`"Preencha todos os campos."` · `"Nova senha deve ter no mínimo 6 caracteres."` · `"As senhas não conferem."` · `"Sua conta usa login com Google. Não é possível definir senha por aqui."` · `"Senha atual incorreta."` |

### 6.5 OAuth do Google (rotas de API)

**`loginWithGoogle(profile, inviteToken?)`** → `{ error?: "google_unverified" | "google_conflict" }` fica em `lib/google-auth.ts`, **fora** de arquivo `"use server"`: ela confia no perfil recebido, então não pode ser uma Server Action (endpoint POST público). Só a rota de callback a chama.
1. Procura o usuário por `google_id`; só se não achar, por e-mail em minúsculas.
2. Decide com `decideGoogleLink` (`lib/google-link.ts`, §10.3a):
   - conta com esse `google_id` → usa;
   - senão, o e-mail precisa ser **autoritativo** (`isEmailAuthoritative`: `verified_email === true` **e** e-mail `@gmail.com` **ou** `hd` igual ao domínio do e-mail). Não autoritativo → `{ error: "google_unverified" }`, sem ligar nem criar conta (impede entrar na conta de outra pessoa e o pré-sequestro de conta);
   - conta do e-mail já ligada a **outro** `google_id` → `{ error: "google_conflict" }`;
   - conta do e-mail sem Google → liga; nenhuma conta → cria.
3. **Liga/usa** → preenche só os campos vazios: `google_id`, `name`, `avatar_url`. Depois `setUserId`. Com convite → `acceptInvite`.
4. **Cria** → `name = name ?? parte do e-mail antes do "@"`. Aceita o convite ou cria a organização solo. Depois `setUserId`.
5. **Não** chama `redirect` (a rota chama).

`GET /api/auth/google` (`app/api/auth/google/route.ts`):
1. Gera `state` = 16 bytes aleatórios em hex.
2. Redireciona para `https://accounts.google.com/o/oauth2/v2/auth` com `client_id`, `redirect_uri = {BASE}/api/auth/google/callback`, `response_type=code`, `scope="openid email profile"` e `state`.
3. Grava o cookie `google_oauth_state` (httpOnly, lax, secure, `/`, 10 min).
4. Se `?invite=` veio → grava o cookie `pending_invite_token` (mesmos atributos, 10 min). Se não veio → **apaga** esse cookie. Isso impede que um convite abandonado "pegue carona" num login sem relação com ele.

`GET /api/auth/google/callback`:
Toda saída do callback (sucesso ou erro) apaga os cookies `google_oauth_state` (uso único) e `pending_invite_token`.
1. Sem `code` → `/?error=google_cancelled`.
2. `state` ausente ou diferente do cookie → `/?error=google_invalid_state`.
3. Troca o `code` em `https://oauth2.googleapis.com/token` (POST form: `code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`).
4. Lê `https://www.googleapis.com/oauth2/v2/userinfo` com o Bearer token.
5. Perfil sem `id` ou `email` em texto → erro (vai para o passo 6). Chama `loginWithGoogle(profile, inviteToken)`. Com `{ error }` → `/?error={error}`.
6. Qualquer exceção → `console.error` e `/?error=google_failed`.
7. Sucesso → `/select`.

**[DEFEITO D4]**: a página `/` não lê nem mostra o `?error=`.

### 6.6 Organização solo (`lib/db/onboarding.ts`)

`createSoloOrgForNewUser(userId, name)` executa numa transação:
1. cria a organização com `name = "Operação de {name}"`, `slug = "user-{userId}"` e dono = o próprio usuário;
2. cria a membership `entregador` ativa.

Todo cadastro sem convite passa por aqui. O usuário novo não ganha papel de gestor.

---

## 7. Autorização

### 7.1 Funções de acesso (`app/actions/auth.ts`)

| Função | Regra |
|---|---|
| `requireUser()` | Sem sessão → lança `"Não autenticado"`. Usuário apagado → lança `"Usuário inválido"`. |
| `requireAdmin()` | `requireUser` + `isAdminEmail`. Senão lança `"Acesso restrito."`. |
| `requireMembership(role?, knownUser?)` | Busca **uma** membership ativa do usuário, filtrando pelo papel se ele vier. Sem membership → lança `"Sem acesso como {role}."` ou `"Nenhuma organização vinculada."`. Devolve `MembershipContext = { user, organizationId, role, membershipId }`. |
| `requireGestor(knownUser?)` / `requireEntregador(knownUser?)` | `requireMembership("gestor", knownUser)` e `requireMembership("entregador", knownUser)`. |
| `resolveViewerMode()` | Sem argumentos. Faz `requireUser()`. Admin → `{ mode: "admin", user }`. Senão → `requireGestor(user)` → `{ mode: "gestor", ...MembershipContext }`. Lança o erro se o usuário não for admin nem gestor. Uso: telas onde os dois modos são **exclusivos**. A auditoria não é uma delas: lá ser gestor é obrigatório e ser admin é só um adicional. |
| `getActiveRoles()` | Não lança erro. Devolve os papéis ativos do usuário da sessão, ou `[]`. |

Os parâmetros opcionais `knownUser` (em `auth.ts`) e `known?: MembershipContext` (em `gestor.ts` e `invites.ts`) deixam o chamador reaproveitar um resultado que já tem. Assim o mesmo SELECT não se repete dentro de um request. Sem esses parâmetros, cada função resolve tudo sozinha.

### 7.2 Matriz de acesso

| Capacidade | Entregador | Gestor | ADMIN MASTER |
|---|---|---|---|
| Ver e editar os próprios dados (`/dashboard`, `/panel2`) | ✅ | só se também for entregador | só se também for entregador |
| Ver a organização (`/gestor`) | — | ✅ só a própria | ✅ só se também for gestor |
| Drill-down de um entregador | — | ✅ só leitura, mesma organização (outra → 404) | ✅ **escrita**, qualquer organização |
| Convites | — | ✅ | ✅ se for gestor |
| Ler a auditoria | — | ✅ só a própria organização (200 mais recentes) | ✅ **todas** as organizações (300 mais recentes), mesmo sem papel gestor |
| Excluir uma entrada da auditoria | — | — | ✅ de qualquer organização |
| `/gestao` (usuários e organizações) | — | — | ✅ |

### 7.3 Isolamento entre organizações

- Toda leitura e escrita nas tabelas operacionais filtra por `organization_id`. Toda escrita filtra também por `user_id`.
- O anti-IDOR do gestor está em `getMemberDashboardData`. O alvo DEVE ter membership `entregador` **ativa** na **mesma** organização do gestor. Se não tiver → `null` → 404.

---

## 8. Rotas e páginas

| Rota | Arquivo | Acesso | Comportamento |
|---|---|---|---|
| `/` | `app/page.tsx` | público | Logado → `/select`. Senão mostra a tela de login (§11.1). |
| `/select` | `app/select/page.tsx` | logado | `requireUser` falha → `/`. Só gestor (sem papel entregador e sem ser admin) → `/gestor`. Senão mostra a tela de início com os cartões dos papéis do usuário, ou o estado vazio (§11.2). |
| `/dashboard` | `app/dashboard/page.tsx` | entregador | `requireUser` falha → `/`. Busca entregas, transações e boletas do painel `jadlog` em `Promise.all`. Se falhar (sem papel entregador) → `/select`. Renderiza `DashboardHeader(panelName "JADLOG", isAdmin)` + `DashboardTabs`. |
| `/panel2` | `app/panel2/page.tsx` | entregador | Igual a `/dashboard`, com `PANEL = "panel2"`, `panelName "Painel 2"` e `AppShell panel="panel2"` (`<main data-panel="panel2">`), que ativa o tema azul. |
| `/gestor` | `app/gestor/page.tsx` | gestor | Sem papel gestor → `/select`. Resolve `requireGestor()` **uma vez** e repassa às 3 consultas (§11.8). |
| `/gestor/entregadores/[userId]` | `app/gestor/entregadores/[userId]/page.tsx` | gestor ou admin | 1. `resolveViewerMode()`. Se lançar (deslogado, ou logado sem ser admin nem gestor) → `redirect("/")`, e a `/` manda o logado para `/select`.<br>2. `params` e `searchParams` são `Promise`. Id inválido → 404. `?from=gestor|gestao` define o "Voltar" (`drillDownBackHref`, `lib/nav.ts`): o gestor volta sempre ao `/gestor`; o admin volta ao `/gestor` com `from=gestor` e ao `/gestao` nos outros casos.<br>3. Admin → `adminGetTargetMemberData` + ações admin com `.bind(null, organizationId, targetUserId)`.<br>4. Gestor → `getMemberDashboardData(targetUserId, viewer)`, só leitura.<br>5. Alvo inexistente ou de fora → 404. |
| `/gestor/auditoria` | `app/gestor/auditoria/page.tsx` | gestor ou admin | Admin → `getAuditLogGlobal()` (todas as organizações, sem precisar do papel gestor). Gestor → `getAuditLog(ctx)` (só a própria). Nenhum dos dois → `/select`. `canDelete = isAdminEmail`. |
| `/gestao` | `app/gestao/page.tsx` | admin | Não é admin → `/select`. Título `"Gestão de Usuários"`, subtítulo `"Usuários e organizações de todo o sistema"`, botão "Nova organização" à direita do título e tabela de usuários. |
| `/convite/[token]` | `app/convite/[token]/page.tsx` | público | §11.10. |
| `/api/auth/google` e `/callback` | §6.5 | público | — |

Todas as páginas logadas (`/select`, `/dashboard`, `/panel2`, `/gestor`, drill-down, auditoria, `/gestao`) usam o `AppShell` (§11.3a): barra de navegação fixa + `<main className="mx-auto min-h-screen max-w-6xl px-4 pt-6 pb-28 md:px-6 md:pt-8 md:pb-10">` (o `pb-28` deixa espaço para a barra inferior do celular). Links internos usam `next/link` (navegação sem recarregar a página); só os links para `/api/auth/google` continuam `<a>`.

Estados de rota:
- `loading.tsx` em `/dashboard`, `/panel2`, `/gestor`, `/gestor/entregadores/[userId]` (`PageSkeleton`, 5 cartões) e em `/gestor/auditoria` e `/gestao` (`PageSkeleton cards={0}`). `components/page-skeleton.tsx`: cabeçalho, cartões, abas e um bloco grande em `Skeleton`, com `aria-busy` e `"Carregando…"` para leitor de tela.
- Consequência do streaming: nessas rotas, o `redirect()` (sem login, sem papel) não é mais um 307. A resposta é 200 com o esqueleto, uma `<meta http-equiv="refresh">` e a navegação no cliente (comportamento documentado do Next 16). Nenhum dado do painel vai no HTML.
- `app/error.tsx` (client): ícone de alerta, `"Algo deu errado"`, `"Não foi possível carregar esta tela. Tente de novo. Se o erro continuar, volte ao início."`, botões `"Tentar de novo"` (`retry()`, API do Next 16.3) e `"Voltar ao início"` (`/select`).
- `app/not-found.tsx`: `"Página não encontrada"`, `"O endereço não existe ou você não tem acesso a ele."` e `"Voltar ao início"` (`/select`).

---

## 9. Server actions de dados

Regras comuns a todas:
- `"use server"`.
- O escopo vem da sessão: `requireEntregador()` → `{ organizationId, user }`.
- Toda escrita chama `recordAudit` **depois** de gravar, usando a linha devolvida por `.returning()`.
- Depois de gravar: `revalidatePath("/dashboard")` e `revalidatePath("/panel2")`.


**Validação no servidor (`lib/forms.ts`, todas as actions de escrita, normais e admin).** Erro → devolve `{ error: "<mensagem>" }`, **nunca** lança exceção nem deixa o Postgres responder com erro 500. Sucesso → `{ success: true }` (tipo `ActionResult`). O form mostra o erro no componente `FormError` (`components/form-error.tsx`, caixa vermelha com `role="alert"`) e continua aberto **com os campos preenchidos**: os forms usam `onSubmit` + `preventDefault`, não `action={fn}`, porque o React 19 limpa os campos depois de uma `action`.
- Valor em R$ (`parseMoney`): vazio → `"0"`; aceita `"12,50"` (vírgula vira ponto), `".5"` (→ `"0.5"`) e `"3."` (→ `"3"`); ≥ 0, até 2 casas, abaixo de 100.000.000. Erro: `"{Campo}: informe um valor de 0 a 99.999.999,99, com até 2 casas decimais."`.
- Quantidade (`parseCount`): vazio → 0; inteiro de 0 a 100.000. Erro: `"{Campo}: informe um número inteiro de 0 a 100.000."`.
- Data (`parseISODate`): `AAAA-MM-DD` que existe no calendário. Erro: `"{Campo}: data inválida."`.
- `panel` ∈ `PANEL_LABELS`, conferido com `Object.hasOwn` (não `in`, que aceita `"constructor"`) (`"Painel inválido."`); `status` ∈ `STATUS_OPTIONS` (`"Status inválido."`); `type` ∈ {`receita`, `despesa`} (`"Tipo inválido."`).
- Textos com trim; no máximo 200 caracteres (endereço e descrição: 500). Erro: `"{Campo}: no máximo N caracteres."`.

### 9.1 Boleta (`app/actions/daily-records.ts`)

- `getDailyRecords(panel = "jadlog")` → boletas do usuário naquele painel, da data mais nova para a mais velha.
- `saveDailyRecord(fd)`. Campos:
  - `panel` (padrão `"jadlog"`);
  - `date` (obrigatório: `{ error: "Selecione uma data." }`; formato inválido → `"Data: data inválida."`);
  - `valuePerDelivery` (vazio → `"3.50"`; valor em R$);
  - `delivered` (`"Entregas realizadas"`), `scheduled` (`"Agendadas sem sucesso"`), `occurrences` (`"Com ocorrência"`): quantidades;
  - `expenses` (`"Despesas do dia"`): valor em R$.

  Com o mesmo (organização, usuário, painel, data) já existente → `update` (+ `updatedAt = new Date()`) e auditoria `update`, só se o update devolveu linha. Senão → `insert` e auditoria `create`. Devolve `{ success: true }`.
- `deleteDailyRecord(id)` → exclui dentro do escopo. Se excluiu, grava auditoria `delete`.

### 9.2 Rastreio (`app/actions/deliveries.ts`)

- `getDeliveries(panel)` → entregas do painel, da criação mais nova para a mais velha.
- `createDelivery(fd)`. Campos:
  - `trackingCode` e `recipient` obrigatórios (com trim). Falta → `{ error: "Código de rastreio e destinatário são obrigatórios." }`;
  - `address` e `city` (vazio → `null`);
  - `status` (padrão `pendente`);
  - `value` (`"Valor"`, valor em R$);
  - `deadline` (`"Prazo"`; vazio → `null`).

  Grava auditoria `create`. Devolve `{ success: true }`.
- `updateDelivery(fd)` → edição completa do pacote: `id` do form (`parseRecordId`; inválido → `{ error: "Pacote inválido." }`) e os mesmos campos e regras do `createDelivery` (`parseDeliveryForm`). O painel **não** muda (o pacote fica onde nasceu). Atualiza por `updateDeliveryById` (`lib/db/scopes.ts`, mesmo escopo organização + usuário); sem linha → `{ error: "Pacote não encontrado." }`. Grava auditoria `update` com antes e depois. Devolve `{ success: true }`.
- `updateDeliveryStatus(id, status)` → status fora de `STATUS_OPTIONS` → não faz nada (chamada forjada; a UI só oferece a lista). Senão lê o "antes", atualiza só o `status` e grava auditoria `update`.
- `deleteDelivery(id)` → exclui e grava auditoria `delete`.

### 9.3 Financeiro (`app/actions/transactions.ts`)

- `getTransactions(panel)` → lançamentos do painel, da data mais nova para a mais velha.
- `createTransaction(fd)`. Campos:
  - `type` (padrão `receita`);
  - `description` obrigatória. Falta → `{ error: "Descrição obrigatória." }`;
  - `category` (vazio → `null`);
  - `amount` (`"Valor"`, valor em R$);
  - `date` (vazio → `todayISOIn("America/Sao_Paulo")`).

  Grava auditoria `create`. Devolve `{ success: true }`.
- `updateTransaction(fd)` → mesmas regras, mais `id` inteiro positivo (`parseRecordId`; senão `{ error: "Lançamento inválido." }`). Update que não acha a linha no escopo (excluída em outra aba, ou id de outro usuário) → `{ error: "Lançamento não encontrado." }`, sem auditoria. Atualiza `type`, `description`, `category`, `amount` e `date`. Grava auditoria `update`.
- `deleteTransaction(id)` → exclui e grava auditoria `delete`.

### 9.4 Gestor (`app/actions/gestor.ts`)

- `getOrgOverview(ctx?)` → `{ dailyRecords, deliveries, transactions, members }`:
  - os 3 primeiros vêm de toda a organização, sem filtro de painel;
  - `members` = entregadores ativos `{ userId, name, email }`, em ordem de nome.
- `getMemberDashboardData(targetUserId, ctx?)` → `null` se o alvo falhar no anti-IDOR. Senão `{ member: { name, email }, panels: [...] }`:
  - `panels` = união de `Object.keys(PANEL_LABELS)` com os painéis que aparecem nos dados;
  - cada item é `{ panel, label, dailyRecords, deliveries, transactions }`;
  - os painéis padrão aparecem mesmo sem dados.
- `getAuditLog(ctx?)` → as 200 entradas mais recentes da organização: `{ id, entityType, entityId, action, fieldChanges, createdAt, actorName }`, por `created_at` decrescente.

### 9.5 Convites (`app/actions/invites.ts`)

- `createInvite(fd)` (gestor):
  - `email` opcional, em minúsculas;
  - `expiresInDays` ∈ `{"1": 1, "7": 7, "30": 30, "0": 36500}` (valor desconhecido → 7);
  - gera o token, grava só o hash e faz `revalidatePath("/gestor")`;
  - devolve `{ success: true, url: "{BASE}/convite/{token}" }`. O token puro aparece **só** nesta resposta.
- `listPendingInvites(ctx?)` → convites sem `accepted_at`, sem `revoked_at` e com `expires_at` no futuro (vencido não é pendente: já não pode ser aceito), do mais novo para o mais velho.
- `revokeInvite(id)` → `revoked_at = now`. Só convites da própria organização e ainda não aceitos.
- `revokeAllPendingInvites()` → revoga todos os pendentes da organização.
- `listAcceptedInvites(ctx?)` → `{ id, email, acceptedAt, acceptedByName }`, do aceite mais novo para o mais velho.
- `acceptInviteForCurrentUser(token)` → `requireUser`, depois `acceptInvite`. Falha → devolve `{ success: false, error }`. Sucesso → `redirect("/select")`.

### 9.6 Admin

`app/actions/admin-override.ts` — todas as funções começam com `requireAdmin()`:
- `adminGetTargetMemberData(targetUserId)`:
  - procura a membership `entregador` ativa do alvo em **qualquer** organização, com JOIN de `memberships`, `users` e `organizations`;
  - devolve `{ member, organizationId, orgName (nulo vira "—"), panels }`, ou `null`.
- `adminSaveDailyRecord`, `adminDeleteDailyRecord`, `adminCreateDelivery`, `adminUpdateDelivery`, `adminUpdateDeliveryStatus`, `adminDeleteDelivery`, `adminCreateTransaction`, `adminUpdateTransaction`, `adminDeleteTransaction`:
  - recebem `(organizationId, targetUserId, ...)` antes dos argumentos das ações normais;
  - repetem as mesmas regras e a mesma validação (`lib/forms.ts`), mas gravam a auditoria com `actorUserId = admin`;
  - chamam `revalidatePath("/gestor/entregadores/{targetUserId}")`;
  - **nunca** reaproveitam nem alteram as ações normais;
  - `adminSaveDailyRecord` só grava a auditoria de `update` se o update devolveu linha (igual à ação normal).
- `adminDeleteAuditLogEntry(id)`:
  - entrada inexistente → `{ error: "Registro não encontrado." }`;
  - senão apaga a entrada e grava uma auditoria `{ entityType: "audit_log_entry", entityId: id, action: "delete", before: entrada }` na organização dela;
  - faz `revalidatePath("/gestor/auditoria")` e devolve `{ success: true }`.
  - Decisão de escopo: o admin pode **apagar** uma entrada, mas não pode **reescrever** o texto dela.

`app/actions/admin-users.ts`:
- `getAllUsers()` → `{ id, name, email, googleId, createdAt }`, em ordem de nome.
- `updateUserAdmin(fd)` → mensagens: `"Usuário inválido."`, `"Nome e e-mail são obrigatórios."`, `"Este e-mail já está em uso por outro usuário."`.
- `setUserPasswordAdmin(fd)` → não pede a senha atual. Mínimo de 6 caracteres e confirmação igual.
- `deleteUserAdmin(fd)`:
  - o admin não pode excluir a si mesmo: `"Você não pode excluir sua própria conta por aqui."`;
  - chama `deleteUserCascade(id, adminId)` (`lib/db/delete-user.ts`), numa transação só:
    - dentro da transação, trava (`FOR UPDATE`) as organizações de que o usuário é dono e conta os outros membros de cada uma;
    - `planUserDeletion` (`lib/user-deletion.ts`, função pura): alguma organização própria tem outro membro → recusa com `"Não é possível excluir: este usuário é dono da organização \"{nome}\", que tem {outro membro | outros {n} membros}. Excluir apagaria os dados deles."`;
    - senão apaga as organizações individuais dele (boletas, entregas e lançamentos delas antes; memberships, convites e auditoria delas pelo cascade), anula `memberships.invited_by_user_id` e `invites.accepted_by_user_id` que apontam para ele, apaga os convites que ele criou e a auditoria em que ele é o autor, e por fim o usuário (cascade: memberships, boletas, entregas, lançamentos);
    - grava um meta-registro `{ entityType: "user", action: "delete", actor = admin, snapshotBefore: { id, name, email, removidos: { boletas, entregas, lancamentos, organizacoesIndividuais } } }` em cada organização restante onde ele era membro;
    - usuário inexistente → `"Usuário não encontrado."`.
  - Parâmetro opcional `exec` (banco ou transação externa): permite um dry-run com ROLLBACK.

`app/actions/organizations.ts` — `createOrganizationForGestor(fd)`:
- `orgName` obrigatório: `"Nome da organização é obrigatório."`.
- `mode = "existing"`: precisa de `userId` válido (`"Selecione um usuário."` / `"Usuário não encontrado."`).
- `mode = "new"`: precisa de `name`, `email` e `password` com 6+ caracteres. Mensagens: `"Nome do gestor é obrigatório."`, `"E-mail do gestor é obrigatório."`, a de senha curta e `"Este e-mail já está cadastrado."`.
- O usuário já é gestor ativo → `"Este usuário já é gestor de uma organização."`.
- `slug`:
  - `slugify` = minúsculas → NFD → remove acentos → troca tudo que não é `[a-z0-9]` por `-` → corta os `-` das pontas;
  - resultado vazio → `"org"`;
  - se o slug já existe, acrescenta `-2`, `-3`, …
- Cria a organização (dono = usuário) e a membership `gestor`.

---

## 10. Módulos de `lib/`

10.1 `lib/db/index.ts`: `pool = new Pool({ connectionString: DATABASE_URL })` e `db = drizzle(pool, { schema })`.

10.2 `lib/format.ts`: `formatCurrency`, `formatDate`, `MONTHS`, `filterByPeriod`, `STATUS_OPTIONS`, `statusLabel`, `PANEL_LABELS` e `panelLabel` (§5).

10.3b `lib/forms.ts`: parsers de formulário das actions de escrita (§9, "Validação no servidor"). `lib/dates.ts`: `localDateISO` e `todayISOIn` (§5; `todayISOIn` monta AAAA-MM-DD com `formatToParts`, sem depender do padrão de data de um locale).

10.3a `lib/google-link.ts`: `isEmailAuthoritative(profile)` e `decideGoogleLink(googleId, byGoogleId, byEmail, emailAuthoritative)` → `use` | `link` | `create` | `reject` (`google_unverified` ou `google_conflict`). Funções puras, sem banco (§6.5). `lib/google-auth.ts`: `loginWithGoogle` (§6.5).

10.3 `lib/metrics.ts`: `recordGross`, `recordNet` e `netByQuinzena`, com o tipo `QuinzenaSplit = { year, month (0–11), first: { net, days }, second: { net, days, lastDay } }`.

10.4 `lib/csv.ts`:
- `toCsv(rows, columns)`:
  - separador `;`, porque no Excel em pt-BR a vírgula é o separador decimal;
  - linhas separadas por `\r\n`;
  - `columns = [{ key: campo | (row) => valor, label }]`.
- Escape:
  - campo que começa com `=`, `+`, `@`, tab, CR, ou com `-` **não** seguido de dígito → recebe `'` na frente (proteção contra injeção de fórmula);
  - campo com `"`, `\n` ou `;` → vai entre aspas, com `"` dobradas.
- `downloadCsv(nome, conteúdo)` → Blob com **BOM UTF-8** + `text/csv;charset=utf-8;` + clique num `<a download>` temporário.

10.5 `lib/audit.ts` — `recordAudit({ organizationId, actorUserId, entityType, entityId, action, before, after })`:
- `field_changes` existe só quando `action = "update"`;
- o diff compara com `String(old) !== String(new)` e ignora `id`, `userId`, `organizationId`, `panel`, `createdAt` e `updatedAt`;
- grava os snapshots `before` e `after` completos.

10.6 `lib/invites.ts`:
- `generateInviteToken()` = 32 bytes aleatórios em `base64url`.
- `hashInviteToken(t)` = `sha256(t)` em hex.
- `getInviteByToken(t)`:
  - não encontrado → `{ valid: false, reason: "not_found" }`;
  - revogado → `"revoked"`; já aceito → `"accepted"`; vencido → `"expired"`;
  - válido → `{ valid: true, organizationId, orgName, email }`.
- `acceptInvite(t, userId)` roda numa transação e confere, nesta ordem (mensagens):
  1. `"Convite inválido."`;
  2. `"Este convite foi revogado."`;
  3. `"Este convite já foi utilizado."`;
  4. `"Este convite expirou."`;
  5. convite com e-mail diferente do usuário (comparação em minúsculas) → `"Este convite é exclusivo para {email}."`;
  6. o usuário já é `entregador` ativo em qualquer organização → `"Sua conta já pertence a outra organização como entregador."`.

  Se passar tudo: cria a membership `entregador` (`invited_by_user_id = criador do convite`), marca `accepted_at` e `accepted_by_user_id` e devolve `{ success: true }`.

10.7 `lib/session.ts`, `lib/auth.ts` e `lib/rate-limit.ts`: §6.

10.8 `lib/db/onboarding.ts`: §6.6.

10.9 `lib/utils.ts`: `cn`.

10.10 `lib/db/scopes.ts` — o único acesso às 3 tabelas operacionais. `Scope = { organizationId, userId }`. Todas as escritas usam `.returning()`.

| Tabela | Funções |
|---|---|
| boletas | `dailyRecordsForUser({ organizationId, userId, panel })`, `dailyRecordsForOrg({ organizationId })`, `dailyRecordsForUserAllPanels(scope)`, `findDailyRecord({ ...scope, panel, date })`, `insertDailyRecord(values)`, `updateDailyRecordById({ ...scope, id }, values)`, `deleteDailyRecordById({ ...scope, id })` — todas ordenadas por `date` decrescente |
| entregas | `deliveriesForUser`, `deliveriesForUserAllPanels`, `deliveriesForOrg`, `findDeliveryById`, `insertDelivery`, `updateDeliveryStatusById(scope + id, status)`, `deleteDeliveryById` — ordenadas por `created_at` decrescente |
| financeiro | `transactionsForUser`, `transactionsForUserAllPanels`, `transactionsForOrg`, `findTransactionById`, `insertTransaction`, `updateTransactionById`, `deleteTransactionById` — ordenadas por `date` decrescente |

---

## 11. Telas, componentes e textos exatos

Ícones: `lucide-react`. Padrão visual dos cartões de tela cheia: `rounded-xl border bg-card p-10 shadow-2xl`, centralizados com `max-w-sm`.

### 11.1 Login — `/` (`app/page.tsx`)

1. Logo: ícone `Package` + `"MYLOG"` (`text-3xl font-bold text-primary`).
2. `<h1>` `"Painel de Controle"`.
2a. Erro do login Google (`?error=`), em caixa vermelha (`role="alert"`). O texto vem **só** desta tabela; código desconhecido não mostra nada:
   - `google_cancelled` → `"Login com Google cancelado."`;
   - `google_invalid_state` → `"A sessão de login expirou. Tente entrar com Google de novo."`;
   - `google_failed` → `"Não foi possível entrar com Google. Tente de novo."`;
   - `google_unverified` → `"Não foi possível confirmar o e-mail desta conta Google. Entre com e-mail e senha, ou use uma conta @gmail.com ou da sua empresa (Google Workspace)."`;
   - `google_conflict` → `"Este e-mail já está ligado a outra conta Google. Entre com essa conta ou com e-mail e senha."`.
3. Abas `"Entrar"` (padrão) e `"Cadastrar"`.
4. Aviso no rodapé: ícone `Database` + `"Seus dados ficam vinculados à sua conta."`.

A tela **não** mostra nome de usuário.

**`LoginForm`** (`components/login-form.tsx`, prop opcional `inviteToken`), nesta ordem:
1. Link `"Entrar com Google"` (logo "G" do Google em SVG de 4 cores) → `/api/auth/google`, ou `?invite={token}` quando há convite.
2. Divisor `"ou"`.
3. Campo `"E-mail"` (`placeholder "seu@email.com"`) e campo `"Senha"` (`"••••••"`).
4. Botão `"Entrar"` (`"Entrando..."` enquanto envia).
5. O erro aparece numa caixa vermelha. Com convite, o form envia `inviteToken`.

**`RegisterForm`** (`components/register-form.tsx`, prop opcional `inviteToken`): link `"Cadastrar com Google"`, divisor `"ou"` e os campos:
- `"Nome completo"` (`"Seu nome"`);
- `"E-mail"`;
- `"Senha"` (`"Mínimo 6 caracteres"`);
- `"Confirmar senha"` (`"Repita a senha"`).

Botão `"Criar conta"` (`"Criando conta..."`).

### 11.2 Início — `/select`

Dentro do `AppShell` (`className="max-w-xl"`).
1. `<h1>` `"Olá, {primeiro nome}"`.
2. Sem nenhum cartão (sem papel e sem ser admin): caixa com ícone `Inbox`, `"Você ainda não faz parte de uma operação"`, `"Peça ao seu gestor um link de convite. Ao abrir o link com esta conta, o acesso aparece aqui."` e botão `"Sair"` (form → `logout`). Isso acaba com o laço `/dashboard` → `/select` sem explicação.
3. Com cartões: `"Escolha onde trabalhar"` e a lista de cartões (`next/link`), cada um com ícone num quadrado da cor do token, título na mesma cor, descrição e seta sempre visível (toque). Borda: o token a 40%. Foco visível.

| Cartão | Ícone | Título | Descrição | Cor | Condição |
|---|---|---|---|---|---|
| → `/dashboard` | `Package` | `"Painel JADLOG"` | `"Boletas, rastreio e financeiro do contrato Jadlog"` | `--panel-jadlog` | papel entregador |
| → `/panel2` | `LayoutDashboard` | `"Painel 2"` | `"Boletas, rastreio e financeiro de outros contratos"` | `--panel-2` | papel entregador |
| → `/gestor` | `Users` | `"Painel do Gestor"` | `"Entregadores, convites e resultados da sua organização"` | `--role-gestor` | papel gestor |
| → `/gestao` | `ShieldCheck` | `"Gestão"` | `"Usuários e organizações de todo o sistema"` | `--destructive` | admin |

### 11.3a Navegação fixa — `AppShell` e `AppNav`

- `components/app-shell.tsx` (servidor): recebe o usuário já resolvido pela página, busca os papéis (`getActiveRoles(user.id)`) e monta os itens com `navItems` (`lib/nav.ts`). Prop `panel` vira `data-panel` no `<main>`.
- `navItems({ isAdmin, hasEntregador, hasGestor })`, nesta ordem:

| Item | Rota | Rótulo | Ícone | Condição |
|---|---|---|---|---|
| JADLOG | `/dashboard` | `"JADLOG"` | `Package` | entregador |
| Painel 2 | `/panel2` | `"Painel 2"` | `LayoutDashboard` | entregador |
| Gestor | `/gestor` | `"Gestor"` | `Users` | gestor |
| Auditoria | `/gestor/auditoria` | `"Auditoria"` | `History` | gestor ou admin |
| Gestão | `/gestao` | `"Gestão"` | `ShieldCheck` | admin |

- Item ativo (`isNavActive`): rota exata; o item `/gestor` também fica ativo em `/gestor/entregadores/...` (não na auditoria). Ativo = `aria-current="page"`, fundo `muted` e ícone na cor de identidade (`--panel-jadlog`, `--panel-2`, `--role-gestor`; os outros em `--primary`).
- `components/app-nav.tsx` (cliente):
  - **Barra superior** (sempre): `sticky top-0`, altura 56 px, borda inferior, fundo translúcido com desfoque. Esquerda: logo `MYLOG` (quadrado `primary` com `Package`) → `/select` (`aria-label "MYLOG — início"`). Do `md` para cima, os itens ficam ao lado do logo (`<nav aria-label="Navegação principal">`). Direita: menu de conta.
  - **Barra inferior** (abaixo do `md`, só com 1+ item): `fixed bottom-0`, um item por coluna, ícone + rótulo de 11 px, altura mínima 56 px, `pb-[env(safe-area-inset-bottom)]`.
  - **Menu de conta** (`components/ui/dropdown-menu.tsx`, Base UI `Menu`): gatilho com as iniciais num círculo (+ nome e seta a partir do `lg`), `aria-label "Conta de {nome}"`. Itens: nome e e-mail; `"Configurações da conta"` (abre o modal da §11.3); `"Tema claro"` / `"Tema escuro"` (troca na hora, não fecha o menu; mesma lógica do cookie: `applyTheme`, `components/theme-toggle.tsx`, + action `setTheme`); `"Sair"` (vermelho, chama `logout`).

### 11.3 Cabeçalho da página — `DashboardHeader` (`components/dashboard-header.tsx`, servidor)

Props: `title`, `subtitle?`, `viewerMode?: { entregadorName, mode?: "gestor" | "admin", backHref }`, `actions?` (nó à direita do título).

1. **Faixa de modo** (só com `viewerMode`, `role="status"`):
   - admin → borda e fundo vermelhos, ícone `ShieldAlert` + `"Modo ADMIN MASTER — editando {nome}"`;
   - gestor → cor `--role-gestor`, ícone `Eye` + `"Visualizando como gestor: {nome} · somente leitura"`;
   - link `"Voltar"` (ícone `ArrowLeft`) para `backHref` (§8).
2. `<h1>` com o título (`text-primary`) e o subtítulo embaixo; `actions` à direita.

Títulos e subtítulos: `/dashboard` `"JADLOG"` / `"Boletas, rastreio e financeiro do contrato Jadlog"`; `/panel2` `"Painel 2"` / `"Boletas, rastreio e financeiro de outros contratos"`; `/gestor` `"Painel do Gestor"` / `"Visão da sua organização"`; drill-down `{nome}` / `"Entregador"` (gestor) ou `"Entregador · {organização}"` (admin); auditoria `"Auditoria"` / `"Edições de todas as organizações"` (admin) ou `"Edições feitas na sua organização"`; `/gestao` `"Gestão de Usuários"`.

Nome do usuário logado, tema, configurações e sair ficam no menu de conta (§11.3a). Não existem mais `"Logado como"`, `"⇄ Trocar painel"`, `"Painel de Controle · {ano}"`, `"+ nuvem"` nem `"sincronizado"`.

**Modal "Configurações da conta"** (`components/account-settings-dialog.tsx`, aberto pelo menu de conta; `"Atualize seus dados de acesso."`), com duas abas:
- `"Perfil"`: campos `"Nome"` e `"E-mail"`, botão `"Salvar dados"` (`"Salvando..."`), mensagem de sucesso `"Dados atualizados com sucesso!"`;
- `"Senha"`: campos `"Senha atual"`, `"Nova senha"` (`"Mínimo 6 caracteres"`) e `"Confirmar nova senha"` (`"Repita a nova senha"`), botão `"Alterar senha"` (`"Alterando..."`), mensagem de sucesso `"Senha alterada com sucesso!"`.

### 11.4 Abas do painel — `DashboardTabs` (`components/dashboard-tabs.tsx`)

- Props: `deliveries`, `transactions`, `dailyRecords`, `panel`, `readOnly`, `actions?: PanelActions` (as 9 ações substituíveis do modo admin: boleta salvar/excluir; pacote criar/editar/status/excluir; lançamento criar/editar/excluir).
- **Filtro de período único** (`components/period-filter.tsx`), acima dos cartões: ícone `CalendarRange`, rótulo `"Período"` (só leitor de tela abaixo do `sm`), `<select aria-label="Ano">` (`"Todos os anos"` + anos com boleta **ou** lançamento, do mais novo ao mais velho) e `<select aria-label="Mês">` (`"Todos os meses"` + meses que existem no ano escolhido, em ordem). Trocar o ano tira o mês se ele não existir no ano novo. Com filtro ativo aparece o botão `"Limpar"`. Opções: `periodOptions` (`lib/period.ts`).
- O filtro vale para: os cartões do topo, a aba Boletas, a aba Financeiro e a Visão geral. O Rastreio **não** é filtrado (pacote não tem data de boleta). Os filtros memoizados (`useMemo`) usam `filterByPeriod`.
- Abas, nesta ordem, com ícone: `"Boletas"` (`ClipboardList`), `"Rastreio"` (`Package`), `"Financeiro"` (`Wallet`), `"Visão geral"` (`BarChart3`). Abaixo do `sm` a lista ocupa a largura e rola na lateral (não estoura a página).

### 11.5 Boletas — `DailyRecordsPanel` (`components/daily-records-panel.tsx`)

Props: `records` (do período), `allRecords` (todas), `filtered`, `showAnnual` (falso com mês escolhido), `panel`, `readOnly`, `onSave`, `onDelete`.

**Registrar boleta do dia** (escondido em `readOnly`), `<h2>` `"Registrar boleta do dia"`. O form usa `@container`: 1 coluna, 2 a partir de `@md` e 5 a partir de `@3xl` (largura do form, não da tela; no modal de edição ficam 2 colunas e a data não corta).

| Rótulo | Ícone | Campo | Regra |
|---|---|---|---|
| `"Valor por entrega (R$)"` + `"Altere só se o valor mudar."` | `Settings` | `MoneyInput` | padrão = valor da boleta de data mais recente (`lastValuePerDelivery`, `lib/boleta.ts`), ou `"3.50"` sem boletas |
| `"Data"` | `Calendar` (`Lock` na edição) | `type="date"` | padrão hoje (`localDateISO()`); na edição fica só leitura, com `"Para mudar a data, exclua e registre de novo."` |
| `"Entregas realizadas"` | `CheckCircle2` | `CountInput` | — |
| `"Agendadas (sem sucesso)"` | `Clock` | `CountInput` | — |
| `"Com ocorrência"` | `AlertTriangle` | `CountInput` | — |
| `"Despesas do dia (R$)"` | `Receipt` | `MoneyInput`, `placeholder "0,00"` | — |

- `MoneyInput` / `CountInput` (`components/money-input.tsx`): texto com `inputMode="decimal"` / `"numeric"`. O dinheiro aceita `"12,50"` e `"1.234,56"` colado (com ponto e vírgula juntos, o ponto é milhar); digitado tecla a tecla, o primeiro separador vira o decimal. Aparece com vírgula; o servidor (`parseMoney`) troca a vírgula por ponto. Limpeza: `sanitizeDecimalInput` (`lib/money.ts`, máximo 2 casas). Contagem: só dígitos, até 6.
- **Indicadores ao vivo** (`aria-live`), 3 colunas: `"Bruto"`, `"Despesas"` (`"− R$ x"`) e `"Líquido"` (verde ≥ 0, vermelho < 0).
- Botão `"Salvar boleta"` (edição: `"Salvar alterações"`; `"Salvando..."`). Erro do servidor em `FormError`.
- **Data que já tem boleta** (registro, não edição): antes de gravar abre o modal `"Já existe boleta em {DD/MM/AAAA}"` / `"Salvar agora substitui os números desse dia."`, botões `"Cancelar"` (foco) e `"Substituir"`.
- Depois de salvar: toast `"Boleta de DD/MM salva"`; o form de registro volta limpo (remonta com `key`), com hoje e o valor por entrega da última boleta.

**Histórico:**
- `<h2>` `"Histórico"`, `<select aria-label="Situação">`: `"Todas"` | `"Com entregas"` (entregas > 0) | `"Sem entregas"` (boleta com 0 entregas) (`filterByDelivered`, `lib/boleta.ts`). Botão `"Exportar CSV"` quando há boletas no período.
- Vazios: sem nenhuma boleta → ícone `ClipboardList`, `"Nenhuma boleta registrada"` + `"Preencha o formulário acima para começar."` (fora do só leitura); com boletas mas nada à vista → `"Nenhuma boleta no período"` (filtro de período sem boletas) ou `"Nenhuma boleta com essa situação"`, + `"Mude o período ou a situação para ver outras boletas."`.
- Agrupamento: ano decrescente → mês decrescente → dias decrescentes. Cada mês termina com o **resumo mensal** e cada ano com o **resumo anual logo depois dos meses dele** (`showAnnual`). Os resumos usam todas as boletas do mês/ano no período; a situação só esconde linhas.
- **Abaixo do `sm`: cartões por dia** — data `DD/MM/AAAA` + dia da semana + selo `"fim de semana"` (sábado e domingo); `"{n} entregas · {n} agendadas · {n} ocorr."`; líquido (cor) e `"bruto R$ x"`; fora do só leitura, `"Editar"` (botão com texto) e excluir. Resumos em caixas com `Bruto`, `Despesas`, `Líquido`, `Média/dia`.
- **A partir do `sm`: tabela** — colunas `"Data"`, `"Realizadas"`, `"Agendadas"`, `"Ocorrências"`, `"R$/unid."`, `"Fat. Bruto"`, `"Despesas"`, `"Fat. Líquido"` e `"Ações"` (a coluna some no só leitura). Fim de semana: dia em `primary` + `"(fim de semana)"` para leitor de tela. Resumos: `"↳ Resumo {Mês} {Ano}"` e `"▶ Resumo anual {Ano}"` com `"{n} dias · {entregas} entregas"`, `"Bruto:"`, `"Despesas:"`, `"Líquido:"`, `"Média/dia:"` e `"▲ Positivo"` / `"▼ Negativo"`.
- Editar abre `"Editar boleta — {DD/MM/AAAA}"` / `"Altere os números do dia e salve."` (`sm:max-w-2xl`). Botões com contexto: `aria-label "Editar boleta de {data}"`; excluir pede confirmação (`"a boleta de {DD/MM/AAAA}"`).
- **CSV** `boletas-{panel}-{AAAA-MM-DD}.csv`: as boletas do período (ignora a situação); colunas `Data;Entregas Realizadas;Agendadas;Ocorrências;Valor por Entrega;Faturamento Bruto;Despesas;Faturamento Líquido`, números com 2 casas e ponto.

### 11.6 Cartões do topo — `StatsOverview` (`components/stats-overview.tsx`)

- `periodLabel` (opcional) → `"Período: {label}"`. O `DashboardTabs` não passa (o filtro está logo acima).
- **Abaixo do `lg`: faixa com rolagem lateral** (`snap-x`), cartões de 68% da largura no celular (42% no `sm`, 31% no `md`), alinhados no topo (cada um com a própria altura). A faixa rola sozinha: a página não ganha rolagem lateral. **`lg`+: grade de 5.**
- Cada cartão: rótulo `text-xs uppercase`; **valor** `font-display text-2xl tabular-nums` (corta com `…` e mostra inteiro no `title` se não couber); dica `text-xs`; ícone `h-5 w-5` (o bloco de texto é `min-w-0`, então o ícone não sai do cartão).

| Rótulo | Valor | Dica | Ícone / cor |
|---|---|---|---|
| `"Entregas realizadas"` | Σ entregas | `"{n} dias trabalhados"` | `Truck` / primary |
| `"Fat. bruto acumulado"` | bruto | `"Despesas: R$ x"` | `TrendingUp` / chart-2 |
| `"Fat. líquido acumulado"` | líquido | `"Média/dia: R$ x"` | `Wallet` / verde ou vermelho |
| `"Pacotes no rastreio"` | nº de pacotes | `"{n} em aberto"` | `Package` / chart-4 |
| `"Saldo financeiro"` | saldo | `"Receitas R$ x · Despesas R$ y"` | `TrendingUp` ou `TrendingDown` / verde ou vermelho |

**Faixa de quinzenas** (dentro do cartão de líquido, só se há boleta; vale para o entregador, o `/gestor` e o drill-down):
- título `"Quinzenas · {Mês abreviado em 3 letras}/{Ano}"`;
- duas metades, lado a lado; a partir do breakpoint `lg` (cartão com 1/5 da largura) ficam **uma sobre a outra**, para o valor não ser cortado pelo `overflow-hidden` do `Card`:
  - `"1ª quinzena"`: líquido + `"01–15"`;
  - `"2ª quinzena"`: líquido + `"16–{lastDay com 2 dígitos}"`, ou só `"16"` quando `lastDay = 16`.
  - Quinzena sem boleta (`days = 0`): líquido `R$ 0,00` em cinza + `"sem registros"` no lugar do intervalo — igual nas duas metades.
- Valor cinza se a quinzena não tem boleta, verde se ≥ 0, vermelho se < 0.
- Tooltip: `"{n} dia(s) com boleta"`, com `n` = datas distintas (§5.3).

### 11.7 Rastreio e Financeiro

Termos: **boleta** = o registro do dia (entregas feitas e dinheiro); **pacote** = o item acompanhado no Rastreio. A tabela do banco continua `deliveries`.

**`DeliveriesPanel`** (`components/deliveries-panel.tsx`):
- Título `"Pacotes"`. Botões `"Exportar CSV"` (quando há pacotes) e `"Novo pacote"` (fora de `readOnly`).
- Com pacotes: busca (`type="search"`, `aria-label "Buscar pacote"`, `"Buscar código, destinatário ou cidade"`; sem maiúsculas nem acentos) e chips de status (`"Todos"` + os 4 status; `aria-pressed`) — `filterPackages` (`lib/package-filter.ts`). Nada encontrado → `"Nenhum pacote encontrado com essa busca."`.
- Modal `"Novo pacote"` / `"Cadastre um pacote para acompanhar a entrega."`; editar (lápis, `aria-label "Editar pacote {código}"`) → `"Editar pacote — {código}"` / `"Altere os dados do pacote e salve."`. Mesmo form (`sm:max-w-lg`):
  - `"Código de rastreio"` (`"JL123456789BR"`, obrigatório);
  - `"Destinatário"` (`"Nome do cliente"`, obrigatório);
  - `"Cidade"` (`"São Paulo"`) e `"Valor (R$)"` (`MoneyInput`), lado a lado do `sm` para cima;
  - `"Endereço"` (`"Rua, número, bairro"`);
  - `"Prazo"` (date) e `"Status"` (select, padrão Pendente).

  Botão `"Salvar pacote"` / `"Salvar alterações"` (`"Salvando..."`). Toast `"Pacote cadastrado"` / `"Pacote atualizado"`.
- Tabela: `"Rastreio"`, `"Destinatário"`, `"Cidade"`, `"Prazo"`, `"Valor"`, `"Status"` e `"Ações"` (só fora de `readOnly`).
- Status: Select com badge colorido (pendente cinza, em trânsito chart-4, entregue chart-2, cancelada vermelho), **controlado**: muda na hora; se a action falhar, volta ao anterior e mostra o toast de erro. Em `readOnly`, só o badge.
- Excluir pede confirmação (`"o pacote {código}"`).
- Vazio: `"Nenhum pacote cadastrado"` + `Clique em "Novo pacote" para começar.`.
- CSV `entregas-{panel}-{data}.csv`: `Código de Rastreio;Destinatário;Cidade;Endereço;Prazo;Valor;Status`. Exporta tudo, sem filtro.

**`FinancePanel`** (`components/finance-panel.tsx`):
- Recebe os lançamentos **do período da página** e `hasAny` (existe algum lançamento fora do período). Não tem mais filtro próprio nem a faixa Receitas/Despesas/Saldo (o cartão `"Saldo financeiro"` traz receitas e despesas na dica).
- Título `"Lançamentos financeiros"`. Botões `"Exportar CSV"` (período) e `"Novo lançamento"`.
- Modal `"Novo lançamento"` / `"Registre uma receita ou despesa."`, ou `"Editar lançamento"` / `"Altere os dados e salve."` (`sm:max-w-md`). Campos: `"Tipo"` (Receita | Despesa); `"Valor (R$)"` (`MoneyInput`, obrigatório); `"Descrição"` (`"Ex: Combustível"`, obrigatória); `"Categoria"` (`"Frete, Combustível..."`); `"Data"` (padrão hoje). Botão `"Salvar lançamento"` ou `"Salvar alterações"`.
- Tabela: `"Data"`, `"Descrição"`, `"Categoria"`, `"Tipo"`, `"Valor"` (`+R$` verde ou `−R$` vermelho) e `"Ações"` (só fora de `readOnly`; editar com `aria-label "Editar lançamento {descrição}"`). Excluir pede confirmação (`"o lançamento \"{descrição}\""`).
- Vazio: `"Nenhum lançamento registrado"` (sem nenhum) ou `"Nenhum lançamento no período selecionado"`. Fora de `readOnly` vem também `Clique em "Novo lançamento" para começar.`.
- CSV `financeiro-{panel}-{data}.csv`: `Data;Descrição;Categoria;Tipo;Valor`. Exporta o período.

**`ConfirmDeleteButton`** (`components/confirm-delete-button.tsx`): lixeira que abre o modal `"Excluir {item}?"` / `"Essa ação não pode ser desfeita."`, botões `"Cancelar"` (foco inicial) e `"Excluir"` (`"Excluindo..."`). Não usa `window.confirm`.

### 11.8 Visão geral — `OverviewPanel` (Recharts + `ChartContainer` do shadcn)

Usa as boletas e os lançamentos **do período da página**; os pacotes, todos.
1. `"Boletas mensais (bruto × líquido)"`: barras `bruto` (chart-1), `liquido` (chart-2) e `despesas` (chart-3) por mês `"{Mmm}/{AA}"` (`MONTHS` de `lib/format.ts`, 3 letras), em ordem cronológica; eixo Y em moeda compacta (`formatCurrencyCompact`: `"R$ 750"`, `"R$ 1,5 mil"`); tooltip em BRL; vazio → `"Sem boletas registradas."`.
2. `"Pacotes por status (rastreio)"`: rosca com cores por status (pendente chart-5, em trânsito chart-4, entregue chart-2, cancelada chart-3); legenda `"{rótulo} ({n})"`; vazio → `"Sem pacotes no rastreio."`.
3. `"Receitas × Despesas (financeiro)"`: só aparece se há lançamento. Barras receita (chart-2) e despesa (chart-3) por mês, largura total; eixo Y compacto e tooltip em BRL.

### 11.9 Gestor

**`/gestor`** (`app/gestor/page.tsx`), de cima para baixo:
1. Cabeçalho `"Painel do Gestor"` / `"Visão da sua organização"`. (A auditoria saiu daqui: fica na barra de navegação.)
2. `StatsOverview` com os dados da organização inteira. **[DEFEITO D6]**
3. `"Composição por painel"`: um cartão por painel (os padrões sempre aparecem) com `"{n} entregas"` e o líquido.
4. `InvitesPanel`.
5. `"Entregadores ({n})"`:
   - um cartão-link por entregador → `/gestor/entregadores/{id}?from=gestor`, com nome, e-mail, `"{n} entregas"` e líquido somado de todos os painéis;
   - vazio → `"Nenhum entregador nesta organização ainda"` + `Use "Convidar entregador" acima para gerar um link de convite.`.

**`InvitesPanel`** (`components/invites-panel.tsx`):
1. Título `"Convites"`.
2. Botão `"Revogar todos"` (quando há pendentes).
3. Botão `"Convidar entregador"` → modal `"Novo convite"` / `"Gera um link de convite para um entregador entrar na sua organização."`. Campos:
   - `"E-mail (opcional)"` (`"Deixe em branco para link genérico"`), com a ajuda `"Se preenchido, só essa conta pode aceitar o convite."`;
   - `"Expira em"`: `"1 dia"` / `"7 dias"` (padrão) / `"30 dias"` / `"Sem expiração"`.

   Botão `"Gerar link"` (`"Gerando..."`).
4. O link gerado aparece numa caixa com o botão `"Copiar"`, que muda para `"Copiado"` por 2 s.
5. Lista de pendentes: `"{email | Link genérico} · expira {DD/MM/AAAA}"` + botão X para revogar. Vazia → `"Nenhum convite pendente."`.
6. Botão `"Ver"` / `"Ocultar"` `"histórico de convites aceitos ({n})"`. Cada item: `"{nome} aceitou {o convite de email | um convite} em {data}"`. Vazio → `"Nenhum convite aceito ainda."`.

**Drill-down** `/gestor/entregadores/[userId]` (`MemberPanelTabs`):
- Cabeçalho com o nome do entregador e `viewerMode` (§11.3); o "Voltar" segue o `?from=` (§8).
- Uma aba por painel. Cada aba tem só `DashboardTabs`; os cartões do topo vêm dele e seguem o filtro de período.
- Gestor: `readOnly` (sem formulários nem botões de editar ou excluir; o CSV continua disponível).
- Admin: escrita habilitada com as ações admin.

**Auditoria** `/gestor/auditoria` (`AuditLogRow`, `components/audit-log-row.tsx`):
- Header `"Auditoria"` e título `"Histórico de edições ({n})"`; para o admin, `"Histórico de edições ({n}) · todas as organizações"`.
- Na visão do admin, cada item mostra também o nome da organização num selo cinza.
- Cada item: `"{ator} {criou|editou|excluiu} {boleta diária|entrega|lançamento financeiro|entrada de auditoria|usuário} #{id}"` + data.
- Abaixo do item vêm as mudanças, no formato `"{campo}: ~~antigo~~ → novo"`. Nomes dos campos:

  | Campo | Nome na tela |
  |---|---|
  | `delivered` | entregas realizadas |
  | `scheduled` | agendadas |
  | `occurrences` | ocorrências |
  | `valuePerDelivery` | valor por entrega |
  | `expenses` | despesas |
  | `status` | status |
  | `value` / `amount` | valor |
  | `type` | tipo |
  | `description` | descrição |
  | `category` | categoria |
  | `date` | data |
  | `deadline` | prazo |
  | `recipient` | destinatário |
  | `address` | endereço |
  | `city` | cidade |
  | `trackingCode` | código de rastreio |

- Admin: botão de lixeira com o title `"Excluir entrada de auditoria (ADMIN MASTER) — fica registrado quem excluiu"`. O item some quando o servidor confirma.
- Vazio → `"Nenhuma edição registrada ainda."`.

### 11.10 Convite — `/convite/[token]`

- **Inválido** → tela `"Convite indisponível"` + mensagem + link `"Ir para o login"`. Mensagens por motivo:
  - `not_found` → `"Este link de convite não é válido."`;
  - `expired` → `"Este convite expirou. Peça ao seu gestor para gerar um novo link."`;
  - `revoked` → `"Este convite foi revogado."`;
  - `accepted` → `"Este convite já foi utilizado."`.
- **Logado** → `"Convite para {org}"`, o texto `"Aceitar vincula sua conta a esta organização como entregador."` e o botão `"Aceitar convite"` (`"Aceitando..."`), de `components/accept-invite-button.tsx`; o erro aparece embaixo, em vermelho. O aceite **nunca** é automático num GET.
- **Deslogado** → logo `"MYLOG"`, `"Convite para {org}"` e `"Crie sua conta ou entre para aceitar."`.
  - Com e-mail restrito: `"Este convite é exclusivo para {email}."`.
  - Abas `"Criar conta"` (padrão, `RegisterForm`) e `"Já tenho conta"` (`LoginForm`), as duas com o token.
  - Aviso no rodapé: `"Seus dados ficam vinculados à sua conta."`.

### 11.11 Gestão — `/gestao` (admin)

**`CreateOrganizationPanel`** (`components/create-organization-panel.tsx`): botão `"Nova organização"` → modal com o mesmo título e a descrição `"Cria uma organização e torna um usuário seu gestor (visão agregada + drill-down somente-leitura sobre a frota, sem lançar boletas)."`.
- Campo `"Nome da organização"` (`"Ex.: Transportes Silva"`).
- Aba `"Usuário existente"` (padrão): select `"Gestor"` com `"{nome} — {email}"`; o 1º usuário da lista já vem escolhido; placeholder `"Selecione um usuário"`. Sem usuários: `Nenhum usuário cadastrado ainda — use "Novo usuário".`.
- Aba `"Novo usuário"`: `"Nome do gestor"`, `"E-mail"` (`"gestor@empresa.com"`) e `"Senha inicial"`.
- Botão `"Criar organização"` (`"Criando..."`).

**`UsersPanel`** (`components/users-panel.tsx`): título `"Usuários cadastrados ({n})"`. Vazio → `"Nenhum usuário cadastrado"`.
- Colunas: `"Nome"`, `"E-mail"`, `"Login"` (badge `"Google"` ou `"Senha"`), `"Criado em"` e `"Ações"`.
- Ações por linha:
  - escudo → `/gestor/entregadores/{id}?from=gestao` (modo ADMIN MASTER; `next/link` com `buttonVariants`, `aria-label "Editar dados de {nome} como ADMIN MASTER"`);
  - lápis → modal `"Editar usuário"` / `"Altere nome e e-mail de {nome}."`: campos `"Nome"` e `"E-mail"`, botão `"Salvar alterações"`, fecha e mostra o toast `"Dados atualizados!"`;
  - chave → modal `"Redefinir senha"` / `"Defina uma nova senha para {nome}. A senha atual não é necessária."`: campos `"Nova senha"` e `"Confirmar nova senha"`, botão `"Redefinir senha"`, fecha e mostra o toast `"Senha redefinida!"`;
  - lixeira (desabilitada para o próprio admin) → modal `"Excluir {nome}?"` / `"Isso também apagará permanentemente as boletas, entregas, lançamentos, vínculos e a auditoria desse usuário, e a organização individual dele, se houver. Dono de organização com outros membros não pode ser excluído. Essa ação não pode ser desfeita."`, botão `"Excluir permanentemente"` (`"Excluindo..."`); o erro aparece no modal.

---

## 12. Tema visual (`app/globals.css`)

- Imports, nesta ordem: `@import 'tailwindcss'`, `@import 'tw-animate-css'` e `@import 'shadcn/tailwind.css'`. Depois vem `@custom-variant dark (&:is(.dark *))`.
- `@theme inline` tem uma linha `--color-X: var(--X)` para cada token de cor da tabela abaixo:
  - `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`;
  - `primary`, `primary-foreground`, `secondary`, `secondary-foreground`;
  - `muted`, `muted-foreground`, `accent`, `accent-foreground`;
  - `destructive`, `border`, `input`, `ring`, `chart-1` a `chart-5`;
  - `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`.

  Exemplo: `--color-primary: var(--primary)`. Com isso existem as classes `bg-primary`, `text-muted-foreground` etc.
- Raios: `--radius: 0.625rem`. Valores derivados:
  - `--radius-sm` = ×0.6;
  - `--radius-md` = ×0.8;
  - `--radius-lg` = ×1;
  - `--radius-xl` = ×1.4;
  - `--radius-2xl` = ×1.8;
  - `--radius-3xl` = ×2.2;
  - `--radius-4xl` = ×2.6.
- Fontes em `@theme inline`:
  - `--font-sans` = Geist;
  - `--font-mono` = Geist Mono;
  - `--font-heading` = sans;
  - `--font-display` = `Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif`. É uma pilha de sistema, sem webfont, usada só nos números dos cartões (§11.6).
- **Cor de marca: índigo/violeta (matiz ~255).** Ela foi escolhida por eliminação, para não colidir com as cores que já têm outro sentido:
  - laranja era a cor antiga do template;
  - azul é a cor do Painel 2;
  - verde é a cor de saldo positivo;
  - vermelho é a cor de erro e de valor negativo.
- **O tema padrão é o escuro (`:root`).** O claro vale com `<html data-theme="light">`, escolhido pelo usuário no botão de tema (cookie `theme`, §2.4 e §11.3).

| Token | Escuro (`:root`, padrão) | Claro (`:root[data-theme="light"]`) |
|---|---|---|
| `color-scheme` | `dark` | `light` |
| `--background` | `#0f1117` | `#f4f5f8` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground` | `#e8eaf0` | `#14171c` |
| `--card`, `--popover` | `#1a1d23` | `#ffffff` |
| `--primary`, `--ring`, `--chart-1` | `#8d7bdb` | `#5b3fa8` |
| `--primary-foreground` | `#14101f` | `#ffffff` |
| `--secondary`, `--muted` | `#22262f` | `#e7e8ec` |
| `--muted-foreground`, `--chart-5` | `#8891a4` | `#5b6270` |
| `--accent` | `#2e333d` | `#eceef2` |
| `--border` | `#2e333d` | `rgba(20, 23, 28, 0.12)` |
| `--input` | `#2e333d` | `rgba(20, 23, 28, 0.18)` |
| `--destructive`, `--chart-3` | `#e5484d` | `#c8353b` |
| `--chart-2` (verde, "positivo") | `#3dd68c` | `#1f7a52` |
| `--chart-4` | `#4f9dff` | `#1f6fb2` |
| `--sidebar` | `#1a1d23` | `#ffffff` |
| `--sidebar-foreground`, `--sidebar-accent-foreground` | `#e8eaf0` | `#14171c` |
| `--sidebar-primary`, `--sidebar-ring` | `#8d7bdb` | `#5b3fa8` |
| `--sidebar-primary-foreground` | `#14101f` | `#ffffff` |
| `--sidebar-accent` | `#22262f` | `#eceef2` |
| `--sidebar-border` | `#2e333d` | `rgba(20, 23, 28, 0.12)` |

**Tema do Painel 2** (`<main data-panel="panel2">`):

| Token | Escuro (`[data-panel="panel2"]`) | Claro (`:root[data-theme="light"] [data-panel="panel2"]`) |
|---|---|---|
| `--primary`, `--ring`, `--chart-1` | `#4f9dff` | `#1f6fb2` |
| `--primary-foreground` | `#0a1628` | `#ffffff` |
| `--chart-2` | `#3dd68c` | `#1f7a52` |
| `--chart-3` | `#e5484d` | `#c8353b` |
| `--chart-4` | `#8d7bdb` | `#5b3fa8` |
| `--chart-5` | `#8891a4` | `#5b6270` |

Modais e menus (Dialog, Select) renderizam num portal no `<body>`, fora do `<main data-panel>`. Por isso o `/panel2` também marca o `<body>` com `data-panel="panel2"` (`components/panel-theme.tsx`, `PanelTheme`; a marca sai ao deixar a página).

Base: `* { border-border outline-ring/50 }` e `body { bg-background text-foreground }`.

**Variante `dark:`**: `@custom-variant dark (&:where(:root:not([data-theme="light"]) *))`. As regras `dark:` dos componentes shadcn valem em todo o app, menos no tema claro. (Antes era `.dark *`, e nenhum elemento tinha `.dark`: as regras ficavam mortas.)

**Tokens de identidade** (nos dois temas, com `--color-*` no `@theme inline`):

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `--panel-jadlog` | `#8d7bdb` | `#5b3fa8` | cor do JADLOG em links e cartões |
| `--panel-2` | `#4f9dff` | `#1f6fb2` | cor do Painel 2 em links e cartões |
| `--role-gestor` | `#e5a13a` | `#9a5b00` | cor do papel gestor (não reaproveita o verde de saldo) |

**Toasts** (`sonner`, `toast.success` / `toast.error`), textos exatos:
- boleta salva → `"Boleta de DD/MM salva"`;
- excluir pelo `ConfirmDeleteButton` → `"Excluído"` + o item com inicial maiúscula (ex.: `"A boleta de 09/11/2026"`); se a action devolver `{ error }`, o erro aparece no modal e ele não fecha;
- pacote → `"Pacote cadastrado"` / `"Pacote atualizado"`; status (desfaz a troca na falha) → `"Status: {rótulo}"`, falha → `"Não foi possível mudar o status. Atualize a página e tente de novo."`;
- lançamento → `"Lançamento salvo"` / `"Lançamento atualizado"`;
- convite → `"Link de convite gerado"` (`"Copie e envie ao entregador."`), `"Convite revogado"`, `"Convites pendentes revogados"`;
- auditoria → `"Entrada de auditoria excluída"`; erro da action → o texto do erro;
- `/gestao` → `"Organização criada"`, `"Dados atualizados!"`, `"Senha redefinida!"`, `"{nome} excluído"`.

---

## 13. Testes (`npm test` → Vitest; estado atual: **128/128**; o CI roda em todo push e PR, §2.1)

| Arquivo | O que DEVE ser testado |
|---|---|
| `lib/auth.test.ts` | senha certa passa; senha errada falha; mesma senha gera hashes diferentes; formato legado HMAC é aceito; formato desconhecido falha; `isLegacyHash` com 2 e 3 partes; `isAdminEmail` ignora maiúsculas e devolve false sem `ADMIN_EMAIL` |
| `lib/ui-helpers.test.ts` | `sanitizeDecimalInput` (vírgula, ponto e vírgula juntos = milhar + decimal, um tipo só, 2 casas, lixo, vazio) e `decimalValue`; `periodOptions` (ordem dos anos e meses, várias listas) e `periodLabel`; `lastValuePerDelivery` (mais recente; sem boletas → 3.50); `filterByDelivered`; `filterPackages` (código, destinatário, cidade, sem acento, status); `formatCurrencyCompact` (valores distintos, curtos) |
| `lib/format.test.ts` | `formatCurrency` (número, string, inválido → R$ 0,00); `formatDate` (pt-BR, null e inválida → `"—"`); `filterByPeriod` (tudo, por ano, ano + mês com mês 0-indexado); `statusLabel` (conhecido e desconhecido) |
| `lib/rate-limit.test.ts` | não bloqueia antes de 5 falhas; bloqueia na 5ª; desbloqueia quando a janela vence (fake timers); `clearAttempts` desbloqueia; e-mail sem diferença de maiúsculas |
| `lib/google-link.test.ts` | `isEmailAuthoritative`: @gmail.com verificado; Workspace com `hd` igual ao domínio; recusa conta comum de outro domínio, `hd` diferente, não verificado e `verified_email` que não é `true`. `decideGoogleLink`: usa a conta do `google_id`; liga pelo e-mail autoritativo; recusa e-mail não autoritativo (ligar e criar); recusa conta já ligada a outro `google_id`; cria conta nova |
| `lib/forms.test.ts` | `parseMoney` (ponto e vírgula, vazio → 0, recusa negativo, texto, 3 casas, notação científica e valor grande); `parseCount` (inteiro ≥ 0, vazio → 0, recusa negativo, decimal, texto e acima do limite); `parseISODate` (válida; recusa formato errado e data inexistente); `parseDailyRecordForm`, `parseDeliveryForm` e `parseTransactionForm` (normalização, padrões, mensagens, painel/status/tipo inválidos, id na edição, 'hoje' recebido) |
| `lib/dates.test.ts` | `localDateISO` usa a data local (23:30 continua o mesmo dia) e preenche com 2 dígitos; `todayISOIn` em São Paulo antes e depois das 03:00 UTC |
| `lib/metrics.test.ts` | `recordGross`; `recordNet` (normal e negativo); `netByQuinzena`: null sem boletas; dia 15 vai para a 1ª e dia 16 para a 2ª; mês de referência na virada do ano; ignora outros meses; `lastDay`; 2ª quinzena vazia; `days` conta datas distintas; valor negativo; soma das quinzenas = líquido do mês |
| `lib/nav.test.ts` | `navItems` por combinação de papéis (entregador, gestor, dual-role, admin sem papel, admin com tudo, ninguém) e rótulos curtos de até 9 letras; `isNavActive` (rota exata, `/gestor` no drill-down e não na auditoria, prefixo parecido não conta); `drillDownBackHref` (gestor sempre `/gestor`; admin segue `from`, valor estranho → `/gestao`) |
| `lib/theme.test.ts` | `parseTheme` (`light`/`dark`; vazio, maiúsculas e lixo → escuro); `themeColor` dos dois temas; nome do cookie `theme` |
| `lib/user-deletion.test.ts` | `planUserDeletion`: sem organização própria → pode; organização só dele → vai junto; dono de organização com outros membros → recusa com o nome; recusa se qualquer organização própria for compartilhada |
| `lib/theme-tokens.test.ts` | todo token do tema escuro existe no claro e vice-versa (exceto `radius`); o Painel 2 tem a mesma lista de tokens nos dois temas |
| `lib/db/scopes.test.ts` | **teste de arquitetura**: nenhum arquivo `app/actions/*.ts` contém `.from(T)`, `db.update(T)`, `db.delete(T)` ou `db.insert(T)` para `T` ∈ {`dailyRecords`, `deliveries`, `transactions`} |

As server actions e os componentes não têm teste automatizado. Eles dependem de banco e de `next/headers`.

---

## 14. Como reconstruir e como aceitar

### 14.1 Ordem de construção

1. Criar o projeto Next 16 com as dependências da §2.1 e os arquivos da §2.2. Gerar os componentes de UI (§2.3).
2. Criar o banco com o DDL da §4.2 e o `lib/db/schema.ts` equivalente.
3. Criar `lib/` (§10), com testes (§13).
4. Criar autenticação e sessão (§6) e as funções de acesso (§7).
5. Criar `lib/db/scopes.ts` e as ações de dados (§9.1–9.3).
6. Criar as telas do entregador (§11.1–11.8) e o tema (§12).
7. Criar a camada de organização: convites, gestor, auditoria (§9.4–9.5, §11.9–11.10).
8. Criar o modo admin e `/gestao` (§9.6, §11.11).
9. Primeiro acesso:
   - o admin se cadastra pela tela normal e ganha uma organização solo como entregador;
   - para virar gestor, ele cria uma organização em `/gestao` e escolhe a própria conta.

### 14.2 Critérios de aceite

Para chamar uma entrega de "pronta", todos estes passos DEVEM passar:

0. O CI (`.github/workflows/ci.yml`) passa: `tsc`, testes e `build`.
1. `npx tsc --noEmit` sem erros. Exceção conhecida: um arquivo velho em `.next/types/validator.ts` aponta para a rota antiga `/usuarios`. Ele some quando o servidor de dev recompila.
2. `npm test` com todos os testes passando.
3. Teste manual no navegador:
   - cadastro e login (senha e Google);
   - boleta: criar; salvar a mesma data de novo (deve substituir); conferir bruto e líquido ao vivo; conferir resumos mensal e anual e a faixa de quinzenas; exportar CSV;
   - os dois painéis com dados separados e cores diferentes;
   - convite: gerar, aceitar, revogar;
   - drill-down do gestor só leitura; outra organização → 404;
   - admin: editar um dado de outra organização e ver a auditoria registrar o admin como autor.

---

## 15. Defeitos conhecidos (não corrigidos)

Reconstruir **sem** estes defeitos. Para corrigir no sistema atual, abrir uma tarefa própria para cada um.

Corrigidos em 2026-11-09 (os IDs não são reaproveitados): **D5** (cartões duplicados no drill-down, `5c1796a`), **D14** (cabeçalho em 375 px, `6011e51`), **D16** (fórmula repetida, `6011e51`) **D7** (convites vencidos listados como pendentes), **D11** (modais do Painel 2 sem o tema), **D13** (excluir sem confirmação), **D2** (data "hoje" em UTC), **D3** (validação no servidor), **D9** (auditoria do `adminSaveDailyRecord`), **D12** (actions lançavam exceção), **D1** (login Google sem `verified_email`, segurança) e **D4** (`?error=` do login Google agora aparece na tela de login: tabela fixa de mensagens em `app/page.tsx`, código desconhecido não mostra nada).

Corrigidos em 2026-11-13: **D8** (exclusão de usuário em cascata, §9.6), **D10** (auditoria global do admin, §7.2 e §11.9) e **D15** (o tema claro pinta certo no `next dev` e no build, conferido em 2026-11-09; guarda em `lib/theme-tokens.test.ts`).

| ID | Onde | Defeito | Correção |
|---|---|---|---|
| D6 | `app/gestor/page.tsx` | Os cartões do topo somam os dois painéis, contra a regra de nunca somar painéis. | Mostrar só a composição por painel, ou cartões por painel. |

Limites aceitos (não são defeitos): o limite de tentativas fica em memória (§6.3); a sessão dura 365 dias e não pode ser revogada (§6.2); o cookie de state do OAuth só vence depois de 10 min.

---

## 16. Decisões pendentes do dono

| ID | Pergunta | Regra atual |
|---|---|---|
| Q1 | O v1 pedia tirar o nome do usuário "da página inicial". A `/` não mostra nome. Manter o nome do usuário logado nos painéis? | Mantém, no menu de conta da barra fixa (§11.3a), desde 2026-11-13. O `/select` mostra `"Olá, {primeiro nome}"`. |
| Q2 | O v1 pedia o resumo "embaixo do último dia do mês". Manter a ordem decrescente (resumo abaixo do dia mais antigo) ou mudar para crescente? | Decrescente. |
| Q3 | O bruto conta só as entregas realizadas × valor? As agendadas e as com ocorrência ficam só como contagem? | Sim. |

---

## 17. Rastreabilidade com o pedido original (v1)

| Pedido do v1 | Onde está nesta spec | Estado |
|---|---|---|
| Sistema de cadastro | §6.4 `register`, §11.1 | ✅ |
| Login com e-mail e senha individual | §6.1–6.4 | ✅ |
| "AuthO com google" | §6.5. É um OAuth direto com o Google, não o Auth0. | ✅ (D1 corrigido em 2026-11-09) |
| Cadastro de entregas diárias para o histórico do ano | §5.1, §9.1, §11.5 | ✅ |
| Separação mensal e anual, para este ano e os próximos | §11.5 (os anos vêm dos dados) | ✅ |
| Resumo "em linha reta embaixo do último dia do mês" | §11.5 resumo mensal | ⚠️ Q2 |
| Indicador anual, modular, que muda com os registros | §11.5 resumo anual, §11.6 | ✅ |
| Campos: valor por entrega, data, realizadas, agendadas, com ocorrência, despesas | §11.5 tabela de campos | ✅ |
| Indicadores: bruto, despesas do dia, líquido do dia | §5.1, §11.5 indicadores ao vivo | ✅ |
| Tirar o indicador "sincronizado" | §11.3 | ✅ |
| "painel individual 2026 + nuvem" → ano automático, sem "+nuvem" | §11.3 | ✅ |
| Tirar o nome do usuário da página inicial | §11.1, §11.3 | ✅ / Q1 |
| *(fora do v1)* dois painéis, rastreio, financeiro, visão geral, CSV, organizações, convites, auditoria, admin, quinzenas | §1, §9, §11 | já existe |
