'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RefreshCw, CheckCircle2, Globe, Lock, Eye, X, Database, Terminal } from 'lucide-react';
import { toast } from 'sonner';

const MCP_SETTINGS_KEY = 'mcp-settings';
const DEFAULT_FEATURES = 'docs,account,database,debugging,development,functions,branching';

/**
 * Derives the Supabase project ref from the public project URL
 * (https://<ref>.supabase.co) so it stays in sync with the deployment instead of
 * being hardcoded. The ref is not a secret — it appears in every public API URL.
 */
function getProjectRef(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    return match?.[1] ?? '';
}

interface MpcSettingsFormProps {
    onClose?: () => void;
}

export function MpcSettingsForm({ onClose }: MpcSettingsFormProps) {
    const [mcpSettings, setMcpSettings] = useState({ readOnly: true, features: DEFAULT_FEATURES });
    const [saved, setSaved] = useState(false);

    const projectRef = getProjectRef();

    useEffect(() => {
        const mcp = localStorage.getItem(MCP_SETTINGS_KEY);
        if (mcp) {
            try {
                const parsed = JSON.parse(mcp);
                setMcpSettings({
                    readOnly: parsed.readOnly ?? true,
                    features: parsed.features ?? DEFAULT_FEATURES,
                });
            } catch { /* */ }
        }
    }, []);

    const mcpUrl = `https://mcp.supabase.com/mcp?project_ref=${projectRef}&read_only=${mcpSettings.readOnly}&features=${mcpSettings.features}`;

    const handleSave = () => {
        localStorage.setItem(MCP_SETTINGS_KEY, JSON.stringify({ ...mcpSettings, projectRef }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success('บันทึกการตั้งค่าเรียบร้อย');
    };

    const handleReset = () => {
        setMcpSettings({ readOnly: true, features: DEFAULT_FEATURES });
        toast.success('รีเซ็ตเป็นค่าปกติ');
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-brand to-brand-dark px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">ตั้งค่าระบบเชื่อมต่อ</h2>
                        <p className="text-[11px] text-white/70">กำหนดสิทธิ์การเข้าถึงฐานข้อมูลสำหรับเครื่องมือภายนอก</p>
                    </div>
                </div>
                {onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* โปรเจคที่ใช้ */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-slate-400" /> โปรเจคที่เชื่อมต่ออยู่
                    </Label>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 font-mono">
                        {projectRef || 'ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL'}
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-4">
                    {/* สิทธิ์การเข้าถึง */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-slate-400" /> สิทธิ์การเข้าถึง
                        </Label>
                        <select
                            value={mcpSettings.readOnly ? 'true' : 'false'}
                            onChange={(e) => setMcpSettings({ ...mcpSettings, readOnly: e.target.value === 'true' })}
                            className="flex h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs transition-colors focus:border-brand/60 focus:ring-2 focus:ring-brand/20 focus:bg-white"
                        >
                            <option value="true">อ่านอย่างเดียว (แนะนำ — ปลอดภัย)</option>
                            <option value="false">อ่านและเขียนได้ (สำหรับผู้ดูแลระบบ)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">เลือก &quot;อ่านอย่างเดียว&quot; ถ้าแค่ต้องการค้นหาข้อมูล</p>
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
                    <Button onClick={handleSave} className="h-9 gap-2 bg-brand hover:bg-brand-dark text-white text-xs px-4 rounded-xl">
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
