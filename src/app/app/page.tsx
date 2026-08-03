import type { Metadata } from 'next';
import { FieldModeCalculator } from '@/components/field-mode/field-mode-calculator';

export const metadata: Metadata = {
    title: 'คำนวณสาร — Field Mode',
};

export default function FieldModePage() {
    return <FieldModeCalculator />;
}
