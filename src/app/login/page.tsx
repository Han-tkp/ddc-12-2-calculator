'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Sparkles, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginInput) => {
        setIsLoading(true);
        try {
            const result = await signIn('credentials', {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            } else {
                toast.success('เข้าสู่ระบบสำเร็จ!');
                // Only ADMINs can sign in at all (src/lib/auth.ts), so anyone who
                // reaches here belongs in the back office, not the public landing page.
                router.push('/admin/dashboard');
                router.refresh();
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4 font-sans">
            {/* Minimal Background pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03]" 
                 style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="w-full max-w-[400px] relative z-10">
                {/* Logo & Header */}
                <div className="text-center mb-10 animate-fade-up">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand mb-6 shadow-xl shadow-brand/20">
                        <span className="text-3xl">🧪</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        ระบบคำนวณสารเคมี
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">
                        ศูนย์ควบคุมโรคติดต่อนำโดยแมลงที่ 12.2
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-fade-up stagger-1">
                    <div className="p-8 pt-10">
                        <div className="mb-8 text-center">
                            <h2 className="text-xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
                            <p className="text-slate-400 text-sm mt-1">กรุณากรอกข้อมูลเพื่อเริ่มต้นใช้งาน</p>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-2 animate-fade-up stagger-2">
                                <Label htmlFor="email" className="text-slate-700 text-xs font-bold uppercase tracking-wider ml-1">
                                    อีเมลเจ้าหน้าที่
                                </Label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="user@example.com"
                                        className="h-12 pl-12 rounded-xl border-slate-200 focus:border-brand focus:ring-brand/10 bg-slate-50/50 transition-all font-medium"
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1 font-medium">
                                        <Sparkles className="h-3 w-3" /> {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 animate-fade-up stagger-3">
                                <Label htmlFor="password" className="text-slate-700 text-xs font-bold uppercase tracking-wider ml-1">
                                    รหัสผ่าน
                                </Label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="h-12 pl-12 rounded-xl border-slate-200 focus:border-brand focus:ring-brand/10 bg-slate-50/50 transition-all font-medium"
                                        {...register('password')}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1 font-medium">
                                        <Sparkles className="h-3 w-3" /> {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-bold rounded-xl bg-brand hover:bg-slate-900 text-white shadow-lg shadow-brand-soft transition-all duration-300 animate-fade-up stagger-4"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        กำลังตรวจสอบ...
                                    </>
                                ) : (
                                    <>
                                        เข้าสู่ระบบ
                                        <LogIn className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4 animate-fade-up stagger-5">
                            <p className="text-xs text-slate-400 font-medium">
                                ติดต่อแจ้งปัญหาการใช้งานที่ผู้ดูแลระบบ
                            </p>
                            <Link href="/" className="w-full">
                                <Button variant="ghost" className="w-full h-11 rounded-xl text-slate-500 hover:text-brand hover:bg-brand-soft/50 font-medium text-sm">
                                    กลับสู่หน้าหลัก
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Simple Footer */}
                <div className="mt-10 text-center animate-fade-up stagger-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Department of Disease Control • District 12.2
                    </p>
                </div>
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
