import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Terminal, Cpu, Database, Sparkles, CheckCircle2, Copy, Shield, Layers, Code, Zap } from 'lucide-react';
import { AiMcpChatbot } from '@/components/ai/ai-mcp-chatbot';
import Link from 'next/link';

export default async function AdminMCPPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    const mcpCommand = `gemini mcp add -t http supabase "https://mcp.supabase.com/mcp?project_ref=qggguodrxmacqpqujkqq&read_only=true&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"`;
    const mcpJson = `{
  "mcpServers": {
    "supabase": {
      "httpUrl": "https://mcp.supabase.com/mcp?project_ref=qggguodrxmacqpqujkqq&read_only=true&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
    }
  }
}`;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MCP Server Active
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                            Gemini AI Ready
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 mt-2">
                        ศูนย์ผู้ช่วย AI & Supabase MCP System
                    </h1>
                    <p className="text-slate-500 text-sm">
                        เครื่องมือจัดการ AI Agent (Model Context Protocol) และช่วยคำนวณสูตรสารเคมีชั้นสูงสำหรับผู้ดูแลระบบ
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/admin/profiles">
                        <Button variant="outline" className="gap-2 bg-white">
                            <Layers className="h-4 w-4" /> จัดการสูตรทั้งหมด
                        </Button>
                    </Link>
                </div>
            </div>

            {/* AI MCP Chatbot Component */}
            <AiMcpChatbot />

            {/* Grid Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                            MCP Service Status
                        </CardDescription>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Cpu className="h-5 w-5 text-indigo-600" /> Supabase MCP Server
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            เชื่อมต่อ Supabase Database ผ่าน HTTP MCP Endpoint เพื่อดึงสูตรสารเคมีและวิเคราะห์ผลลัพธ์แบบ Real-time
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                            AI Calculation Engine
                        </CardDescription>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Zap className="h-5 w-5 text-emerald-600" /> Dynamic Engine
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            คำนวณผ่านสัดส่วนผสม (ผสมรวม/ผสมสุทธิ), อัตราการพ่นต่อพื้นที่, และขนาดถังพ่นเคมีมาตรฐาน (Standard Tank Size)
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white shadow-sm">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                            Agent Skills
                        </CardDescription>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                            <Sparkles className="h-5 w-5 text-purple-600" /> Supabase Agent Skills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            ติดตั้งชุดคำสั่งและทรัพยากรช่วยพัฒนา AI Agent สำหรับจัดเตรียมข้อมูลสารเคมีแบบ WHO Standard
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* MCP Setup Steps */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <Terminal className="h-5 w-5 text-indigo-600" /> 1. การกำหนดค่า MCP (Configure MCP Server)
                    </CardTitle>
                    <CardDescription>
                        คำสั่งตั้งค่า Supabase MCP Server สำหรับ Gemini CLI เวอร์ชัน 0.20.2 ขึ้นไป
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Code className="h-4 w-4 text-slate-500" /> เพิ่ม Supabase MCP เข้ากับ Gemini CLI:
                        </h3>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                            {mcpCommand}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <Database className="h-4 w-4 text-slate-500" /> หรือเพิ่มในไฟล์ <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">.gemini/settings.json</code>:
                        </h3>
                        <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                            {mcpJson}
                        </pre>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
                        <Bot className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">การยืนยันตัวตนหลังการติดตั้ง:</p>
                            <p>รันคำสั่ง <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">/mcp auth supabase</code> ใน Gemini CLI เพื่อเชื่อมต่อสิทธิ์เข้าใช้งานเซิร์ฟเวอร์</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Agent Skills Section */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                        <Sparkles className="h-5 w-5 text-indigo-600" /> 2. ติดตั้ง Agent Skills (Optional)
                    </CardTitle>
                    <CardDescription>
                        ติดตั้งคู่มือและคำสั่งสำเร็จรูปสำหรับการทำงานร่วมกับ Supabase
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                        npx skills add supabase/agent-skills
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
