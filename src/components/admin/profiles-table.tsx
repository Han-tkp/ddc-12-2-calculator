'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { Plus, Pencil, Trash2, Loader2, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CustomChemicalModal } from '@/components/calculator/custom-chemical-modal';

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

    const openEditDialog = (profile: Profile) => {
        setEditingProfileId(profile.id);
        setEditData({
            name: profile.name,
            description: profile.description || '',
            C: profile.C,
            S: profile.S,
            RA: profile.RA,
            RA_unit: profile.RA_unit,
            mix_type: profile.mix_type || 1,
            A0: profile.A0
        });
        setIsEditDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'เกิดข้อผิดพลาด');
            }

            toast.success('เพิ่มสูตรสำเร็จ');
            setIsAddDialogOpen(false);
            setFormData(initialFormData);
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
        setIsLoading(true);

        try {
            const response = await fetch(`/api/profiles/${editingProfileId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });

            if (!response.ok) {
                const data = await response.json();
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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`ต้องการลบสูตร "${name}" หรือไม่?`)) return;

        try {
            const response = await fetch(`/api/profiles/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('ไม่สามารถลบได้');
            }

            toast.success('ลบสูตรสำเร็จ');
            router.refresh();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

    return (
        <div className="space-y-4">
            {/* Add Buttons */}
            <div className="flex items-center justify-end gap-2">
                <Button
                    type="button"
                    onClick={() => setIsCustomModalOpen(true)}
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-semibold gap-2"
                >
                    <Upload className="h-4 w-4" />
                    เพิ่มสูตร Custom (Drag & Drop ฉลาก)
                </Button>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
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
                                    <Label htmlFor="add-C">ยาฆ่ายุง (C)</Label>
                                    <Input
                                        id="add-C"
                                        type="number"
                                        step="any"
                                        value={formData.C}
                                        onChange={(e) => setFormData({ ...formData, C: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-S">น้ำมัน/น้ำ (S)</Label>
                                    <Input
                                        id="add-S"
                                        type="number"
                                        step="any"
                                        value={formData.S}
                                        onChange={(e) => setFormData({ ...formData, S: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-RA">ปริมาณพ่น</Label>
                                    <Input
                                        id="add-RA"
                                        type="number"
                                        step="any"
                                        value={formData.RA}
                                        onChange={(e) => setFormData({ ...formData, RA: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-RA_unit">หน่วย</Label>
                                    <Select
                                        value={formData.RA_unit}
                                        onValueChange={(value) => setFormData({ ...formData, RA_unit: value })}
                                    >
                                        <SelectTrigger id="add-RA_unit">
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

                            <div className="space-y-2">
                                <Label htmlFor="add-A0">พื้นที่มาตรฐาน (ตร.ม.)</Label>
                                <Input
                                    id="add-A0"
                                    type="number"
                                    step="1"
                                    value={formData.A0}
                                    onChange={(e) => setFormData({ ...formData, A0: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
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
                                    <Label htmlFor="edit-C">ยาฆ่ายุง (C)</Label>
                                    <Input
                                        id="edit-C"
                                        type="number"
                                        step="any"
                                        value={editData.C}
                                        onChange={(e) => setEditData({ ...editData, C: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-S">น้ำมัน/น้ำ (S)</Label>
                                    <Input
                                        id="edit-S"
                                        type="number"
                                        step="any"
                                        value={editData.S}
                                        onChange={(e) => setEditData({ ...editData, S: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-RA">ปริมาณพ่น</Label>
                                    <Input
                                        id="edit-RA"
                                        type="number"
                                        step="any"
                                        value={editData.RA}
                                        onChange={(e) => setEditData({ ...editData, RA: parseFloat(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-RA_unit">หน่วย</Label>
                                    <Select
                                        value={editData.RA_unit}
                                        onValueChange={(value) => setEditData({ ...editData, RA_unit: value })}
                                    >
                                        <SelectTrigger id="edit-RA_unit">
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

                            <div className="space-y-2">
                                <Label htmlFor="edit-A0">พื้นที่มาตรฐาน (ตร.ม.)</Label>
                                <Input
                                    id="edit-A0"
                                    type="number"
                                    step="1"
                                    value={editData.A0}
                                    onChange={(e) => setEditData({ ...editData, A0: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    ยกเลิก
                                </Button>
                                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
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

            {/* Table */}
            <div className="rounded-xl border border-slate-200/50 shadow-sm overflow-hidden mb-6 w-full">
                <div className="overflow-x-auto max-h-[70vh] md:max-h-150 overflow-y-auto w-full relative">
                    <Table className="whitespace-nowrap md:whitespace-normal text-sm md:text-base">
                        <TableHeader className="sticky top-0 z-10 bg-slate-50 border-b">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700 min-w-48">ชื่อสูตร</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center min-w-24">อัตราส่วน</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center min-w-28">ปริมาณพ่น</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center min-w-32">พื้นที่ (ตร.ม.)</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center min-w-24">สถานะ</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right min-w-24">จัดการ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        ยังไม่มีสูตรสารเคมี
                                    </TableCell>
                                </TableRow>
                            ) : (
                                profiles.map((profile) => (
                                    <TableRow key={profile.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-800">{profile.name}</p>
                                                {profile.description && (
                                                    <p className="text-sm text-slate-500">{profile.description}</p>
                                                )}
                                                <p className="text-xs text-indigo-500 mt-1">
                                                    {profile.mix_type === 2 ? '(แบบผสมกับ)' : '(แบบผสมให้ได้สุทธิ)'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono py-4">
                                            {profile.C}:{profile.S}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md text-slate-700 font-medium text-sm">
                                                {profile.RA} {profile.RA_unit === 'L' ? 'ลิตร' : 'มล.'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {profile.A0.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {profile.isDefault ? (
                                                <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-200">ค่าเริ่มต้น</Badge>
                                            ) : profile.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">ใช้งาน</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-rose-100 text-rose-700 border-none hover:bg-rose-100">ปิดใช้งาน</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => openEditDialog(profile)}
                                                    title="แก้ไขสูตร"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                                    onClick={() => handleDelete(profile.id, profile.name)}
                                                    title="ลบสูตร"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <CustomChemicalModal
                isOpen={isCustomModalOpen}
                onOpenChange={setIsCustomModalOpen}
                onSuccess={() => router.refresh()}
            />
        </div>
    );
}
