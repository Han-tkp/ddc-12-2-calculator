'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MpcSettingsForm } from '@/components/ai/mcp-settings-form';
import {
    Bot,
    Send,
    User,
    CheckCircle2,
    AlertTriangle,
    FlaskConical,
    Clock,
    RefreshCw,
    Settings,
    Calculator,
    Paperclip,
    FileSpreadsheet,
    FileText,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { recordTrackingCalculation } from '@/lib/track-calculation';
import type { FormulaVariable } from '@/lib/formula-engine';
import { parseFile, fileToFormulaVariables, type ParsedFile } from '@/lib/file-import';
import { ResultHelpEditor } from '@/components/calculator/result-help-editor';

export function formulaSchemaToVariables(schema: FormulaSchema): FormulaVariable[] {
    const id = () => Math.random().toString(36).slice(2, 9);
    const vars: FormulaVariable[] = [
        { id: id(), name: 'C', expression: String(schema.C), unit: 'ส่วน', description: 'สัดส่วนสารออกฤทธิ์' },
        { id: id(), name: 'S', expression: String(schema.S), unit: 'ส่วน', description: 'สัดส่วนตัวทำละลาย' },
        { id: id(), name: 'RA', expression: String(schema.RA), unit: schema.RA_unit, description: 'อัตราการพ่น' },
        { id: id(), name: 'tank', expression: String(schema.tankCapacity), unit: 'L', description: 'ขนาดถังพ่น' },
        { id: id(), name: 'A0', expression: String(schema.A0), unit: 'ml/L', description: 'ความเข้มข้นสารออกฤทธิ์' },
    ];
    if (schema.mix_type === 2) {
        vars.push(
            { id: id(), name: 'chemical_per_tank', expression: 'tank * 1000 * C / S', unit: 'ml', description: 'ปริมาณสารเคมีต่อถัง' },
            { id: id(), name: 'solvent_per_tank', expression: 'tank * 1000 - chemical_per_tank', unit: 'ml', description: 'ปริมาณตัวทำละลายต่อถัง' },
        );
    } else {
        vars.push(
            { id: id(), name: 'ratio_total', expression: 'C + S', unit: 'ส่วน', description: 'รวมสัดส่วนทั้งหมด' },
            { id: id(), name: 'chemical_per_tank', expression: 'tank * 1000 * C / ratio_total', unit: 'ml', description: 'ปริมาณสารเคมีต่อถัง' },
            { id: id(), name: 'solvent_per_tank', expression: 'tank * 1000 * S / ratio_total', unit: 'ml', description: 'ปริมาณตัวทำละลายต่อถัง' },
        );
    }
    return vars;
}

export interface FormulaSchema {
    name: string;
    description: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number;
    A0: number;
    tankCapacity: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    formula?: FormulaSchema;
    file?: ParsedFile;
    timestamp: string;
    meta?: { provider?: string; model?: string };
}

const QUICK_PROMPTS = [
    { label: 'หมอกควัน Fogging', query: 'ช่วยคำนวณและสร้างสูตรพ่นหมอกควัน กำจัดยุงลาย' },
    { label: 'ULV ฝอยละเอียด', query: 'ช่วยสร้างสูตรผสมยาสำหรับพ่น ULV ฝอยละเอียด' },
    { label: 'ถัง 10 ลิตร', query: 'ขอสูตรสัดส่วนตวงต่อถังพ่นเคมี 10 ลิตร' },
    { label: 'เปรียบเทียบ', query: 'เปรียบเทียบข้อแตกต่าง Deltacide กับ Submarine' },
];

export function AiMcpChatbot({ onFormulaSaved, onSendToCalculator, onSendFileToCalculator }: {
    onFormulaSaved?: () => void;
    onSendToCalculator?: (formula: FormulaSchema) => void;
    onSendFileToCalculator?: (vars: FormulaVariable[]) => void;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome-1',
            role: 'assistant',
            text: 'สวัสดีครับ ผมคือผู้ช่วยสูตรสารเคมี พร้อมช่วยคุณคำนวณ ค้นหา และจัดการสูตรสารเคมีจากฐานข้อมูล พิมพ์คำถามหรือเลือกหัวข้อด้านล่างได้เลยครับ',
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        },
    ]);

    const [inputQuery, setInputQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [selectedFormula, setSelectedFormula] = useState<FormulaSchema | null>(null);
    const [confirmLocation, setConfirmLocation] = useState('');
    const [confirmResultHelp, setConfirmResultHelp] = useState<Record<string, string>>({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [attachedFile, setAttachedFile] = useState<ParsedFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = async (queryText?: string) => {
        const textToSend = queryText || inputQuery;
        if (!textToSend.trim() || isTyping) return;

        const fileToSend = attachedFile;
        const userMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            text: textToSend.trim(),
            file: fileToSend ?? undefined,
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        if (!queryText) setInputQuery('');
        if (fileToSend) setAttachedFile(null);
        setIsTyping(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend.trim(),
                    fileData: fileToSend
                        ? { fileName: fileToSend.fileName, headers: fileToSend.headers, rows: fileToSend.rows }
                        : undefined,
                    imageData: fileToSend?.imageData,
                    rawText: fileToSend?.rawText,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.text || data.error || 'ไม่สามารถเชื่อมต่อได้');

            const aiMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                text: data.text || '...',
                formula: data.formula || undefined,
                timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                meta: data.provider ? { provider: data.provider, model: data.model } : undefined,
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id: String(Date.now() + 1),
                    role: 'assistant',
                    text: `⚠️ ${err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'}`,
                    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        try {
            const parsed = await parseFile(file);
            setAttachedFile(parsed);
            toast.success(`อ่านไฟล์ "${file.name}" แล้ว — ${parsed.rowCount} แถว ${parsed.colCount} คอลัมน์`);
        } catch (err: any) {
            toast.error(err.message || 'ไม่สามารถอ่านไฟล์ได้');
        }
    };

    const handleSendFileToCalc = () => {
        if (!attachedFile || !onSendFileToCalculator) return;
        const vars = fileToFormulaVariables(attachedFile);
        onSendFileToCalculator(vars);
        toast.success('ส่งข้อมูลไฟล์ไปเครื่องคำนวณแล้ว');
    };

    const handleTriggerSave = (formula: FormulaSchema) => {
        setSelectedFormula(formula);
        setConfirmResultHelp({});
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        if (!selectedFormula) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: selectedFormula.name,
                    description: selectedFormula.description,
                    C: Number(selectedFormula.C),
                    S: Number(selectedFormula.S),
                    RA: Number(selectedFormula.RA),
                    RA_unit: selectedFormula.RA_unit,
                    mix_type: Number(selectedFormula.mix_type),
                    A0: Number(selectedFormula.A0),
                    tankCapacity: Number(selectedFormula.tankCapacity),
                    isActive: true,
                    location: confirmLocation.trim() || undefined,
                    resultHelp: Object.keys(confirmResultHelp).length > 0 ? confirmResultHelp : undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกสูตรได้');

            await recordTrackingCalculation({
                C: Number(selectedFormula.C),
                S: Number(selectedFormula.S),
                RA: Number(selectedFormula.RA),
                RA_unit: selectedFormula.RA_unit,
                mix_type: Number(selectedFormula.mix_type),
                A0: Number(selectedFormula.A0),
                A_house: 100,
                N: 10,
                chemical: selectedFormula.name,
                location: confirmLocation.trim() || 'บันทึกผ่าน AI Chatbot',
                agency: 'ผู้ใช้งานทั่วไป / AI Chatbot',
            });

            toast.success(data.message || `เพิ่ม "${selectedFormula.name}" เรียบร้อย`);
            setShowConfirmModal(false);
            if (onFormulaSaved) onFormulaSaved();
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-0">
                {/* Header */}
                <div className="bg-linear-to-r from-slate-900 to-slate-800 px-5 py-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    AI Assistant
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">Chat</span>
                                </h2>
                                <p className="text-[11px] text-slate-400">ผู้ช่วยสูตรสารเคมีอัจฉริยะ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSettings(true)}
                                className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                                title="MCP Settings"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMessages([messages[0]])}
                                className="text-slate-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                                title="ล้างแชท"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Quick prompts */}
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
                    {QUICK_PROMPTS.map((qp, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSendMessage(qp.query)}
                            className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-medium shrink-0 transition-colors hover:bg-slate-50 whitespace-nowrap"
                        >
                            {qp.label}
                        </button>
                    ))}
                </div>

                {/* Chat area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}

                            <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                                <div className={`rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'bg-slate-800 text-white rounded-br-md p-3.5'
                                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md shadow-xs p-3.5'
                                }`}>
                                    <p className="whitespace-pre-line">{msg.text}</p>

                                    {/* File attachment inline — user message */}
                                    {msg.file && (
                                        <div className="mt-2.5 flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl p-2.5">
                                            {msg.file.fileType === 'xlsx' || msg.file.fileType === 'xls' || msg.file.fileType === 'csv' || msg.file.fileType === 'tsv' ? (
                                                <FileSpreadsheet className="h-4 w-4 text-emerald-300 shrink-0" />
                                            ) : (
                                                <FileText className="h-4 w-4 text-sky-300 shrink-0" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-semibold text-white truncate">{msg.file.fileName}</div>
                                                <div className="text-[10px] text-white/60">
                                                    {msg.file.rowCount} แถว × {msg.file.colCount} คอลัมน์
                                                    {msg.file.numericColumns.length > 0 && ` • ตัวเลข ${msg.file.numericColumns.length} คอลัมน์`}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <span className="block text-[10px] mt-1.5 text-slate-400">
                                        {msg.timestamp}
                                        {msg.meta?.provider && (
                                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono">
                                                {msg.meta.provider}/{msg.meta.model}
                                            </span>
                                        )}
                                    </span>

                                    {/* Formula inline — conversational style */}
                                    {msg.formula && msg.role === 'assistant' && (
                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FlaskConical className="h-3.5 w-3.5 text-brand" />
                                                <span className="text-xs font-semibold text-brand-dark">{msg.formula.name}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                    msg.formula.mix_type === 2
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-brand-soft text-brand-dark'
                                                }`}>
                                                    {msg.formula.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                                                    <span className="text-slate-500">C:S</span>
                                                    <span className="font-semibold text-slate-800">{msg.formula.C} : {msg.formula.S}</span>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                                                    <span className="text-slate-500">RA</span>
                                                    <span className="font-semibold text-emerald-700">{msg.formula.RA} {msg.formula.RA_unit}</span>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                                                    <span className="text-slate-500">ถัง</span>
                                                    <span className="font-semibold text-slate-800">{msg.formula.tankCapacity} L</span>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                                                    <span className="text-slate-500">เคมี/ถัง</span>
                                                    <span className="font-semibold text-amber-700">
                                                        {msg.formula.mix_type === 2
                                                            ? `${(10000 * msg.formula.C / msg.formula.S).toFixed(0)}`
                                                            : `${(10000 * msg.formula.C / (msg.formula.C + msg.formula.S)).toFixed(0)}`} มล.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => handleTriggerSave(msg.formula!)}
                                                    className="flex-1 py-1.5 rounded-lg bg-brand-soft hover:bg-brand-soft text-brand-dark text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" /> บันทึกสูตรนี้
                                                </button>
                                                <button
                                                    onClick={() => onSendToCalculator?.(msg.formula!)}
                                                    className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Calculator className="h-3 w-3" /> ส่งไปคำนวณ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center shrink-0 mt-1">
                                    <User className="h-3.5 w-3.5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3 items-center text-xs text-slate-400">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                                <Bot className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-2">
                                <Clock className="h-3 w-3 text-slate-400 animate-spin" />
                                กำลังประมวลผล...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    {/* Attached file chip */}
                    {attachedFile && (
                        <div className="mb-2 flex items-center gap-2.5 bg-brand-soft border border-brand/20 rounded-xl p-2.5">
                            {attachedFile.fileType === 'image' ? <FileText className="h-4 w-4 text-brand shrink-0" /> : <FileSpreadsheet className="h-4 w-4 text-brand shrink-0" />}
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-brand-dark truncate">{attachedFile.fileName}</div>
                                <div className="text-[10px] text-brand">
                                    {attachedFile.fileType === 'image' ? 'รอวิเคราะห์ฉลากด้วย AI Vision' : `${attachedFile.rowCount} แถว × ${attachedFile.colCount} คอลัมน์`}
                                </div>
                            </div>
                            {onSendFileToCalculator && (
                                <button
                                    onClick={handleSendFileToCalc}
                                    className="px-2.5 py-1 rounded-lg bg-brand hover:bg-brand-dark text-white text-[11px] font-medium shrink-0 flex items-center gap-1"
                                >
                                    <Calculator className="h-3 w-3" /> ส่งไปคำนวณ
                                </button>
                            )}
                            <button
                                onClick={() => setAttachedFile(null)}
                                className="text-brand/60 hover:text-brand shrink-0"
                                title="ลบไฟล์"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                        className="flex items-center gap-2"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv,.tsv,.json,.txt,.png,.jpg,.jpeg,.webp"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isTyping}
                            className="h-10 w-10 p-0 border-slate-200 text-slate-400 hover:text-brand hover:border-brand/20 rounded-xl shrink-0"
                            title="แนบไฟล์ฉลากหรือข้อมูล (PNG/CSV/TXT/Excel/JSON)"
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Input
                            placeholder="พิมพ์ข้อความ..."
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            disabled={isTyping}
                            className="h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
                        />
                        <Button
                            type="submit"
                            disabled={isTyping || !inputQuery.trim()}
                            className="h-10 w-10 p-0 bg-slate-800 hover:bg-slate-700 text-white rounded-xl shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>

            {/* Settings Dialog */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="max-w-lg rounded-2xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
                    <DialogHeader className="sr-only">
                        <DialogTitle>ตั้งค่าระบบเชื่อมต่อ MCP</DialogTitle>
                        <DialogDescription>เลือกโปรเจคและกำหนดสิทธิ์การเข้าถึงฐานข้อมูล</DialogDescription>
                    </DialogHeader>
                    <MpcSettingsForm onClose={() => setShowSettings(false)} />
                </DialogContent>
            </Dialog>

            {/* Confirm dialog */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
                            <AlertTriangle className="h-5 w-5 text-amber-500" /> ยืนยันบันทึกสูตร?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            ตรวจสอบข้อมูลก่อนยืนยัน
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFormula && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                            <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                <span className="text-slate-500">ชื่อ:</span>
                                <span className="font-bold text-slate-900">{selectedFormula.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                <span className="text-slate-500">สัดส่วน:</span>
                                <span className="font-bold">{selectedFormula.C}:{selectedFormula.S}</span>
                            </div>
                            <div className="pt-2 space-y-1">
                                <Label className="text-[11px] text-slate-500">สถานที่:</Label>
                                <Input
                                    placeholder="เช่น อ.เมือง สงขลา"
                                    value={confirmLocation}
                                    onChange={(e) => setConfirmLocation(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    )}

                    <ResultHelpEditor value={confirmResultHelp} onChange={setConfirmResultHelp} />

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting} className="text-xs">
                            ยกเลิก
                        </Button>
                        <Button onClick={handleConfirmSave} disabled={isSubmitting} className="bg-slate-800 hover:bg-slate-700 text-white text-xs gap-2">
                            {isSubmitting ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            ยืนยันบันทึก
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
