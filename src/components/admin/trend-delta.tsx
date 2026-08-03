import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendDeltaProps {
    current: number;
    previous: number;
    /** What the numbers count, e.g. "รายการ" — used in the accessible label. */
    unit?: string;
    /** Label for the comparison window shown after the percentage. */
    periodLabel?: string;
}

/**
 * Period-over-period change for a KPI card.
 *
 * Deliberately NOT colour-coded good/bad. This dashboard measures pesticide
 * application volume: more spraying can mean a bigger outbreak (bad) or better
 * coverage (good), and the system has no way to tell which. Painting "up" green
 * would assert a judgement the data does not support, so direction is carried by
 * an arrow plus a sign, and colour stays neutral ink.
 */
export function TrendDelta({ current, previous, unit = '', periodLabel = 'จากช่วงก่อนหน้า' }: TrendDeltaProps) {
    // No baseline to compare against — say so rather than showing a meaningless +100%.
    if (!Number.isFinite(previous) || previous <= 0) {
        return (
            <p className="text-xs text-brand-muted mt-1">
                {current > 0 ? `ช่วงก่อนหน้าไม่มีข้อมูลให้เทียบ` : 'ไม่มีข้อมูลเทียบ'}
            </p>
        );
    }

    const diff = current - previous;
    const pct = (diff / previous) * 100;
    // Below half a percent the arrow implies a movement that isn't really there.
    const flat = Math.abs(pct) < 0.5;

    const Icon = flat ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight;
    const sign = diff > 0 ? '+' : '';

    return (
        <p className="text-xs text-brand-muted mt-1 flex items-center gap-1 flex-wrap">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-brand-ink tabular-nums">
                {flat ? 'ทรงตัว' : `${sign}${pct.toFixed(1)}%`}
            </span>
            <span>{periodLabel}</span>
            <span className="text-brand-muted/80">
                ({previous.toLocaleString('th-TH')}{unit ? ` ${unit}` : ''})
            </span>
        </p>
    );
}
