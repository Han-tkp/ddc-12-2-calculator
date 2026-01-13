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
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-mesh relative overflow-hidden flex items-center justify-center p-4">
            {/* Animated background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-400/30 rounded-full blur-3xl animate-float" />
                <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float stagger-2" />
                <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-float stagger-4" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-up">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mb-4 animate-pulse-glow p-0.5">
                        <div className="w-full h-full rounded-3xl bg-white/90 flex items-center justify-center">
                            <span className="text-4xl">🧪</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold gradient-text mb-2">
                        เข้าสู่ระบบ
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        ระบบคำนวณสารเคมีพ่นยุง
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card rounded-3xl overflow-hidden hover-lift animate-fade-up stagger-1">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                                <LogIn className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">ยินดีต้อนรับกลับ</h2>
                                <p className="text-white/80 text-sm">กรอกข้อมูลเพื่อเข้าสู่ระบบ</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="space-y-2 animate-fade-up stagger-2">
                                <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                                    <Mail className="h-4 w-4 text-indigo-500" />
                                    อีเมล
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    className="h-14 text-lg rounded-2xl border-2 focus:border-indigo-500 transition-all bg-white/50"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <span>⚠️</span> {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 animate-fade-up stagger-3">
                                <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                                    <KeyRound className="h-4 w-4 text-purple-500" />
                                    รหัสผ่าน
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-14 text-lg rounded-2xl border-2 focus:border-purple-500 transition-all bg-white/50"
                                    {...register('password')}
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <span>⚠️</span> {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 hover-lift animate-fade-up stagger-4"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        กำลังเข้าสู่ระบบ...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-6 w-6" />
                                        เข้าสู่ระบบ
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center animate-fade-up stagger-5">
                            <p className="text-sm text-slate-500">
                                ติดต่อผู้ดูแลระบบเพื่อขอรับบัญชีผู้ใช้งาน
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200/50 animate-fade-up stagger-6">
                            <Link href="/">
                                <Button variant="ghost" className="w-full rounded-xl hover:bg-slate-100">
                                    ← กลับไปหน้าคำนวณ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 mt-6 animate-fade-up stagger-6">
                    Made with 💜 for public health
                </p>
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
