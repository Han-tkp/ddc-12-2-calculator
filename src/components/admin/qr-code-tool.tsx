'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QrCode, Download, Loader2, Link as LinkIcon, Pencil, Trash2, X, Check, ScanLine } from 'lucide-react';
import { BRAND } from '@/lib/theme';
import type { QrCodeRecord } from '@/lib/qr-codes';

const PAGE_SIZE = 10;

function formatThaiDate(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
}

async function toPngDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
        width: 512,
        margin: 2,
        color: { dark: BRAND.ink, light: '#ffffff' },
    });
}

function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Saved QR codes. The image encodes this system's short link (/q/<id>), never the
 * destination directly — that is what lets an admin repoint a destination without
 * invalidating signage that has already been printed and posted in the field.
 */
export function QrCodeTool() {
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [preview, setPreview] = useState<{ record: QrCodeRecord; dataUrl: string } | null>(null);

    const [codes, setCodes] = useState<QrCodeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shortLink = (id: string) => `${origin}/q/${id}`;

    const loadCodes = useCallback(async () => {
        try {
            const res = await fetch('/api/qr');
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถโหลดรายการได้');
            setCodes(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'ไม่สามารถโหลดรายการ QR Code ได้');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadCodes(); }, [loadCodes]);

    const handleCreate = async () => {
        if (!label.trim()) { toast.error('กรุณาระบุชื่อเรียก'); return; }
        if (!url.trim()) { toast.error('กรุณาระบุลิงก์'); return; }

        setCreating(true);
        try {
            const res = await fetch('/api/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: label.trim(), targetUrl: url.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกได้');

            setPreview({ record: data, dataUrl: await toPngDataUrl(shortLink(data.id)) });
            setLabel('');
            setUrl('');
            await loadCodes();
            setPage(1);
            toast.success('สร้างและบันทึก QR Code เรียบร้อยแล้ว');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'ไม่สามารถสร้าง QR Code ได้');
        } finally {
            setCreating(false);
        }
    };

    const handleSaveEdit = async (id: string) => {
        setBusyId(id);
        try {
            const res = await fetch(`/api/qr/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: editLabel.trim(), targetUrl: editUrl.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถแก้ไขได้');
            setEditingId(null);
            await loadCodes();
            toast.success('แก้ไขเรียบร้อย — QR Code เดิมที่พิมพ์ไปแล้วยังใช้งานได้');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'ไม่สามารถแก้ไขได้');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (record: QrCodeRecord) => {
        setBusyId(record.id);
        try {
            const res = await fetch(`/api/qr/${record.id}`, { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถยกเลิกได้');
            await loadCodes();
            toast.success(`ยกเลิก "${record.label}" แล้ว — ผู้ที่สแกนป้ายเดิมจะเห็นข้อความแจ้งยกเลิก`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกได้');
        } finally {
            setBusyId(null);
        }
    };

    const handleDownload = async (record: QrCodeRecord) => {
        try {
            const dataUrl = await toPngDataUrl(shortLink(record.id));
            downloadDataUrl(dataUrl, `qr-${record.id}.png`);
        } catch {
            toast.error('ไม่สามารถสร้างไฟล์รูปภาพได้');
        }
    };

    const totalPages = Math.max(1, Math.ceil(codes.length / PAGE_SIZE));
    const pageItems = codes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-brand-soft p-2.5 rounded-xl border border-brand/20 shadow-sm">
                    <QrCode className="h-6 w-6 text-brand" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-brand-ink">สร้าง QR Code</h1>
                    <p className="text-brand-muted text-sm">
                        QR ที่สร้างจะชี้มาที่ลิงก์สั้นของระบบ แล้วส่งต่อไปยังปลายทาง — แก้ปลายทางภายหลังได้โดยป้ายที่พิมพ์ไปแล้วยังใช้งานได้ปกติ
                    </p>
                </div>
            </div>

            {/* Create */}
            <div className="bg-white rounded-2xl border border-brand-line shadow-sm p-6 space-y-4 max-w-xl">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-brand-muted">ชื่อเรียก (สำหรับให้เจ้าหน้าที่จำได้)</Label>
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="เช่น ป้ายประชาสัมพันธ์ อบต.ควนลัง"
                        className="h-10 text-sm border-brand-line"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-brand-muted flex items-center gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5" /> ลิงก์ปลายทาง
                    </Label>
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-10 text-sm font-mono border-brand-line"
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
                    />
                </div>

                <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="gap-2 rounded-xl text-white bg-brand hover:bg-brand-dark"
                >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    สร้างและบันทึก
                </Button>

                {preview && (
                    <div className="flex flex-col items-center gap-3 pt-4 border-t border-brand-line">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.dataUrl} alt={`QR Code: ${preview.record.label}`} className="w-56 h-56 rounded-lg border border-brand-line" />
                        <p className="text-xs font-mono text-brand-muted break-all text-center">{shortLink(preview.record.id)}</p>
                        <Button variant="outline" onClick={() => downloadDataUrl(preview.dataUrl, `qr-${preview.record.id}.png`)} className="gap-2 rounded-xl border-brand-line">
                            <Download className="h-4 w-4" /> Save Image
                        </Button>
                    </div>
                )}
            </div>

            {/* Saved list */}
            <div className="rounded-xl border border-brand-line bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-line bg-brand-cloud">
                    <h2 className="text-sm font-bold text-brand-ink">QR Code ที่บันทึกไว้ ({codes.length.toLocaleString('th-TH')} รายการ)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-250">
                        <thead className="bg-brand-cloud text-brand-muted">
                            <tr>
                                <th className="p-3 font-semibold">ชื่อเรียก</th>
                                <th className="p-3 font-semibold">ปลายทาง</th>
                                <th className="p-3 font-semibold text-center">สแกน</th>
                                <th className="p-3 font-semibold whitespace-nowrap">สร้างเมื่อ</th>
                                <th className="p-3 font-semibold whitespace-nowrap">แก้ไขล่าสุด</th>
                                <th className="p-3 font-semibold text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-line">
                            {pageItems.map((code) => (
                                <tr key={code.id} className="hover:bg-brand-soft/40">
                                    {editingId === code.id ? (
                                        <>
                                            <td className="p-3">
                                                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-xs border-brand-line" />
                                            </td>
                                            <td className="p-3" colSpan={4}>
                                                <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="h-8 text-xs font-mono border-brand-line" />
                                            </td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <Button size="sm" variant="ghost" disabled={busyId === code.id} onClick={() => handleSaveEdit(code.id)} className="h-8 px-2 text-brand-dark">
                                                    {busyId === code.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 px-2 text-brand-muted">
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 font-semibold text-brand-ink max-w-56">
                                                <span className="block truncate" title={code.label}>{code.label}</span>
                                                <span className="block text-[11px] font-mono text-brand-muted">/q/{code.id}</span>
                                            </td>
                                            <td className="p-3 text-brand-muted max-w-72">
                                                <span className="block truncate font-mono text-xs" title={code.targetUrl}>{code.targetUrl}</span>
                                            </td>
                                            <td className="p-3 text-center tabular-nums font-semibold text-brand-dark">
                                                <span className="inline-flex items-center gap-1">
                                                    <ScanLine className="h-3.5 w-3.5 text-brand-muted" />{code.scanCount}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-brand-muted whitespace-nowrap">{formatThaiDate(code.createdAt)}</td>
                                            <td className="p-3 text-xs text-brand-muted whitespace-nowrap">{formatThaiDate(code.updatedAt)}</td>
                                            <td className="p-3 text-right whitespace-nowrap">
                                                <Button size="sm" variant="ghost" onClick={() => handleDownload(code)} className="h-8 px-2 text-brand-muted" title="ดาวน์โหลดรูป">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { setEditingId(code.id); setEditLabel(code.label); setEditUrl(code.targetUrl); }}
                                                    className="h-8 px-2 text-brand-muted"
                                                    title="แก้ไข"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={busyId === code.id}
                                                    onClick={() => handleDelete(code)}
                                                    className="h-8 px-2"
                                                    style={{ color: BRAND.critical }}
                                                    title="ยกเลิกการใช้งาน"
                                                >
                                                    {busyId === code.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {!loading && codes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-brand-muted">ยังไม่มี QR Code ที่บันทึกไว้</td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-brand-muted">กำลังโหลด...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-brand-line text-xs text-brand-muted">
                        <span>
                            แสดง {((page - 1) * PAGE_SIZE + 1).toLocaleString('th-TH')}–{Math.min(page * PAGE_SIZE, codes.length).toLocaleString('th-TH')} จาก {codes.length.toLocaleString('th-TH')} รายการ
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((n) => Math.max(1, n - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                            >
                                ก่อนหน้า
                            </button>
                            <span className="tabular-nums">{page} / {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-brand-line bg-white text-brand-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft"
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
