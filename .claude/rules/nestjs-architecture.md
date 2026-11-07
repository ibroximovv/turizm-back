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
- Har bir feature modul `apps/api/src/router/index.ts` dagi `appRoutes` daraxtiga `{ path: '<feature>', module: <Feature>Module }` qilib qo'shiladi. U yerdan avtomatik import bo'ladi, `AppModule` ga qo'shilmaydi. Controller'da prefix yozilmaydi: `@Controller()`. Controller va provider'lar `AppModule` ga to'g'ridan-to'g'ri yozilmaydi. `src/app/` dagi `todos`/`health` bundan mustasno, ular shablondan qolgan.
- Umumiy infratuzilma (Prisma, config, guard'lar, filter'lar) `apps/api/src/common/` yoki `apps/api/src/<infra>/` da turadi. `PrismaModule` `apps/api/src/prisma/` da joylashadi.

## Base qatlam (`apps/api/src/common/`)

- Standart CRUD uchun service `BaseService<TEntity, TCreate, TUpdate, TResponse, TId>` dan meros oladi: `entityName`, `sortableFields` va kerak bo'lsa `toResponse()` (maxfiy maydonlarni olib tashlash) beriladi. Ma'lumotga kirish `CrudRepository` orqali (Prisma delegate ustidan yoziladi).
- Controller `createCrudController({ name, createDto, updateDto, responseDto, idType })` dan meros oladi va `constructor(protected readonly service: XService) { super(); }` yozadi. CRUD'ning faqat bir qismi kerak bo'lsa, oddiy controller yoziladi.
- List endpoint query DTO'si `PaginationQueryDto` dan meros oladi, javob `PaginatedResponse<T>` (`@nestjs-template/types`).
- Fayl qabul qiluvchi modul `UploadModule` ni import qiladi va route'da `@ApiFileUpload()` / `@ApiFilesUpload()` ishlatadi.
- Job: queue nomi `jobs/queues.ts` dagi `QUEUES` ga, modulga `JobsModule.registerQueues(QUEUES.X)`, producer'da `@InjectQueue(QUEUES.X)`, worker `@JobProcessor(QUEUES.X)` + `extends BaseProcessor`.

## Qatlamlar

- **Controller yupqa bo'ladi.** U faqat route, param/body/query qabul qilish, status kod va service chaqiruvi bilan shug'ullanadi. Biznes logika, if/else qarorlari, DB so'rovlari controller'da yozilmaydi.
- **Service** biznes logikani o'z ichiga oladi. Prisma bilan faqat service ishlaydi (`PrismaService` constructor orqali inject qilinadi).
- Boshqa modul service'i kerak bo'lsa, o'sha modul uni `exports` ga qo'shadi, kerakli modul esa uni `imports` qiladi. Service'ni boshqa modulning `providers` ga qayta qo'shish mumkin emas.
- Dependency'lar faqat constructor injection orqali olinadi (`private readonly x: X`). `new SomeService()` ishlatilmaydi.
- Aylanma bog'liqlik (`forwardRef`) paydo bo'lsa, bu dizayn muammosi belgisi. Uni ishlatishdan oldin foydalanuvchi bilan maslahatlashing.

## DTO va type'lar

- **Kiruvchi ma'lumot** (body/query) uchun modulning `dto/` papkasida `class-validator` dekoratorli **class** DTO yoziladi. Interface DTO runtime'da tekshirilmaydi, shablondagi `todos` bunga yomon namuna.
- `Update*Dto` `@nestjs/swagger` dagi `PartialType(Create*Dto)` orqali yasaladi (swagger metadata'sini ham ko'chiradi).
- Build swagger CLI plugin'ini ishlatmaydi, shuning uchun DTO va javob class'larining har bir maydoniga `@ApiProperty()` / `@ApiPropertyOptional()` yoziladi.
- **Chiquvchi javob** shakllari (frontend ham ishlatadigan interface'lar) `packages/types/src/lib/` da saqlanadi va `@nestjs-template/types` dan `import type` bilan olinadi.
- `packages/types` da faqat sof TypeScript bo'ladi. U yerda NestJS, class-validator yoki `@prisma/client` importlari bo'lmaydi.
- Prisma model obyektini to'g'ridan-to'g'ri qaytarmang, ayniqsa `password`/`passwordHash` kabi maydonlar bo'lsa. Service umumiy type'ga map qilib qaytaradi.
- `class-validator` / `class-transformer` o'rnatilgan, global `ValidationPipe` `main.ts` da `common/pipes/validation.ts` dagi umumiy sozlamalar bilan ulangan.

## Xatolar va HTTP

- Topilmadi holatida `NotFoundException`, noto'g'ri so'rovda `BadRequestException`, takrorlanuvchi qiymatda `ConflictException`, ruxsat yo'qligida `ForbiddenException`/`UnauthorizedException` tashlanadi. Xabar inglizcha va aniq bo'ladi: `User #12 not found`.
- Service xato holatda `null` qaytarmaydi, exception tashlaydi.
- Prisma xatolarini (`P2002` unique, `P2025` not found, `P2003` FK) service'da tegishli Nest exception'ga aylantiring. `BaseService.mapError()` buni qiladi; o'z metodlaringizda ham undan foydalaning. Ular 500 bo'lib chiqib ketmasligi kerak.
- Barcha xato javoblari `AllExceptionsFilter` orqali `ApiErrorResponse` shaklida qaytadi.
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
