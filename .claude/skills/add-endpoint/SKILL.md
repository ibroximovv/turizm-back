---
name: add-endpoint
description: Mavjud NestJS moduliga yangi endpoint qo'shadi (DTO, service metodi, controller route, umumiy type, unit testlar). Foydalanuvchi mavjud modulga yangi route, API yoki amal qo'shishni so'raganda ishlating.
argument-hint: <modul> <METHOD /path> [tavsif]
---

# Endpoint qo'shish: `$ARGUMENTS`

Kod `.claude/rules/nestjs-architecture.md` qoidalariga mos yoziladi.

## 1. Tushunish

- Modulni toping: `apps/api/src/modules/<modul>/`. Uning controller, service, DTO va spec fayllarini o'qing. Yangi kod mavjud uslubni takrorlaydi.
- Aniq bo'lmasa, foydalanuvchidan **bitta xabarda** so'rang: kiruvchi ma'lumot (body/query/param), javob shakli, kim kira oladi, xato holatlari.
- Route to'qnashuvini tekshiring. Masalan, `GET :id` dan keyin e'lon qilingan `GET me` hech qachon ishlamaydi, chunki statik route'lar parametrli route'lardan **oldin** turishi kerak.

## 2. Amalga oshirish

Qadamlar shu tartibda bajariladi:

1. **Type:** javob shakli yangi bo'lsa, `packages/types/src/lib/<modul>.ts` ga qo'shiladi.
2. **DTO:** body yoki query bo'lsa, `dto/` da class-validator bilan yoziladi. Query'dagi raqamlar uchun `@Type(() => Number)` qo'shiladi.
3. **Service metodi:** logika, Prisma so'rovi va exception'lar shu yerda bo'ladi.
4. **Controller route:** to'g'ri dekorator, pipe va status kod qo'yiladi. Controller faqat service'ni chaqiradi.
5. **Baza:** yangi maydon yoki jadval kerak bo'lsa, avval `db-migration` skill'ini bajaring.

## 3. REST konventsiyalari

- Resurs nomlari ko'plikda, kebab-case: `/api/users/:id/booking-history`.
- `GET` faqat o'qiydi. `POST` yaratadi (201). `PATCH` qisman yangilaydi (200). `DELETE` o'chiradi (204, body yo'q).
- Ro'yxat qaytaruvchi endpoint `{ data: T[], total: number }` shaklida javob beradi. Pagination kerak bo'lsa query'da `page`/`limit` ishlatiladi va `limit` ga yuqori chegara qo'yiladi.

## 4. Testlar

- Yangi service metodi uchun: muvaffaqiyatli holat va har bir xato holati.
- Controller uchun: route service'ni to'g'ri argumentlar bilan chaqirishi.

## 5. Tekshirish va yakun

- `npx tsc -p apps/api/tsconfig.app.json --noEmit` va `npx nx run api:test -- <modul>` ishga tushiriladi.
- Foydalanuvchiga o'zbekcha hisobot beriladi: endpoint (`METHOD /api/...`), namunaviy so'rov va javob, o'zgargan fayllar, test natijasi.
