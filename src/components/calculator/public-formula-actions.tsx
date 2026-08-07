'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convertRA } from '@/lib/calculations';

interface PublicProfile {
    id: string;
    name: string;
    description?: string | null;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
    tankCapacity?: number;
    canManage?: boolean;
}

interface PublicFormulaActionsProps {
    profile: PublicProfile;
    onChanged: () => Promise<void> | void;
}

export function PublicFormulaActions({ profile, onChanged }: PublicFormulaActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [confirmation, setConfirmation] = useState<'update' | 'delete' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: profile.name,
        description: profile.description || '',
        C: profile.C,
        S: profile.S,
        RA: profile.RA,
        RA_unit: profile.RA_unit,
        mix_type: profile.mix_type,
        A0: profile.A0,
        tankCapacity: profile.tankCapacity || 10,
        location: '',
    });

    if (!profile.canManage) return null;

    const getCoordinates = (): Promise<{ lat: number | null; lng: number | null }> => new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: null, lng: null });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            () => resolve({ lat: null, lng: null }),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });

    const execute = async () => {
        if (!confirmation) return;
        setIsSubmitting(true);

        try {
            const coordinates = await getCoordinates();
            const response = await fetch(`/api/profiles/${profile.id}`, {
                method: confirmation === 'update' ? 'PUT' : 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    confirmation === 'update'
                        ? { ...form, ...coordinates }
                        : { location: form.location, ...coordinates }
                ),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้');

            toast.success(data.message || 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
            setConfirmation(null);
            setIsEditOpen(false);
            await onChanged();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการทำรายการ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-brand" onClick={() => setIsEditOpen(true)} title="แก้ไขสูตรของฉัน">
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => setConfirmation('delete')} title="ลบสูตรของฉัน">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>แก้ไขสูตรสารเคมี</DialogTitle>
                        <DialogDescription>แก้ไขได้เฉพาะสูตรที่คุณเพิ่มเอง ระบบจะบันทึกเวลาและพิกัดเมื่อยืนยัน</DialogDescription>
                    </DialogHeader>
                    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); setConfirmation('update'); }}>
                        <div className="space-y-1"><Label>ชื่อสูตร</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div>
                        <div className="space-y-1"><Label>คำอธิบาย</Label><Input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>สารออกฤทธิ์ (C)</Label><Input type="number" min="0.0001" step="any" value={form.C} onChange={(event) => setForm({ ...form, C: Number(event.target.value) })} required /></div>
                            <div className="space-y-1"><Label>ตัวทำละลาย (S) (ลิตร)</Label><Input type="number" min="0.0001" step="any" value={form.S} onChange={(event) => setForm({ ...form, S: Number(event.target.value) })} required /></div>
                            <div className="space-y-1"><Label>อัตราพ่น</Label><Input type="number" min="0.0001" step="any" value={form.RA} onChange={(event) => setForm({ ...form, RA: Number(event.target.value) })} required /></div>
                            <div className="space-y-1"><Label>หน่วย</Label><Select value={form.RA_unit} onValueChange={(value: 'L' | 'cc') => setForm({ ...form, RA: convertRA(form.RA, form.RA_unit, value), RA_unit: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="L">ลิตร</SelectItem><SelectItem value="cc">มล.</SelectItem></SelectContent></Select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>รูปแบบการผสม</Label><Select value={String(form.mix_type)} onValueChange={(value) => setForm({ ...form, mix_type: Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">แบบผสมให้ได้</SelectItem><SelectItem value="2">แบบผสมกับ</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1"><Label>พื้นที่มาตรฐาน (ตร.ม.)</Label><Input type="number" min="1" value={form.A0} onChange={(event) => setForm({ ...form, A0: Number(event.target.value) })} required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label>ขนาดถัง (ลิตร)</Label><Input type="number" min="0.1" step="0.1" value={form.tankCapacity} onChange={(event) => setForm({ ...form, tankCapacity: Number(event.target.value) })} required /></div>
                            <div className="space-y-1"><Label>สถานที่ทำรายการ</Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="ระบุได้ถ้าต้องการ" /></div>
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>ยกเลิก</Button><Button type="submit">ตรวจสอบก่อนบันทึก</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmation !== null} onOpenChange={(open) => !open && setConfirmation(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{confirmation === 'update' ? 'ยืนยันการแก้ไขสูตร' : 'ยืนยันการลบสูตร'}</DialogTitle>
                        <DialogDescription>{confirmation === 'update' ? `จะบันทึกการแก้ไขสูตร “${form.name}”` : `จะลบสูตร “${profile.name}” ออกจากระบบถาวร การกระทำนี้ไม่สามารถย้อนกลับได้`}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmation(null)} disabled={isSubmitting}>ยกเลิก</Button><Button type="button" variant={confirmation === 'delete' ? 'destructive' : 'default'} onClick={execute} disabled={isSubmitting}>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน'}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
