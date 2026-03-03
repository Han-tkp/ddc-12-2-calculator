'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCog, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UserActionsProps {
    user: any;
    currentUserId: string;
}

export function UserActions({ user, currentUserId }: UserActionsProps) {
    const router = useRouter();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState(user.role);

    const isSelf = user.id === currentUserId;

    const handleUpdateRole = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            });

            if (!res.ok) throw new Error('Failed to update user');
            
            toast.success('อัปเดตสิทธิ์สำเร็จ');
            setIsEditDialogOpen(false);
            router.refresh();
        } catch (error) {
            toast.error('ไม่สามารถอัปเดตสิทธิ์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');

            toast.success('ลบบัญชีผู้ใช้สำเร็จ');
            setIsDeleteDialogOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-600">
                        <UserCog className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>แก้ไขสิทธิ์</span>
                    </DropdownMenuItem>
                    {!isSelf && (
                        <DropdownMenuItem 
                            onClick={() => setIsDeleteDialogOpen(true)}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>ลบบัญชี</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>แก้ไขสิทธิ์การใช้งาน</DialogTitle>
                        <DialogDescription>
                            ปรับเปลี่ยนสิทธิ์ของผู้ใช้นี้ในระบบ
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                สิทธิ์ใหม่
                            </Label>
                            <div className="col-span-3">
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="เลือกสิทธิ์" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">ผู้ใช้งานทั่วไป (USER)</SelectItem>
                                        <SelectItem value="ADMIN">ผู้ดูแลระบบ (ADMIN)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleUpdateRole} disabled={isLoading || role === user.role}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">ยืนยันการลบบัญชี</DialogTitle>
                        <DialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
                            และผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีกต่อไป
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isLoading}>
                            ยกเลิก
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            ยืนยันการลบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
