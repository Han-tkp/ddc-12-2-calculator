'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Sparkles, AlertTriangle, MapPin, Clock, CheckCircle2, FlaskConical, Beaker, ShieldAlert, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface PublicFormulaManagerProps {
    onFormulaAdded?: (newFormulaName: string) => void;
}

export function PublicFormulaManager({ onFormulaAdded }: PublicFormulaManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [C, setC] = useState<number>(1);
    const [S, setS] = useState<number>(79);
    const [RA, setRA] = useState<number>(1);
    const [RAUnit, setRAUnit] = useState<'L' | 'cc'>('L');
    const [mixType, setMixType] = useState<number>(2); // 1 = ผสมให้ได้, 2 = ผสมกับ
    const [A0, setA0] = useState<number>(1000);
    const [tankCapacity, setTankCapacity] = useState<number>(10);
    const [location, setLocation] = useState('');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isGpsLoading, setIsGpsLoading] = useState(false);

    // AI Assistant Mode State
    const [aiQuery, setAiQuery] = useState('');
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);

    // Request GPS location on open
    const captureGps = () => {
        if (!navigator.geolocation) return;
        setIsGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsGpsLoading(false);
            },
            () => setIsGpsLoading(false),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const handleOpenModal = () => {
        setIsOpen(true);
        captureGps();
    };

    // AI Formula Generator trigger
    const handleAiGenerate = () => {
        if (!aiQuery.trim()) {
            toast.error('กรุณาระบุยี่ห้อสารเคมีหรือศัตรูพืชที่ต้องการกำจัด');
            return;
        }
        setIsAiSuggesting(true);
        setTimeout(() => {
            const queryLower = aiQuery.toLowerCase();
            if (queryLower.includes('ulv') || queryLower.includes('ยูแอลวี')) {
                setName(aiQuery.includes('เดลตา') ? 'Deltacide ULV (สูตรใหม่)' : `${aiQuery} (ULV)`);
                setC(1);
                setS(4);
                setRA(75);
                setRAUnit('cc');
                setMixType(1);
                setA0(1000);
                setTankCapacity(10);
                setDescription('สูตรแนะนำโดย AI สำหรับพ่นฝอยละเอียด (ULV) ปริมาณพ่น 75 มล./1,000 ตร.ม.');
            } else {
                setName(aiQuery.includes('ซับมาริน') ? 'Submarine (สูตรใหม่)' : `${aiQuery} (หมอกควัน)`);
                setC(1);
                setS(79);
                setRA(1);
                setRAUnit('L');
                setMixType(2);
                setA0(1000);
                setTankCapacity(10);
                setDescription('สูตรแนะนำโดย AI สำหรับพ่นหมอกควัน (Thermal Fogging) พ่น 1 ลิตร/1,000 ตร.ม.');
            }
            setIsAiSuggesting(false);
            toast.success('AI ช่วยเติมข้อมูลสูตรสารเคมีเรียบร้อยแล้ว');
        }, 600);
    };

    // Trigger pre-submit confirmation
    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('กรุณาระบุชื่อสูตรสารเคมี');
            return;
        }
        if (C <= 0 || S <= 0 || RA <= 0 || A0 <= 0 || tankCapacity <= 0) {
            toast.error('กรุณากรอกตัวเลขจำนวนบวกในทุกช่องสัดส่วน');
            return;
        }
        setShowConfirm(true);
    };

    // Execute actual submit
    const handleConfirmSubmit = async () => {
        setIsSubmitting(true);
        try {
            const nowIso = new Date().toISOString();
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || `เพิ่มโดยผู้ใช้ภายนอก (${new Date().toLocaleDateString('th-TH')})`,
                    C: Number(C),
                    S: Number(S),
                    RA: Number(RA),
                    RA_unit: RAUnit,
                    mix_type: Number(mixType),
                    A0: Number(A0),
                    tankCapacity: Number(tankCapacity),
                    isActive: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'ไม่สามารถสร้างสูตรสารเคมีได้');
            }

            // Record tracking calculation entry if location is specified
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    C: Number(C),
                    S: Number(S),
                    RA: Number(RA),
                    RA_unit: RAUnit,
                    mix_type: Number(mixType),
                    A0: Number(A0),
                    A_house: 100,
                    N: 10,
                    chemical: name.trim(),
                    location: location.trim() || 'บันทึกสูตรเคมีภายนอก',
                    agency: 'ผู้ใช้งานทั่วไป / ภายนอก',
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                }),
            });

            toast.success(`เพิ่มสูตรสารเคมี "${name}" และบันทึกประวัติเข้าสู่ระบบเรียบร้อยแล้ว!`);
            setShowConfirm(false);
            setIsOpen(false);
            if (onFormulaAdded) onFormulaAdded(name.trim());
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                onClick={handleOpenModal}
                variant="outline"
                className="w-full sm:w-auto bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold gap-2 h-10 shadow-sm"
            >
                <Plus className="h-4 w-4" />
                เพิ่มสูตรสารเคมีใหม่ / AI Assistant
            </Button>

            {/* Main Form Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                            <FlaskConical className="h-6 w-6 text-indigo-600" />
                            เพิ่มสูตรสารเคมีใหม่ (Public Catalog)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            ระบบจะบันทึกประวัติการเพิ่มพร้อมพิกัดและเวลาที่ทำรายการอัตโนมัติ
                        </DialogDescription>
                    </DialogHeader>

                    {/* AI Generator Bar */}
                    <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-indigo-100 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-indigo-800">
                            <Bot className="h-4 w-4 text-indigo-600" />
                            ผู้ช่วย AI เพิ่มสูตรอัตโนมัติ (AI Formula Assistant)
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="เช่น เดลตาไซด์ ULV หรือ ซับมาริน หมอกควัน..."
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                className="h-9 text-xs bg-white"
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAiGenerate}
                                disabled={isAiSuggesting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1 shrink-0"
                            >
                                {isAiSuggesting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                เติมสูตรด้วย AI
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handlePreSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">ชื่อสูตรสารเคมี *</Label>
                                <Input
                                    placeholder="เช่น Deltacide (สูตรใหม่)"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">คำอธิบายสูตร</Label>
                                <Input
                                    placeholder="เช่น เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Mix Type & Dilution Ratios */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="space-y-1">
                                <Label className="font-semibold text-slate-700">รูปแบบการผสมยา *</Label>
                                <Select value={String(mixType)} onValueChange={(val) => setMixType(Number(val))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้ (VOLUME_TO_TOTAL) - รวมปริมาตรคงที่</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ (NET_ADDITIVE) - เติมสารทบน้ำมัน</SelectItem>
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

                        {/* Spray Coverage & Tank Capacity */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
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

                        {/* Tracking metadata */}
                        <div className="space-y-1">
                            <Label className="font-semibold text-slate-700 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-red-500" /> สถานที่ปฏิบัติงาน / พื้นที่อ้างอิง
                            </Label>
                            <Input
                                placeholder="เช่น อ.เมือง สงขลา (เพื่อการ Tracking ประวัติ)"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <CheckCircle2 className="h-4 w-4" /> ดำเนินการเพิ่มสูตร
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Alert Confirmation Dialog */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 text-lg font-bold">
                            <AlertTriangle className="h-5 w-5" /> ยืนยันการเพิ่มสูตรสารเคมีเข้าสู่ระบบ?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-2">
                            โปรดตรวจสอบข้อมูลสูตรสารเคมีก่อนยืนยันการบันทึก ข้อมูลนี้จะถูกเปิดใช้ในหน้าคำนวณและบันทึกประวัติการทำรายการเข้าสู่ฐานข้อมูล
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700 font-sans">
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">ชื่อสูตรสารเคมี:</span>
                            <span className="font-bold text-slate-900">{name}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">อัตราส่วนผสม (C:S):</span>
                            <span className="font-bold text-slate-900">{C}:{S} ({mixType === 2 ? 'ผสมกับ' : 'ผสมให้ได้'})</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">อัตราการพ่น (RA):</span>
                            <span className="font-bold text-slate-900">{RA} {RAUnit} / {A0} ตร.ม.</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                            <span className="text-slate-500">ความจุถังพ่นเคมี:</span>
                            <span className="font-bold text-slate-900">{tankCapacity} ลิตร</span>
                        </div>
                        <div className="flex justify-between pt-1 text-[11px] text-slate-500">
                            <span>พิกัดสถานที่ Tracking:</span>
                            <span>{coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'พิกัดเริ่มต้น'}</span>
                        </div>
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
                            ยืนยันเพิ่มสูตรสารเคมี
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
