'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerSchema, type RegisterInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Sparkles, Mail, KeyRound, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: RegisterInput) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || 'เกิดข้อผิดพลาด');
                return;
            }

            toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            router.push('/login');
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
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-400/30 rounded-full blur-3xl animate-float" />
                <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-float stagger-2" />
                <div className="absolute -bottom-40 left-1/3 w-80 h-80 bg-green-400/20 rounded-full blur-3xl animate-float stagger-4" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-6 animate-fade-up">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-green-500 mb-4 animate-pulse-glow p-0.5">
                        <div className="w-full h-full rounded-3xl bg-white/90 flex items-center justify-center">
                            <span className="text-4xl">✨</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold gradient-text-blue mb-2">
                        สมัครสมาชิก
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        สร้างบัญชีเพื่อบันทึกสูตรของคุณ
                    </p>
                </div>

                {/* Register Card */}
                <div className="glass-card rounded-3xl overflow-hidden hover-lift animate-fade-up stagger-1">
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 p-5">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-float">
                                <UserPlus className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">สร้างบัญชีใหม่</h2>
                                <p className="text-white/80 text-sm">กรอกข้อมูลด้านล่าง</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2 animate-fade-up stagger-1">
                                <Label htmlFor="name" className="flex items-center gap-2 font-medium">
                                    <User className="h-4 w-4 text-emerald-500" />
                                    ชื่อ-นามสกุล
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="สมชาย ใจดี"
                                    className="h-12 text-base rounded-2xl border-2 focus:border-emerald-500 transition-all bg-white/50"
                                    {...register('name')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <span>⚠️</span> {errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 animate-fade-up stagger-2">
                                <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                                    <Mail className="h-4 w-4 text-teal-500" />
                                    อีเมล
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    className="h-12 text-base rounded-2xl border-2 focus:border-teal-500 transition-all bg-white/50"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500 flex items-center gap-1">
                                        <span>⚠️</span> {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2 animate-fade-up stagger-3">
                                    <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                                        <KeyRound className="h-4 w-4 text-green-500" />
                                        รหัสผ่าน
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="อย่างน้อย 6 ตัว"
                                        className="h-12 text-base rounded-2xl border-2 focus:border-green-500 transition-all bg-white/50"
                                        {...register('password')}
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-red-500">{errors.password.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2 animate-fade-up stagger-4">
                                    <Label htmlFor="confirmPassword" className="flex items-center gap-2 font-medium">
                                        <KeyRound className="h-4 w-4 text-green-500" />
                                        ยืนยันรหัสผ่าน
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="กรอกอีกครั้ง"
                                        className="h-12 text-base rounded-2xl border-2 focus:border-green-500 transition-all bg-white/50"
                                        {...register('confirmPassword')}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-600 hover:via-teal-600 hover:to-green-600 shadow-lg shadow-emerald-500/30 hover-lift animate-fade-up stagger-5"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        กำลังสมัคร...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-6 w-6" />
                                        สมัครสมาชิก
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center animate-fade-up stagger-5">
                            <p className="text-sm text-slate-500">
                                มีบัญชีอยู่แล้ว?{' '}
                                <Link href="/login" className="font-bold text-emerald-600 hover:underline">
                                    เข้าสู่ระบบ
                                </Link>
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
                    Made with 💚 for public health
                </p>
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
