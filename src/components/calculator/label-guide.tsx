'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Info, BookOpen, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LabelGuide() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    วิธีอ่านฉลาก
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="h-5 w-5 text-violet-500" />
                        คู่มือการอ่านฉลากสารเคมี
                    </DialogTitle>
                    <DialogDescription>
                        ทำความเข้าใจวิธีการผสมจากฉลากข้างขวด (อ้างอิง: เดลตาไซด์ / ซับมาริน)
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="step1" className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="step1">ขั้นตอนที่ 1: อ่านฉลาก</TabsTrigger>
                        <TabsTrigger value="step2">ขั้นตอนที่ 2: แปลความหมาย</TabsTrigger>
                    </TabsList>

                    <TabsContent value="step1" className="space-y-4">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                ตัวอย่างข้อความบนฉลาก
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                                    <span className="text-xs font-bold text-emerald-600 mb-1 block">ตัวอย่างที่ 1 (เดลตาไซด์ - หมอกควัน)</span>
                                    <p className="text-slate-700 italic">
                                        "ใช้ เดลตาไซด์ <strong className="text-emerald-600 bg-emerald-50 px-1 rounded">1 ลิตร</strong> ผสมกับน้ำมันโซล่า <strong className="text-emerald-600 bg-emerald-50 px-1 rounded">79 ลิตร</strong> แล้วนำไปฉีดพ่นในอัตรา <strong className="text-blue-600 bg-blue-50 px-1 rounded">1 ลิตร</strong> ต่อพื้นที่ <strong className="text-blue-600 bg-blue-50 px-1 rounded">1,000 ตารางเมตร</strong>"
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border-l-4 border-amber-500 shadow-sm">
                                    <span className="text-xs font-bold text-amber-600 mb-1 block">ตัวอย่างที่ 2 (ซับมาริน - ULV)</span>
                                    <p className="text-slate-700 italic">
                                        "ใช้ ซับมาริน <strong className="text-amber-600 bg-amber-50 px-1 rounded">1 ลิตร</strong> ผสมกับน้ำให้ได้ <strong className="text-amber-600 bg-amber-50 px-1 rounded">40 ลิตร</strong> แล้วนำไปฉีดพ่นในอัตรา <strong className="text-blue-600 bg-blue-50 px-1 rounded">2 ลิตร</strong> ต่อพื้นที่ <strong className="text-blue-600 bg-blue-50 px-1 rounded">10,000 ตารางเมตร</strong>"
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 text-center">
                            สังเกตตัวเลขที่ระบุ "ปริมาณสาร", "ปริมาณตัวผสม", และ "อัตราการพ่น"
                        </p>
                    </TabsContent>

                    <TabsContent value="step2" className="space-y-4">
                        <div className="grid gap-4">
                            <div className="bg-violet-50/50 p-5 rounded-2xl border border-violet-100">
                                <h4 className="font-semibold text-violet-700 mb-2">1. การหาอัตราส่วนผสม (C : S)</h4>
                                <ul className="space-y-3 text-sm text-slate-700">
                                    <li className="flex gap-3 bg-white p-3 rounded-xl shadow-xs">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">A</div>
                                        <div>
                                            <p className="font-medium">แบบระบุตรงตัว</p>
                                            <p className="text-slate-500">"ผสม 1 ลิตร กับน้ำมัน 79 ลิตร"</p>
                                            <p className="mt-1 text-emerald-600 font-medium">👉 C = 1, S = 79</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-3 bg-white p-3 rounded-xl shadow-xs">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">B</div>
                                        <div>
                                            <p className="font-medium">แบบพันธุ์ผสมให้ได้จำนวนรวม</p>
                                            <p className="text-slate-500">"ผสม 1 ลิตร กับน้ำให้ได้ 40 ลิตร"</p>
                                            <p className="mt-1 text-emerald-600 font-medium">👉 C = 1, S = 39 (มาจาก 40-1)</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <h4 className="font-semibold text-blue-700 mb-2">2. การหาอัตราการพ่น (RA / A0)</h4>
                                <div className="bg-white p-3 rounded-xl shadow-xs text-sm">
                                    <p className="text-slate-500 mb-1">"ฉีดพ่นในอัตรา <span className="text-blue-600 font-bold">1 ลิตร</span> ต่อพื้นที่ <span className="text-blue-600 font-bold">1,000 ตร.ม.</span>"</p>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <span className="text-xs text-slate-400">RA (อัตราไหล)</span>
                                            <p className="font-medium">1 ลิตร</p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400">A0 (พื้นที่มาตรฐาน)</span>
                                            <p className="font-medium">1,000 ตร.ม.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="mt-4 p-4 bg-orange-50 rounded-xl flex gap-3 text-sm text-orange-800 border border-orange-100">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-orange-500" />
                    <p>
                        <strong>เคล็ดลับ:</strong> ระบบนี้กำหนดให้พื้นที่บ้าน 1 หลัง มีค่าเฉลี่ยประมาณ <strong>100 ตารางเมตร</strong>
                        เพื่อใช้ในการคำนวณปริมาณที่ต้องใช้ต่อหลัง
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
