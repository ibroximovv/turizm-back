# turizm-back

Turizm platformasi uchun backend API. Nx monorepo + NestJS 11, TypeScript, PostgreSQL + Prisma (rejalashtirilgan).

## Til va muloqot

- Foydalanuvchiga javoblar **o'zbek tilida**. Texnik atamalar (controller, DTO, migration...) o'zgarishsiz qoladi.
- Kod, identifikatorlar, kod ichidagi izohlar, commit xabarlari, branch nomlari: **ingliz tilida**.
- API'ning foydalanuvchiga ko'rinadigan xato xabarlari ham inglizcha bo'ladi. Lokalizatsiya keyinroq alohida hal qilinadi.

## Loyiha xaritasi

```
apps/
  api/                    NestJS ilova (tags: scope:api, type:app)
    src/main.ts           bootstrap, global prefix "api", PORT (default 3000)
    src/app/              app.module.ts (root) + shablondan qolgan namuna (todos, health)
    src/modules/<feature> domen modullari shu yerda yaratiladi (qarang: .claude/rules/nestjs-architecture.md)
    tsdown.config.mts     build (oxc/rolldown) -> dist/apps/api/main.cjs
    Dockerfile            multi-stage, `nx run api:prune`
  api-e2e/                Jest + axios e2e testlar (ishlab turgan serverga so'rov yuboradi)
packages/
  types/                  umumiy interface/type'lar, import: `@nestjs-template/types` (tags: scope:shared)
```

- **Module boundaries** (`eslint.config.mjs`): `scope:api` faqat `scope:api` va `scope:shared` dan import qila oladi. `scope:shared` faqat `scope:shared` dan import qila oladi. `packages/types` hech qachon NestJS yoki Prisma'ga bog'liq bo'lmasligi kerak.
- Path alias'lar `tsconfig.base.json` da. Yangi alias qo'shilsa, `apps/api/tsdown.config.mts` dagi `alias` ga ham qo'shiladi, aks holda build uni topmaydi.
- `tsconfig` da `strict: false`. Shunga qaramay yangi kodni strict'dek yozing: `any` ishlatmang, null holatlarini tekshiring.

### Domen modullari

| Modul | Holat | Izoh |
| ----- | ----- | ---- |
| `auth` | rejada | JWT asosida |
| `users` | rejada | foydalanuvchilar, profil |
| `todos` | namuna | shablondan qolgan, domen emas, keyin o'chiriladi |

Yangi modul qo'shilganda shu jadval yangilanadi.

### Ma'lumotlar bazasi

PostgreSQL + Prisma tanlangan, lekin hali o'rnatilmagan. Bazaga oid har qanday ish uchun `db-migration` skill'idan foydalaning. Unda dastlabki sozlash qadamlari ham bor.

## Buyruqlar

Vazifalarni **Nx orqali** ishga tushiring (`npx nx ...`). Nx kesh va bog'liqliklarni o'zi boshqaradi.

| Maqsad | Nx | To'g'ridan-to'g'ri (zaxira) |
| ------ | -- | --------------------------- |
| Dev server | `npx nx run api:serve` | `cd apps/api && npx tsdown --watch` + `node --watch dist/apps/api/main.cjs` |
| Build | `npx nx run api:build` | `cd apps/api && npx tsdown` |
| Unit test | `npx nx run api:test` | `npx jest -c apps/api/jest.config.cts --forceExit` |
| Bitta test fayl | `npx nx run api:test -- todos` | `npx jest -c apps/api/jest.config.cts todos` |
| Lint | `npx nx run-many -t lint` | `npx eslint apps/api/src packages/types/src` |
| Typecheck | *(Nx target yo'q)* | `npx tsc -p apps/api/tsconfig.app.json --noEmit` va `npx tsc -p apps/api/tsconfig.spec.json --noEmit` |
| e2e | `npx nx run api-e2e:e2e` | server ishlab turishi kerak |
| Hammasi | `npx nx run-many -t lint test build` | `verify` skill'iga qarang |

- **Typecheck target yo'q.** CI (`.github/workflows/ci.yml`) `typecheck` ni chaqiradi, lekin hozir hech bir loyihada bunday target yo'q. Typecheck har doim `tsc --noEmit` bilan qilinadi.
- **Windows muhiti:** ilgari Smart App Control Nx native binary'ni bloklagan edi (`WorkspaceContext is not a constructor` / `ERR_DLOPEN_FAILED`). Bu xato chiqsa, sozlamani o'zingiz o'zgartirmang. Zaxira buyruqlarga o'ting va foydalanuvchiga xabar bering. Bunday holatda ESLint `@nx/enforce-module-boundaries` qoidasini tashlab ketadi ("No cached ProjectGraph").
- Jest tugagach "worker failed to exit gracefully" ogohlantirishi chiqishi normal holat. `--forceExit` yordam beradi.

## Ish tartibi

1. **Avval o'qing, keyin yozing.** O'zgartirishdan oldin tegishli modul va `packages/types` ni ko'rib chiqing. Mavjud uslubni takrorlang.
2. **Kichik qadamlar.** Bitta vazifa uchun bitta mantiqiy o'zgarish qiling. So'ralmagan refactor qilmang.
3. **O'zgarishdan keyin doim tekshiring:** kamida typecheck va o'zgargan modulning unit testlari. Kattaroq o'zgarishda `verify` skill'ini ishlating. Tekshirilmagan narsani "ishlaydi" deb aytmang. Natijani, xatolar bo'lsa ular bilan birga, aniq yozing.
4. **Har bir yangi service metodiga unit test yoziladi** (`*.spec.ts`, kod bilan yonma-yon).
5. **Git:** commit, push va branch faqat foydalanuvchi so'raganda qilinadi. `main` da bevosita commit qilinmaydi, avval branch ochiladi.
6. **Tegilmaydigan fayllar:** `dist/`, `.nx/`, `node_modules/` qo'lda tahrirlanmaydi. `package-lock.json` faqat `npm install` orqali o'zgaradi. `.env` ga haqiqiy maxfiy ma'lumot yozilmaydi, namunasi `.env.example` da saqlanadi.
7. **Yangi paket** (`npm install ...`) o'rnatishdan oldin foydalanuvchiga nima uchun kerakligini qisqa aytib, roziligini oling.

## Skill'lar va qoidalar

- `.claude/rules/nestjs-architecture.md`: modul tuzilishi va NestJS qoidalari. `apps/api/**` bilan ishlaganda avtomatik yuklanadi.
- `/new-module <nom>`: yangi domen moduli yaratadi.
- `/add-endpoint <modul> <METHOD /path>`: mavjud modulga endpoint qo'shadi.
- `/db-migration <tavsif>`: Prisma schema o'zgarishi va migratsiya.
- `/verify`: typecheck, lint, test va build'ni ketma-ket ishlatib, natijani jadvalda beradi.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
