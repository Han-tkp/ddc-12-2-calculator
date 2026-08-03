import {
    LayoutDashboard,
    Bot,
    Settings,
    FileText,
    ClipboardList,
    Inbox,
    Cpu,
    Users,
    CreditCard,
    QrCode,
} from 'lucide-react';

export const adminNavItems = [
    {
        href: '/admin/dashboard',
        label: 'ภาพรวม',
        icon: LayoutDashboard
    },
    {
        // Was "ระบบ AI / MCP" (misleading — this isn't MCP server config, that's /admin/ai).
        // Absorbed the former /admin/playground (deleted): this page embeds the same
        // FreeFormulaCalculator plus an AI chat, so it's the one place to build/test a formula.
        href: '/admin/mcp',
        label: 'ผู้ช่วยสร้างสูตร (AI)',
        icon: Bot
    },
    {
        href: '/admin/ai',
        label: 'ตั้งค่า AI Provider',
        icon: Cpu
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
        href: '/admin/billing',
        label: 'การเรียกเก็บเงิน',
        icon: CreditCard
    },
    {
        href: '/admin/qr-code',
        label: 'สร้าง QR Code',
        icon: QrCode
    }
];
