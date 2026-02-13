# Setup (หลัง git clone)

## Requirements

- Node.js (แนะนำ 20+)
- npm

## ติดตั้งและรันแบบเร็ว (ครั้งเดียวจบ)

```bash
bash scripts/setup-dev.sh
npm run dev
```

เปิดเว็บ:

- http://localhost:3000

## Prisma Studio

```bash
npx prisma studio --port 5555
```

เปิด:

- http://localhost:5555

## ตั้งค่า env (ถ้าต้องการ)

โปรเจกต์นี้ ignore `.env` อยู่แล้ว ให้สร้างจากตัวอย่าง:

```bash
cp .env.example .env
```

หมายเหตุ:

- `AUTH_SECRET` ใช้กับ NextAuth (ถ้าไม่ตั้ง จะใช้ค่า dev fallback)
- `ENCRYPTION_KEY` ใช้กับการเข้ารหัสชื่อผู้ใช้ (ถ้าไม่ตั้ง จะใช้ค่า dev fallback)

## Database / Migrate / Seed

- ใช้ SQLite ที่ `prisma/dev.db`

สั่ง migrate/seed เอง:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## Admin login (หลัง seed)

- admin: `admin@gmail.com` / `admin1234`

## Troubleshooting

- ถ้า migrate ติดเพราะ DB เก่าค้าง: ลอง backup แล้วสร้างใหม่

```bash
mv prisma/dev.db prisma/dev.db.bak
npx prisma migrate deploy
npx prisma db seed
```
