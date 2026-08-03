-- Backfill formula JSONB for 4 default presets
-- Values confirmed from CHEMICAL_PRESETS and user verification

-- Deltacide (หมอกควัน) — C=1, S=79, RA=1, RA_unit='L', mix_type=2, A0=1000, A_house=100
UPDATE public.label_profiles SET formula = '{
  "schemaVersion": 1,
  "meta": {"name": "Deltacide (หมอกควัน)", "resultTemplate": "tank-dilution"},
  "inputs": [
    {"id":"C","name":"C","expression":"1","label":"สัดส่วนสารออกฤทธิ์","default":1},
    {"id":"S","name":"S","expression":"79","label":"สัดส่วนตัวทำละลาย","default":79},
    {"id":"RA","name":"RA","expression":"1","label":"อัตราฉีดพ่น","unit":"L","default":1},
    {"id":"RA_unit","name":"RA_unit","expression":"L","default":"L","type":"select","options":["L","cc"]},
    {"id":"mix_type","name":"mix_type","expression":"2","default":2,"type":"select","options":["1","2"]},
    {"id":"A0","name":"A0","expression":"1000","default":1000},
    {"id":"A_house","name":"A_house","expression":"100","default":100}
  ],
  "variables": [],
  "outputs": []
}'::jsonb
WHERE name = 'Deltacide (หมอกควัน)';

-- Deltacide (ULV) — C=1, S=4, RA=75, RA_unit='cc', mix_type=2, A0=1000, A_house=100
UPDATE public.label_profiles SET formula = '{
  "schemaVersion": 1,
  "meta": {"name": "Deltacide (ULV)", "resultTemplate": "tank-dilution"},
  "inputs": [
    {"id":"C","name":"C","expression":"1","label":"สัดส่วนสารออกฤทธิ์","default":1},
    {"id":"S","name":"S","expression":"4","label":"สัดส่วนตัวทำละลาย","default":4},
    {"id":"RA","name":"RA","expression":"75","label":"อัตราฉีดพ่น","unit":"cc","default":75},
    {"id":"RA_unit","name":"RA_unit","expression":"cc","default":"cc","type":"select","options":["L","cc"]},
    {"id":"mix_type","name":"mix_type","expression":"2","default":2,"type":"select","options":["1","2"]},
    {"id":"A0","name":"A0","expression":"1000","default":1000},
    {"id":"A_house","name":"A_house","expression":"100","default":100}
  ],
  "variables": [],
  "outputs": []
}'::jsonb
WHERE name = 'Deltacide (ULV)';

-- Submarine (หมอกควัน) — C=1, S=249, RA=1.25, RA_unit='L', mix_type=1, A0=1000, A_house=100
UPDATE public.label_profiles SET formula = '{
  "schemaVersion": 1,
  "meta": {"name": "Submarine (หมอกควัน)", "resultTemplate": "tank-dilution"},
  "inputs": [
    {"id":"C","name":"C","expression":"1","label":"สัดส่วนสารออกฤทธิ์","default":1},
    {"id":"S","name":"S","expression":"249","label":"สัดส่วนตัวทำละลาย","default":249},
    {"id":"RA","name":"RA","expression":"1.25","label":"อัตราฉีดพ่น","unit":"L","default":1.25},
    {"id":"RA_unit","name":"RA_unit","expression":"L","default":"L","type":"select","options":["L","cc"]},
    {"id":"mix_type","name":"mix_type","expression":"1","default":1,"type":"select","options":["1","2"]},
    {"id":"A0","name":"A0","expression":"1000","default":1000},
    {"id":"A_house","name":"A_house","expression":"100","default":100}
  ],
  "variables": [],
  "outputs": []
}'::jsonb
WHERE name = 'Submarine (หมอกควัน)';

-- Submarine (ULV) — C=1, S=39, RA=2, RA_unit='L', mix_type=1, A0=10000, A_house=100
UPDATE public.label_profiles SET formula = '{
  "schemaVersion": 1,
  "meta": {"name": "Submarine (ULV)", "resultTemplate": "tank-dilution"},
  "inputs": [
    {"id":"C","name":"C","expression":"1","label":"สัดส่วนสารออกฤทธิ์","default":1},
    {"id":"S","name":"S","expression":"39","label":"สัดส่วนตัวทำละลาย","default":39},
    {"id":"RA","name":"RA","expression":"2","label":"อัตราฉีดพ่น","unit":"L","default":2},
    {"id":"RA_unit","name":"RA_unit","expression":"L","default":"L","type":"select","options":["L","cc"]},
    {"id":"mix_type","name":"mix_type","expression":"1","default":1,"type":"select","options":["1","2"]},
    {"id":"A0","name":"A0","expression":"10000","default":10000},
    {"id":"A_house","name":"A_house","expression":"100","default":100}
  ],
  "variables": [],
  "outputs": []
}'::jsonb
WHERE name = 'Submarine (ULV)';