# Setup Guide

## Requirements

- Node.js (แนะนำ 20+)
- npm

## การติดตั้งครั้งแรก

โปรเจกต์นี้ใช้ **Supabase** เป็นฐานข้อมูลหลัก ดังนั้นคุณต้องตั้งค่า Environment Variables ก่อนเริ่มใช้งาน

1. คัดลอกไฟล์ตัวอย่าง:
```bash
cp .env.example .env
```

2. แก้ไขไฟล์ `.env` โดยใส่ค่าที่ได้จากโปรเจกต์ Supabase ของคุณ:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

API_SECRET_KEY=your-secret-token-for-desktop-app
```

3. ติดตั้ง Dependencies และรันแบบเร็ว:
```bash
bash scripts/setup-dev.sh
npm run dev
```

เปิดเว็บ:
- http://localhost:3000

## การรันด้วย Docker (ทางเลือกแนะนำ)

หากเครื่องคอมพิวเตอร์ของคุณไม่มี Node.js หรือต้องการรันระบบผ่าน Container เพื่อความสะดวกในการตั้งค่าแวดล้อม สามารถใช้งาน Docker และ Docker Compose ได้ดังนี้:

1. คัดลอกและตั้งค่าไฟล์ `.env` ก่อนการทำงาน (ตามขั้นตอนที่ 1 และ 2 ด้านบน)
2. สั่งรันชุดคำสั่งเพื่อ Build และเริ่มระบบ:
   ```bash
   docker compose up --build -d
   ```
3. ตรวจสอบการทำงานของระบบผ่าน Logs:
   ```bash
   docker compose logs -f
   ```
4. เปิดใช้งานผ่านเว็บเบราว์เซอร์:
   - http://localhost:3000

หากต้องการปิดหรือหยุดการรันระบบ ให้ใช้คำสั่ง:
```bash
docker compose down
```

## Database / Supabase

โปรเจกต์นี้ไม่ได้ใช้ Prisma แล้ว ตารางทั้งหมดถูกจัดการผ่านบน Supabase โดยตรง
หากต้องการแก้ไข Schema หรือดูข้อมูล ให้เข้าไปที่ [Supabase Dashboard](https://supabase.com/dashboard) ของโปรเจกต์คุณ

## การเชื่อมต่อกับ Desktop App

ให้ตั้งค่าตัวแปร `API_SECRET_KEY` ในไฟล์ `.env` เป็นรหัสผ่านอะไรก็ได้ 
จากนั้นนำค่าเดียวกันนี้ไปกรอกในช่อง **API Key** ของโปรเจกต์ฝั่ง Desktop (C# Avalonia) เพื่อให้สิทธิ์ในการยิงผลวิเคราะห์เข้ามาที่ฐานข้อมูลของเว็บแอพนี้
