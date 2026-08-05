import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { CalculatorForm } from '@/components/calculator/calculator-form';
import { Footer } from '@/components/footer';
import { Calculator, LogIn, LayoutDashboard, LogOut, User, Plus, Zap } from 'lucide-react';
import Image from 'next/image';

import { PublicFormulaManager } from '@/components/calculator/public-formula-manager';
import { AutoScrollToCalculator } from '@/components/auto-scroll-to-calculator';

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-white dark:from-slate-950 dark:to-slate-900 relative flex flex-col">
      <div className="absolute inset-0 bg-grid-slate-200/50 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/50 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="relative w-9 h-9 md:w-12 md:h-12 hover:scale-105 transition-transform duration-300 shrink-0">
              <Image
                src="/logo-vbdc.png"
                alt="DDC Logo"
                fill
                sizes="48px"
                className="object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base md:text-xl text-slate-800 tracking-tight leading-tight">
                VBDC 12.2
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">
                ศูนย์ควบคุมโรคติดต่อนำโดยแมลงที่ 12.2 สงขลา
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* User Portal Link */}
            <Link href="/user">
              <Button
                variant="outline"
                className="bg-emerald-50/80 border-emerald-200/80 hover:bg-emerald-100 text-emerald-800 font-semibold gap-1.5 h-10 text-xs sm:text-sm rounded-full px-3 sm:px-4 shadow-xs transition-all hover:scale-105 shrink-0"
                title="ศูนย์ผู้ใช้งาน"
              >
                <LayoutDashboard className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">ศูนย์ผู้ใช้งาน</span>
              </Button>
            </Link>

            {/* Public Chemical Add Popup Modal */}
            <PublicFormulaManager />

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {session?.user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-line">
                    <User className="h-4 w-4 text-brand" />
                    <span className="text-sm font-medium text-slate-700">
                      {session.user.name}
                    </span>
                  </div>

                  {session.user.role === 'ADMIN' && (
                    <Link href="/admin/dashboard">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-brand hover:text-brand-dark hover:bg-brand-soft px-2 sm:px-3 shrink-0" title="ระบบหลังบ้าน">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="hidden sm:inline">ระบบหลังบ้าน</span>
                      </Button>
                    </Link>
                  )}

                  <form action={async () => {
                    'use server';
                    await signOut();
                  }}>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" title="ออกจากระบบ">
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </form>
                </>
              ) : (
                <Link href="/login">
                  <Button variant="default" className="bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/20 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                    <LogIn className="mr-2 h-4 w-4" />
                    เข้าสู่ระบบ
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 w-full">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-3xl mx-auto text-center mb-10 space-y-4 animate-fade-up">
            <div className="inline-block p-1 rounded-full bg-white border border-brand mb-2">
              <span className="px-3 py-1 text-xs font-semibold text-brand tracking-wide uppercase">
                Official Calculator
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              ระบบคำนวณสารเคมี
              <span className="block mt-2 pb-2 text-brand leading-normal">
                เพื่อการควบคุมโรค
              </span>
            </h2>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              ช่วยคำนวณปริมาณสารเคมีและตัวผสมตามมาตรฐานกรมควบคุมโรค
              แม่นยำ รวดเร็ว และตรวจสอบได้ง่าย สำหรับเจ้าหน้าที่ผู้ปฏิบัติงาน
            </p>
          </div>

          {/* Calculator Card */}
          <div id="calculator-card" className="max-w-4xl mx-auto relative z-10 perspective-1000 scroll-mt-20">
            <CalculatorForm />
          </div>
          <AutoScrollToCalculator />
        </div>
      </div>

      {/* Footer */}
      <Footer />

      <Toaster position="top-center" richColors theme="light" />
    </main>
  );
}
