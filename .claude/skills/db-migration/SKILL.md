---
name: db-migration
description: PostgreSQL + Prisma bilan ishlaydi. Prisma'ni loyihaga birinchi marta sozlaydi, schema.prisma'ga model yoki maydon qo'shadi yoki o'zgartiradi, migratsiya yaratadi, client'ni generate qiladi va service hamda type'larni yangilaydi. Bazadagi jadval, ustun, relation, index yoki migratsiyaga oid har qanday so'rovda ishlating.
argument-hint: <o'zgarish tavsifi, masalan "users jadvaliga phone qo'shish">
---

# Bazani o'zgartirish: `$ARGUMENTS`

## 0. Prisma o'rnatilganmi?

`package.json` da `prisma` va `@prisma/client` bormi, tekshiring. Yo'q bo'lsa, avval **dastlabki sozlash** (pastda) bajariladi.

O'rnatilgan Prisma versiyasini aniqlang (`npx prisma --version`). Prisma'ning katta versiyalari orasida sozlash farq qiladi: generator nomi, `output` yo'li, `prisma.config.ts`, driver adapter'lar. Shuning uchun yangi sozlash yoki noma'lum xato chiqqanda shu versiya uchun Prisma hujjatlarini tekshiring. Taxmin qilmang.

## 1. Schema o'zgarishi

Fayl: `apps/api/prisma/schema.prisma`.

- Model nomi PascalCase va birlikda (`User`). Jadval nomi `@@map("users")` bilan snake_case va ko'plikda beriladi. Maydonlar camelCase, ustunlar `@map("created_at")` bilan snake_case.
- Har bir modelda `id`, `createdAt @default(now())` va `updatedAt @updatedAt` bo'ladi.
- ID turi: loyihada qaysi biri (`Int @default(autoincrement())` yoki `String @default(uuid())`) ishlatilgan bo'lsa, o'shani ishlating. Birinchi model uchun foydalanuvchidan so'rang.
- Pul uchun `Decimal` ishlatiladi, `Float` emas. Sanalar uchun `DateTime`. Cheklangan qiymatlar uchun `enum`.
- Ko'p qidiriladigan maydonlarga `@@index`, takrorlanmasligi kerak bo'lganlarga `@unique` qo'yiladi.
- Relation'larda `onDelete` xatti-harakati ongli tanlanadi.

## 2. Xavfli o'zgarishlar: avval so'rang

Quyidagi holatlarda migratsiyadan **oldin** foydalanuvchini ogohlantirib, roziligini oling:
- Ustun yoki jadvalni o'chirish yoki nomini o'zgartirish. Prisma rename'ni drop + create deb tushunadi va ma'lumot yo'qoladi. Kerak bo'lsa, migratsiya SQL'ini qo'lda tahrirlang.
- Mavjud jadvalga default'siz `NOT NULL` ustun qo'shish.
- Ustun turini o'zgartirish.
- `prisma migrate reset` (butun ma'lumotni o'chiradi) va `prisma db push` (migratsiya tarixini chetlab o'tadi). Bu buyruqlar o'z-o'zidan ishlatilmaydi.

## 3. Migratsiya

```
npx prisma migrate dev --name <snake_case_tavsif>
```

- Buyruq `prisma.config.ts` yoki `schema.prisma` joylashgan joydan ishga tushiriladi, yoki `--schema apps/api/prisma/schema.prisma` beriladi. Qaysi biri kerakligi loyihadagi sozlashga qarab tekshiriladi.
- Migratsiya nomlari: `add_user_phone`, `create_bookings`.
- Yaratilgan `migrations/<timestamp>_<nom>/migration.sql` ni o'qing va kutilgan o'zgarish ekanini tasdiqlang.
- Yaratilgan migratsiya fayllarini keyin tahrirlamang (ular allaqachon qo'llangan bo'lishi mumkin). Tuzatish uchun yangi migratsiya yarating.
- Baza ishlamayotgan bo'lsa (`P1001` va h.k.), foydalanuvchiga ayting. `DATABASE_URL` ni o'zingiz o'ylab topmang.

## 4. Kodni yangilash

- Client generate qilinadi (`npx prisma generate`, agar `migrate dev` uni o'zi qilmagan bo'lsa).
- `packages/types` dagi tegishli javob interface'i yangilanadi. U yerga `@prisma/client` import qilinmaydi.
- Service'lar va DTO'lar yangilanadi.
- Service unit testlaridagi mock ma'lumotlar yangi maydonlarga moslashtiriladi.

## 5. Tekshirish

Typecheck va tegishli unit testlar ishga tushiriladi (yoki `verify` skill'i). Hisobotda migratsiya nomi, schema'dagi o'zgarish qisqacha va xavfli qadamlar bo'lgan-bo'lmagani aytiladi.

---

## Dastlabki sozlash (faqat bir marta)

Boshlashdan oldin foydalanuvchiga reja aytilib, `npm install` uchun rozilik olinadi.

1. Paketlar o'rnatiladi: `prisma` (dev) va `@prisma/client`, hamda o'rnatilgan versiya talab qilsa PostgreSQL driver adapter'i (`@prisma/adapter-pg` + `pg`).
2. `apps/api/prisma/schema.prisma` yaratiladi: `datasource db { provider = "postgresql" }` va versiyaga mos generator.
3. `DATABASE_URL`:
   - `.env` ga lokal qiymat yoziladi. `.env` `.gitignore` da ekanini tekshiring, bo'lmasa qo'shing.
   - `.env.example` ga namuna yoziladi: `postgresql://postgres:postgres@localhost:5432/turizm?schema=public`.
   - Haqiqiy parollar yozilmaydi va commit qilinmaydi.
4. `apps/api/src/prisma/prisma.service.ts` yaratiladi: `PrismaClient` dan meros oladi va `OnModuleInit` da `$connect()` qiladi. Shu papkada `prisma.module.ts` ham yaratiladi: `@Global()`, `PrismaService` ni provide va export qiladi. U `AppModule.imports` ga qo'shiladi.
5. Build tekshiriladi: `tsdown` `@prisma/client` ni external qoldirishi kerak. `apps/api/package.json` dependencies'ga `@prisma/client` qo'shiladi, aks holda prune qilingan Docker image'da u bo'lmaydi.
6. `apps/api/Dockerfile` builder bosqichiga `npx prisma generate` qo'shiladi. Runtime'da migratsiya uchun `prisma migrate deploy` qanday ishga tushirilishini foydalanuvchi bilan kelishib oling.
7. Lokal PostgreSQL yo'q bo'lsa, ildizda `docker-compose.yml` (faqat `postgres` servisi) yaratishni taklif qiling.
8. Birinchi migratsiya: `npx prisma migrate dev --name init`.
9. `CLAUDE.md` dagi "Ma'lumotlar bazasi" bo'limi yangilanadi: schema yo'li, buyruqlar va baza qanday ishga tushirilishi yoziladi.
