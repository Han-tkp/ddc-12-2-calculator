'use client';

import React, { useState, useRef, useMemo } from 'react';
import { UNIT_REGISTRY, validateUnitCompatibility, UnitCategory, UnitDefinition } from '@/lib/unit-registry';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Plus,
    Minus,
    X as Multiply,
    Divide,
    Layers,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Lock,
    Trash2,
    Move,
    Maximize2,
    RefreshCw,
    Calculator,
    Zap
} from 'lucide-react';
import { toast } from 'sonner';

export interface VisualNode {
    id: string;
    type: 'variable' | 'operator' | 'constant' | 'result' | 'chemical_blank' | 'formula';
    label: string;
    value: number;
    unitId: string;
    category: UnitCategory;
    operator?: '+' | '-' | '*' | '/';
    x: number;
    y: number;
    inputs: string[]; // Connected Node IDs
    chemProperties?: {
        c?: number;
        s?: number;
        mixType?: 'add' | 'top_up';
    };
    formulaState?: {
        expression: string;
        variables: Record<string, number>;
    };
}

export interface ConnectionEdge {
    id: string;
    fromId: string;
    toId: string;
    valid: boolean;
    errorMsg?: string;
}

export function NodeVisualCalculator() {
    // Initial Nodes set up for DDC Spray Volume calculation flow
    const [nodes, setNodes] = useState<VisualNode[]>([
        {
            id: 'node-area',
            type: 'variable',
            label: 'พื้นที่พ่น (Area)',
            value: 2500,
            unitId: 'm2',
            category: 'area',
            x: 50,
            y: 80,
            inputs: [],
        },
        {
            id: 'node-rate',
            type: 'variable',
            label: 'อัตราฉีดพ่น (RA)',
            value: 75,
            unitId: 'rate_cc_1000m2',
            category: 'rate',
            x: 50,
            y: 220,
            inputs: [],
        },
        {
            id: 'node-multiply',
            type: 'operator',
            label: 'คูณ (*)',
            value: 0,
            operator: '*',
            unitId: 'mL',
            category: 'volume',
            x: 340,
            y: 150,
            inputs: ['node-area', 'node-rate'],
        },
        {
            id: 'node-tank',
            type: 'variable',
            label: 'ขนาดถังพ่น (Tank Cap)',
            value: 10,
            unitId: 'L',
            category: 'volume',
            x: 50,
            y: 360,
            inputs: [],
        },
        {
            id: 'node-result',
            type: 'result',
            label: 'ปริมาตรน้ำยาผสมรวมสุทธิ',
            value: 0,
            unitId: 'L',
            category: 'volume',
            x: 630,
            y: 200,
            inputs: ['node-multiply'],
        },
    ]);

    const [edges, setEdges] = useState<ConnectionEdge[]>([
        { id: 'e1', fromId: 'node-area', toId: 'node-multiply', valid: true },
        { id: 'e2', fromId: 'node-rate', toId: 'node-multiply', valid: true },
        { id: 'e3', fromId: 'node-multiply', toId: 'node-result', valid: true },
    ]);

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    // Dynamic Equation Evaluation & Validation
    const evaluatedResults = useMemo(() => {
        // Map nodes by ID for fast lookup
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));

        // Calculate values based on inputs
        const computedMap = new Map<string, { val: number; unitId: string; category: UnitCategory }>();

        nodes.forEach((n) => {
            if (n.type === 'variable' || n.type === 'constant' || n.type === 'chemical_blank') {
                const uDef = UNIT_REGISTRY[n.unitId];
                const baseVal = uDef ? uDef.toBase(n.value) : n.value;
                computedMap.set(n.id, { val: baseVal, unitId: n.unitId, category: n.category });
            } else if (n.type === 'formula') {
                try {
                    let expr = n.formulaState?.expression || '0';
                    const vars = n.formulaState?.variables || {};
                    for (const [key, val] of Object.entries(vars)) {
                        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), val.toString());
                    }
                    if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
                        computedMap.set(n.id, { val: 0, unitId: n.unitId, category: n.category });
                    } else {
                        const result = new Function(`return ${expr}`)();
                        computedMap.set(n.id, { val: isNaN(result) ? 0 : result, unitId: n.unitId, category: n.category });
                    }
                } catch {
                    computedMap.set(n.id, { val: 0, unitId: n.unitId, category: n.category });
                }
            }
        });

        // Compute operators
        nodes.forEach((n) => {
            if (n.type === 'operator' && n.inputs.length >= 2) {
                const inputA = computedMap.get(n.inputs[0]);
                const inputB = computedMap.get(n.inputs[1]);

                if (inputA && inputB) {
                    let resultVal = 0;
                    if (n.operator === '+') resultVal = inputA.val + inputB.val;
                    if (n.operator === '-') resultVal = inputA.val - inputB.val;
                    if (n.operator === '*') resultVal = inputA.val * inputB.val;
                    if (n.operator === '/') resultVal = inputB.val !== 0 ? inputA.val / inputB.val : 0;

                    computedMap.set(n.id, { val: resultVal, unitId: n.unitId, category: n.category });
                }
            }
        });

        // Compute result node
        const resultNode = nodes.find((n) => n.type === 'result');
        let finalVolumeLiters = 0;
        let finalVolumeCc = 0;

        if (resultNode && resultNode.inputs.length > 0) {
            const inputRes = computedMap.get(resultNode.inputs[0]);
            if (inputRes) {
                finalVolumeCc = inputRes.val;
                finalVolumeLiters = finalVolumeCc / 1000;
            }
        }

        return { computedMap, finalVolumeLiters, finalVolumeCc };
    }, [nodes]);

    // Validation Status of All Edges
    const edgeValidations = useMemo(() => {
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        return edges.map((edge) => {
            const fromNode = nodeMap.get(edge.fromId);
            const toNode = nodeMap.get(edge.toId);

            if (!fromNode || !toNode) return { ...edge, valid: true };

            if (toNode.type === 'operator' && toNode.operator) {
                const otherInputId = toNode.inputs.find((id) => id !== edge.fromId);
                const otherNode = otherInputId ? nodeMap.get(otherInputId) : null;

                if (otherNode) {
                    const check = validateUnitCompatibility(toNode.operator, fromNode.category, otherNode.category);
                    return {
                        ...edge,
                        valid: check.valid,
                        errorMsg: check.errorMsg,
                    };
                }
            }
            return { ...edge, valid: true };
        });
    }, [nodes, edges]);

    // Node Drag Handlers
    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setSelectedNodeId(nodeId);
        setDraggingNodeId(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (node && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left - node.x,
                y: e.clientY - rect.top - node.y,
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingNodeId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(10, Math.min(rect.width - 180, e.clientX - rect.left - dragOffset.x));
        const newY = Math.max(10, Math.min(rect.height - 120, e.clientY - rect.top - dragOffset.y));

        setNodes((prev) =>
            prev.map((n) => (n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n))
        );
    };

    const handleMouseUp = () => {
        setDraggingNodeId(null);
    };

    // Add New Node from Toolbox
    const addNodeFromToolbox = (categoryKey: string) => {
        const id = `node-${Date.now()}`;
        let newNode: VisualNode;

        if (categoryKey === 'rai') {
            newNode = {
                id,
                type: 'variable',
                label: 'พื้นที่ (ไร่)',
                value: 1,
                unitId: 'rai',
                category: 'area',
                x: 80,
                y: 100,
                inputs: [],
            };
        } else if (categoryKey === 'sq_wa') {
            newNode = {
                id,
                type: 'variable',
                label: 'พื้นที่ (ตารางวา)',
                value: 100,
                unitId: 'sq_wa',
                category: 'area',
                x: 80,
                y: 180,
                inputs: [],
            };
        } else if (categoryKey === 'add') {
            newNode = {
                id,
                type: 'operator',
                label: 'บวก (+)',
                value: 0,
                operator: '+',
                unitId: 'mL',
                category: 'volume',
                x: 320,
                y: 200,
                inputs: [],
            };
        } else if (categoryKey === 'divide') {
            newNode = {
                id,
                type: 'operator',
                label: 'หาร (/)',
                value: 0,
                operator: '/',
                unitId: 'ratio',
                category: 'dimensionless',
                x: 320,
                y: 280,
                inputs: [],
            };
        } else if (categoryKey === 'chemical_blank') {
            newNode = {
                id,
                type: 'chemical_blank',
                label: 'สารเคมีอิสระ (Custom)',
                value: 100, // RA Value
                unitId: 'rate_cc_1000m2',
                category: 'rate',
                x: 150,
                y: 150,
                inputs: [],
                chemProperties: {
                    c: 10,
                    s: 0,
                    mixType: 'add'
                }
            };
        } else if (categoryKey === 'formula') {
            newNode = {
                id,
                type: 'formula',
                label: 'สมการอิสระ (Formula Pad)',
                value: 0,
                unitId: 'mL',
                category: 'volume',
                x: 100,
                y: 100,
                inputs: [],
                formulaState: {
                    expression: '(Area * Rate) / C',
                    variables: { Area: 2500, Rate: 75, C: 10 }
                }
            };
        } else {
            newNode = {
                id,
                type: 'variable',
                label: 'ตัวแปรใหม่',
                value: 10,
                unitId: 'mL',
                category: 'volume',
                x: 100,
                y: 100,
                inputs: [],
            };
        }

        setNodes((prev) => [...prev, newNode]);
        toast.success(`เพิ่มโหนด "${newNode.label}" ลงใน Canvas เรียบร้อยแล้ว`);
    };

    // Delete Selected Node
    const deleteSelectedNode = () => {
        if (!selectedNodeId) return;
        setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
        setEdges((prev) => prev.filter((e) => e.fromId !== selectedNodeId && e.toId !== selectedNodeId));
        setSelectedNodeId(null);
        toast.success('ลบโหนดเรียบร้อยแล้ว');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Node-based AST Builder
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            Unit Validation Active
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                        🧩 Visual Node Scripting & Unit Conversion Workspace
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm">
                        ออกแบบและตรวจสอบลอจิกการคำนวณสารเคมีผ่าน Node & Cable Graph พร้อมระบบแปลงหน่วยพื้นที่ (ไร่, ตารางวา, m²) อัตโนมัติ
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {selectedNodeId && (
                        <Button
                            onClick={deleteSelectedNode}
                            variant="destructive"
                            className="gap-2 text-xs font-semibold rounded-2xl h-10"
                        >
                            <Trash2 className="h-4 w-4" /> ลบโหนดที่เลือก
                        </Button>
                    )}
                </div>
            </div>

            {/* 3-Panel Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. LEFT PANEL: Toolbox & Pre-defined Units */}
                <Card className="lg:col-span-3 border-indigo-100 shadow-sm bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-200/80 p-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                            <Layers className="h-4 w-4 text-indigo-600" />
                            📦 Toolbox & Unit Registry
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                            คลิกเพื่อเพิ่มกล่องตัวแปรและตัวดำเนินการ
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 text-xs">
                        {/* Area Units Category */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block border-b border-slate-100 pb-1">
                                📐 หน่วยพื้นที่ (Area Units)
                            </Label>
                            <div className="grid grid-cols-1 gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('rai')}
                                    className="justify-start gap-2 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 text-xs h-9 rounded-xl font-semibold"
                                >
                                    <Plus className="h-3.5 w-3.5 text-indigo-600" /> โหนดพื้นที่ไร่ (1 ไร่ = 1,600 m²)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('sq_wa')}
                                    className="justify-start gap-2 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 text-xs h-9 rounded-xl font-semibold"
                                >
                                    <Plus className="h-3.5 w-3.5 text-indigo-600" /> โหนดตารางวา (1 ตร.วา = 4 m²)
                                </Button>
                            </div>
                        </div>

                        {/* Math Operators Category */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block border-b border-slate-100 pb-1">
                                🔢 เครื่องหมายคณิตศาสตร์ (Operators)
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('add')}
                                    className="gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 font-bold"
                                >
                                    <Plus className="h-3.5 w-3.5 text-indigo-600" /> บวก (+)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('divide')}
                                    className="gap-1.5 text-xs bg-slate-50 hover:bg-slate-100 font-bold"
                                >
                                    <Divide className="h-3.5 w-3.5 text-indigo-600" /> หาร (/)
                                </Button>
                            </div>
                        </div>

                        {/* Chemical Custom Category */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block border-b border-slate-100 pb-1">
                                🧪 สารเคมี (Chemicals)
                            </Label>
                            <div className="grid grid-cols-1 gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('formula')}
                                    className="justify-start gap-2 bg-amber-50/50 hover:bg-amber-100 text-amber-900 border-amber-200 text-xs h-9 rounded-xl font-semibold"
                                >
                                    <Calculator className="h-3.5 w-3.5 text-amber-600" /> แป้นพิมพ์สมการ (Formula Pad)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addNodeFromToolbox('chemical_blank')}
                                    className="justify-start gap-2 bg-pink-50/50 hover:bg-pink-100 text-pink-900 border-pink-200 text-xs h-9 rounded-xl font-semibold"
                                >
                                    <Plus className="h-3.5 w-3.5 text-pink-600" /> โหนดสารเคมี (Custom)
                                </Button>
                            </div>
                        </div>

                        {/* Unit Registry Info Card */}
                        <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1.5 text-[11px] text-purple-900">
                            <span className="font-bold flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5 text-purple-600" /> Unit Validation Rule:
                            </span>
                            <p className="leading-relaxed text-purple-700">
                                ระบบจะทำการ <strong>Dimensional Check</strong> ป้องกันการนำหน่วยต่างมิติ (เช่น ลิตร + ตารางเมตร) มาบวกลบกันโดยเด็ดขาด
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. CENTER PANEL: Drag & Drop Interactive Canvas */}
                <Card className="lg:col-span-6 border-slate-200 shadow-xs bg-slate-900/95 text-white rounded-3xl overflow-hidden flex flex-col h-[620px]">
                    <CardHeader className="bg-slate-800/90 border-b border-slate-700/80 p-4 shrink-0 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-100">
                                <Move className="h-4 w-4 text-emerald-400" />
                                Center Canvas (Drag & Drop Workspace)
                            </CardTitle>
                            <CardDescription className="text-[11px] text-slate-400">
                                ลากเคลื่อนย้ายโหนดเพื่ออ่านลำดับสายการคำนวณ (Order of Operations)
                            </CardDescription>
                        </div>
                        <span className="text-[10px] bg-slate-700 px-2 py-1 rounded-full text-slate-300 font-mono">
                            Nodes: {nodes.length} | Edges: {edges.length}
                        </span>
                    </CardHeader>

                    {/* Canvas Area */}
                    <div
                        ref={canvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        className="flex-1 relative overflow-hidden bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] cursor-crosshair select-none"
                    >
                        {/* SVG Connection Cables */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            {edgeValidations.map((edge) => {
                                const fromNode = nodes.find((n) => n.id === edge.fromId);
                                const toNode = nodes.find((n) => n.id === edge.toId);
                                if (!fromNode || !toNode) return null;

                                const x1 = fromNode.x + 160;
                                const y1 = fromNode.y + 35;
                                const x2 = toNode.x;
                                const y2 = toNode.y + 35;
                                const dx = Math.abs(x2 - x1) * 0.5;

                                const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                                return (
                                    <g key={edge.id}>
                                        <path
                                            d={pathD}
                                            fill="none"
                                            stroke={edge.valid ? '#10b981' : '#ef4444'}
                                            strokeWidth={edge.valid ? '3' : '4'}
                                            strokeDasharray={edge.valid ? 'none' : '6,6'}
                                            className="transition-all"
                                        />
                                        {!edge.valid && (
                                            <text
                                                x={(x1 + x2) / 2}
                                                y={(y1 + y2) / 2 - 8}
                                                fill="#f87171"
                                                fontSize="10"
                                                fontWeight="bold"
                                                textAnchor="middle"
                                                className="bg-slate-900 px-1"
                                            >
                                                ⚠️ ล็อกสาย: {edge.errorMsg}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Render Nodes */}
                        {nodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const uDef = UNIT_REGISTRY[node.unitId];

                            return (
                                <div
                                    key={node.id}
                                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                                    className={`absolute w-44 rounded-2xl p-3 border shadow-lg transition-all z-20 backdrop-blur-md cursor-grab active:cursor-grabbing ${
                                        node.type === 'result'
                                            ? 'bg-gradient-to-br from-emerald-900 to-teal-900 border-emerald-500 text-white'
                                            : node.type === 'formula'
                                            ? 'bg-gradient-to-br from-amber-950 to-slate-900 border-amber-500 text-amber-100 w-56'
                                            : node.type === 'chemical_blank'
                                            ? 'bg-gradient-to-br from-pink-950 to-slate-900 border-pink-500 text-pink-100'
                                            : node.type === 'operator'
                                            ? 'bg-slate-800 border-indigo-500 text-indigo-200'
                                            : isSelected
                                            ? 'bg-indigo-900/90 border-indigo-400 text-white ring-2 ring-indigo-400/50'
                                            : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                                        <span className="font-bold text-xs truncate">{node.label}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-slate-300">
                                            {uDef ? uDef.symbol : node.unitId}
                                        </span>
                                    </div>

                                    {/* Node Value Input / Output */}
                                    {node.type === 'formula' && (
                                        <div className="space-y-2 mt-2">
                                            <div className="text-[10px] text-amber-300 font-semibold mb-1 flex justify-between">
                                                <span>สมการ (Equation):</span>
                                                <span className="text-[9px] text-amber-500/50">พิมพ์ตัวแปรได้อิสระ</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={node.formulaState?.expression || ''}
                                                onChange={(e) => {
                                                    const expr = e.target.value;
                                                    const varNames = expr.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
                                                    const uniqueVars = Array.from(new Set(varNames));
                                                    
                                                    const oldVars = node.formulaState?.variables || {};
                                                    const newVars: Record<string, number> = {};
                                                    uniqueVars.forEach(v => {
                                                        newVars[v] = oldVars[v] || 0;
                                                    });
                                                    
                                                    setNodes((prev) =>
                                                        prev.map((n) => (n.id === node.id ? { ...n, formulaState: { expression: expr, variables: newVars } } : n))
                                                    );
                                                }}
                                                placeholder="(Area * Rate) / C"
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-100 font-mono"
                                            />
                                            
                                            {Object.entries(node.formulaState?.variables || {}).length > 0 && (
                                                <div className="pt-2 space-y-1">
                                                    <div className="text-[10px] text-slate-400">ตัวแปร:</div>
                                                    {Object.entries(node.formulaState!.variables).map(([vName, vVal]) => (
                                                        <div key={vName} className="flex items-center gap-2">
                                                            <Label className="text-[10px] w-8 truncate text-amber-200">{vName}</Label>
                                                            <input
                                                                type="number"
                                                                value={vVal}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    setNodes((prev) =>
                                                                        prev.map((n) => {
                                                                            if (n.id === node.id && n.formulaState) {
                                                                                return {
                                                                                    ...n,
                                                                                    formulaState: {
                                                                                        ...n.formulaState,
                                                                                        variables: { ...n.formulaState.variables, [vName]: val }
                                                                                    }
                                                                                };
                                                                            }
                                                                            return n;
                                                                        })
                                                                    );
                                                                }}
                                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-xs text-white font-mono"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                                <Label className="text-[10px] text-amber-300">ผลลัพธ์:</Label>
                                                <div className="text-sm font-bold text-white">
                                                    {(() => {
                                                        const evaluated = evaluatedResults.computedMap.get(node.id);
                                                        return evaluated ? evaluated.val.toFixed(2) : '0.00';
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {node.type === 'chemical_blank' && (
                                        <div className="space-y-2 mt-2">
                                            <div className="text-[10px] text-pink-300 font-semibold mb-1">กำหนดคุณสมบัติสาร:</div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] w-8">C (%)</Label>
                                                <input
                                                    type="number"
                                                    value={node.chemProperties?.c || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setNodes((prev) =>
                                                            prev.map((n) => (n.id === node.id ? { ...n, chemProperties: { ...n.chemProperties, c: val } } : n))
                                                        );
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] w-8">S (%)</Label>
                                                <input
                                                    type="number"
                                                    value={node.chemProperties?.s || 0}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setNodes((prev) =>
                                                            prev.map((n) => (n.id === node.id ? { ...n, chemProperties: { ...n.chemProperties, s: val } } : n))
                                                        );
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-[10px] w-8">การผสม</Label>
                                                <select
                                                    value={node.chemProperties?.mixType || 'add'}
                                                    onChange={(e) => {
                                                        const val = e.target.value as 'add' | 'top_up';
                                                        setNodes((prev) =>
                                                            prev.map((n) => (n.id === node.id ? { ...n, chemProperties: { ...n.chemProperties, mixType: val } } : n))
                                                        );
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-1 py-1 text-[10px] text-white"
                                                >
                                                    <option value="add">ผสมรวม</option>
                                                    <option value="top_up">ผสมสุทธิ</option>
                                                </select>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                                <Label className="text-[10px] text-pink-300">Rate (RA):</Label>
                                                <input
                                                    type="number"
                                                    value={node.value}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        setNodes((prev) =>
                                                            prev.map((n) => (n.id === node.id ? { ...n, value: val } : n))
                                                        );
                                                    }}
                                                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-1 py-1 text-xs text-white font-mono text-right"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {node.type === 'variable' && (
                                        <div className="space-y-1">
                                            <input
                                                type="number"
                                                value={node.value}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    setNodes((prev) =>
                                                        prev.map((n) => (n.id === node.id ? { ...n, value: val } : n))
                                                    );
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold"
                                            />
                                        </div>
                                    )}

                                    {node.type === 'operator' && (
                                        <div className="text-center font-extrabold text-indigo-400 text-sm py-1">
                                            {node.operator === '*' ? '✖️ (คูณ)' : node.operator === '/' ? '➗ (หาร)' : '➕ (บวก)'}
                                        </div>
                                    )}

                                    {node.type === 'result' && (
                                        <div className="text-center font-extrabold text-amber-300 text-base py-1">
                                            {evaluatedResults.finalVolumeLiters.toFixed(2)} ลิตร
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* 3. RIGHT PANEL: Live Results & AST Math Tree */}
                <Card className="lg:col-span-3 border-indigo-100 shadow-sm bg-white rounded-3xl overflow-hidden flex flex-col">
                    <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-900">
                            <Calculator className="h-4 w-4 text-emerald-600" />
                            📊 Live Preview & AST Evaluation
                        </CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">
                            แสดงผลลัพธ์สองทาง (Two-way binding) เรียลไทม์
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4 text-xs flex-1">
                        {/* Live Calculated Metric */}
                        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-4 rounded-2xl space-y-2 shadow-sm">
                            <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                                ผลลัพธ์ผสมรวมสุทธิ (Total Volume)
                            </span>
                            <div className="text-2xl font-extrabold text-amber-300">
                                {evaluatedResults.finalVolumeLiters.toFixed(2)} <span className="text-xs text-white">ลิตร</span>
                            </div>
                            <span className="text-[11px] text-slate-300 block">
                                ({evaluatedResults.finalVolumeCc.toLocaleString()} ซีซี / มล.)
                            </span>
                        </div>

                        {/* Edge Warnings */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700 text-[11px]">
                                🛡️ ผลการตรวจสอบความเข้ากันได้ของหน่วย:
                            </Label>
                            {edgeValidations.some((e) => !e.valid) ? (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-rose-800 text-[11px]">
                                    <div className="font-bold flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4 text-rose-600" /> พบล็อกสายเชื่อมหน่วยผิดมิติ:
                                    </div>
                                    {edgeValidations
                                        .filter((e) => !e.valid)
                                        .map((e) => (
                                            <p key={e.id} className="text-rose-700">
                                                • {e.errorMsg}
                                            </p>
                                        ))}
                                </div>
                            ) : (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-[11px] font-semibold">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    ผ่านการตรวจสอบมิติหน่วยทุกสายเชื่อม (All Edges Valid)
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
