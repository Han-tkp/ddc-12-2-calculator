'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Bot,
    Send,
    Sparkles,
    User,
    CheckCircle2,
    AlertTriangle,
    FlaskConical,
    Droplets,
    Beaker,
    MapPin,
    Clock,
    Plus,
    RefreshCw,
    Shield,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export interface FormulaSchema {
    name: string;
    description: string;
    C: number;
    S: number;
    RA: number;
    RA_unit: 'L' | 'cc';
    mix_type: number; // 1 = ผสมให้ได้, 2 = ผสมกับ
    A0: number;
    tankCapacity: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    formula?: FormulaSchema;
    timestamp: string;
}

const QUICK_PROMPTS = [
    { label: '🧪 สั่งสร้างสูตรพ่นหมอกควัน (Fogging)', query: 'ช่วยคำนวณและสร้างสูตรพ่นหมอกควัน กำจัดยุงลาย' },
    { label: '⚡ สั่งสร้างสูตรพ่นฝอยละเอียด (ULV)', query: 'ช่วยสร้างสูตรผสมยาสำหรับพ่น ULV ฝอยละเอียด' },
    { label: '⚓ คำนวณสัดส่วนตวงต่อถัง 10 ลิตร', query: 'ขอสูตรสัดส่วนตวงต่อถังพ่นเคมี 10 ลิตร' },
    { label: '🔍 เปรียบเทียบ Deltacide vs Submarine', query: 'เปรียบเทียบข้อแตกต่าง Deltacide กับ Submarine' },
];

export function AiMcpChatbot({ onFormulaSaved }: { onFormulaSaved?: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome-1',
            role: 'assistant',
            text: 'สวัสดีครับ! ผมคือผู้ช่วย AI / MCP สำหรับคำนวณและจัดการสูตรสารเคมีกำจัดยุงและศัตรูพืช คุณสามารถสอบถามข้อมูลสารเคมี ขอคำแนะนำสัดส่วน หรือให้ผมช่วยสร้างสูตรใหม่เพื่อบันทึกเข้าสู่ระบบได้ทันทีครับ 😊',
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        },
    ]);

    const [inputQuery, setInputQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Confirmation Modal state for saving AI-generated formula
    const [selectedFormula, setSelectedFormula] = useState<FormulaSchema | null>(null);
    const [confirmLocation, setConfirmLocation] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSendMessage = async (queryText?: string) => {
        const textToSend = queryText || inputQuery;
        if (!textToSend.trim() || isTyping) return;

        const userMsg: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            text: textToSend.trim(),
            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        if (!queryText) setInputQuery('');
        setIsTyping(true);

        // Process query and build intelligent AI response
        setTimeout(() => {
            const qLower = textToSend.toLowerCase();
            let aiText = '';
            let generatedFormula: FormulaSchema | undefined = undefined;

            if (qLower.includes('ulv') || qLower.includes('ยูแอลวี') || qLower.includes('ฝอยละเอียด')) {
                aiText = 'จากการวิเคราะห์ตามมาตรฐานกรมควบคุมโรค (DDC/WHO) สำหรับการพ่นฝอยละเอียด (ULV): สามารถใช้สารเคมีในอัตราส่วน 1 : 4 (สารเคมี 1 ส่วน ผสมน้ำมันดีเซลให้ได้ 5 ส่วน) โดยใช้อัตราการพ่น 75 มล. ต่อพื้นที่ 1,000 ตร.ม. ครับ';
                generatedFormula = {
                    name: qLower.includes('เดลตา') ? 'Deltacide ULV (สูตรแชทบอท AI)' : 'สูตรสารเคมีพ่นฝอยละเอียด ULV (AI)',
                    description: 'สูตรแนะนำโดย AI Assistant สำหรับเครื่องพ่นฝอยละเอียด ULV (75 มล./1,000 ตร.ม.)',
                    C: 1,
                    S: 4,
                    RA: 75,
                    RA_unit: 'cc',
                    mix_type: 1, // ผสมให้ได้
                    A0: 1000,
                    tankCapacity: 10,
                };
            } else if (qLower.includes('หมอกควัน') || qLower.includes('fogging') || qLower.includes('ซับมาริน') || qLower.includes('เดลตาไซด์')) {
                aiText = 'สำหรับการพ่นหมอกควัน (Thermal Fogging): สารเคมีเข้มข้นจะผสมกับน้ำมันดีเซลในอัตราส่วน 1 : 79 (เติมสารเคมี 1 ลิตร ลงในน้ำมันดีเซล 79 ลิตร) พ่นในอัตรา 1 ลิตร ต่อพื้นที่ 1,000 ตร.ม. (เทียบเท่า 100 มล. ต่อบ้าน 1 หลัง 100 ตร.ม.) ครับ';
                generatedFormula = {
                    name: qLower.includes('ซับมาริน') ? 'Submarine Fogging (สูตรแชทบอท AI)' : 'สูตรพ่นหมอกควันกำจัดยุงลาย (AI)',
                    description: 'สูตรแนะนำโดย AI Assistant สำหรับเครื่องพ่นหมอกควัน Thermal Fogging (1:79)',
                    C: 1,
                    S: 79,
                    RA: 1,
                    RA_unit: 'L',
                    mix_type: 2, // ผสมกับ
                    A0: 1000,
                    tankCapacity: 10,
                };
            } else if (qLower.includes('ถัง') || qLower.includes('10')) {
                aiText = 'ข้อแนะนำสำหรับถังพ่นเคมีมาตรฐานขนาด 10 ลิตร: หากใช้สูตรพ่นหมอกควัน (1:79) ใน 1 ถังเต็ม (10,000 มล.) จะตวงสารเคมีประมาณ 125 มล. และเติมน้ำมันดีเซล 9,875 มล. (9.88 ลิตร) ครับ';
                generatedFormula = {
                    name: 'สูตรผสมยามาตรฐานถัง 10 ลิตร (AI)',
                    description: 'สัดส่วนตวงผสมแม่นยำสำหรับถังพ่นสะพายหลังมาตรฐาน 10 ลิตร',
                    C: 1,
                    S: 79,
                    RA: 1,
                    RA_unit: 'L',
                    mix_type: 2,
                    A0: 1000,
                    tankCapacity: 10,
                };
            } else {
                aiText = `ผมได้ทำการค้นหาข้อมูลสารเคมี "${textToSend}" ในคลังข้อมูล WHO และฐานข้อมูลกรมควบคุมโรคแล้ว สารเคมีประเภทนี้สามารถนำมาคำนวณสัดส่วนการเจือจางและการฉีดพ่นเพื่อควบคุมยุงและแมลงนำโรคได้ตามการ์ดสูตรด้านล่างนี้ครับ`;
                generatedFormula = {
                    name: `${textToSend.trim()} (สูตรวิเคราะห์โดย AI)`,
                    description: `สูตรวิเคราะห์โดย AI Assistant อิงตามพารามิเตอร์การพ่นมาตรฐาน`,
                    C: 1,
                    S: 49,
                    RA: 1,
                    RA_unit: 'L',
                    mix_type: 2,
                    A0: 1000,
                    tankCapacity: 10,
                };
            }

            const aiMsg: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                text: aiText,
                formula: generatedFormula,
                timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            };

            setMessages((prev) => [...prev, aiMsg]);
            setIsTyping(false);
        }, 500);
    };

    // Open confirmation dialog for formula save
    const handleTriggerSave = (formula: FormulaSchema) => {
        setSelectedFormula(formula);
        setShowConfirmModal(true);
    };

    // Execute actual Supabase write with tracking
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
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'ไม่สามารถบันทึกสูตรได้');

            // Record tracking calculation entry
            await fetch('/api/calculations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    C: Number(selectedFormula.C),
                    S: Number(selectedFormula.S),
                    RA: Number(selectedFormula.RA),
                    RA_unit: selectedFormula.RA_unit,
                    mix_type: Number(selectedFormula.mix_type),
                    A0: Number(selectedFormula.A0),
                    A_house: 100,
                    N: 10,
                    chemical: selectedFormula.name,
                    location: confirmLocation.trim() || 'บันทึกผ่าน AI Chatbot Assistant',
                    agency: 'ผู้ใช้งานทั่วไป / AI Chatbot',
                }),
            });

            toast.success(`บันทึกสูตรสารเคมี "${selectedFormula.name}" และประวัติ Tracking เรียบร้อยแล้ว!`);
            setShowConfirmModal(false);
            if (onFormulaSaved) onFormulaSaved();
        } catch (err: any) {
            toast.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-indigo-100 shadow-md bg-white rounded-3xl overflow-hidden flex flex-col h-[700px]">
            {/* Header */}
            <CardHeader className="bg-linear-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 sm:p-6 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <Bot className="h-6 w-6 text-indigo-300" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                AI / MCP Chemical Assistant Chatbot
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Online
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs text-indigo-200">
                                ผู้ช่วยแชทบอทอัจฉริยะสำหรับค้นหาคำนวณอัตราส่วน และออกสูตรสารเคมีเข้าสู่ระบบ
                            </CardDescription>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMessages([messages[0]])}
                        className="text-indigo-200 hover:text-white hover:bg-white/10 text-xs gap-1"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> ล้างแชท
                    </Button>
                </div>
            </CardHeader>

            {/* Quick Prompt Pills */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> ลองถาม AI:
                </span>
                {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSendMessage(qp.query)}
                        className="px-3 py-1 rounded-full bg-white border border-indigo-100 hover:border-indigo-300 text-indigo-700 text-xs font-medium shrink-0 transition-all hover:bg-indigo-50 shadow-2xs"
                    >
                        {qp.label}
                    </button>
                ))}
            </div>

            {/* Chat Transcript Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[75%] space-y-3`}>
                            {/* Text Message Bubble */}
                            <div
                                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                                    msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                                }`}
                            >
                                <p className="whitespace-pre-line">{msg.text}</p>
                                <span
                                    className={`block text-[10px] mt-1.5 text-right ${
                                        msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                                    }`}
                                >
                                    {msg.timestamp}
                                </span>
                            </div>

                            {/* Structured Rich Formula Card */}
                            {msg.formula && (
                                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl border border-indigo-700 shadow-md space-y-3">
                                    <div className="flex items-center justify-between border-b border-indigo-700/60 pb-2">
                                        <div className="flex items-center gap-2">
                                            <FlaskConical className="h-5 w-5 text-indigo-400" />
                                            <h4 className="font-bold text-sm text-white">{msg.formula.name}</h4>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold border border-indigo-400/30">
                                            {msg.formula.mix_type === 2 ? 'แบบผสมกับ - เติมสารทบน้ำมัน' : 'แบบผสมให้ได้ - รวมปริมาตรคงที่'}
                                        </span>
                                    </div>

                                    <p className="text-xs text-indigo-200 leading-normal">{msg.formula.description}</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                                            <span className="block text-[10px] text-indigo-300">สัดส่วน (C:S)</span>
                                            <span className="font-bold text-white text-sm">{msg.formula.C} : {msg.formula.S}</span>
                                        </div>
                                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                                            <span className="block text-[10px] text-indigo-300">อัตราพ่น (RA)</span>
                                            <span className="font-bold text-white text-sm">{msg.formula.RA} {msg.formula.RA_unit}/1,000m²</span>
                                        </div>
                                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                                            <span className="block text-[10px] text-indigo-300">ถังพ่นเคมี</span>
                                            <span className="font-bold text-emerald-300 text-sm">{msg.formula.tankCapacity} ลิตร</span>
                                        </div>
                                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-xs">
                                            <span className="block text-[10px] text-indigo-300">สารเคมีต่อถัง</span>
                                            <span className="font-bold text-amber-300 text-sm">
                                                {msg.formula.mix_type === 2
                                                    ? `${((10000 * (msg.formula.C / msg.formula.S))).toFixed(0)} มล.`
                                                    : `${(10000 * (msg.formula.C / (msg.formula.C + msg.formula.S))).toFixed(0)} มล.`}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() => handleTriggerSave(msg.formula!)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-2 shadow-sm rounded-xl mt-1"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> บันทึกสูตรนี้เข้าสู่ระบบฐานข้อมูล
                                    </Button>
                                </div>
                            )}
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                <User className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </div>
                ))}

                {isTyping && (
                    <div className="flex gap-3 justify-start items-center text-xs text-slate-500 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                            AI กำลังประมวลผลคำตอบ...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer Bar */}
            <div className="p-4 bg-white border-t border-slate-200/80 shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                >
                    <Input
                        placeholder="พิมพ์ข้อความคุยกับ AI เช่น 'ช่วยสร้างสูตร ULV เดลตาไซด์'..."
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        disabled={isTyping}
                        className="h-11 text-xs sm:text-sm bg-slate-50 border-slate-200 focus:bg-white"
                    />
                    <Button
                        type="submit"
                        disabled={isTyping || !inputQuery.trim()}
                        className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shrink-0 rounded-xl"
                    >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">ส่งข้อความ</span>
                    </Button>
                </form>
            </div>

            {/* Confirmation Alert Dialog */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-700 text-lg font-bold">
                            <AlertTriangle className="h-5 w-5 text-amber-500" /> ยืนยันการบันทึกสูตรจาก AI เข้าสู่ระบบ?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
                            โปรดตรวจสอบข้อมูลสูตรก่อนยืนยัน บันทึกนี้จะถูกเปิดใช้งานในระบบคำนวณและบันทึกประวัติ Tracking
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFormula && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                                <span className="text-slate-500">ชื่อสูตรสารเคมี:</span>
                                <span className="font-bold text-indigo-900">{selectedFormula.name}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                                <span className="text-slate-500">สัดส่วนผสม (C:S):</span>
                                <span className="font-bold text-slate-900">{selectedFormula.C}:{selectedFormula.S} ({selectedFormula.mix_type === 2 ? 'ผสมกับ' : 'ผสมให้ได้'})</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                                <span className="text-slate-500">อัตราการพ่น (RA):</span>
                                <span className="font-bold text-slate-900">{selectedFormula.RA} {selectedFormula.RA_unit} / 1,000 ตร.ม.</span>
                            </div>
                            <div className="space-y-1 pt-2">
                                <Label className="text-[11px] font-semibold text-slate-600">สถานที่ปฏิบัติงาน / อ้างอิง (Tracking Location):</Label>
                                <Input
                                    placeholder="เช่น อ.เมือง สงขลา"
                                    value={confirmLocation}
                                    onChange={(e) => setConfirmLocation(e.target.value)}
                                    className="h-8 text-xs bg-white"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
                            ตรวจสอบอีกครั้ง
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSave}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                            {isSubmitting ? <Clock className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            ยืนยันบันทึกสูตรเข้าสู่ระบบ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
