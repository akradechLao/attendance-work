# HR Attendance System

ระบบบันทึกเวลาเข้า-ออกงานสำหรับ HR

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 16
- Prisma + PostgreSQL (Supabase)
- Deployed on Netlify

## Environment Variables

ตั้งค่าใน `.env`:

```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
```

## Deployment

```bash
npm run build
```

 deploy ผ่าน Netlify
