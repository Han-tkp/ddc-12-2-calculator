import { z } from 'zod';
import type { FormulaInput } from './formula-schema';

/**
 * Builds a Zod object schema on the fly from a generic-table formula's
 * `inputs` metadata (label/type/options/min/max/integer), for validating
 * the dynamic input form in calculator-form.tsx. Kept separate from
 * `calculationSchema` since the shape is per-formula, not fixed.
 */
export function buildDynamicInputSchema(inputs: FormulaInput[]) {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const input of inputs) {
        if (input.type === 'select' && input.options && input.options.length > 0) {
            const [first, ...rest] = input.options;
            shape[input.name] = z.enum([first, ...rest]);
            continue;
        }

        let schema = z.coerce.number({ message: `กรุณากรอก "${input.label}" เป็นตัวเลข` });
        if (input.integer) schema = schema.int({ message: `"${input.label}" ต้องเป็นจำนวนเต็ม` });
        if (typeof input.min === 'number') schema = schema.min(input.min, { message: `"${input.label}" ต้องไม่น้อยกว่า ${input.min}` });
        if (typeof input.max === 'number') schema = schema.max(input.max, { message: `"${input.label}" ต้องไม่มากกว่า ${input.max}` });
        shape[input.name] = schema;
    }

    return z.object(shape);
}
