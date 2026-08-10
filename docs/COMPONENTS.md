<!-- markdownlint-disable MD060 -->
# แผนที่ Components ทั้งหมด

อธิบายว่าแต่ละไฟล์ใน `src/components/` คืออะไร ใช้ตรงไหน จัดกลุ่มตามโฟลเดอร์ ยึดตามโค้ดจริง ณ วันที่เขียน — ถ้าเพิ่ม/ลบ component ใหม่ ควรอัปเดตไฟล์นี้ตามไปด้วย

## `calculator/` — หน้าคำนวณหลัก (ใช้ทั้งฝั่งสาธารณะและ Field Mode)

| ไฟล์ | คืออะไร |
| --- | --- |
| `use-calculator-engine.ts` | **Hook หลัก ไม่ใช่ UI** — เก็บ state ฟอร์มทั้งหมด (react-hook-form), โหลดสูตรจาก `/api/profiles`, คำนวณผ่าน `calculate()`/`runFormula()`, ให้ handler ทุกตัว (`handlePresetChange`, `handleRAUnitChange`, `handleCalculateAndSave`, ...) ใช้ร่วมกันโดย `calculator-form.tsx` และ `field-mode/field-mode-calculator.tsx` |
| `calculator-form.tsx` | ฟอร์มคำนวณหน้าแรก (`/`) — กรอก C/S/RA/พื้นที่/จำนวนหลัง แล้วแสดงผลผ่าน `ResultsDisplay` หรือ `GenericFormulaResults` |
| `preset-combobox.tsx` | Dropdown เลือกสูตรแบบพิมพ์ค้นหาได้ (autocomplete, จำกัด 10 แถว) ใช้แทน `<Select>` เดิมใน `calculator-form.tsx` |
| `results-display.tsx` | แสดงผลลัพธ์การคำนวณแบบ tank-dilution (C/S/RA แบบดั้งเดิม) — รับ `resultHelp` เพื่อโชว์คำอธิบายเพิ่มเติมต่อค่า (A0, mix_type) ถ้ามี |
| `generic-formula-results.tsx` | แสดงผลลัพธ์สำหรับสูตร "แบบ Excel" (generic-table/`FreeFormulaCalculator`) — คนละ layout จาก `results-display.tsx` |
| `formula-trial-preview.tsx` | กล่อง "ทดลองคำนวณ" ในไดอะล็อกเพิ่มสูตร — คำนวณ preview ด้วย `calculate()` ตรงๆ ในเบราว์เซอร์ ไม่ยิง API ไม่บันทึกอะไรลง DB เก็บค่าชั่วคราวใน localStorage |
| `result-help-editor.tsx` | ฟอร์มย่อยให้พิมพ์คำอธิบาย/help-text ต่อฟิลด์ (เช่น A0, mix_type) เก็บเป็น `resultHelp: Record<string,string>` แล้วส่งไปกับตัวสูตร |
| `public-formula-manager.tsx` | ไดอะล็อก **"เพิ่มสูตรสารเคมี" แบบปกติ ฝั่งสาธารณะ** (guest, ผูกกับ `guestOwnerToken`) |
| `public-formula-actions.tsx` | ปุ่ม แก้ไข/ลบ สูตรที่ผู้ใช้ทั่วไปสร้างเอง (เฉพาะเจ้าของ `guestOwnerToken`) — มีไดอะล็อกแก้ไขในตัว |
| `free-formula-calculator.tsx` | **เครื่องคำนวณสูตร Excel-style** — ผู้ใช้พิมพ์ตัวแปร/สูตร (`SUM`, `IF`, ...) เอง ไม่มี A0/reference-area อัตโนมัติ เพราะทุกอย่างเป็นตัวแปรที่ผู้ใช้กำหนดเอง ใช้ทั้งในหน้า public และฝังใน user portal (`user-public-portal.tsx`) |
| `label-guide.tsx` | ปุ่ม/โมดัลอธิบายวิธีอ่านฉลากเคมี (help content เฉยๆ) |
| `location-picker.tsx` | แผนที่ Leaflet เลือกพิกัด GPS ตอนบันทึกผลคำนวณ |
| `location-picker-wrapper.tsx` | ตัวห่อ `location-picker.tsx` ด้วย `dynamic(..., { ssr:false })` (Leaflet ต้องรันฝั่ง client เท่านั้น) |

## `admin/` — เฉพาะ `/admin/*` (ต้องล็อกอิน role ADMIN)

| ไฟล์ | คืออะไร |
| --- | --- |
| `admin-layout-wrapper.tsx` | โครง layout รอบเนื้อหาแอดมินทุกหน้า (sidebar + content area) |
| `admin-sidebar.tsx` | เมนูด้านข้างของ `/admin/*` อ่านรายการจาก `src/config/admin-nav.ts` |
| `mobile-nav.tsx` | เมนูแอดมินเวอร์ชันมือถือ (hamburger) |
| `profiles-table.tsx` | ตาราง CRUD สูตรสารเคมีที่ `/admin/profiles` — มีไดอะล็อกเพิ่ม/แก้ไขสูตรในตัว และ `BulkEditProfilesModal` สำหรับแก้หลายสูตรพร้อมกัน |
| `bulk-edit-profiles-modal.tsx` | ไดอะล็อกแก้ไขหลายสูตรพร้อมกัน — เลือกได้หลายแถวจาก `profiles-table.tsx` แล้วแก้ค่าของแต่ละแถวแยกอิสระในหน้าต่างเดียว |
| `profile-source-filter.tsx` | ตัวกรองแบบ toggle-group ตามแหล่งที่มาของสูตร (ค่าเริ่มต้น/แอดมิน/ผู้ใช้ทั่วไป/นำเข้าไฟล์) ใช้ใน `/admin/profiles` |
| `user-actions.tsx` | เมนู แก้ไข/ลบ/เปลี่ยนสิทธิ์ ต่อแถวผู้ใช้ใน `/admin/users` |
| `calculation-map.tsx` | แผนที่ Leaflet จริงที่ `/admin/dashboard` — คลัสเตอร์มาร์กเกอร์ (`leaflet.markercluster`) + heatmap (`leaflet.heat`) พร้อมปุ่มสลับมุมมอง |
| `dashboard-map.tsx` | ตัวห่อ `calculation-map.tsx` ด้วย dynamic import (`ssr:false`) เหมือน `location-picker-wrapper.tsx` |
| `dashboard-charts.tsx` | กราฟแท่ง/เส้นสรุปสถิติที่ `/admin/dashboard` (Recharts) |
| `dashboard-tabs.tsx` | โครง Tabs ของหน้า dashboard (ปฏิบัติการ / วิเคราะห์เชิงลึก ฯลฯ) |
| `dashboard-export-button.tsx` | ปุ่ม export ข้อมูล dashboard เป็น Excel (เรียก server action ใน `src/app/actions/export.ts`) |
| `export-excel-button.tsx` | ปุ่ม export คนละจุด (ประวัติการคำนวณ/ช่วงวันที่ที่เลือก) — แยกจาก `dashboard-export-button.tsx` |
| `location-report.tsx` | ตาราง/สรุปยอดตามสถานที่ปฏิบัติงาน ใช้ในแดชบอร์ด |
| `trend-delta.tsx` | ตัวเลขเปอร์เซ็นต์เพิ่ม/ลดเทียบช่วงก่อนหน้า (ลูกศรขึ้น-ลง) ใช้กับการ์ดสถิติในแดชบอร์ด |
| `search-input.tsx` | กล่องค้นหาแบบ URL param (`?q=`) ใช้ซ้ำในตาราง `users`/`profiles`/`inbox` |
| `role-filter.tsx` | ตัวกรองแบบ dropdown ตาม role (USER/ADMIN) ใช้ใน `/admin/logs`, `/admin/audit` |
| `date-range-filter.tsx` | ตัวกรองช่วงวันที่ (URL param) ใช้ใน `/admin/logs`, `/admin/audit` |
| `dimension-filter.tsx` | ตัวกรอง dropdown ทั่วไปแบบ generic (เลือกมิติ/ค่าที่กำหนดเอง) |
| `qr-code-tool.tsx` | เครื่องมือสร้าง/จัดการ QR code ที่ `/admin/qr` |
| `billing-actions.tsx` | ปุ่มจัดการ subscription (เปิด Stripe portal/checkout) ที่ `/admin/billing` |

## `field-mode/` — โหมดภาคสนาม (`/app`)

| ไฟล์ | คืออะไร |
| --- | --- |
| `field-mode-calculator.tsx` | เวอร์ชัน mobile-first ของ `calculator-form.tsx` ใช้ hook เดียวกัน (`use-calculator-engine.ts`) แต่ UI เป็น chip เลือกสูตร + ค้นหาแบบ inline ของตัวเอง (ไม่ได้ใช้ `PresetCombobox`) |
| `field-mode-generic-result.tsx` | เวอร์ชัน mobile ของ `generic-formula-results.tsx` สำหรับสูตรแบบ Excel |

## `user/` — พอร์ทัลผู้ใช้ทั่วไป (`/user`)

| ไฟล์ | คืออะไร |
| --- | --- |
| `user-public-portal.tsx` | หน้ารวมของ `/user` — คุม Tabs ทั้ง 4 แท็บ: ภาพรวมปฏิบัติงาน, วิเคราะห์, คลังสูตร (read-only catalog), เพิ่มสูตรสารเคมี (`free-formula-calculator.tsx`) |

## ระดับบนสุด (`src/components/*.tsx`)

| ไฟล์ | คืออะไร |
| --- | --- |
| `feedback-dialog.tsx` | ปุ่มลอยมุมขวาล่าง เปิดฟอร์มส่งข้อเสนอแนะ/ขอเพิ่มสูตร → บันทึกลงตาราง `feedbacks` (ไปโผล่ที่ `/admin/inbox`) |
| `footer.tsx` | Footer ของเว็บ (โลโก้/ลิงก์หน่วยงาน) |

## `ui/` — shadcn/ui primitives (Radix ใต้ฝาครอบ, ไม่มี business logic)

ทุกไฟล์ในนี้เป็น component ทั่วไปใช้ซ้ำได้ทั้งระบบ ไม่ผูกกับโดเมนเคมี/การคำนวณ:

| ไฟล์ | คืออะไร |
| --- | --- |
| `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `badge.tsx`, `card.tsx` | Element พื้นฐาน (ปุ่ม, ช่องกรอก, การ์ด ฯลฯ) |
| `select.tsx` | Dropdown แบบเลือกได้อย่างเดียว (ไม่พิมพ์ค้นหา) — ใช้กับตัวเลือกคงที่ เช่น mix_type, RA_unit |
| `popover.tsx` | กล่องลอย (เพิ่มใหม่พร้อม `command.tsx` เพื่อสร้าง `preset-combobox.tsx`) |
| `command.tsx` | ชุด primitive สำหรับ command palette / combobox (จาก `cmdk`, เพิ่มใหม่) — ตัวที่ `preset-combobox.tsx` เอาไปประกอบ |
| `dialog.tsx` | โมดัล/ไดอะล็อกมาตรฐาน — เป็นฐานของแทบทุกไดอะล็อกในระบบ (เพิ่มสูตร, ยืนยันลบ, ...) |
| `sheet.tsx` | แผงเลื่อนจากขอบจอ (ใช้กับเมนูมือถือ) |
| `dropdown-menu.tsx` | เมนูลอยแบบคลิกแล้วมีตัวเลือกย่อย (ใช้ใน `user-actions.tsx`) |
| `tabs.tsx` | โครง Tabs มาตรฐาน (ใช้ใน dashboard, user portal) |
| `table.tsx` | โครงตาราง HTML (`Table`, `TableRow`, `TableCell`, ...) ใช้แทบทุกตาราง admin |
| `pagination.tsx` | ปุ่มเปลี่ยนหน้า อ่าน/เขียน `?page=` ผ่าน URL — ใช้ในทุกตาราง admin ที่แบ่งหน้า |
| `radio-group.tsx` | กลุ่มปุ่มตัวเลือกแบบเลือกได้ตัวเดียว |
| `form.tsx` | ตัวช่วยผูก react-hook-form กับ label/error message |
| `sonner.tsx` | ตัวแสดง toast (แจ้งเตือนมุมจอ) |
| `katex-display.tsx` | แสดงสูตรคณิตศาสตร์ด้วย KaTeX (ใช้ตรงคำอธิบายสูตรบางจุด) |

## หมายเหตุ

- `results-display.tsx` (tank-dilution) กับ `generic-formula-results.tsx`/`field-mode-generic-result.tsx` (generic-table/Excel) เป็นคนละระบบ แยกกันเพราะ `runFormula()` มี 2 execution path — ดู `src/lib/formula-interpreter.ts`
- ไฟล์ที่ลงท้าย `-wrapper.tsx` (`location-picker-wrapper.tsx`, และ `dashboard-map.tsx` ที่ห่อ `calculation-map.tsx`) มีไว้แก้ปัญหา Leaflet ต้องรันฝั่ง client เท่านั้น (`dynamic(..., { ssr: false })`) — ไม่ได้มี logic อื่นเพิ่ม
- `custom-chemical-modal.tsx` vs `public-formula-manager.tsx`: โครงหน้าตาคล้ายกันมาก แต่เป็นคนละ endpoint/สิทธิ์เจ้าของ (แอดมิน/MCP เทียบกับ guest สาธารณะ) — แก้ไข logic ร่วมกัน (เช่น unit toggle, resultHelp) ต้องแก้ทั้งสองไฟล์แยกกัน
