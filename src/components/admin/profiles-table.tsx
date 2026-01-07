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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Profile {
    id: string;
    name: string;
    description: string | null;
    C: number;
    S: number;
    RA: number;
    RA_unit: string;
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
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        C: 1,
        S: 79,
        RA: 1,
        RA_unit: 'L',
        A0: 1000,
    });

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
            setFormData({
                name: '',
                description: '',
                C: 1,
                S: 79,
                RA: 1,
                RA_unit: 'L',
                A0: 1000,
            });
            router.refresh();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            }
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

    return (
        <div className="space-y-4">
            {/* Add Button */}
            <div className="flex justify-end">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
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
                                <Label htmlFor="name">ชื่อสูตร</Label>
                                <Input
                                    id="name"
                                    placeholder="เช่น หมอกควัน 1:79"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">คำอธิบาย (ถ้ามี)</Label>
                                <Input
                                    id="description"
                                    placeholder="เช่น สำหรับเครื่องพ่นหมอกควัน"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="grid grid-cols-2 gap-4">
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
                                            <SelectItem value="cc">ซีซี</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <Button type="submit" disabled={isLoading}>
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
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ชื่อสูตร</TableHead>
                            <TableHead className="text-center">อัตราส่วน</TableHead>
                            <TableHead className="text-center">ปริมาณพ่น</TableHead>
                            <TableHead className="text-center">พื้นที่ (ตร.ม.)</TableHead>
                            <TableHead className="text-center">สถานะ</TableHead>
                            <TableHead className="text-right">จัดการ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    ยังไม่มีสูตรสารเคมี
                                </TableCell>
                            </TableRow>
                        ) : (
                            profiles.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{profile.name}</p>
                                            {profile.description && (
                                                <p className="text-sm text-muted-foreground">{profile.description}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-mono">
                                        {profile.C}:{profile.S}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {profile.RA} {profile.RA_unit === 'L' ? 'ลิตร' : 'ซีซี'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {profile.A0.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {profile.isDefault ? (
                                            <Badge variant="secondary">ค่าเริ่มต้น</Badge>
                                        ) : profile.isActive ? (
                                            <Badge className="bg-green-100 text-green-700">ใช้งาน</Badge>
                                        ) : (
                                            <Badge variant="destructive">ปิดใช้งาน</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" disabled={profile.isDefault}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleDelete(profile.id, profile.name)}
                                                disabled={profile.isDefault}
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
    );
}
