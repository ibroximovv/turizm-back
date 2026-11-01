---
paths:
  - "apps/api/**/*.ts"
  - "packages/types/**/*.ts"
---

# NestJS arxitektura qoidalari

## Modul tuzilishi

Har bir domen (auth, users, ...) `apps/api/src/modules/<feature>/` ichida o'z modulida turadi:

```
modules/users/
  users.module.ts
  users.controller.ts
  users.controller.spec.ts
  users.service.ts
  users.service.spec.ts
  dto/
    create-user.dto.ts
    update-user.dto.ts
    user-query.dto.ts        (list uchun filter/pagination bo'lsa)
```

- Fayl nomlari kebab-case, `<feature>.<turi>.ts` shaklida. Klass nomlari PascalCase: `UsersService`, `CreateUserDto`.
- Modul nomi ko'plikda bo'ladi (`users`, `tours`). Entity/type nomi birlikda (`User`).
- Har bir feature modul `AppModule` ning `imports` ro'yxatiga qo'shiladi. Controller va provider'lar `AppModule` ga to'g'ridan-to'g'ri yozilmaydi. `src/app/` dagi `todos`/`health` bundan mustasno, ular shablondan qolgan.
- Umumiy infratuzilma (Prisma, config, guard'lar, filter'lar) `apps/api/src/common/` yoki `apps/api/src/<infra>/` da turadi. `PrismaModule` `apps/api/src/prisma/` da joylashadi.

## Qatlamlar

- **Controller yupqa bo'ladi.** U faqat route, param/body/query qabul qilish, status kod va service chaqiruvi bilan shug'ullanadi. Biznes logika, if/else qarorlari, DB so'rovlari controller'da yozilmaydi.
- **Service** biznes logikani o'z ichiga oladi. Prisma bilan faqat service ishlaydi (`PrismaService` constructor orqali inject qilinadi).
- Boshqa modul service'i kerak bo'lsa, o'sha modul uni `exports` ga qo'shadi, kerakli modul esa uni `imports` qiladi. Service'ni boshqa modulning `providers` ga qayta qo'shish mumkin emas.
- Dependency'lar faqat constructor injection orqali olinadi (`private readonly x: X`). `new SomeService()` ishlatilmaydi.
- Aylanma bog'liqlik (`forwardRef`) paydo bo'lsa, bu dizayn muammosi belgisi. Uni ishlatishdan oldin foydalanuvchi bilan maslahatlashing.

## DTO va type'lar

- **Kiruvchi ma'lumot** (body/query) uchun modulning `dto/` papkasida `class-validator` dekoratorli **class** DTO yoziladi. Interface DTO runtime'da tekshirilmaydi, shablondagi `todos` bunga yomon namuna.
- `Update*Dto` `@nestjs/mapped-types` dagi `PartialType(Create*Dto)` orqali yasaladi.
- **Chiquvchi javob** shakllari (frontend ham ishlatadigan interface'lar) `packages/types/src/lib/` da saqlanadi va `@nestjs-template/types` dan `import type` bilan olinadi.
- `packages/types` da faqat sof TypeScript bo'ladi. U yerda NestJS, class-validator yoki `@prisma/client` importlari bo'lmaydi.
- Prisma model obyektini to'g'ridan-to'g'ri qaytarmang, ayniqsa `password`/`passwordHash` kabi maydonlar bo'lsa. Service umumiy type'ga map qilib qaytaradi.
- `class-validator` / `ValidationPipe` hali o'rnatilmagan. Birinchi DTO yozilayotganda foydalanuvchiga aytib, ularni qo'shish taklif qilinadi: `main.ts` da `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.

## Xatolar va HTTP

- Topilmadi holatida `NotFoundException`, noto'g'ri so'rovda `BadRequestException`, takrorlanuvchi qiymatda `ConflictException`, ruxsat yo'qligida `ForbiddenException`/`UnauthorizedException` tashlanadi. Xabar inglizcha va aniq bo'ladi: `User #12 not found`.
- Service xato holatda `null` qaytarmaydi, exception tashlaydi.
- Prisma xatolarini (`P2002` unique, `P2025` not found) service'da tegishli Nest exception'ga aylantiring. Ular 500 bo'lib chiqib ketmasligi kerak.
- Route param'lari pipe bilan tekshiriladi: `ParseIntPipe` yoki `ParseUUIDPipe`.
- `DELETE` uchun `@HttpCode(204)` ishlatiladi. `POST` default bo'yicha 201 qaytaradi.

## Xavfsizlik

- Parollar faqat hash qilingan holda saqlanadi (bcrypt/argon2) va hech qachon javobda yoki logda chiqmaydi.
- Maxfiy qiymatlar (JWT secret, DB URL) faqat environment'dan olinadi, kodga yozilmaydi.
- Himoyalangan route'lar guard bilan yopiladi. Auth moduli tayyor bo'lgach, guard'ni har bir endpoint'da ochiq qoldirish yoki yopish ongli qaror bo'lishi kerak.

## Testlar

- Unit testlar `Test.createTestingModule` bilan yoziladi. Bog'liqliklar (`PrismaService`, boshqa service'lar) `{ provide: X, useValue: mock }` orqali almashtiriladi. Unit testda haqiqiy DB ishlatilmaydi.
- Har bir service metodi uchun kamida bitta muvaffaqiyatli va bitta xato holati (masalan, not found) test qilinadi.
- Controller testi service chaqirilganini va natija qaytganini tekshiradi. Logika service testida tekshiriladi.
