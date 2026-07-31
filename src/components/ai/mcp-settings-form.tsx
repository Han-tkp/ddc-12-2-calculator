'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, RefreshCw, CheckCircle2, Globe, Lock, Eye, X, Key, ExternalLink, Database, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ApiCredential {
    id: string;
    name: string;
    projectRef: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
    geminiApiKey: string;
}

const CREDENTIALS_KEY = 'api-credentials';
const ACTIVE_CREDENTIAL_KEY = 'active-credential-id';

const DEFAULT_CREDENTIAL: ApiCredential = {
    id: 'default',
    name: 'โปรเจคหลัก (DDC)',
    projectRef: 'qggguodrxmacqpqujkqq',
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
    geminiApiKey: '',
};

interface MpcSettingsFormProps {
    onClose?: () => void;
}

export function MpcSettingsForm({ onClose }: MpcSettingsFormProps) {
    const [credentials, setCredentials] = useState<ApiCredential[]>([]);
    const [activeId, setActiveId] = useState<string>('default');
    const [mcpSettings, setMcpSettings] = useState({ readOnly: true, features: 'docs,account,database,debugging,development,functions,branching' });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(CREDENTIALS_KEY);
        if (stored) {
            try { setCredentials(JSON.parse(stored)); } catch { /* */ }
        }
        const active = localStorage.getItem(ACTIVE_CREDENTIAL_KEY);
        if (active) setActiveId(active);
        const mcp = localStorage.getItem('mcp-settings');
        if (mcp) {
            try {
                const parsed = JSON.parse(mcp);
                setMcpSettings({ readOnly: parsed.readOnly ?? true, features: parsed.features ?? 'docs,account,database,debugging,development,functions,branching' });
            } catch { /* */ }
        }
    }, []);

    const activeCred = credentials.find(c => c.id === activeId) || null;
    const projectRef = activeCred?.projectRef || DEFAULT_CREDENTIAL.projectRef;
    const mcpUrl = `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=${mcpSettings.readOnly}&features=${mcpSettings.features}`;

    const handleSave = () => {
        const mcpPayload = { ...mcpSettings, projectRef };
        localStorage.setItem('mcp-settings', JSON.stringify(mcpPayload));
        localStorage.setItem(ACTIVE_CREDENTIAL_KEY, activeId);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success('บันทึกการตั้งค่าเรียบร้อย');
    };

    const handleReset = () => {
        setMcpSettings({ readOnly: true, features: 'docs,account,database,debugging,development,functions,branching' });
        toast.success('รีเซ็ตเป็นค่าปกติ');
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-indigo-200" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">ตั้งค่าระบบเชื่อมต่อ</h2>
                        <p className="text-[11px] text-indigo-200">เลือกโปรเจคและกำหนดสิทธิ์การเข้าถึงฐานข้อมูล</p>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-indigo-200 hover:text-white hover:bg-white/10 h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* เลือกโปรเจค */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-slate-400" /> เลือกโปรเจคที่ต้องการใช้
                    </Label>
                    {credentials.length > 0 ? (
                        <Select value={activeId} onValueChange={setActiveId}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="เลือกโปรเจค..." />
                            </SelectTrigger>
                            <SelectContent>
                                {credentials.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
                            ยังไม่มีโปรเจคที่บันทึกไว้ — ไปที่หน้า <Link href="/admin/credentials" className="font-bold underline">จัดการคีย์เชื่อมต่อ</Link> เพื่อเพิ่ม
                        </div>
                    )}
                    <Link href="/admin/credentials" className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" /> จัดการคีย์เชื่อมต่อทั้งหมด
                    </Link>
                </div>

                {activeCred && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700">{activeCred.name}</span>
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">กำลังใช้</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">รหัสโปรเจค: {activeCred.projectRef}</div>
                        {activeCred.supabaseUrl && (
                            <div className="text-[11px] text-slate-500 font-mono truncate">URL: {activeCred.supabaseUrl}</div>
                        )}
                    </div>
                )}

                <div className="border-t border-slate-100 pt-4 space-y-4">
                    {/* สิทธิ์การเข้าถึง */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-slate-400" /> สิทธิ์การเข้าถึง
                        </Label>
                        <select
                            value={mcpSettings.readOnly ? 'true' : 'false'}
                            onChange={(e) => setMcpSettings({ ...mcpSettings, readOnly: e.target.value === 'true' })}
                            className="flex h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 focus:bg-white"
                        >
                            <option value="true">อ่านอย่างเดียว (แนะนำ — ปลอดภัย)</option>
                            <option value="false">อ่านและเขียนได้ (สำหรับผู้ดูแลระบบ)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">เลือก "อ่านอย่างเดียว" ถ้าแค่ต้องการค้นหาข้อมูล</p>
                    </div>

                    {/* ความสามารถที่เปิดใช้ */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-slate-400" /> ความสามารถที่เปิดใช้
                        </Label>
                        <Input
                            value={mcpSettings.features}
                            onChange={(e) => setMcpSettings({ ...mcpSettings, features: e.target.value })}
                            placeholder="docs,account,database"
                            className="h-9 text-xs font-mono bg-slate-50 border-slate-200 focus:bg-white"
                        />
                        <p className="text-[10px] text-slate-400">รายการความสามารถ คั่นด้วยเครื่องหมาย , (เช่น docs,account,database)</p>
                    </div>

                    {/* ลิงก์เชื่อมต่อ */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-slate-400" /> ลิงก์สำหรับเชื่อมต่อ
                        </Label>
                        <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs leading-relaxed border border-slate-700 break-all select-all">
                            {mcpUrl}
                        </div>
                        <p className="text-[10px] text-slate-400">คัดลอกลิงก์นี้ไปใช้ในโปรแกรม Gemini CLI หรือเครื่องมืออื่นๆ</p>
                    </div>
                </div>

                {/* ปุ่ม */}
                <div className="flex items-center gap-3 pt-1">
                    <Button onClick={handleSave} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 rounded-xl">
                        {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                        {saved ? 'บันทึกแล้ว' : 'บันทึก'}
                    </Button>
                    <Button onClick={handleReset} variant="outline" className="h-9 gap-2 text-xs px-4 rounded-xl border-slate-200">
                        <RefreshCw className="h-3.5 w-3.5" /> รีเซ็ต
                    </Button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-3">
                    <Terminal className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold mb-0.5">สำหรับผู้ใช้ Gemini CLI</p>
                        <p>รันคำสั่ง <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">/mcp auth supabase</code> เพื่อเชื่อมต่อสิทธิ์ แล้ววางลิงก์ด้านบน</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
