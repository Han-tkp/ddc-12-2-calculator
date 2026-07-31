'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
    placeholder?: string;
}

export function SearchInput({
    placeholder = 'ค้นหา...',
}: SearchInputProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [query, setQuery] = useState(searchParams.get('q') || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());

        if (query.trim()) params.set('q', query.trim());
        else params.delete('q');

        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearSearch = () => {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <form onSubmit={handleSearch} className="flex items-center gap-1 w-full">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="pl-8 h-9 text-xs bg-slate-50 border-slate-200 pr-8"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="ล้างการค้นหา"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            <Button type="submit" size="icon" className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-sm">
                <Search className="h-4 w-4" />
            </Button>
        </form>
    );
}
