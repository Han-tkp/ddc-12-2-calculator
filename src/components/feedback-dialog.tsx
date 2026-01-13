'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquarePlus, Send, Loader2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

// Validation Schema
const feedbackSchema = z.object({
    type: z.enum(['GENERAL', 'FORMULA_REQUEST']),
    organization: z.string().min(2, { message: 'กรุณาระบุหน่วยงาน' }),
    reason: z.string().min(5, { message: 'กรุณาระบุเหตุผล/ความจำเป็น' }),
    message: z.string().optional(),
    contact: z.string().optional(),
    // Formula Request fields (optional unless type is request)
    formulaName: z.string().optional(),
    C: z.number().optional(),
    S: z.number().optional(),
    RA: z.number().optional(),
    A0: z.number().optional(),
}).refine((data) => {
    if (data.type === 'FORMULA_REQUEST') {
        return !!data.formulaName && data.formulaName.length > 0;
    }
    return true;
}, {
    message: "กรุณาระบุชื่อสูตรที่ต้องการ",
    path: ["formulaName"],
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackDialog() {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FeedbackFormValues>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            type: 'GENERAL',
            organization: '',
            reason: '',
            message: '',
            contact: '',
            formulaName: '',
            C: undefined,
            S: undefined,
            RA: undefined,
            A0: 1000,
        },
    });

    const feedbackType = form.watch('type');

    async function onSubmit(data: FeedbackFormValues) {
        setIsSubmitting(true);
        try {
            const payload = {
                type: data.type,
                organization: data.organization,
                reason: data.reason,
                message: data.message,
                contact: data.contact,
                formulaData: data.type === 'FORMULA_REQUEST' ? JSON.stringify({
                    name: data.formulaName,
                    C: data.C,
                    S: data.S,
                    RA: data.RA,
                    A0: data.A0
                }) : null
            };

            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Failed to submit');

            toast.success('ส่งข้อเสนอแนะเรียบร้อยแล้ว');
            setOpen(false);
            form.reset();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white/50 backdrop-blur-sm border-indigo-200 hover:bg-white hover:text-indigo-600 transition-all">
                    <MessageSquarePlus className="h-4 w-4" />
                    <span className="hidden sm:inline">แจ้งเพิ่มสูตร / แนะนำ</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-600">
                        <MessageSquarePlus className="h-5 w-5" />
                        ส่งข้อเสนอแนะ / ขอเพิ่มสูตร
                    </DialogTitle>
                    <DialogDescription>
                        ช่วยเราปรับปรุงระบบให้ดียิ่งขึ้น หรือแจ้งสูตรสารเคมีที่ต้องการใช้งาน
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>ประเภทเรื่องที่แจ้ง</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 [&:has(:checked)]:border-indigo-500 [&:has(:checked)]:bg-indigo-50">
                                                <FormControl>
                                                    <RadioGroupItem value="GENERAL" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer">
                                                    👋 แนะนำ/ติชมทั่วไป
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 [&:has(:checked)]:border-indigo-500 [&:has(:checked)]:bg-indigo-50">
                                                <FormControl>
                                                    <RadioGroupItem value="FORMULA_REQUEST" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer">
                                                    🧪 ขอเพิ่มสูตรใหม่
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="organization"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>หน่วยงาน <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="เช่น สคร.12, รพ.สต.บ้าน..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="contact"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>เบอร์โทร/ติดต่อ (ถ้ามี)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="เผื่อทีมงานสอบถามเพิ่มเติม" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>เหตุผล/ความจำเป็น <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="เช่น เป็นสารเคมีตัวใหม่ที่ได้รับจัดสรร, พื้นที่มีการระบาดต้องใช้สูตรนี้"
                                            className="resize-none h-20"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {feedbackType === 'FORMULA_REQUEST' && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-up">
                                <h4 className="font-medium flex items-center gap-2 text-sm text-slate-700">
                                    <FlaskConical className="h-4 w-4" />
                                    รายละเอียดสูตรที่ต้องการ
                                </h4>
                                <FormField
                                    control={form.control}
                                    name="formulaName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">ชื่อสูตร/สารเคมี</FormLabel>
                                            <FormControl>
                                                <Input placeholder="เช่น Aqua Resigen, Solfac" className="bg-white" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="C"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">สัดส่วนสารเคมี (C)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="1" className="bg-white" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="S"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">สัดส่วนตัวผสม (S)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="9" className="bg-white" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="RA"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">อัตราการพ่น (RA)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="100" className="bg-white" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="A0"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">พื้นที่มาตรฐาน (A0)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="1000" className="bg-white" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormDescription className="text-xs">
                                    หากไม่ทราบค่าที่แน่นอน สามารถระบุในช่อง "ข้อความเพิ่มเติม" ได้
                                </FormDescription>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ข้อความเพิ่มเติม</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="รายละเอียดอื่นๆ ที่อยากบอก (ถ้ามี)"
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        กำลังส่ง...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        ส่งข้อมูล
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
