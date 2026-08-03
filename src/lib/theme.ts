/**
 * Raw brand colour values for the few places that need inline styles
 * (canvas, dynamically-computed styles) rather than Tailwind classes.
 *
 * Canonical definition lives in `src/app/globals.css` under `@theme` — prefer the
 * generated Tailwind utilities (`bg-brand`, `text-brand-dark`, `border-brand/20`, …)
 * wherever a className will do. Keep both in sync if the palette ever changes —
 * and `public/site.webmanifest`'s theme_color too, since static JSON can't import this.
 */
export const BRAND = {
    /** Agency green, sampled from the Ministry of Public Health seal. */
    accent: '#0b724a',
    accentDark: '#085a3a',
    /** Pale mint, for subtle fills behind the accent. */
    soft: '#eef5f1',
    /** Deep forest ink — primary text, not pure black. */
    ink: '#122a1e',
    inkMuted: '#5c6e63',
    line: '#e2e5e3',
    cloud: '#f5f6f5',
    /** Semantic states, deliberately outside the green family so they never
     *  get lost against the accent. */
    warn: '#b45309',
    critical: '#b42318',
} as const;
