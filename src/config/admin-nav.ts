import {
    LayoutDashboard,
    Users,
    Settings,
    FileText,
    Microscope,
    MessageSquare
} from 'lucide-react';

export const adminNavItems = [
    {
        href: '/admin/dashboard',
        label: 'ภาพรวม',
        icon: LayoutDashboard
    },
    {
        href: '/admin/users',
        label: 'จัดการผู้ใช้',
        icon: Users
    },
    {
        href: '/admin/profiles',
        label: 'จัดการสูตร',
        icon: Settings
    },
    {
        href: '/admin/feedback',
        label: 'กล่องข้อความ',
        icon: MessageSquare
    },
    {
        href: '/admin/droplet-analysis',
        label: 'ผลวิเคราะห์ AI',
        icon: Microscope
    },
    {
        href: '/admin/logs',
        label: 'ประวัติคำนวณ',
        icon: FileText
    }
];
