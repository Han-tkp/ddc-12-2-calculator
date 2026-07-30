import {
    LayoutDashboard,
    Bot,
    Settings,
    FileText,
    Inbox
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
        href: '/admin/inbox',
        label: 'กล่องข้อความ',
        icon: Inbox
    }
];
