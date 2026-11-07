---
name: new-module
description: Turizm API uchun yangi NestJS domen modulini yaratadi (module, controller, service, DTO, umumiy type'lar, unit testlar) va `src/router/index.ts` ga ulaydi. Foydalanuvchi yangi modul/resurs/domen (masalan users, auth, tours) qo'shishni so'raganda ishlating.
argument-hint: <feature-nomi ko'plikda, masalan users>
---

# Yangi domen moduli: `$ARGUMENTS`

Avval `.claude/rules/nestjs-architecture.md` qoidalarini eslab qoling, butun ish shu qoidalarga mos bo'lishi kerak.

## 1. Aniqlashtirish

Agar quyidagilar so'rovdan aniq bo'lmasa, kod yozishdan oldin foydalanuvchidan **bitta xabarda** so'rang:
- Entity maydonlari (nomi, turi, majburiyligi, unique bo'lishi).
- Qaysi endpoint'lar kerak: to'liq CRUD yoki faqat bir qismi.
- Bazaga yoziladimi? Ha bo'lsa, Prisma modeli kerak (6-qadam).
- Himoyalanganmi (auth kerakmi)?

## 2. Mavjud holatni tekshirish

- `apps/api/src/modules/` da shu nomli modul yo'qligini tekshiring.
- Base qatlamni ko'rib chiqing: `apps/api/src/common/` (BaseService, createCrudController, PaginationQueryDto). To'liq CRUD bo'lsa, shulardan meros oling.

## 3. Scaffold

Skelet uchun Nx generator ishlatiladi. Avval `nx-generate` skill'ini chaqiring, keyin flag'larni `--help` dan tekshiring:

```
npx nx g @nx/nest:resource --help
```

Generator joylashuvni to'g'ri bermasa yoki Nx ishlamasa, fayllarni qo'lda yarating. Tuzilish shunday bo'lishi kerak:

```
apps/api/src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts / .controller.spec.ts
  <feature>.service.ts / .service.spec.ts
  dto/create-<entity>.dto.ts, dto/update-<entity>.dto.ts
```

Generator yaratgan keraksiz fayllarni (`entities/*.entity.ts` va boshqa bo'sh namunalar) olib tashlang.

## 4. Kod

- **DTO:** class-validator dekoratorlari bilan yoziladi. `Update` DTO `PartialType(Create...)` orqali yasaladi.
- **Umumiy type:** `packages/types/src/lib/<feature>.ts` da javob interface'i (`User`, `UserListResponse` va h.k.) yoziladi. Uni `packages/types/src/index.ts` dan `export * from './lib/<feature>'` qilib eksport qiling.
- **Service:** biznes logika shu yerda. Topilmasa `NotFoundException` tashlanadi. DB kerak bo'lsa `PrismaService` inject qilinadi.
- **Controller:** yupqa bo'ladi. Param'lar pipe bilan tekshiriladi, `DELETE` uchun `@HttpCode(204)` qo'yiladi.
- **Module:** boshqa modullarga kerak bo'lsa service `exports` ga qo'shiladi.
- `apps/api/src/router/index.ts` dagi `appRoutes` ning `v1` bolalariga `{ path: '<feature>', module: <Feature>Module }` qo'shiladi. `AppModule` ga qo'shilmaydi.

## 5. Testlar

- Service spec: har bir metod uchun muvaffaqiyatli holat va xato holati. `PrismaService` mock qilinadi.
- Controller spec: service mock qilinadi, chaqiruv va natija tekshiriladi.

## 6. Baza (kerak bo'lsa)

Modulga Prisma modeli kerak bo'lsa, `db-migration` skill'i bo'yicha model qo'shib migratsiya qiling.

## 7. Tekshirish va yakun

- `verify` skill'ini ishlating. Kamida typecheck va `npx nx run api:test -- <feature>` o'tishi shart.
- `CLAUDE.md` dagi "Domen modullari" jadvalida modul holatini yangilang.
- Foydalanuvchiga o'zbekcha qisqa hisobot bering: yaratilgan fayllar, endpoint'lar ro'yxati (`METHOD /api/v1/<feature>/...`), test natijasi va hali qilinmagan ishlar.
