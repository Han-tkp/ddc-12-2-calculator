'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { BulkEditProfilesModal } from './bulk-edit-profiles-modal';
import { convertRA } from '@/lib/calculations';
import { formatCSUnitLabel } from '@/lib/quantity';
import { applyCSUnitChoice, csEditState, csSavePayload, type CSUnitChoice, type CSUnitOrParts } from '@/lib/cs-units';
import { inferProfileSource } from '@/lib/profile-source';


interface Profile {
    id: string;
    name: string;
    description: string | null;
    C: number;
    S: number;
    RA: number;
    RA_unit: string;
    mix_type: number;
    A0: number;
    isActive: boolean;
    isDefault: boolean;
    createdBy: { name: string | null; email: string } | null;
    guestOwnerToken?: string | null;
    createdById?: string | null;
    createdAt: string;
    updatedAt: string;
    C_unit?: 'L' | 'cc' | null;
    S_unit?: 'L' | 'cc' | null;
}

interface ProfilesTableProps {
    profiles: Profile[];
}

export function ProfilesTable({ profiles }: ProfilesTableProps) {
    const router = useRouter();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<{
        type: 'create' | 'update' | 'activate' | 'delete';
        profile?: Profile;
    } | null>(null);

    const initialFormData = {
        name: '',
        description: '',
        C: 1,
        S: 79,
        RA: 1,
        RA_unit: 'L',
        mix_type: 1,
        A0: 1000,
    };

    const [formData, setFormData] = useState(initialFormData);
    const [editData, setEditData] = useState(initialFormData);
    // ตัวเลือกหน่วยของ C และ S แยกอิสระจากกัน (ฉลากจริงมักเขียนหน่วยไม่ตรงกัน) — ค่า C/S
    // ถูกบันทึก "ตามที่พิมพ์" โดยมี C_unit/S_unit เป็นหน่วยจริงของตัวเลขนั้น การแปลงหน่วย
    // เกิดตอนคำนวณเท่านั้น (normalizeCSForCalc) ห้ามย่อสัดส่วนก่อนบันทึกอีก มิฉะนั้นหน่วยเดิม
    // จะถูกเอาไปคูณกับเลขที่ย่อแล้วซ้ำอีกรอบ = เจือจางลง 1,000 เท่าทุกครั้งที่กดบันทึก
    const [addCUnit, setAddCUnit] = useState<CSUnitOrParts>('L');
    const [addSUnit, setAddSUnit] = useState<CSUnitOrParts>('L');
    const [editCUnit, setEditCUnit] = useState<CSUnitOrParts>('L');
    const [editSUnit, setEditSUnit] = useState<CSUnitOrParts>('L');

    const openEditDialog = (profile: Profile) => {
        setEditingProfileId(profile.id);
        // seed ผ่าน csEditState เพื่อคงความเป็น "ไม่มีหน่วย" ไว้ — ห้าม default ข้างเดียวเป็น 'L'
        // เพราะหน่วยจริงข้างหนึ่งคู่กับ default อีกข้างคือรูปร่างของบั๊ก 1,000 เท่า
        const seeded = csEditState(profile);
        setEditCUnit(seeded.CUnit);
        setEditSUnit(seeded.SUnit);
        setEditData({
            name: profile.name,
            description: profile.description || '',
            C: seeded.C,
            S: seeded.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit,
            mix_type: profile.mix_type || 1,
            A0: profile.A0,
        });
        setIsEditDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPendingAction({ type: 'create' });
    };

    const createProfile = async () => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, ...csSavePayload({ C: formData.C, CUnit: addCUnit, S: formData.S, SUnit: addSUnit }) }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'เกิดข้อผิดพลาด');
            }

            toast.success('เพิ่มสูตรสำเร็จ');
            setIsAddDialogOpen(false);
            setFormData(initialFormData);
            setAddCUnit('L');
            setAddSUnit('L');
            router.refresh();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProfileId) return;
        setPendingAction({ type: 'update' });
    };

    const updateProfile = async () => {
        if (!editingProfileId) return;
        setIsLoading(true);

        try {
            const response = await fetch(`/api/profiles/${editingProfileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editData, ...csSavePayload({ C: editData.C, CUnit: editCUnit, S: editData.S, SUnit: editSUnit }) }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'เกิดข้อผิดพลาดในการแก้ไข');
            }

            toast.success('อัปเดตสูตรสำเร็จ');
            setIsEditDialogOpen(false);
            setEditingProfileId(null);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteProfile = async (id: string) => {
        try {
            const response = await fetch(`/api/profiles/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('ไม่สามารถลบได้');
            }

            toast.success('ลบสูตรออกจากระบบถาวรแล้ว');
            router.refresh();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const activateProfile = async (profile: Profile) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/profiles/${profile.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profile.name,
                    description: profile.description,
                    C: profile.C,
                    S: profile.S,
                    RA: profile.RA,
                    RA_unit: profile.RA_unit,
                    mix_type: profile.mix_type,
                    A0: profile.A0,
                    isActive: true,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'ไม่สามารถเผยแพร่สูตรได้');
            }

            toast.success('อนุมัติและเผยแพร่สูตรสำเร็จ');
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเผยแพร่สูตร');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmPendingAction = async () => {
        if (!pendingAction) return;

        if (pendingAction.type === 'create') {
            await createProfile();
        } else if (pendingAction.type === 'update') {
            await updateProfile();
        } else if (pendingAction.type === 'activate' && pendingAction.profile) {
            await activateProfile(pendingAction.profile);
        } else if (pendingAction.profile) {
            await deleteProfile(pendingAction.profile.id);
        }

        setPendingAction(null);
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const selectedProfiles = profiles.filter((p) => selectedIds.has(p.id));

    return (
        <div className="space-y-4">
            {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-brand-soft/60 border border-brand/20">
                    <span className="text-sm font-medium text-brand-dark">เลือกแล้ว {selectedIds.size} รายการ</span>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                            ยกเลิกการเลือก
                        </Button>
                        <Button type="button" size="sm" onClick={() => setIsBulkEditOpen(true)} className="bg-brand hover:bg-brand-dark">
                            แก้ไขหลายรายการ
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Button */}
            <div className="flex items-center justify-end">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-brand hover:bg-brand-dark text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            เพิ่มสูตรใหม่
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>เพิ่มสูตรสารเคมีใหม่</DialogTitle>
                            <DialogDescription>
                                กรอกข้อมูลจากฉลากสารเคมี
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="add-name">ชื่อสูตร</Label>
                                <Input
                                    id="add-name"
                                    placeholder="เช่น หมอกควัน 1:79"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="add-description">คำอธิบาย (ถ้ามี)</Label>
                                <Input
                                    id="add-description"
                                    placeholder="เช่น สำหรับเครื่องพ่นหมอกควัน"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-C">สารเคมีออกฤทธิ์ (C)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="add-C"
                                            type="number"
                                            step="any"
                                            value={formData.C}
                                            onChange={(e) => setFormData({ ...formData, C: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                        <Select
                                            value={addCUnit ?? 'part'}
                                            onValueChange={(val: CSUnitChoice) => {
                                                // หน่วยของ C แยกอิสระจาก S — สลับแล้วแปลงแค่ค่า C ให้ยังหมายถึงปริมาณเท่าเดิม
                                                // (applyCSUnitChoice ยังบังคับให้อีกข้างมีหน่วยตามไปด้วยเสมอ)
                                                const next = applyCSUnitChoice({ C: formData.C, CUnit: addCUnit, S: formData.S, SUnit: addSUnit }, 'C', val, convertRA);
                                                setFormData({ ...formData, C: next.C, S: next.S });
                                                setAddCUnit(next.CUnit);
                                                setAddSUnit(next.SUnit);
                                            }}
                                        >
                                            <SelectTrigger id="add-C-unit" className="w-24 shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="L">ลิตร</SelectItem>
                                                <SelectItem value="cc">มล.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-S">น้ำมัน/น้ำ (S)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="add-S"
                                            type="number"
                                            step="any"
                                            value={formData.S}
                                            onChange={(e) => setFormData({ ...formData, S: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                        <Select
                                            value={addSUnit ?? 'part'}
                                            onValueChange={(val: CSUnitChoice) => {
                                                const next = applyCSUnitChoice({ C: formData.C, CUnit: addCUnit, S: formData.S, SUnit: addSUnit }, 'S', val, convertRA);
                                                setFormData({ ...formData, C: next.C, S: next.S });
                                                setAddCUnit(next.CUnit);
                                                setAddSUnit(next.SUnit);
                                            }}
                                        >
                                            <SelectTrigger id="add-S-unit" className="w-24 shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="L">ลิตร</SelectItem>
                                                <SelectItem value="cc">มล.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="add-RA">อัตราการพ่นต่อพื้นที่</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        id="add-RA"
                                        type="number"
                                        step="any"
                                        value={formData.RA}
                                        onChange={(e) => setFormData({ ...formData, RA: parseFloat(e.target.value) || 0 })}
                                        required
                                        className="flex-1 min-w-20"
                                    />
                                    <Select
                                        value={formData.RA_unit}
                                        onValueChange={(value: 'L' | 'cc') => setFormData({ ...formData, RA: convertRA(formData.RA, formData.RA_unit as 'L' | 'cc', value), RA_unit: value })}
                                    >
                                        <SelectTrigger id="add-RA_unit" className="w-24 shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">ลิตร</SelectItem>
                                            <SelectItem value="cc">มล.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-slate-500 shrink-0">ต่อ</span>
                                    <Input
                                        id="add-A0"
                                        type="number"
                                        step="1"
                                        value={formData.A0}
                                        onChange={(e) => setFormData({ ...formData, A0: parseFloat(e.target.value) || 0 })}
                                        required
                                        className="flex-1 min-w-20"
                                    />
                                    <span className="text-sm text-slate-500 shrink-0">ตร.ม.</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="add-mix_type">ประเภทการผสม</Label>
                                <Select
                                    value={String(formData.mix_type)}
                                    onValueChange={(value) => setFormData({ ...formData, mix_type: parseInt(value) })}
                                >
                                    <SelectTrigger id="add-mix_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้ - รวมปริมาตรคงที่</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ - เติมสารทบน้ำมัน</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        'บันทึก'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog - Kept hidden but conditionally opens */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>แก้ไขสูตรสารเคมี</DialogTitle>
                            <DialogDescription>
                                ปรับปรุงข้อมูลของสารเคมี
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">ชื่อสูตร</Label>
                                <Input
                                    id="edit-name"
                                    value={editData.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-description">คำอธิบาย</Label>
                                <Input
                                    id="edit-description"
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-C">สารเคมีออกฤทธิ์ (C)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="edit-C"
                                            type="number"
                                            step="any"
                                            value={editData.C}
                                            onChange={(e) => setEditData({ ...editData, C: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                        <Select
                                            value={editCUnit ?? 'part'}
                                            onValueChange={(val: CSUnitChoice) => {
                                                const next = applyCSUnitChoice({ C: editData.C, CUnit: editCUnit, S: editData.S, SUnit: editSUnit }, 'C', val, convertRA);
                                                setEditData({ ...editData, C: next.C, S: next.S });
                                                setEditCUnit(next.CUnit);
                                                setEditSUnit(next.SUnit);
                                            }}
                                        >
                                            <SelectTrigger id="edit-C-unit" className="w-24 shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="L">ลิตร</SelectItem>
                                                <SelectItem value="cc">มล.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-S">น้ำมัน/น้ำ (S)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="edit-S"
                                            type="number"
                                            step="any"
                                            value={editData.S}
                                            onChange={(e) => setEditData({ ...editData, S: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                        <Select
                                            value={editSUnit ?? 'part'}
                                            onValueChange={(val: CSUnitChoice) => {
                                                const next = applyCSUnitChoice({ C: editData.C, CUnit: editCUnit, S: editData.S, SUnit: editSUnit }, 'S', val, convertRA);
                                                setEditData({ ...editData, C: next.C, S: next.S });
                                                setEditCUnit(next.CUnit);
                                                setEditSUnit(next.SUnit);
                                            }}
                                        >
                                            <SelectTrigger id="edit-S-unit" className="w-24 shrink-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="L">ลิตร</SelectItem>
                                                <SelectItem value="cc">มล.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-RA">อัตราการพ่นต่อพื้นที่</Label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        id="edit-RA"
                                        type="number"
                                        step="any"
                                        value={editData.RA}
                                        onChange={(e) => setEditData({ ...editData, RA: parseFloat(e.target.value) || 0 })}
                                        required
                                        className="flex-1 min-w-20"
                                    />
                                    <Select
                                        value={editData.RA_unit}
                                        onValueChange={(value: 'L' | 'cc') => setEditData({ ...editData, RA: convertRA(editData.RA, editData.RA_unit as 'L' | 'cc', value), RA_unit: value })}
                                    >
                                        <SelectTrigger id="edit-RA_unit" className="w-24 shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="L">ลิตร</SelectItem>
                                            <SelectItem value="cc">มล.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-slate-500 shrink-0">ต่อ</span>
                                    <Input
                                        id="edit-A0"
                                        type="number"
                                        step="1"
                                        value={editData.A0}
                                        onChange={(e) => setEditData({ ...editData, A0: parseFloat(e.target.value) || 0 })}
                                        required
                                        className="flex-1 min-w-20"
                                    />
                                    <span className="text-sm text-slate-500 shrink-0">ตร.ม.</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-mix_type">ประเภทการผสม</Label>
                                <Select
                                    value={String(editData.mix_type)}
                                    onValueChange={(value) => setEditData({ ...editData, mix_type: parseInt(value) })}
                                >
                                    <SelectTrigger id="edit-mix_type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">แบบผสมให้ได้</SelectItem>
                                        <SelectItem value="2">แบบผสมกับ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={isLoading} className="bg-brand hover:bg-brand-dark">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            กำลังอัปเดต...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            บันทึก
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table — matches the history pages' (ประวัติคำนวณ / ประวัติจัดการสูตร) format */}
            <div className="glass-card rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6 w-full">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto w-full relative">
                    <table className="w-full text-left text-sm min-w-275">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 border-b">
                            <tr>
                                <th className="p-3 w-10">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300"
                                        checked={profiles.length > 0 && selectedIds.size === profiles.length}
                                        onChange={(e) => setSelectedIds(e.target.checked ? new Set(profiles.map((p) => p.id)) : new Set())}
                                        aria-label="เลือกทั้งหมด"
                                    />
                                </th>
                                <th className="p-3 font-semibold min-w-48">ชื่อสูตร</th>
                                <th className="p-3 font-semibold text-center">สารเคมีออกฤทธิ์ (C)</th>
                                <th className="p-3 font-semibold text-center">ตัวทำละลาย (S)</th>
                                <th className="p-3 font-semibold text-center">รูปแบบการผสม</th>
                                <th className="p-3 font-semibold text-center">ปริมาณพ่น</th>
                                <th className="p-3 font-semibold text-center">พื้นที่ (ตร.ม.)</th>
                                <th className="p-3 font-semibold text-center">เพิ่มมาในรูปแบบใด</th>
                                <th className="p-3 font-semibold">เวลา CRUD</th>
                                <th className="p-3 font-semibold text-center">สถานะ</th>
                                <th className="p-3 font-semibold text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {profiles.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center py-8 text-slate-500">
                                        ยังไม่มีสูตรสารเคมี
                                    </td>
                                </tr>
                            ) : (
                                profiles.map((profile) => {
                                    const sourceInfo = inferProfileSource(profile);
                                    const wasEdited = profile.updatedAt && profile.updatedAt !== profile.createdAt;
                                    return (
                                        <tr key={profile.id} className={`hover:bg-slate-50/50 ${selectedIds.has(profile.id) ? 'bg-brand-soft/30' : ''}`}>
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300"
                                                    checked={selectedIds.has(profile.id)}
                                                    onChange={(e) => {
                                                        setSelectedIds((prev) => {
                                                            const next = new Set(prev);
                                                            if (e.target.checked) next.add(profile.id); else next.delete(profile.id);
                                                            return next;
                                                        });
                                                    }}
                                                    aria-label={`เลือก ${profile.name}`}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <p className="font-medium text-slate-800">{profile.name}</p>
                                                {profile.description && (
                                                    <p className="text-xs text-slate-500 max-w-56 truncate" title={profile.description}>{profile.description}</p>
                                                )}
                                            </td>
                                            <td className="p-3 text-center font-mono">
                                                {profile.C}
                                                <span className="block font-sans text-[11px] text-slate-400">{formatCSUnitLabel(profile.C_unit)}</span>
                                            </td>
                                            <td className="p-3 text-center font-mono">
                                                {profile.S}
                                                <span className="block font-sans text-[11px] text-slate-400">{formatCSUnitLabel(profile.S_unit)}</span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap bg-brand-soft text-brand-dark">
                                                    {profile.mix_type === 2 ? 'แบบผสมกับ' : 'แบบผสมให้ได้'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md text-slate-700 font-medium text-xs whitespace-nowrap">
                                                    {profile.RA} {profile.RA_unit === 'L' ? 'ลิตร' : 'มล.'}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">{profile.A0.toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                                    sourceInfo.source === 'default' ? 'bg-slate-200 text-slate-700'
                                                        : sourceInfo.source === 'file-import' ? 'bg-amber-100 text-amber-700'
                                                            : sourceInfo.source === 'guest' ? 'bg-sky-100 text-sky-700'
                                                                : 'bg-brand-soft text-brand-dark'
                                                }`}>
                                                    {sourceInfo.label}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                                                <div>สร้าง {format(new Date(profile.createdAt), 'd MMM yy HH:mm', { locale: th })}</div>
                                                {wasEdited && (
                                                    <div className="text-slate-400">แก้ไข {format(new Date(profile.updatedAt), 'd MMM yy HH:mm', { locale: th })}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {profile.isDefault ? (
                                                    <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200">ค่าเริ่มต้น</Badge>
                                                ) : profile.isActive ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">ใช้งาน</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-rose-100 text-rose-700 border-none hover:bg-rose-100">ปิดใช้งาน</Badge>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {!profile.isActive && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            onClick={() => setPendingAction({ type: 'activate', profile })}
                                                            title="อนุมัติและเผยแพร่สูตร"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:text-brand hover:bg-brand-soft"
                                                        onClick={() => openEditDialog(profile)}
                                                        title="แก้ไขสูตร"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => setPendingAction({ type: 'delete', profile })}
                                                        title="ลบสูตรถาวร"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <BulkEditProfilesModal
                profiles={selectedProfiles}
                open={isBulkEditOpen}
                onOpenChange={setIsBulkEditOpen}
                onDone={() => {
                    setSelectedIds(new Set());
                    router.refresh();
                }}
            />

            <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {pendingAction?.type === 'create' && 'ยืนยันการเพิ่มสูตร'}
                            {pendingAction?.type === 'update' && 'ยืนยันการแก้ไขสูตร'}
                            {pendingAction?.type === 'activate' && 'ยืนยันการอนุมัติสูตร'}
                            {pendingAction?.type === 'delete' && 'ยืนยันการลบสูตรถาวร'}
                        </DialogTitle>
                        <DialogDescription>
                            {pendingAction?.type === 'create' && `จะเพิ่มสูตร “${formData.name}” และเผยแพร่ให้ใช้งานทันที`}
                            {pendingAction?.type === 'update' && `จะบันทึกการแก้ไขสูตร “${editData.name}”`}
                            {pendingAction?.type === 'activate' && `จะเผยแพร่สูตร “${pendingAction.profile?.name}” ให้ผู้ใช้งานเลือกใช้`}
                            {pendingAction?.type === 'delete' && `จะลบสูตร “${pendingAction.profile?.name}” ออกจากระบบถาวร การกระทำนี้ไม่สามารถย้อนกลับได้`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPendingAction(null)} disabled={isLoading}>ยกเลิก</Button>
                        <Button type="button" onClick={confirmPendingAction} disabled={isLoading} variant={pendingAction?.type === 'delete' ? 'destructive' : 'default'}>
                            {isLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
