'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Plus, Trash2, Save, Key, Globe, Lock, CheckCircle2, AlertTriangle,
    Database, ExternalLink, Copy, Eye, EyeOff, Star, Edit3, X, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiCredential {
    id: string;
    name: string;
    projectRef: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
    geminiApiKey: string;
}

const STORAGE_KEY = 'api-credentials';
const ACTIVE_KEY = 'active-credential-id';

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function CredentialsPage() {
    const [credentials, setCredentials] = useState<ApiCredential[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [editId, setEditId] = useState<string | null>(null);

    const [form, setForm] = useState<ApiCredential>({
        id: '',
        name: '',
        projectRef: '',
        supabaseUrl: '',
        supabaseAnonKey: '',
        supabaseServiceKey: '',
        geminiApiKey: '',
    });

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { setCredentials(JSON.parse(stored)); } catch { /* */ }
        }
        const active = localStorage.getItem(ACTIVE_KEY);
        if (active) setActiveId(active);
    }, []);

    const saveToLocal = (list: ApiCredential[], active: string | null) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        if (active) localStorage.setItem(ACTIVE_KEY, active);
        setCredentials(list);
        setActiveId(active);
    };

    const resetForm = () => {
        setForm({ id: '', name: '', projectRef: '', supabaseUrl: '', supabaseAnonKey: '', supabaseServiceKey: '', geminiApiKey: '' });
        setEditId(null);
        setShowForm(false);
    };

    const handleSubmit = () => {
        if (!form.name.trim()) {
            toast.error('กรุณาตั้งชื่อโปรเจค');
            return;
        }
        if (!form.projectRef.trim()) {
            toast.error('กรุณากรอกรหัสโปรเจค (Project Ref)');
            return;
        }

        let updated: ApiCredential[];
        if (editId) {
            updated = credentials.map(c => c.id === editId ? { ...form, id: editId } : c);
            toast.success(`อัปเดต "${form.name}" เรียบร้อย`);
        } else {
            const newCred = { ...form, id: generateId() };
            updated = [...credentials, newCred];
            toast.success(`เพิ่ม "${form.name}" เรียบร้อย`);
        }
        saveToLocal(updated, activeId);
        resetForm();
    };

    const handleDelete = (id: string) => {
        const name = credentials.find(c => c.id === id)?.name || '';
        const updated = credentials.filter(c => c.id !== id);
        const newActive = activeId === id ? (updated[0]?.id || null) : activeId;
        saveToLocal(updated, newActive);
        toast.success(`ลบ "${name}" เรียบร้อย`);
    };

    const handleEdit = (cred: ApiCredential) => {
        setForm(cred);
        setEditId(cred.id);
        setShowForm(true);
    };

    const handleSetActive = (id: string) => {
        saveToLocal(credentials, id);
        toast.success('เปลี่ยนโปรเจคที่ใช้งานเรียบร้อย');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('คัดลอกแล้ว');
    };

    const toggleShowKey = (id: string) => {
        setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const maskKey = (key: string) => {
        if (key.length <= 8) return '••••••••';
        return key.slice(0, 4) + '••••' + key.slice(-4);
    };

    return (
        <div className="pb-12 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Key className="h-5 w-5 text-indigo-600" /> จัดการคีย์เชื่อมต่อ
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        เพิ่มข้อมูลโปรเจค Supabase และคีย์ต่างๆ เพื่อใช้ในระบบ AI / MCP
                    </p>
                </div>
                {!showForm && (
                    <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 text-sm h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
                        <Plus className="h-4 w-4" /> เพิ่มโปรเจค
                    </Button>
                )}
            </div>

            {/* Form เพิ่ม/แก้ไข */}
            {showForm && (
                <Card className="mb-6 border-indigo-100">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-800">
                            {editId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {editId ? 'แก้ไขโปรเจค' : 'เพิ่มโปรเจคใหม่'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">ชื่อโปรเจค <span className="text-red-500">*</span></Label>
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น โปรเจค DDC สงขลา" className="h-9 text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">รหัสโปรเจค (Project Ref) <span className="text-red-500">*</span></Label>
                                <Input value={form.projectRef} onChange={e => setForm({ ...form, projectRef: e.target.value })} placeholder="qggguodrxmacqpqujkqq" className="h-9 text-xs font-mono" />
                                <p className="text-[10px] text-slate-400">หาได้จาก Settings → API → Project Ref ใน Supabase</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">Supabase URL</Label>
                                <Input value={form.supabaseUrl} onChange={e => setForm({ ...form, supabaseUrl: e.target.value })} placeholder="https://xxxxx.supabase.co" className="h-9 text-xs font-mono" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">Anon Public Key</Label>
                                <div className="relative">
                                    <Input value={form.supabaseAnonKey} onChange={e => setForm({ ...form, supabaseAnonKey: e.target.value })} placeholder="eyJhbGciOiJIUzI1NiIs..." className="h-9 text-xs font-mono pr-8" type={showKeys['form-anon'] ? 'text' : 'password'} />
                                    <button onClick={() => toggleShowKey('form-anon')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showKeys['form-anon'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">Service Role Key</Label>
                                <div className="relative">
                                    <Input value={form.supabaseServiceKey} onChange={e => setForm({ ...form, supabaseServiceKey: e.target.value })} placeholder="eyJhbGciOiJIUzI1NiIs..." className="h-9 text-xs font-mono pr-8" type={showKeys['form-service'] ? 'text' : 'password'} />
                                    <button onClick={() => toggleShowKey('form-service')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showKeys['form-service'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-600">Gemini API Key (ถ้ามี)</Label>
                                <div className="relative">
                                    <Input value={form.geminiApiKey} onChange={e => setForm({ ...form, geminiApiKey: e.target.value })} placeholder="AIzaSy..." className="h-9 text-xs font-mono pr-8" type={showKeys['form-gemini'] ? 'text' : 'password'} />
                                    <button onClick={() => toggleShowKey('form-gemini')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showKeys['form-gemini'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-5">
                            <Button onClick={handleSubmit} className="h-9 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 rounded-xl">
                                <Save className="h-3.5 w-3.5" /> {editId ? 'บันทึกการแก้ไข' : 'เพิ่มโปรเจค'}
                            </Button>
                            <Button onClick={resetForm} variant="outline" className="h-9 text-xs px-4 rounded-xl">
                                ยกเลิก
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* รายการโปรเจค */}
            {credentials.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Database className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium">ยังไม่มีข้อมูลโปรเจค</p>
                    <p className="text-sm mt-1">กด "เพิ่มโปรเจค" เพื่อเพิ่มโปรเจค Supabase ของคุณ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {credentials.map(cred => {
                        const isActive = cred.id === activeId;
                        const mcpUrl = `https://mcp.supabase.com/mcp?project_ref=${cred.projectRef}&read_only=true&features=docs,account,database`;

                        return (
                            <Card key={cred.id} className={`border ${isActive ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'} transition-all`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-800 text-sm">{cred.name}</h3>
                                                {isActive && (
                                                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                                        <CheckCircle2 className="h-3 w-3" /> กำลังใช้
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-2 space-y-1 text-xs text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-3 w-3 shrink-0" />
                                                    <span className="font-mono">{cred.projectRef}</span>
                                                    <button onClick={() => copyToClipboard(cred.projectRef)} className="text-slate-400 hover:text-indigo-600">
                                                        <Copy className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                {cred.supabaseUrl && <div className="flex items-center gap-2"><Database className="h-3 w-3 shrink-0" /><span className="truncate">{cred.supabaseUrl}</span></div>}
                                                {cred.supabaseAnonKey && (
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="h-3 w-3 shrink-0" />
                                                        <span className="font-mono">{showKeys[cred.id] ? cred.supabaseAnonKey : maskKey(cred.supabaseAnonKey)}</span>
                                                        <button onClick={() => toggleShowKey(cred.id)} className="text-slate-400 hover:text-slate-600">
                                                            {showKeys[cred.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                        </button>
                                                    </div>
                                                )}
                                                {cred.supabaseServiceKey && (
                                                    <div className="flex items-center gap-2">
                                                        <Lock className="h-3 w-3 shrink-0" />
                                                        <span className="font-mono">{showKeys[`sv-${cred.id}`] ? cred.supabaseServiceKey : maskKey(cred.supabaseServiceKey)}</span>
                                                        <button onClick={() => toggleShowKey(`sv-${cred.id}`)} className="text-slate-400 hover:text-slate-600">
                                                            {showKeys[`sv-${cred.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2">
                                                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-[10px] font-mono text-emerald-600 break-all select-all">
                                                    {mcpUrl}
                                                </div>
                                                <button onClick={() => copyToClipboard(mcpUrl)} className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1">
                                                    <Copy className="h-3 w-3" /> คัดลอกลิงก์ MCP
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-3 shrink-0">
                                            {!isActive && (
                                                <Button variant="ghost" size="sm" onClick={() => handleSetActive(cred.id)} className="h-8 text-xs gap-1 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="เลือกใช้โปรเจคนี้">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> ใช้
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(cred)} className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600" title="แก้ไข">
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(cred.id)} className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" title="ลบ">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-indigo-900">ข้อมูลนี้เก็บไว้ในเครื่องคุณเท่านั้น</h3>
                        <p className="text-xs text-indigo-700 mt-1">
                            คีย์และรหัสต่างๆ จะถูกบันทึกไว้ใน <strong>Local Storage</strong> ของเบราว์เซอร์นี้เท่านั้น
                            ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์ภายนอก (ยกเว้นการเชื่อมต่อไปยัง Supabase โดยตรงตามคีย์ที่ให้ไว้)
                        </p>
                        <p className="text-xs text-indigo-700 mt-1">
                            หากเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์ จะต้องตั้งค่าใหม่
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
