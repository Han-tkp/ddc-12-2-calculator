'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BRAND } from '@/lib/theme';

interface DashboardChartsProps {
    dailyStats: { date: string; count: number }[];
    chemicalStats: { name: string; value: number }[];
    volumeStats: { name: string; value: number }[];
}

/**
 * Categorical slots, in fixed order — validated for colour-vision deficiency
 * (worst adjacent pair ΔE 9.1 protan, normal-vision floor 19.6). Never cycle past
 * the last slot to invent a 7th hue: the tail folds into "อื่นๆ" instead, which is
 * what OTHER_COLOR paints. Contrast against a white card sits under 3:1 for three
 * of these, so every slice must carry a visible text label — hence the legend
 * below prints name, value and share rather than relying on colour alone.
 */
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const OTHER_COLOR = '#94a3b8';

/** Past this many slices a donut stops being readable; the rest becomes "อื่นๆ". */
const MAX_SLICES = 5;
/** The volume chart is a ranking, not a census — show the meaningful head of it. */
const MAX_BARS = 10;

const AXIS_COLOR = '#94a3b8';

function formatCompact(n: number): string {
    if (!Number.isFinite(n)) return '-';
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} ล้าน`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)} พัน`;
    return n.toLocaleString('th-TH');
}

const tooltipStyle = {
    borderRadius: '12px',
    border: `1px solid ${BRAND.line}`,
    boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)',
    fontSize: '12px',
} as const;

export function DashboardCharts({ dailyStats, chemicalStats, volumeStats }: DashboardChartsProps) {
    /**
     * The catalogue routinely holds 15–20 chemicals. Rendering one slice per chemical
     * produced a donut whose legend and per-slice labels overlapped the ring itself
     * and spilled outside the card — unreadable. Keep the leaders separate and sum
     * the tail so the shape stays interpretable.
     */
    const { slices, otherCount, total } = useMemo(() => {
        const sorted = [...chemicalStats].sort((a, b) => b.value - a.value);
        const head = sorted.slice(0, MAX_SLICES);
        const tail = sorted.slice(MAX_SLICES);
        const tailTotal = tail.reduce((sum, s) => sum + s.value, 0);
        const grandTotal = sorted.reduce((sum, s) => sum + s.value, 0);
        return {
            slices: tailTotal > 0 ? [...head, { name: `อื่นๆ (${tail.length} ชนิด)`, value: tailTotal }] : head,
            otherCount: tail.length,
            total: grandTotal,
        };
    }, [chemicalStats]);

    /**
     * Volumes span several orders of magnitude — one heavily used chemical flattens
     * every other bar to a hairline against a shared linear axis. Ranking and
     * trimming to the head keeps the axis governed by comparable values, and the
     * direct value label means a short bar is still readable rather than guessed at.
     * (A log axis was the alternative, and was rejected: readers habitually compare
     * bar lengths, and on a log scale those lengths misstate dose ratios.)
     */
    const topVolumes = useMemo(
        () => [...volumeStats].sort((a, b) => b.value - a.value).slice(0, MAX_BARS),
        [volumeStats]
    );
    const hiddenVolumes = Math.max(0, volumeStats.length - topVolumes.length);

    return (
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Usage — single measure, so one hue rather than a categorical set */}
            <Card className="border-brand-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-brand-ink">สถิติการใช้งานรายวัน</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280} initialDimension={{ width: 600, height: 280 }}>
                            <BarChart data={dailyStats} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={BRAND.line} />
                                <XAxis dataKey="date" stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={AXIS_COLOR} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                    contentStyle={tooltipStyle}
                                    formatter={(v: number | undefined) => [`${Number(v ?? 0).toLocaleString('th-TH')} รายการ`, 'จำนวน']}
                                />
                                <Bar dataKey="count" fill={BRAND.accent} radius={[4, 4, 0, 0]} name="จำนวนรายการ" maxBarSize={56} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Chemical share — donut capped at MAX_SLICES + "อื่นๆ" */}
            <Card className="border-brand-line shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-brand-ink">สัดส่วนสารเคมีที่ใช้</CardTitle>
                    <CardDescription className="text-xs">
                        {otherCount > 0
                            ? `แสดง ${MAX_SLICES} อันดับแรก และรวมอีก ${otherCount} ชนิดเป็น "อื่นๆ"`
                            : `ทั้งหมด ${slices.length} ชนิด`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {slices.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-sm text-brand-muted">ยังไม่มีข้อมูล</div>
                    ) : (
                        // Legend sits BELOW the ring, never beside it. This card lives in a
                        // two-column grid, so a side legend gets ~60px and truncates every name
                        // to nothing — leaving coloured dots with no text, which is exactly the
                        // colour-alone failure the palette's contrast warning forbids. Stacked,
                        // the legend always has the full card width.
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-52 w-52 shrink-0">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} initialDimension={{ width: 208, height: 208 }}>
                                    <PieChart>
                                        <Pie
                                            data={slices}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={82}
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                            /* No per-slice labels: with any real number of
                                               categories they collide into illegible mush.
                                               Identity lives in the labelled legend beside it. */
                                        >
                                            {slices.map((entry, index) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.name.startsWith('อื่นๆ') ? OTHER_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                                    stroke="#ffffff"
                                                    strokeWidth={2}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            formatter={(v: number | undefined, name: string | undefined) => [
                                                `${Number(v).toLocaleString('th-TH')} ครั้ง (${total ? ((Number(v) / total) * 100).toFixed(1) : 0}%)`,
                                                name,
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend carries the text relief the palette's contrast WARN requires */}
                            <ul className="w-full min-w-0 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {slices.map((entry, index) => (
                                    <li key={entry.name} className="flex items-center gap-2 text-xs">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ background: entry.name.startsWith('อื่นๆ') ? OTHER_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                                        />
                                        <span className="truncate text-brand-ink" title={entry.name}>{entry.name}</span>
                                        <span className="ml-auto shrink-0 tabular-nums font-semibold text-brand-ink">
                                            {total ? ((entry.value / total) * 100).toFixed(1) : '0'}%
                                        </span>
                                        <span className="shrink-0 tabular-nums text-brand-muted w-14 text-right">
                                            {entry.value.toLocaleString('th-TH')} ครั้ง
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Total volume — magnitude comparison, so a single hue and a sorted ranking */}
            <Card className="border-brand-line shadow-sm lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-brand-ink">ปริมาณการใช้สารเคมีรวม (ลิตร)</CardTitle>
                    <CardDescription className="text-xs">
                        เรียงจากมากไปน้อย{hiddenVolumes > 0 ? ` — แสดง ${MAX_BARS} อันดับแรกจากทั้งหมด ${volumeStats.length} ชนิด` : ''}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {topVolumes.length === 0 ? (
                        <div className="h-72 flex items-center justify-center text-sm text-brand-muted">ยังไม่มีข้อมูล</div>
                    ) : (
                        <div style={{ height: Math.max(240, topVolumes.length * 38 + 48) }} className="w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 800, height: 400 }}>
                                <BarChart
                                    data={topVolumes}
                                    layout="vertical"
                                    margin={{ top: 8, right: 76, left: 8, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={BRAND.line} />
                                    <XAxis
                                        type="number"
                                        stroke={AXIS_COLOR}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={formatCompact}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke={AXIS_COLOR}
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                        width={150}
                                        interval={0}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                        contentStyle={tooltipStyle}
                                        formatter={(v: number | undefined) => [`${Number(v ?? 0).toLocaleString('th-TH')} ลิตร`, 'ปริมาณรวม']}
                                    />
                                    <Bar dataKey="value" fill={BRAND.accent} radius={[0, 4, 4, 0]} name="ปริมาณรวม" maxBarSize={22}>
                                        {/* Direct label so a short bar still reports its value */}
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            formatter={(v: unknown) => formatCompact(Number(v ?? 0))}
                                            style={{ fontSize: 11, fill: BRAND.inkMuted }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
