import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ProfilesTable } from '@/components/admin/profiles-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Settings, FlaskConical, Sparkles, Shield } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

async function getProfiles() {
    // Join with users table for createdBy (mapped as 'users')
    // We assume the relationship is detectable by Supabase Client or defined in Postgres
    // "createdBy:users!createdById(name, email)" is explicit syntax if needed
    // But let's try standard first or explicit if we know the FK name.
    // In schema: createdBy User @relation(fields: [createdById], references: [id])

    const { data: profiles, error } = await supabase
        .from('label_profiles')
        .select('*, createdBy:users(name, email)')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
    return profiles;
}

export default async function AdminProfilesPage() {
    const session = await auth();

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const profiles = await getProfiles();

    return (
        <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-400/30 rounded-full blur-3xl animate-float" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float stagger-2" />
                <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-fuchsia-400/20 rounded-full blur-3xl animate-float stagger-4" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass-card border-b-0 border-x-0 rounded-none">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <Button variant="ghost" size="sm" className="rounded-xl hover-lift">
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    กลับ
                                </Button>
                            </Link>
                            <Link href="/admin/logs">
                                <Button variant="ghost" size="sm" className="rounded-xl hover-lift">
                                    <Shield className="h-4 w-4 mr-1" />
                                    ดูประวัติ
                                </Button>
                            </Link>
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-0.5 animate-pulse-glow">
                                <div className="w-full h-full rounded-2xl bg-white/90 dark:bg-slate-900/90 flex items-center justify-center">
                                    <Settings className="h-5 w-5 text-purple-600" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold gradient-text">
                                    จัดการสูตรสารเคมี
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Admin Panel
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                                {session.user.name?.[0] || 'A'}
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {session.user.name || 'Admin'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
                {/* Title Card */}
                <div className="glass-card rounded-3xl overflow-hidden mb-6 animate-fade-up">
                    <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-6">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                                <FlaskConical className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    รายการสูตรสารเคมี
                                    <Sparkles className="h-5 w-5" />
                                </h2>
                                <p className="text-white/80">
                                    จัดการสูตรที่ผู้ใช้เลือกได้ในหน้าคำนวณ
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <ProfilesTable profiles={profiles} />
                    </div>
                </div>
            </main>

            <Toaster position="top-center" richColors />
        </div>
    );
}
