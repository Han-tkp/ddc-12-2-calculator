'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PresetOption {
    id: string | number;
    name: string;
    C?: number;
    S?: number;
    [key: string]: unknown;
}

interface PresetComboboxProps {
    presets: PresetOption[];
    value: string;
    onValueChange: (id: string) => void;
    placeholder?: string;
    /** Max rows shown at once — the rest only appear as the search narrows the list. */
    maxVisible?: number;
}

/**
 * Type-to-search replacement for the plain preset <Select>. dbPresets can grow to
 * dozens of formulas, so this filters by name/ratio as you type and caps the
 * visible list instead of rendering every option in one long scroll.
 */
export function PresetCombobox({ presets, value, onValueChange, placeholder = 'เลือกสูตร...', maxVisible = 10 }: PresetComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const selected = useMemo(() => presets.find(p => String(p.id) === value), [presets, value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matches = q
            ? presets.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.C !== undefined && p.S !== undefined && `${p.C}:${p.S}`.includes(q))
            )
            : presets;
        return matches.slice(0, maxVisible);
    }, [presets, query, maxVisible]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="glass-input h-11 sm:h-12 w-full justify-between bg-white/50 backdrop-blur-sm border-slate-200/50 hover:bg-white/80 font-normal text-xs sm:text-sm"
                >
                    {selected ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="font-medium">{selected.name}</span>
                            {selected.id !== 'other' && selected.C !== undefined && (
                                <span className="text-[11px] text-slate-400">({selected.C}:{selected.S})</span>
                            )}
                        </span>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="พิมพ์เพื่อค้นหาสูตร..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        <CommandEmpty>ไม่พบสูตรที่ตรงกัน</CommandEmpty>
                        <CommandGroup>
                            {filtered.map((preset) => (
                                <CommandItem
                                    key={preset.id}
                                    value={String(preset.id)}
                                    onSelect={() => {
                                        onValueChange(String(preset.id));
                                        setQuery('');
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('h-4 w-4', String(preset.id) === value ? 'opacity-100' : 'opacity-0')} />
                                    <span className="text-xs sm:text-sm font-medium">{preset.name}</span>
                                    {preset.id !== 'other' && preset.C !== undefined && (
                                        <span className="text-[11px] text-slate-400 ml-auto">({preset.C}:{preset.S})</span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
