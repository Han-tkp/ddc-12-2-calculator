import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FreeFormulaCalculator } from '@/components/calculator/free-formula-calculator';
import { Calculator } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPlaygroundPage() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/login');
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center gap-2 p-4 bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <div>
                    <h3 className="text-sm font-bold text-indigo-900">เครื่องคำนวณสูตรอิสระ (Excel-like)</h3>
                    <p className="text-xs text-indigo-700">กำหนดตัวแปร เขียนสูตรเอง คำนวณได้ทุกอย่าง เหมือนใช้ Excel</p>
                </div>
            </div>
            <FreeFormulaCalculator />
        </div>
    );
}
