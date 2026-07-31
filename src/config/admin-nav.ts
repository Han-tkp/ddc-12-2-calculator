import {
    LayoutDashboard,
    Bot,
    Settings,
    FileText,
    ClipboardList,
    Inbox,
    FlaskConical,
    Key,
    Cpu,
} from 'lucide-react';

export const adminNavItems = [
    {
        href: '/admin/dashboard',
        label: 'ภาพรวม',
        icon: LayoutDashboard
    },
    {
        href: '/admin/mcp',
        label: 'ระบบ AI / MCP',
        icon: Bot
    },
    {
        href: '/admin/ai',
        label: 'ตั้งค่า AI Provider',
        icon: Cpu
    },
    {
        href: '/admin/playground',
        label: 'Playground ทดสอบสูตร',
        icon: FlaskConical
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
        href: '/admin/credentials',
        label: 'จัดการคีย์เชื่อมต่อ',
        icon: Key
    }
];
