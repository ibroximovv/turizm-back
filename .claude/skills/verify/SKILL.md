---
name: verify
description: Loyihani to'liq tekshiradi (typecheck, lint, unit test, build) va natijani jadvalda beradi. Nx ishlamasa to'g'ridan-to'g'ri buyruqlarga o'tadi. Kattaroq o'zgarishdan keyin, commit yoki PR'dan oldin yoki foydalanuvchi "tekshir", "ishlaydimi" deb so'raganda ishlating.
argument-hint: "[e2e]"
---

# Loyihani tekshirish

Bosqichlar ketma-ket ishga tushiriladi. Bitta bosqich xato bersa ham keyingisiga o'tiladi, chunki maqsad to'liq manzarani ko'rish. Buyruqlar ishchi papka sifatida repo ildizidan ishga tushiriladi.

## 1. Nx ishlayaptimi?

```
npx nx show projects
```

- Agar `["types","api-e2e","api"]` qaytsa, Nx yo'li ishlatiladi.
- Agar `WorkspaceContext is not a constructor` yoki `ERR_DLOPEN_FAILED` chiqsa, zaxira yo'lga o'tiladi va hisobotda bu alohida aytiladi (Windows Smart App Control). Tizim sozlamasini o'zgartirishga urinmang.

## 2. Bosqichlar

| # | Bosqich | Nx yo'li | Zaxira yo'l |
|---|---------|----------|-------------|
| 1 | Typecheck | *(Nx target yo'q, doim zaxira)* | `npx tsc -p apps/api/tsconfig.app.json --noEmit`, `npx tsc -p apps/api/tsconfig.spec.json --noEmit`, `npx tsc -p packages/types/tsconfig.lib.json --noEmit` |
| 2 | Lint | `npx nx run-many -t lint` | `npx eslint apps/api/src packages/types/src apps/api-e2e/src` |
| 3 | Unit test | `npx nx run-many -t test` | `npx jest -c apps/api/jest.config.cts --forceExit` |
| 4 | Build | `npx nx run api:build` | `cd apps/api && npx tsdown` |
| 5 | e2e *(faqat `$ARGUMENTS` da `e2e` bo'lsa)* | `npx nx run api-e2e:e2e` | quyiga qarang |

- Nx natijasi keshdan kelgan bo'lsa ("existing outputs match the cache") va o'zgarishlar yangi bo'lsa, natija ishonchli. Shubha tug'ilsa, `--skip-nx-cache` bilan qayta ishga tushiring.
- **e2e zaxira yo'li:** avval build qilinadi, keyin `node dist/apps/api/main.cjs` fonda ishga tushiriladi (`run_in_background`). Port 3000 javob berishini kutib, `npx jest -c apps/api-e2e/jest.config.cts` ishga tushiriladi. Oxirida server jarayoni **albatta to'xtatiladi**.
- Lint'dagi `No cached ProjectGraph... enforce-module-boundaries` ogohlantirishi module boundary tekshiruvi o'tkazib yuborilganini bildiradi. Buni hisobotda qayd eting.

## 3. Xato bo'lsa

- Xatoning birinchi tegishli qismini (fayl:qator va xabar) hisobotga ko'chiring. Butun logni ko'chirmang.
- Xato siz shu sessiyada qilgan o'zgarishdan bo'lsa, uni tuzatib, tegishli bosqichni qayta ishga tushiring.
- Xato oldindan mavjud bo'lsa yoki muhit bilan bog'liq bo'lsa, o'zingiz tuzatmang. Foydalanuvchiga xabar bering.

## 4. Hisobot (o'zbekcha)

```
| Bosqich   | Yo'l     | Natija |
|-----------|----------|--------|
| Typecheck | tsc      | ✅ / ❌ (qisqa sabab) |
| Lint      | nx/eslint| ✅ / ⚠️ / ❌ |
| Unit test | nx/jest  | ✅ N/N  |
| Build     | nx/tsdown| ✅      |
```

Jadvaldan keyin bir-ikki gapda umumiy xulosa yoziladi: o'tdimi yoki yo'qmi, nima tekshirilmagani va nega.
