/**
 * Safe arithmetic expression parser/evaluator — replaces `new Function(...)` in formula-engine.ts.
 * No eval/Function; identifiers only ever resolve against the caller-supplied `scope`/function table,
 * never against JS globals, so there is no code path back to `process`/`fetch`/`constructor`/`__proto__`.
 */

export type MathFunctions = Record<string, (...args: number[]) => number>;

export type Token =
    | { type: 'num'; value: number }
    | { type: 'ident'; value: string }
    | { type: 'op'; value: string }
    | { type: 'lparen' }
    | { type: 'rparen' }
    | { type: 'comma' };

export type AstNode =
    | { type: 'num'; value: number }
    | { type: 'var'; name: string }
    | { type: 'call'; name: string; args: AstNode[] }
    | { type: 'binop'; op: string; left: AstNode; right: AstNode }
    | { type: 'unop'; op: string; arg: AstNode };

const MAX_TOKENS = 200;
const MAX_DEPTH = 50;

const COMPARISON_OPS = ['<=', '>=', '==', '!=', '<', '>'];

export class ExprError extends Error {}

export function tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < expr.length) {
        const ch = expr[i];
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

        // comparison operators (2-char first)
        const two = expr.slice(i, i + 2);
        if (COMPARISON_OPS.includes(two)) { tokens.push({ type: 'op', value: two }); i += 2; continue; }
        if (ch === '<' || ch === '>') { tokens.push({ type: 'op', value: ch }); i++; continue; }

        if ('+-*/%^'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
        if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
        if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
        if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }

        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
            let num = '';
            while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
            const value = Number(num);
            if (isNaN(value)) throw new ExprError(`ตัวเลขไม่ถูกต้อง: "${num}"`);
            tokens.push({ type: 'num', value });
            continue;
        }

        if (/[a-zA-Z_]/.test(ch)) {
            let word = '';
            while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) { word += expr[i]; i++; }
            tokens.push({ type: 'ident', value: word });
            continue;
        }

        throw new ExprError(`พบอักขระที่ไม่รู้จัก: "${ch}"`);
    }
    if (tokens.length > MAX_TOKENS) {
        throw new ExprError('สูตรยาวเกินไป');
    }
    return tokens;
}

class Parser {
    private pos = 0;
    constructor(private tokens: Token[], private functionNames: Set<string>) {}

    private peek(): Token | undefined {
        return this.tokens[this.pos];
    }

    private next(): Token {
        const t = this.tokens[this.pos];
        if (!t) throw new ExprError('สูตรไม่สมบูรณ์');
        this.pos++;
        return t;
    }

    parse(): AstNode {
        const node = this.parseComparison(0);
        if (this.pos < this.tokens.length) {
            throw new ExprError('มีสัญลักษณ์เกินความจำเป็นในสูตร');
        }
        return node;
    }

    private parseComparison(depth: number): AstNode {
        let left = this.parseAdditive(depth + 1);
        while (this.peek()?.type === 'op' && COMPARISON_OPS.includes((this.peek() as any).value)) {
            const op = (this.next() as { type: 'op'; value: string }).value;
            const right = this.parseAdditive(depth + 1);
            left = { type: 'binop', op, left, right };
        }
        return left;
    }

    private parseAdditive(depth: number): AstNode {
        this.assertDepth(depth);
        let left = this.parseMultiplicative(depth + 1);
        while (this.peek()?.type === 'op' && ((this.peek() as any).value === '+' || (this.peek() as any).value === '-')) {
            const op = (this.next() as { type: 'op'; value: string }).value;
            const right = this.parseMultiplicative(depth + 1);
            left = { type: 'binop', op, left, right };
        }
        return left;
    }

    private parseMultiplicative(depth: number): AstNode {
        this.assertDepth(depth);
        let left = this.parseUnary(depth + 1);
        while (
            this.peek()?.type === 'op' &&
            ['*', '/', '%'].includes((this.peek() as any).value)
        ) {
            const op = (this.next() as { type: 'op'; value: string }).value;
            const right = this.parseUnary(depth + 1);
            left = { type: 'binop', op, left, right };
        }
        return left;
    }

    private parseUnary(depth: number): AstNode {
        this.assertDepth(depth);
        const t = this.peek();
        if (t?.type === 'op' && (t.value === '-' || t.value === '+')) {
            this.next();
            const arg = this.parseUnary(depth + 1);
            return { type: 'unop', op: t.value, arg };
        }
        return this.parsePower(depth + 1);
    }

    private parsePower(depth: number): AstNode {
        this.assertDepth(depth);
        const base = this.parsePrimary(depth + 1);
        if (this.peek()?.type === 'op' && (this.peek() as any).value === '^') {
            this.next();
            const exponent = this.parseUnary(depth + 1); // right-associative
            return { type: 'binop', op: '^', left: base, right: exponent };
        }
        return base;
    }

    private parsePrimary(depth: number): AstNode {
        this.assertDepth(depth);
        const t = this.next();
        if (t.type === 'num') return { type: 'num', value: t.value };
        if (t.type === 'lparen') {
            const node = this.parseComparison(depth + 1);
            const close = this.next();
            if (close.type !== 'rparen') throw new ExprError('วงเล็บไม่ครบ');
            return node;
        }
        if (t.type === 'ident') {
            if (this.peek()?.type === 'lparen') {
                this.next(); // consume (
                const upper = t.value.toUpperCase();
                if (!this.functionNames.has(upper)) {
                    throw new ExprError(`พบฟังก์ชันที่ไม่รู้จัก: "${t.value}"`);
                }
                const args: AstNode[] = [];
                if (this.peek()?.type !== 'rparen') {
                    args.push(this.parseComparison(depth + 1));
                    while (this.peek()?.type === 'comma') {
                        this.next();
                        args.push(this.parseComparison(depth + 1));
                    }
                }
                const close = this.next();
                if (close.type !== 'rparen') throw new ExprError('วงเล็บไม่ครบ');
                return { type: 'call', name: upper, args };
            }
            if (t.value.toLowerCase() === 'true') return { type: 'num', value: 1 };
            if (t.value.toLowerCase() === 'false') return { type: 'num', value: 0 };
            return { type: 'var', name: t.value };
        }
        throw new ExprError('สูตรไม่ถูกต้อง');
    }

    private assertDepth(depth: number) {
        if (depth > MAX_DEPTH) throw new ExprError('สูตรซับซ้อนเกินไป');
    }
}

export function parse(tokens: Token[], functionNames: Set<string>): AstNode {
    if (tokens.length === 0) throw new ExprError('ไม่มีสูตร');
    return new Parser(tokens, functionNames).parse();
}

export function evaluate(node: AstNode, scope: Record<string, number>, functions: MathFunctions): number {
    switch (node.type) {
        case 'num':
            return node.value;
        case 'var': {
            if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
                throw new ExprError(`ไม่พบตัวแปร: "${node.name}"`);
            }
            return scope[node.name];
        }
        case 'unop': {
            const v = evaluate(node.arg, scope, functions);
            return node.op === '-' ? -v : v;
        }
        case 'binop': {
            const l = evaluate(node.left, scope, functions);
            const r = evaluate(node.right, scope, functions);
            switch (node.op) {
                case '+': return l + r;
                case '-': return l - r;
                case '*': return l * r;
                case '/': return l / r;
                case '%': return l % r;
                case '^': return Math.pow(l, r);
                case '<': return l < r ? 1 : 0;
                case '<=': return l <= r ? 1 : 0;
                case '>': return l > r ? 1 : 0;
                case '>=': return l >= r ? 1 : 0;
                case '==': return l === r ? 1 : 0;
                case '!=': return l !== r ? 1 : 0;
                default: throw new ExprError(`ตัวดำเนินการไม่รู้จัก: "${node.op}"`);
            }
        }
        case 'call': {
            const fn = functions[node.name];
            if (!fn) throw new ExprError(`พบฟังก์ชันที่ไม่รู้จัก: "${node.name}"`);
            const args = node.args.map(a => evaluate(a, scope, functions));
            return fn(...args);
        }
        default:
            throw new ExprError('โหนดของสูตรไม่ถูกต้อง');
    }
}
