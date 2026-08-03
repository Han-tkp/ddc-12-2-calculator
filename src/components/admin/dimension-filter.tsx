'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface DimensionFilterProps {
    /** searchParam key this control owns, e.g. "chemical" or "location". */
    paramKey: string;
    label: string;
    /** Distinct values, supplied by the server page that already loaded the rows. */
    options: string[];
    allLabel?: string;
}

/** Sentinel for "no filter" — Radix Select rejects an empty-string item value. */
const ALL = '__all__';

/**
 * A single dimension drop-down that writes its state into the URL, matching
 * DateRangeFilter / SearchInput / RoleFilter. Keeping the filter in searchParams
 * means a filtered dashboard is a shareable link and survives a refresh, and the
 * server component re-queries rather than the client filtering a partial page.
 */
export function DimensionFilter({ paramKey, label, options, allLabel = 'ทั้งหมด' }: DimensionFilterProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = searchParams.get(paramKey) || ALL;

    const handleChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === ALL) params.delete(paramKey);
        else params.set(paramKey, value);
        // Any filter change invalidates the current page offset.
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] font-medium text-brand-muted">{label}</span>
            <Select value={current} onValueChange={handleChange}>
                <SelectTrigger className="h-9 text-xs bg-white border-brand-line w-full sm:w-48">
                    <SelectValue placeholder={allLabel} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                    <SelectItem value={ALL}>{allLabel}</SelectItem>
                    {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
