'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Cpu,
    CheckCircle2,
    XCircle,
    ArrowUp,
    ArrowDown,
    Save,
    RefreshCw,
    Plug,
    Activity,
    Trash2,
    Bot,
    Clock,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import {
    AI_SETTINGS_KEY,
    DEFAULT_AI_SETTINGS,
    normalizeAISettings,
} from '@/lib/ai/settings';
import type { AIClientSettings, AIProviderName } from '@/lib/ai/settings';
import type { AICallLog } from '@/lib/ai/usage';

const PROVIDERS: { name: AIProviderName; displayName: string; color: string }[] = [
    { name: 'gemini', displayName: 'Gemini (Google)', color: 'text-blue-600' },
    { name: 'anthropic', displayName: 'Claude (Anthropic)', color: 'text-orange-600' },
    { name: 'openrouter', displayName: 'OpenRouter', color: 'text-violet-600' },
    { name: 'openai', displayName: 'OpenAI', color: 'text-emerald-600' },
];

interface ProviderStatus {
    name: AIProviderName;
    displayName: string;
    configured: boolean;
    defaultModel: string;
}

export default function AdminAIPage() {
    const [settings, setSettings] = useState<AIClientSettings>(DEFAULT_AI_SETTINGS);
    const [loaded, setLoaded] = useState(false);
    const [status, setStatus] = useState<ProviderStatus[] | null>(null);
    const [testing, setTesting] = useState<AIProviderName | null>(null);
    const [logs, setLogs] = useState<AICallLog[]>([]);
    const [quotaState, setQuotaState] = useState<Record<string, { perMinute: number; perHour: number }>>({});

    const loadStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/ai/status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data.providers);
            }
        } catch { /* */ }
    }, []);

    const loadUsage = useCallback(async () => {
        try {
            const res = await fetch('/api/ai/usage?limit=100');
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setQuotaState(data.quotaState);
            }
        } catch { /* */ }
    }, []);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(AI_SETTINGS_KEY);
            const parsed = normalizeAISettings(raw ? JSON.parse(raw) : undefined);
            setSettings(parsed ?? DEFAULT_AI_SETTINGS);
        } catch { /* */ }
        setLoaded(true);
        loadStatus();
        loadUsage();
    }, [loadStatus, loadUsage]);

    const persist = (next: AIClientSettings) => {
        setSettings(next);
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(next));
    };

    const setEnabled = (name: AIProviderName, enabled: boolean) => {
        persist({
            ...settings,
            providers: { ...settings.providers, [name]: { ...settings.providers[name], enabled } },
        });
    };

    const setModel = (name: AIProviderName, model: string) => {
        persist({
            ...settings,
            providers: { ...settings.providers, [name]: { ...settings.providers[name], model } },
        });
    };

    const moveOrder = (index: number, dir: -1 | 1) => {
        const order = [...settings.order];
        const target = index + dir;
        if (target < 0 || target >= order.length) return;
        [order[index], order[target]] = [order[target], order[index]];
        persist({ ...settings, order });
    };

    const handleSave = () => {
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
        toast.success('บันทึกการตั้งค่า AI เรียบร้อย');
    };

    const handleReset = () => {
        localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(DEFAULT_AI_SETTINGS));
        setSettings(DEFAULT_AI_SETTINGS);
        toast.success('รีเซ็ตเป็นค่าเริ่มต้น');
    };

    const handleTest = async (name: AIProviderName) => {
        setTesting(name);
        try {
            const res = await fetch('/api/ai/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: name, model: settings.providers[name]?.model || undefined }),
            });
            const data = await res.json();
            if (data.ok) {
                toast.success(`${data.provider}/${data.model} ตอบกลับใน ${data.latencyMs}ms`);
            } else {
                toast.error(`${name}: ${data.error || 'การเชื่อมต่อล้มเหลว'}`);
            }
            loadUsage();
        } catch (err: any) {
            toast.error(`${name}: ${err.message || 'ไม่สามารถทดสอบได้'}`);
        } finally {
            setTesting(null);
        }
    };

    const handleClearLogs = async () => {
        await fetch('/api/ai/usage', { method: 'DELETE' });
        setLogs([]);
        setQuotaState({});
        toast.success('ล้าง log เรียบร้อย');
    };

    if (!loaded) return <div className="p-6 text-sm text-slate-400">กำลังโหลด...</div>;

    return (
        <div className="p-4 md:p-6 space-y-6 pb-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-indigo-600" />
                    <h1 className="text-lg font-bold text-slate-800">ตั้งค่า AI Provider</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset} className="h-8 text-xs gap-1.5 rounded-xl">
                        <RefreshCw className="h-3.5 w-3.5" /> รีเซ็ต
                    </Button>
                    <Button size="sm" onClick={handleSave} className="h-8 text-xs gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Save className="h-3.5 w-3.5" /> บันทึก
                    </Button>
                </div>
            </div>

            <p className="text-xs text-slate-500 -mt-3">
                คีย์ API ถูกเก็บฝั่งเซิร์ฟเวอร์ (env) เท่านั้น — หน้าที่นี้จัดการลำดับสำรอง, การเปิด/ปิด provider และ model ที่ใช้
            </p>

            {/* Provider order + cards */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Plug className="h-3.5 w-3.5 text-slate-400" /> ลำดับสำรอง (fallback order)
                    </Label>
                    <p className="text-[11px] text-slate-400">
                        ถ้า provider แรกล้มเหลว (429/หมดโควตา/timeout) จะย้ายไป provider ถัดไปโดยอัตโนมัติ
                    </p>
                    <div className="space-y-2">
                        {settings.order.map((name, idx) => {
                            const meta = PROVIDERS.find(p => p.name === name);
                            const st = status?.find(s => s.name === name);
                            return (
                                <div key={name} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <span>{meta?.displayName || name}</span>
                                            {st?.configured ? (
                                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <CheckCircle2 className="h-3 w-3" /> พร้อมใช้
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                                    <XCircle className="h-3 w-3" /> ยังไม่ได้ตั้ง key
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono truncate">
                                            {st?.defaultModel || ''}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => moveOrder(idx, -1)} className="h-7 w-7 p-0 text-slate-400" title="เลื่อนขึ้น">
                                            <ArrowUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" disabled={idx === settings.order.length - 1} onClick={() => moveOrder(idx, 1)} className="h-7 w-7 p-0 text-slate-400" title="เลื่อนลง">
                                            <ArrowDown className="h-3.5 w-3.5" />
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setEnabled(name, settings.providers[name]?.enabled === false)}
                                            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                                                settings.providers[name]?.enabled === false ? 'bg-slate-300' : 'bg-emerald-500'
                                            }`}
                                            title={settings.providers[name]?.enabled === false ? 'เปิดใช้' : 'ปิดใช้'}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                                settings.providers[name]?.enabled === false ? '' : 'translate-x-4'
                                            }`} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Global settings + provider model cards */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                        <Label className="text-xs font-medium text-slate-600">ค่าทั่วไป</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[11px] text-slate-500">อุณหภูมิ (temperature)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={settings.temperature ?? 0.3}
                                    onChange={(e) => persist({ ...settings, temperature: Number(e.target.value) || undefined })}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[11px] text-slate-500">Max tokens</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={16384}
                                    step={256}
                                    value={settings.maxTokens ?? 2048}
                                    onChange={(e) => persist({ ...settings, maxTokens: Number(e.target.value) || undefined })}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {settings.order.map((name) => {
                        const meta = PROVIDERS.find(p => p.name === name);
                        const st = status?.find(s => s.name === name);
                        return (
                            <div key={`card-${name}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bot className={`h-4 w-4 ${meta?.color || 'text-slate-500'}`} />
                                        <span className="text-sm font-medium text-slate-700">{meta?.displayName || name}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={testing === name || !st?.configured}
                                        onClick={() => handleTest(name)}
                                        className="h-7 text-[11px] gap-1 rounded-lg border-slate-200"
                                    >
                                        {testing === name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
                                        ทดสอบ
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder={`model (default: ${st?.defaultModel || ''})`}
                                        value={settings.providers[name]?.model ?? ''}
                                        onChange={(e) => setModel(name, e.target.value)}
                                        className="h-8 text-xs font-mono flex-1"
                                        disabled={settings.providers[name]?.enabled === false}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Usage log */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> ประวัติการเรียกใช้ AI (runtime, ในหน่วยความจำ)
                    </Label>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={loadUsage} className="h-7 text-[11px] gap-1 text-slate-400">
                            <RefreshCw className="h-3 w-3" /> รีเฟรช
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClearLogs} className="h-7 text-[11px] gap-1 text-red-500">
                            <Trash2 className="h-3 w-3" /> ล้าง
                        </Button>
                    </div>
                </div>

                {Object.keys(quotaState).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(quotaState).map(([name, q]) => (
                            <span key={name} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                                {name}: {q.perMinute} ครั้ง/นาที · {q.perHour} ครั้ง/ชม.
                            </span>
                        ))}
                    </div>
                )}

                {logs.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center">
                        ยังไม่มี log — ส่งข้อความในหน้า AI Chatbot หรือทดสอบ provider ด้านบน
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-slate-400 border-b border-slate-100">
                                    <th className="py-1.5 pr-3 font-medium">เวลา</th>
                                    <th className="py-1.5 pr-3 font-medium">Provider</th>
                                    <th className="py-1.5 pr-3 font-medium">Model</th>
                                    <th className="py-1.5 pr-3 font-medium">ประเภท</th>
                                    <th className="py-1.5 pr-3 font-medium">Latency</th>
                                    <th className="py-1.5 pr-3 font-medium">Tokens</th>
                                    <th className="py-1.5 font-medium">ผลลัพธ์</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className="border-b border-slate-50 text-slate-600">
                                        <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-slate-400">
                                            {new Date(log.ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="py-1.5 pr-3 font-medium">{log.provider}</td>
                                        <td className="py-1.5 pr-3 font-mono">{log.model}</td>
                                        <td className="py-1.5 pr-3">{log.kind}</td>
                                        <td className="py-1.5 pr-3 font-mono">{log.latencyMs}ms</td>
                                        <td className="py-1.5 pr-3 font-mono">
                                            {log.inputTokens !== undefined ? `${log.inputTokens}→${log.outputTokens ?? 0}` : '-'}
                                        </td>
                                        <td className="py-1.5">
                                            {log.ok ? (
                                                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>
                                            ) : (
                                                <span className="text-red-500 flex items-center gap-1" title={log.error?.message}>
                                                    <AlertTriangle className="h-3 w-3" /> {log.error?.kind || 'error'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
