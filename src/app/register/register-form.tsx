'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerSchema, type RegisterInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Mail, KeyRound, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';

export function RegisterForm() {
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

            const result = await response.json().catch(() => ({}));

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
        <div className="min-h-screen bg-brand-cloud flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-soft border border-brand/20 mb-4">
                        <UserPlus className="h-7 w-7 text-brand" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-brand-dark mb-2">
                        สมัครสมาชิก
                    </h1>
                    <p className="text-brand-muted">
                        สร้างบัญชีเพื่อบันทึกสูตรของคุณ
                    </p>
                </div>

                {/* Register Card */}
                <div className="rounded-2xl overflow-hidden border border-brand-line bg-white shadow-sm">
                    {/* Header */}
                    <div className="bg-brand p-5">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
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
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2 font-medium">
                                    <User className="h-4 w-4 text-brand" />
                                    ชื่อ-นามสกุล
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="สมชาย ใจดี"
                                    className="h-12 text-base rounded-2xl border-2 focus:border-brand transition-all bg-white"
                                    {...register('name')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-[#b42318] flex items-center gap-1">
                                        {errors.name.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                                    <Mail className="h-4 w-4 text-brand" />
                                    อีเมล
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    className="h-12 text-base rounded-2xl border-2 focus:border-brand transition-all bg-white"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-[#b42318] flex items-center gap-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="flex items-center gap-2 font-medium">
                                        <KeyRound className="h-4 w-4 text-brand" />
                                        รหัสผ่าน
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="อย่างน้อย 6 ตัว"
                                        className="h-12 text-base rounded-2xl border-2 focus:border-brand transition-all bg-white"
                                        {...register('password')}
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-[#b42318]">{errors.password.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="flex items-center gap-2 font-medium">
                                        <KeyRound className="h-4 w-4 text-brand" />
                                        ยืนยันรหัสผ่าน
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="กรอกอีกครั้ง"
                                        className="h-12 text-base rounded-2xl border-2 focus:border-brand transition-all bg-white"
                                        {...register('confirmPassword')}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-[#b42318]">{errors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg font-bold rounded-2xl bg-brand hover:bg-brand-dark text-white"
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

                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-500">
                                มีบัญชีอยู่แล้ว?{' '}
                                <Link href="/login" className="font-bold text-brand-dark hover:underline">
                                    เข้าสู่ระบบ
                                </Link>
                            </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-brand-line">
                            <Link href="/">
                                <Button variant="ghost" className="w-full rounded-xl hover:bg-slate-100">
                                    ← กลับไปหน้าคำนวณ
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-brand-muted mt-6">
                    Made with 💚 for public health
                </p>
            </div>

            <Toaster position="top-center" richColors />
        </div>
    );
}
