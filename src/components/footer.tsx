import { Phone, MapPin, HeartPulse } from 'lucide-react';

export function Footer() {
    return (
        <footer className="mt-12 py-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">

                    <div className="space-y-2">
                        <h3 className="font-bold text-slate-800 text-lg">
                            ศูนย์ควบคุมโรคติดต่อนำโดยแมลงที่ 12.2 จังหวัดสงขลา
                        </h3>
                        <div className="text-slate-600 text-sm space-y-1">
                            <p className="flex items-center justify-center md:justify-start gap-2">
                                <MapPin className="h-4 w-4 text-brand" />
                                428 ถ.ไทรบุรี ต.บ่อยาง อ.เมืองสงขลา จ.สงขลา 90000
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-emerald-500" />
                                    สายด่วน: <span className="font-semibold text-emerald-600">1422</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-700">โทรศัพท์:</span> 074-311 411
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2">
                        <div className="bg-brand-soft px-4 py-2 rounded-full">
                            <p className="text-brand-dark font-medium text-sm flex items-center gap-2">
                                <HeartPulse className="h-4 w-4 text-red-500" />
                                "กรมควบคุมโรคห่วงใย อยากให้คนไทยสุขภาพดี"
                            </p>
                        </div>
                        <p className="text-xs text-slate-400">© DDC 12.2 Calculator | By Github:han-tkp.</p>
                    </div>

                </div>
            </div>
        </footer>
    );
}
