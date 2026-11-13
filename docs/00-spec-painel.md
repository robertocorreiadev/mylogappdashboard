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

1.3 Cada painel tem 4 abas: **Boleta Diária**, **Rastreio** (pacotes), **Financeiro** (receitas e despesas avulsas) e **Visão Geral** (gráficos).

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
    "pg": "^8.22.0", "react": "^19", "react-dom": "^19", "recharts": "3.8.0", "shadcn": "^4.8.0",
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
- Viewport: `colorScheme: "light dark"`; `themeColor` branco no tema claro e preto no escuro.
- `<html lang="pt-BR" className="{fontes} bg-background">` e `<body className="font-sans antialiased">`.
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
| `/select` | `app/select/page.tsx` | logado | Sem sessão → `/`. Só gestor (sem papel entregador) → `/gestor`. Senão mostra os cartões dos painéis (§11.2). |
| `/dashboard` | `app/dashboard/page.tsx` | entregador | `requireUser` falha → `/`. Busca entregas, transações e boletas do painel `jadlog` em `Promise.all`. Se falhar (sem papel entregador) → `/select`. Renderiza `DashboardHeader(panelName "JADLOG", isAdmin)` + `DashboardTabs`. |
| `/panel2` | `app/panel2/page.tsx` | entregador | Igual a `/dashboard`, com `PANEL = "panel2"`, `panelName "Painel 2"` e `<main data-panel="panel2">`, que ativa o tema azul. |
| `/gestor` | `app/gestor/page.tsx` | gestor | Sem papel gestor → `/select`. Resolve `requireGestor()` **uma vez** e repassa às 3 consultas (§11.8). |
| `/gestor/entregadores/[userId]` | `app/gestor/entregadores/[userId]/page.tsx` | gestor ou admin | 1. `resolveViewerMode()`. Se lançar (deslogado, ou logado sem ser admin nem gestor) → `redirect("/")`, e a `/` manda o logado para `/select`.<br>2. `params` é `Promise`. Id inválido → 404.<br>3. Admin → `adminGetTargetMemberData` + ações admin com `.bind(null, organizationId, targetUserId)`.<br>4. Gestor → `getMemberDashboardData(targetUserId, viewer)`, só leitura.<br>5. Alvo inexistente ou de fora → 404. |
| `/gestor/auditoria` | `app/gestor/auditoria/page.tsx` | gestor ou admin | Admin → `getAuditLogGlobal()` (todas as organizações, sem precisar do papel gestor). Gestor → `getAuditLog(ctx)` (só a própria). Nenhum dos dois → `/select`. `canDelete = isAdminEmail`. |
| `/gestao` | `app/gestao/page.tsx` | admin | Não é admin → `/select`. Header `panelName "Gestão de Usuários"`, botão "Nova organização" e tabela de usuários. |
| `/convite/[token]` | `app/convite/[token]/page.tsx` | público | §11.10. |
| `/api/auth/google` e `/callback` | §6.5 | público | — |

Todas as páginas de painel usam `<main className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-6 md:py-8">`.

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
- `adminSaveDailyRecord`, `adminDeleteDailyRecord`, `adminCreateDelivery`, `adminUpdateDeliveryStatus`, `adminDeleteDelivery`, `adminCreateTransaction`, `adminUpdateTransaction`, `adminDeleteTransaction`:
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

### 11.2 Seleção — `/select`

1. Logo `"MYLOG"`, `<h1>` `"Selecione o Painel"` e o texto `"Escolha qual transportadora deseja gerenciar"`.
2. Cartões (links `<a>`):

| Cartão | Ícone | Título | Subtítulo | Cor | Condição |
|---|---|---|---|---|---|
| → `/dashboard` | `Package` | `"Painel JADLOG"` | `"Entregas e financeiro Jadlog"` | `primary` (índigo `#8d7bdb`) | sempre |
| → `/panel2` | `LayoutDashboard` | `"Painel 2"` | `"Entregas e financeiro para outros contratos"` | `#4f9dff` | sempre |
| → `/gestor` | `Users` | `"Painel do Gestor"` | `"Visão da sua organização"` | `var(--chart-2)` | só com papel gestor |

Uma seta `"→"` aparece no hover.

### 11.3 Cabeçalho — `DashboardHeader` (`components/dashboard-header.tsx`)

Props: `userName`, `userEmail`, `panelName?`, `panel?` (não usada), `isAdmin?`, `viewerMode?: { entregadorName, mode?: "gestor" | "admin", backHref? }`.

1. **Faixa de modo** (só com `viewerMode`):
   - admin → borda e fundo vermelhos + `"⚠ Modo ADMIN MASTER — editando {nome}"`;
   - gestor → verde + `"Visualizando como gestor: {nome} · somente leitura"`;
   - botão `"← Voltar"` para `backHref`, que vale `"/gestao"` para o admin e `"/gestor"` para o gestor.
2. **Esquerda:** link para `/select` (ou `backHref` no modo de visualização) com:
   - quadrado `primary` com ícone `Package`;
   - `{panelName ?? "JADLOG"}`;
   - `"Painel de Controle · {ano}"`, com `ano = new Date().getFullYear()` (muda sozinho na virada do ano).
   - **Não** existem `"+ nuvem"` nem o indicador `"sincronizado"`.
3. **Direita:**
   - `"Logado como"` + nome **[DECIDIR Q1]**;
   - engrenagem (escondida no modo de visualização);
   - `"Gestão"` (só com `isAdmin` e fora do modo de visualização);
   - `"⇄ Trocar painel"` (escondido no modo de visualização);
   - `"Sair"` (form → `logout`).
   - Abaixo do breakpoint `sm`, `"Gestão"`, `"Trocar painel"` e `"Sair"` mostram só o ícone (`⇄` no Trocar painel), com `aria-label` igual ao texto. O grupo usa `flex-wrap`, para não gerar rolagem horizontal em 375 px.
4. **Modal "Configurações da conta"** (`"Atualize seus dados de acesso."`), com duas abas:
   - `"Perfil"`: campos `"Nome"` e `"E-mail"`, botão `"Salvar dados"` (`"Salvando..."`), mensagem de sucesso `"Dados atualizados com sucesso!"`;
   - `"Senha"`: campos `"Senha atual"`, `"Nova senha"` (`"Mínimo 6 caracteres"`) e `"Confirmar nova senha"` (`"Repita a nova senha"`), botão `"Alterar senha"` (`"Alterando..."`), mensagem de sucesso `"Senha alterada com sucesso!"`.

### 11.4 Abas do painel — `DashboardTabs` (`components/dashboard-tabs.tsx`)

- Props: `deliveries`, `transactions`, `dailyRecords`, `panel`, `readOnly`, `actions?: PanelActions` (as 8 ações substituíveis do modo admin).
- Estado: aba ativa (padrão `"daily"`), mais ano e mês da boleta e ano e mês do financeiro. Os filtros são independentes.
- Abas, nesta ordem: `"Boleta Diária"`, `"Rastreio"`, `"Financeiro"`, `"Visão Geral"`.
- Os cartões do topo (`StatsOverview`):
  - na aba Boleta, usam as boletas filtradas pelo período dela;
  - na aba Financeiro, usam os lançamentos filtrados pelo período dela;
  - nas outras abas, usam tudo.
  - O rastreio nunca é filtrado.
  - O filtro dos cartões é memoizado (`useMemo` com aba, dados, ano e mês): não refaz a conta quando nada disso muda.
- `periodLabel`:
  - sem filtro → nada;
  - ano + mês → `"{Aba} — {Mês}/{Ano}"`;
  - só ano → `"{Aba} — {Ano}"`;
  - só mês → `"{Aba} — {Mês} (todos os anos)"`.
  - `{Aba}` vale `"Boleta Diária"` ou `"Financeiro"`.

### 11.5 Boleta Diária — `DailyRecordsPanel` (`components/daily-records-panel.tsx`)

**Formulário fixo no topo** (escondido em `readOnly`). Cabeçalho `"Registrar entrega do dia"`. Campos, nesta ordem:

| Rótulo | Ícone | Input | Regra |
|---|---|---|---|
| `"Valor por entrega (R$)"` + dica `"← altere se o valor mudar"` | `Settings` | texto, `inputMode="decimal"`, `pattern="[0-9]*[.,]?[0-9]*"` | padrão `"3.50"` (ou o valor gravado com 2 casas); vírgula vira ponto ao digitar; obrigatório |
| `"Data"` | `Calendar` | `type="date"`, obrigatório | padrão hoje (`localDateISO()`) ou a data gravada |
| `"Entregas realizadas"` | `CheckCircle2` | `number`, `min 0`, `step 1`, `placeholder "0"` | — |
| `"Agendadas (sem sucesso)"` | `Clock` | `number`, `min 0` | padrão 0 |
| `"Com ocorrência"` | `AlertTriangle` | `number`, `min 0` | padrão 0 |
| `"Despesas do dia (R$)"` | `Receipt` | `number`, `step 0.01`, `min 0`, `placeholder "0,00"` | — |

- Grade: 1 coluna no celular, 2 a partir de `sm` e 5 a partir de `lg`.
- **Indicadores ao vivo** (antes de salvar), em 3 colunas:
  - `"Faturamento bruto"`;
  - `"Despesas"`, mostrado como `"− R$ x"`;
  - `"Faturamento líquido"`: verde (`--chart-2`) se ≥ 0, vermelho se < 0.
- Botão `"Salvar"` (`"Salvando..."`). O erro do servidor aparece numa caixa vermelha.

**Histórico:**
- Título `"Histórico"`, ou `"Histórico {ano}"` com ano filtrado.
- Botão `"Exportar CSV"` quando há boletas.
- Três `<select>` nativos:
  - ano: `"Todos os anos"` + anos que têm boleta, do mais novo para o mais velho;
  - mês: `"Todos os meses"` + meses com boleta no ano escolhido, em ordem crescente;
  - situação: `"Todos"` | `"Registrados"` (entregas > 0) | `"Pendentes"` (boleta com 0 entregas).
- Sem boletas: ícone `ClipboardList`, `"Nenhuma boleta registrada"` e, fora do modo só leitura, `"Preencha o formulário acima para começar."`.

**Tabela:**
- Colunas: `"Data"`, `"Realizadas"`, `"Agendadas"`, `"Ocorrências"`, `"R$/unid."`, `"Fat. Bruto"`, `"Despesas"`, `"Fat. Líquido"`, `"Ações"`.
- Agrupamento: ano decrescente → mês decrescente → datas decrescentes.
- Cada mês abre com a linha `"{Mês} {Ano}"`.
- Linha de boleta:
  - data `DD/MM/AAAA` + dia da semana `Dom Seg Ter Qua Qui Sex Sáb` (sábado e domingo em `primary`);
  - `R$/unid.` como `R$ 3,50`;
  - despesas como `"− R$ x"`;
  - líquido verde ou vermelho;
  - ações (fora de `readOnly`): editar abre o modal `"Editar boleta — {DD/MM/AAAA}"` / `"Altere os dados do dia e salve."` com o mesmo formulário; excluir pede confirmação (`ConfirmDeleteButton`, item `"a boleta de {DD/MM/AAAA}"`).
- **Resumo mensal**:
  - fica no **fim** de cada bloco de mês. Como a ordem é decrescente, fica abaixo do dia **mais antigo** **[DECIDIR Q2]**;
  - texto `"↳ Resumo {Mês} {Ano}"`;
  - campos: `"{n} dias · {entregas} entregas"`, `"Bruto:"`, `"Despesas:"` (vermelho), `"Líquido:"`, `"Média/dia:"` e, à direita, `"▲ Positivo"` ou `"▼ Negativo"` com ícone de tendência.
- **Resumo anual**:
  - `"▶ Resumo Anual {Ano}"`, com os mesmos campos e destaque mais forte (borda `primary/50`);
  - uma linha por ano exibido, **todas juntas no fim da tabela**.
- Os resumos usam **todas** as boletas do mês ou ano. O filtro de situação não muda os totais.
- **CSV** `boletas-{panel}-{AAAA-MM-DD}.csv`:
  - linhas = período de ano e mês, ignorando a situação;
  - colunas `Data;Entregas Realizadas;Agendadas;Ocorrências;Valor por Entrega;Faturamento Bruto;Despesas;Faturamento Líquido`;
  - números com 2 casas e ponto decimal.
- Tudo se atualiza depois de salvar, por `revalidatePath`, sem recarregar a página.

### 11.6 Cartões do topo — `StatsOverview` (`components/stats-overview.tsx`)

- `periodLabel` presente → `"Exibindo período: {label}"`.
- Grade: 2 colunas no celular e 5 a partir de `lg`. O cartão de líquido ocupa 2 colunas no celular (`col-span-2 lg:col-span-1`).
- Cada cartão mostra:
  - o rótulo em `text-xs uppercase tracking-wide`, cor muted;
  - o **valor** em `font-display text-2xl font-normal tabular-nums` (fonte serifada, §12). A hierarquia vem do tamanho e da fonte, não do peso;
  - a dica em `text-xs`, cor muted;
  - o ícone à direita, `h-5 w-5`.

| Rótulo | Valor | Dica | Ícone / cor |
|---|---|---|---|
| `"Entregas realizadas"` | Σ entregas | `"{n} dias trabalhados"` | `Truck` / primary |
| `"Fat. bruto acumulado"` | bruto | `"Despesas: R$ x"` | `TrendingUp` / chart-2 |
| `"Fat. líquido acumulado"` | líquido | `"Média/dia: R$ x"` | `Wallet` / verde ou vermelho |
| `"Rastreio (total)"` | nº de entregas | `"{n} em aberto"` | `Package` / chart-4 |
| `"Saldo financeiro"` | saldo | `"Positivo"` ou `"Negativo"` | `TrendingUp` ou `TrendingDown` / verde ou vermelho |

**Faixa de quinzenas** (dentro do cartão de líquido, só se há boleta; vale para o entregador, o `/gestor` e o drill-down):
- título `"Quinzenas · {Mês abreviado em 3 letras}/{Ano}"`;
- duas metades, lado a lado; a partir do breakpoint `lg` (cartão com 1/5 da largura) ficam **uma sobre a outra**, para o valor não ser cortado pelo `overflow-hidden` do `Card`:
  - `"1ª quinzena"`: líquido + `"01–15"`;
  - `"2ª quinzena"`: líquido + `"16–{lastDay com 2 dígitos}"`, ou só `"16"` quando `lastDay = 16`.
  - Quinzena sem boleta (`days = 0`): líquido `R$ 0,00` em cinza + `"sem registros"` no lugar do intervalo — igual nas duas metades.
- Valor cinza se a quinzena não tem boleta, verde se ≥ 0, vermelho se < 0.
- Tooltip: `"{n} dia(s) com boleta"`, com `n` = datas distintas (§5.3).

### 11.7 Rastreio e Financeiro

**`DeliveriesPanel`** (`components/deliveries-panel.tsx`):
- Título `"Entregas"`.
- Botões `"Exportar CSV"` (quando há entregas) e `"Nova entrega"` (fora de `readOnly`).
- Modal `"Nova entrega"` / `"Cadastre um novo pacote para acompanhamento."`. Campos:
  - `"Código de rastreio"` (`"JL123456789BR"`, obrigatório);
  - `"Destinatário"` (`"Nome do cliente"`, obrigatório);
  - `"Cidade"` (`"São Paulo"`);
  - `"Valor (R$)"`;
  - `"Endereço"` (`"Rua, número, bairro"`);
  - `"Prazo"` (date);
  - `"Status"` (select, padrão Pendente).

  Botão `"Salvar entrega"` (`"Salvando..."`).
- Tabela: `"Rastreio"`, `"Destinatário"`, `"Cidade"`, `"Prazo"`, `"Valor"`, `"Status"`, `"Ações"`.
- O status é um Select com badge colorido:
  - pendente: cinza;
  - em trânsito: chart-4;
  - entregue: chart-2;
  - cancelada: vermelho.
  - Em `readOnly`, só o badge aparece.
- Excluir pede confirmação (`ConfirmDeleteButton`, item `"a entrega {código}"`).
- Vazio: `"Nenhuma entrega cadastrada"` + `Clique em "Nova entrega" para começar.` (este texto e os outros textos com aspas internas aparecem sem as aspas externas).
- CSV `entregas-{panel}-{data}.csv`: `Código de Rastreio;Destinatário;Cidade;Endereço;Prazo;Valor;Status`. Exporta tudo, sem filtro.

**`FinancePanel`** (`components/finance-panel.tsx`):
- Topo: `"Total receitas"` (verde), `"Total despesas"` (vermelho) e `"Saldo"`, todos do período filtrado.
- Título `"Lançamentos financeiros"` + selects `"Todos os anos"` e `"Todos os meses"` (mesma lógica da boleta).
- Botões `"Exportar CSV"` e `"Novo lançamento"`.
- Modal `"Novo lançamento"` / `"Registre uma receita ou despesa."`, ou `"Editar lançamento"` / `"Altere os dados e salve."`. Campos:
  - `"Tipo"` (Receita | Despesa);
  - `"Valor (R$)"` (obrigatório);
  - `"Descrição"` (`"Ex: Combustível"`, obrigatória);
  - `"Categoria"` (`"Frete, Combustível..."`);
  - `"Data"` (padrão hoje).

  Botão `"Salvar lançamento"` ou `"Salvar alterações"`.
- Tabela: `"Data"`, `"Descrição"`, `"Categoria"`, `"Tipo"`, `"Valor"` (`+R$` verde ou `−R$` vermelho), `"Ações"`. Excluir pede confirmação (`ConfirmDeleteButton`, item `"o lançamento \"{descrição}\""`).

**`ConfirmDeleteButton`** (`components/confirm-delete-button.tsx`): lixeira que abre o modal `"Excluir {item}?"` / `"Essa ação não pode ser desfeita."`, botões `"Cancelar"` (foco inicial) e `"Excluir"` (`"Excluindo..."`). Não usa `window.confirm`.
- Vazio: `"Nenhum lançamento registrado"` (sem nenhum lançamento) ou `"Nenhum lançamento no período selecionado"` (com filtro). Fora de `readOnly` vem também `Clique em "Novo lançamento" para começar.`.
- CSV `financeiro-{panel}-{data}.csv`: `Data;Descrição;Categoria;Tipo;Valor`. Exporta o período filtrado.

### 11.8 Visão Geral — `OverviewPanel` (Recharts + `ChartContainer` do shadcn)

1. `"Boletas mensais (bruto × líquido)"`:
   - barras `bruto` (chart-1), `liquido` (chart-2) e `despesas` (chart-3) por mês `"{Mmm}/{AA}"`, em ordem cronológica;
   - eixo Y em `R${milhares}k`;
   - tooltip em BRL;
   - vazio → `"Sem boletas registradas."`.
2. `"Entregas por status (rastreio)"`:
   - rosca com cores por status (pendente chart-5, em trânsito chart-4, entregue chart-2, cancelada chart-3);
   - legenda `"{rótulo} ({n})"`;
   - vazio → `"Sem dados de entregas."`.
3. `"Receitas × Despesas (financeiro)"`: só aparece se há lançamento. Barras receita (chart-2) e despesa (chart-3) por mês, largura total.

### 11.9 Gestor

**`/gestor`** (`app/gestor/page.tsx`), de cima para baixo:
1. Header `"Painel do Gestor"`.
2. Link `"Histórico de edições dos entregadores"` → `/gestor/auditoria`.
3. `StatsOverview` com os dados da organização inteira. **[DEFEITO D6]**
4. `"Composição por painel"`: um cartão por painel (os padrões sempre aparecem) com `"{n} entregas"` e o líquido.
5. `InvitesPanel`.
6. `"Entregadores ({n})"`:
   - um cartão-link por entregador → `/gestor/entregadores/{id}`, com nome, e-mail, `"{n} entregas"` e líquido somado de todos os painéis;
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
- Header com `panelName = nome do entregador` e `viewerMode`.
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
  - escudo → `/gestor/entregadores/{id}` (modo ADMIN MASTER);
  - lápis → modal `"Editar usuário"` / `"Altere nome e e-mail de {nome}."`: campos `"Nome"` e `"E-mail"`, botão `"Salvar alterações"`, sucesso `"Dados atualizados!"` e fecha;
  - chave → modal `"Redefinir senha"` / `"Defina uma nova senha para {nome}. A senha atual não é necessária."`: campos `"Nova senha"` e `"Confirmar nova senha"`, botão `"Redefinir senha"`, sucesso `"Senha redefinida!"` e fecha;
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
- **O tema padrão é o escuro (`:root`), sempre.** O tema claro existe só como tokens, ativado por `<html data-theme="light">`. Ainda não há botão para trocar de tema.

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

---

## 13. Testes (`npm test` → Vitest; estado atual: **93/93**; o CI roda em todo push e PR, §2.1)

| Arquivo | O que DEVE ser testado |
|---|---|
| `lib/auth.test.ts` | senha certa passa; senha errada falha; mesma senha gera hashes diferentes; formato legado HMAC é aceito; formato desconhecido falha; `isLegacyHash` com 2 e 3 partes; `isAdminEmail` ignora maiúsculas e devolve false sem `ADMIN_EMAIL` |
| `lib/format.test.ts` | `formatCurrency` (número, string, inválido → R$ 0,00); `formatDate` (pt-BR, null e inválida → `"—"`); `filterByPeriod` (tudo, por ano, ano + mês com mês 0-indexado); `statusLabel` (conhecido e desconhecido) |
| `lib/rate-limit.test.ts` | não bloqueia antes de 5 falhas; bloqueia na 5ª; desbloqueia quando a janela vence (fake timers); `clearAttempts` desbloqueia; e-mail sem diferença de maiúsculas |
| `lib/google-link.test.ts` | `isEmailAuthoritative`: @gmail.com verificado; Workspace com `hd` igual ao domínio; recusa conta comum de outro domínio, `hd` diferente, não verificado e `verified_email` que não é `true`. `decideGoogleLink`: usa a conta do `google_id`; liga pelo e-mail autoritativo; recusa e-mail não autoritativo (ligar e criar); recusa conta já ligada a outro `google_id`; cria conta nova |
| `lib/forms.test.ts` | `parseMoney` (ponto e vírgula, vazio → 0, recusa negativo, texto, 3 casas, notação científica e valor grande); `parseCount` (inteiro ≥ 0, vazio → 0, recusa negativo, decimal, texto e acima do limite); `parseISODate` (válida; recusa formato errado e data inexistente); `parseDailyRecordForm`, `parseDeliveryForm` e `parseTransactionForm` (normalização, padrões, mensagens, painel/status/tipo inválidos, id na edição, 'hoje' recebido) |
| `lib/dates.test.ts` | `localDateISO` usa a data local (23:30 continua o mesmo dia) e preenche com 2 dígitos; `todayISOIn` em São Paulo antes e depois das 03:00 UTC |
| `lib/metrics.test.ts` | `recordGross`; `recordNet` (normal e negativo); `netByQuinzena`: null sem boletas; dia 15 vai para a 1ª e dia 16 para a 2ª; mês de referência na virada do ano; ignora outros meses; `lastDay`; 2ª quinzena vazia; `days` conta datas distintas; valor negativo; soma das quinzenas = líquido do mês |
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
| Q1 | O v1 pedia tirar o nome do usuário "da página inicial". A `/` não mostra nome. Manter `"Logado como {nome}"` no cabeçalho dos painéis? | Mantém. |
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
