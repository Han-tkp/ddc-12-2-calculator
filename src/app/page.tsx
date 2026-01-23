import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { CalculatorForm } from '@/components/calculator/calculator-form';
import { FeedbackDialog } from '@/components/feedback-dialog';
import { Footer } from '@/components/footer';
import { Calculator, LogIn, LayoutDashboard, LogOut, User } from 'lucide-react';
import Image from 'next/image';

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 relative flex flex-col">
      <div className="absolute inset-0 bg-grid-slate-200/50 mask-[linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800/50 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative w-10 h-10 md:w-12 md:h-12 hover:scale-105 transition-transform duration-300">
              <Image
                src="/logo.png"
                alt="DDC Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl text-slate-800 tracking-tight leading-tight">
                VDC 12.2
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:block">
                ศูนย์ควบคุมโรคติดต่อนำโดยแมลงที่ 12.2 สงขลา
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              <FeedbackDialog />
              {session?.user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-linear-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/50">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {session.user.name}
                    </span>
                  </div>

                  {session.user.role === 'ADMIN' && (
                    <Link href="/admin/dashboard">
                      <Button variant="ghost" size="sm" className="gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
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
                  <Button variant="default" className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
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
            <div className="inline-block p-1 rounded-full bg-indigo-50 border border-indigo-100 mb-2">
              <span className="px-3 py-1 text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                Official Calculator
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              ระบบคำนวณสารเคมี
              <span className="block mt-2 pb-2 text-transparent bg-clip-text bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 leading-normal">
                เพื่อการควบคุมโรค
              </span>
            </h2>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              ช่วยคำนวณปริมาณสารเคมีและตัวผสมตามมาตรฐานกรมควบคุมโรค
              แม่นยำ รวดเร็ว และตรวจสอบได้ง่าย สำหรับเจ้าหน้าที่ผู้ปฏิบัติงาน
            </p>
          </div>

          {/* Calculator Card */}
          <div className="max-w-4xl mx-auto relative z-10 perspective-1000">
            <CalculatorForm />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />

      <Toaster position="top-center" richColors theme="light" />
    </main>
  );
}
