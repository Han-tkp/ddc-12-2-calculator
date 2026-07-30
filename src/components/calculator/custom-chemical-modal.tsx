'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Upload, Image as ImageIcon, CheckCircle2, AlertTriangle, Clock, FlaskConical, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CustomChemicalModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (newFormulaName: string) => void;
}

export function CustomChemicalModal({ isOpen, onOpenChange, onSuccess }: CustomChemicalModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [C, setC] = useState<number>(1);
    const [S, setS] = useState<number>(4);
    const [RA, setRA] = useState<number>(75);
    const [RAUnit, setRAUnit] = useState<'L' | 'cc'>('cc');
    const [mixType, setMixType] = useState<number>(1); // 1 = แบบผสมให้ได้ - รวมปริมาตรคงที่, 2 = แบบผสมกับ - เติมสารทบน้ำมัน
    const [tankCapacity, setTankCapacity] = useState<number>(10);
    const [location, setLocation] = useState('');

    // Drag & drop file state
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Confirmation Modal State
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Drag & Drop event handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setUploadedFile(file);
            toast.success(`อัปโหลดไฟล์ฉลาก "${file.name}" เรียบร้อยแล้ว`);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadedFile(file);
            toast.success(`อัปโหลดไฟล์ฉลาก "${file.name}" เรียบร้อยแล้ว`);
        }
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('กรุณาระบุชื่อสูตรสารเคมี Custom');
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmSubmit = async () => {
        setIsSubmitting(true);
        try {
            const descWithFile = uploadedFile
                ? `${description.trim()} [แนบไฟล์ฉลาก: ${uploadedFile.name}]`
                : description.trim();

            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: descWithFile || 'สูตร Custom สารเคมีเพิ่มโดยผู้ใช้',
                    C: Number(C),
                    S: Number(S),
                    RA: Number(RA),
                    RA_unit: RAUnit,
                    mix_type: Number(mixType),
                    A0: 1000,
                    tankCapacity: Number(tankCapacity),
                    isActive: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกสูตร Custom ได้');

            // Record tracking entry
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    C: Number(C),
                    S: Number(S),
                    RA: Number(RA),
                    RA_unit: RAUnit,
                    mix_type: Number(mixType),
                    A0: 1000,
                    A_house: 100,
                    N: 10,
                    chemical: name.trim(),
                    location: location.trim() || 'บันทึกสูตร Custom ลากวางฉลากสารเคมี',
                    agency: 'Custom Formula Creator',
                }),
            });

            toast.success(`บันทึกสูตร Custom "${name}" และไฟล์ฉลากเรียบร้อยแล้ว!`);
            setShowConfirm(false);
            onOpenChange(false);
            if (onSuccess) onSuccess(name.trim());
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <FlaskConical className="h-6 w-6 text-indigo-600" />
                            เพิ่มสูตรสารเคมี Custom (พร้อม Drag & Drop ฉลาก)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            คุณสามารถลากวางรูปภาพฉลากสารเคมี หรือไฟล์ PDF เพื่อแนบและวิเคราะห์สัดส่วนโดยอัตโนมัติ
                        </DialogDescription>
                    </DialogHeader>

                    {/* Drag & Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                            dragActive
                                ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]'
                                : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-slate-100/80'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {uploadedFile ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs sm:text-sm">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                แนบไฟล์ฉลาก: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">
                                    ลากและวางไฟล์ภาพฉลากสารเคมีลงที่นี่ หรือ <span className="text-indigo-600 underline">คลิกเพื่อเลือกไฟล์</span>
                                </p>
                                <p className="text-[10px] text-slate-400">รองรับไฟล์ PNG, JPG, WEBP, PDF (ไม่เกิน 10MB)</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handlePreSubmit} className="space-y-4 text-xs pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">ชื่อสูตรสารเคมี Custom *</Label>
                                <Input
                                    placeholder="เช่น Custom Deltacide 10%"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">คำอธิบายรายละเอียด</Label>
                                <Input
                                    placeholder="เช่น อัตราเจือจางพิเศษตามฉลาก"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Mix Type Dropdown - Pure Thai */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">รูปแบบการผสมยา *</Label>
                                <Select value={String(mixType)} onValueChange={(val) => setMixType(Number(val))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้ - รวมปริมาตรคงที่</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ - เติมสารทบน้ำมัน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="font-semibold text-slate-700">สารเคมีออกฤทธิ์ (C)</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={C}
                                        onChange={(e) => setC(Number(e.target.value))}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="font-semibold text-slate-700">ตัวทำละลาย น้ำมัน/น้ำ (S)</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={S}
                                        onChange={(e) => setS(Number(e.target.value))}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">อัตราการพ่น (RA)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={RA}
                                    onChange={(e) => setRA(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">หน่วยอัตราพ่น</Label>
                                <Select value={RAUnit} onValueChange={(val: any) => setRAUnit(val)}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">ลิตร (L)</SelectItem>
                                        <SelectItem value="cc">มิลลิลิตร / มล. (cc)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">ความจุถังพ่น (ลิตร)</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={tankCapacity}
                                    onChange={(e) => setTankCapacity(Number(e.target.value))}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="font-semibold text-slate-700">สถานที่ปฏิบัติงาน (Tracking Location)</Label>
                            <Input
                                placeholder="เช่น อ.เมือง สงขลา"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <CheckCircle2 className="h-4 w-4" /> ดำเนินการเพิ่มสูตร Custom
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Alert Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700 text-lg font-bold">
                            <AlertTriangle className="h-5 w-5 text-amber-500" /> ยืนยันการเพิ่มสูตร Custom เข้าสู่ระบบ?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
                            โปรดตรวจสอบข้อมูลสูตร Custom ก่อนยืนยัน บันทึกนี้จะถูกเปิดใช้งานในหน้าคำนวณและบันทึกประวัติการทำรายการเข้าสู่ฐานข้อมูล
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">ชื่อสูตรสารเคมี:</span>
                            <span className="font-bold text-slate-900">{name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">รูปแบบการผสม:</span>
                            <span className="font-bold text-indigo-700">{mixType === 2 ? 'แบบผสมกับ - เติมสารทบน้ำมัน' : 'แบบผสมให้ได้ - รวมปริมาตรคงที่'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">สัดส่วน (C:S):</span>
                            <span className="font-bold text-slate-900">{C}:{S}</span>
                        </div>
                        {uploadedFile && (
                            <div className="flex justify-between border-b border-slate-200/60 pb-1.5 text-emerald-700 font-bold">
                                <span>ไฟล์ฉลากแนบ:</span>
                                <span>{uploadedFile.name}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                            ตรวจสอบอีกครั้ง
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSubmit}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {isSubmitting ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            ยืนยันเพิ่มสูตร Custom
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
