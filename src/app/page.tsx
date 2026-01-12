import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { CalculatorForm } from '@/components/calculator/calculator-form';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogIn, UserCircle, Settings, LogOut, Sparkles, Beaker, FlaskConical } from 'lucide-react';

async function getProfiles() {
  try {
    const profiles = await db.labelProfile.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        C: true,
        S: true,
        RA: true,
        RA_unit: true,
        A0: true,
      },
    });
    return profiles;
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
    return [];
  }
}

export default async function CalculatorPage() {
  const profiles = await getProfiles();
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-mesh relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/30 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-float stagger-2" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-float stagger-4" />
      </div>

      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-50 glass-card border-b-0 border-x-0 rounded-none">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 animate-pulse-glow">
                <div className="w-full h-full rounded-2xl bg-white/90 dark:bg-slate-900/90 flex items-center justify-center group-hover:bg-transparent transition-all">
                  <span className="text-2xl group-hover:animate-wiggle">🧪</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text-blue">
                  คำนวณสารเคมีพ่นยุง
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Chemical Spray Calculator
                </p>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {session?.user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/50">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {session.user.name?.[0] || session.user.email?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                  </div>
                  {session.user.role === 'ADMIN' && (
                    <div className="flex items-center gap-1">
                      <Link href="/admin/profiles">
                        <Button variant="outline" size="sm" className="hover-lift glass">
                          <Settings className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">สูตร</span>
                        </Button>
                      </Link>
                      <Link href="/admin/logs">
                        <Button variant="outline" size="sm" className="hover-lift glass text-indigo-600 border-indigo-200">
                          <span className="mr-1">📋</span>
                          <span className="hidden sm:inline">ประวัติ</span>
                        </Button>
                      </Link>
                    </div>
                  )}
                  <form action={async () => {
                    'use server';
                    const { signOut } = await import('@/lib/auth');
                    await signOut();
                  }}>
                    <Button variant="ghost" size="sm" type="submit" className="hover:bg-red-50 hover:text-red-600">
                      <LogOut className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">ออก</span>
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="hover-lift">
                      <LogIn className="h-4 w-4 mr-1" />
                      เข้าสู่ระบบ
                    </Button>
                  </Link>
                  <Link href="/register" className="hidden sm:inline">
                    <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 hover-lift">
                      <UserCircle className="h-4 w-4 mr-1" />
                      สมัครสมาชิก
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6 animate-fade-up">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">คำนวณง่าย ใช้งานสะดวก</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 animate-fade-up stagger-1">
            <span className="gradient-text">คำนวณสารเคมี</span>
            <br />
            <span className="text-slate-800 dark:text-white">พ่นกำจัดยุง</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto animate-fade-up stagger-2">
            กรอกข้อมูลจากฉลากยา ระบบจะคำนวณปริมาณที่ต้องใช้ให้อัตโนมัติ
          </p>

          {/* Floating icons */}
          <div className="flex justify-center gap-8 mt-8 animate-fade-up stagger-3">
            <div className="flex flex-col items-center gap-2 animate-float">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FlaskConical className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">ยาฆ่ายุง</span>
            </div>
            <div className="flex flex-col items-center gap-2 animate-float stagger-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Beaker className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">น้ำมัน</span>
            </div>
            <div className="flex flex-col items-center gap-2 animate-float stagger-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-500">ผลลัพธ์</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-12 max-w-4xl relative z-10">
        {/* Calculator Form */}
        <CalculatorForm />
      </main>

      {/* Footer */}
      <footer className="glass-card border-t-0 border-x-0 rounded-none py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} ระบบคำนวณสารเคมีพ่นยุง
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Made with 💜 for public health
          </p>
        </div>
      </footer>

      <Toaster position="top-center" richColors />
    </div>
  );
}
