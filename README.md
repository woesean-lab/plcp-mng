# Pulcip Message Copy

Ortak mesaj şablonlarını kategorilere göre yönetmek ve tek tıkla panoya kopyalamak için yapılmış küçük bir uygulama.

- Frontend: Vite + React + Tailwind
- Backend: Express (Node)
- DB: PostgreSQL (Prisma)

## Local geliştirme

1) Bağımlılıklar:

`npm install`

2) `.env` oluştur:

`.env.example` içindeki `DATABASE_URL` değerini kendi Postgres bağlantına göre doldur.

3) DB şemasını uygula (migrations yerine hızlı kurulum):

`npm run db:push`

4) Backend’i başlat:

`npm run dev:api`

5) Frontend’i başlat:

`npm run dev`

Frontend, API’yi aynı origin üzerinden `/api/*` ile çağırır. Prod ortamda Node server hem API’yi hem de `dist/` dosyalarını servis eder.

## Easypanel deploy (tek servis)

Öneri: Tek **Node app service** ile deploy edin (static servis yerine). Akış:

- **Build command**: `npm run build`
- **Start command**: `npm run start`
- **Env vars**:
  - `DATABASE_URL`: Easypanel Postgres servisinin connection string’i
  - `PORT`: Easypanel’in verdiği port (genelde otomatik set edilir; set etmene gerek olmayabilir)

İlk deploy’da DB tabloları yoksa container içinde bir kez:

`npm run db:push`

Not: Server ilk açılışta `Genel` kategorisini ve birkaç örnek şablonu otomatik oluşturur (DB boşsa).
