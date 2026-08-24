'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { DEFAULT_AREA_PER_HOUSE } from '@/lib/area-per-house';

const STORAGE_KEY = 'ddc:area-per-house';

/**
 * พื้นที่ต่อบ้าน 1 หลังที่ใช้เป็นฐานของคอลัมน์ "ต่อ 1 หลัง" ในตารางสูตร
 *
 * ค่านี้ไม่ได้มาจากฉลากสารเคมี (ฉลากระบุแค่อัตราพ่นต่อพื้นที่) แต่เป็นตัวช่วยประมาณ
 * ของหน้างาน — 100 ตร.ม. เป็นเพียงค่าเริ่มต้นตามหลักการทั่วไป พื้นที่จริงของแต่ละ
 * พื้นที่ปฏิบัติงานต่างกันได้ จึงต้องปรับเป็นค่าใดก็ได้ ไม่ผูกกับชุดตัวเลขตายตัว
 *
 * จำค่าไว้ใน localStorage เพื่อไม่ต้องพิมพ์ใหม่ทุกครั้งที่เปิดหน้า
 */
export function useAreaPerHouse() {
    const [areaPerHouse, setAreaPerHouse] = useState<number>(DEFAULT_AREA_PER_HOUSE);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw === null ? NaN : Number(raw);
            if (Number.isFinite(parsed) && parsed > 0) setAreaPerHouse(parsed);
            // eslint-disable-next-line no-empty
        } catch { }
    }, []);

    const update = (value: number) => {
        setAreaPerHouse(value);
        try {
            if (Number.isFinite(value) && value > 0) localStorage.setItem(STORAGE_KEY, String(value));
            // eslint-disable-next-line no-empty
        } catch { }
    };

    return { areaPerHouse, setAreaPerHouse: update };
}

/** ช่องปรับพื้นที่ต่อหลัง วางไว้เหนือตารางสูตร */
export function AreaPerHouseControl({
    value,
    onChange,
    tone = 'light',
}: {
    value: number;
    onChange: (next: number) => void;
    /** ปรับสีให้เข้ากับตารางที่ไปวาง — admin เป็นเทา, พอร์ทัลผู้ใช้เป็นโทนแบรนด์ */
    tone?: 'light' | 'brand';
}) {
    const muted = tone === 'brand' ? 'text-brand-muted' : 'text-slate-500';
    return (
        <label className={`flex items-center gap-2 text-xs ${muted} whitespace-nowrap`}>
            <span>พื้นที่ต่อ 1 หลัง</span>
            <Input
                type="number"
                min="0.01"
                step="any"
                value={Number.isFinite(value) ? value : ''}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="h-8 w-24 text-center text-xs tabular-nums bg-white"
                aria-label="พื้นที่ต่อบ้าน 1 หลัง (ตารางเมตร)"
            />
            <span>ตร.ม.</span>
        </label>
    );
}
