import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface KaTeXDisplayProps {
    formula: string;
    displayMode?: boolean;
    className?: string;
}

export function KaTeXDisplay({ formula, displayMode = false, className }: KaTeXDisplayProps) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) {
            try {
                katex.render(formula, ref.current, {
                    throwOnError: false,
                    displayMode,
                    trust: true,
                });
            } catch {
                if (ref.current) ref.current.textContent = formula;
            }
        }
    }, [formula, displayMode]);

    return <span ref={ref} className={className} />;
}
