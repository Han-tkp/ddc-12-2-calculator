'use client';

import { useEffect } from 'react';

/**
 * Field officers on mobile mostly just want the calculator, not the hero copy.
 * Scrolls straight to #calculator-card on load when the viewport is mobile-width —
 * skips desktop, where the hero + calculator both fit without scrolling anyway.
 */
export function AutoScrollToCalculator() {
    useEffect(() => {
        if (window.innerWidth >= 768) return;
        const target = document.getElementById('calculator-card');
        if (!target) return;

        const timer = setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
