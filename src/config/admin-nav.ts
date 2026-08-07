import {
    LayoutDashboard,
    Settings,
    FileText,
    ClipboardList,
    Inbox,
    Users,
    QrCode,
} from 'lucide-react';

// ซ่อนชั่วคราวจากเมนู (ไม่ได้ลบ route หรือ feature — เข้าตรงผ่าน URL ได้ตามปกติ):
// - /admin/mcp   "ผู้ช่วยสร้างสูตร (AI)"
// - /admin/ai    "ตั้งค่า AI Provider"
// - /admin/billing "การเรียกเก็บเงิน"
// อยากเปิดกลับมาเมื่อไหร่ก็เพิ่ม entry กลับเข้า array นี้ (ดู git history ของไฟล์นี้สำหรับโครงเดิม)
export const adminNavItems = [
    {
        href: '/admin/dashboard',
        label: 'ภาพรวม',
        icon: LayoutDashboard
    },
    {
        href: '/admin/profiles',
        label: 'จัดการสูตร',
        icon: Settings
    },
    {
        href: '/admin/logs',
        label: 'ประวัติคำนวณ',
        icon: FileText
    },
    {
        href: '/admin/audit',
        label: 'ประวัติจัดการสูตร',
        icon: ClipboardList
    },
    {
        href: '/admin/inbox',
        label: 'กล่องข้อความ',
        icon: Inbox
    },
    {
        href: '/admin/users',
        label: 'จัดการผู้ใช้งาน',
        icon: Users
    },
    {
        href: '/admin/qr-code',
        label: 'สร้าง QR Code',
        icon: QrCode
    }
];
