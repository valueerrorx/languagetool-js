// Authors oracle/cases/X-UNIT/*.json (inputs only). Op unit-check (= StyleOps.check): docs/review/F38-oracle.md.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../lib/env.mjs';

const DIR = path.join(ROOT, 'oracle/cases/X-UNIT');
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
const write = (name, description, ops) => writeFileSync(path.join(DIR, `${name}.json`), JSON.stringify({ kind: 'harness', clock: 'fixed', description, normalize: [], compare: 'jsonl', ops }, null, 1) + '\n');
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
// the English rules are tagged picky: only active at level PICKY
const op = (lang, id, texts, extra = {}) => chunks(texts, 20).map((c) => ({ op: 'unit-check', args: { lang, ids: [id], ...extra, cases: c.map((text) => ({ text, level: lang.startsWith('en') ? 'PICKY' : 'DEFAULT' })) } }));
const NB = ' ';

// English: value x unit grids (imperial -> metric and metric -> imperial), phrases, converted-in-parentheses variants
const nums = ['0', '1', '2', '5.5', '6', '10', '12.75', '100', '0.5', '0.001', '999', '1,000', '10,000.75', '1,234,567', '1000000', '123456789', '-5', '-22', '3.14159', '1e3', '.5', '1.', '1,5', '1.234,5'];
const enImp = ['feet', 'ft', 'foot', 'inch', 'inches', 'miles', 'mi', 'yards', 'yd', 'pounds', 'lb', 'lbs', 'pints', 'gallons', 'mph', 'sq ft', 'square feet', 'sq in', 'square yards', 'cubic feet', 'cu ft', 'cubic inches', 'ft2', 'ft²', 'in²', 'yd²', 'ft³', '°F', 'degrees Fahrenheit', 'oz', 'ounces', 'cups', 'fl oz', 'acres', 'sf', "'", '′', '″'];
const enMet = ['km', 'm', 'cm', 'mm', 'µm', 'nm', 'kg', 'g', 't', 'l', 'ml', 'km/h', 'kmh', 'm²', 'm2', 'km²', 'ha', 'a', 'cm²', 'mm²', 'm³', 'cm³', 'km³', 'mm³', '°C', 'degrees Celsius', 'm^2', 'km^3'];
function enTexts() {
  const t = [];
  for (const u of enImp) for (const n of ['6', '100', '10,000.75', '0.5', '-22', '1234567']) t.push(`It is ${n} ${u} here.`);
  for (const u of enMet) for (const n of ['6', '100', '10,000.75', '0.001', '-22', '123456789']) t.push(`It is ${n} ${u} here.`);
  for (const n of nums) { t.push(`Just ${n} miles.`, `Just ${n} km.`, `Just ${n}${NB}°C.`, `Just ${n}°F.`); }
  t.push('I am 6 feet tall.', 'I am 6 feet (2.02 m) tall.', 'I am 6 feet (1.82 m) tall.', 'I am 6 feet (1.83 m) tall.', 'I am 6 feet (183 cm) tall.', 'I am 6 feet (1.83 meters) tall.', 'I am 6 feet (1.83 metres) tall.', 'I am 6 feet (about 1.83 m) tall.',
    'I am 6 feet (ca. 1.83 m) tall.', 'I am 6 feet (approx. 1.83 m) tall.', 'I am 6 feet (~1.83 m) tall.', 'I am 6 feet (1,83 m) tall.',
    'The path is 100 miles long.', 'The path is 100 miles (160.93 km) long.', 'The path is 100 miles (160 km) long.', 'The path is 100 miles (161 km) long.', 'The path is 100 miles (100 km) long.', 'The path is 100 miles (62.14 mi) long.',
    '16 kilometers (10 miles)', '16 kilometers (ca. 10 miles)', '16 kilometers (9.94 mi)', '16 km (9.94 miles)', '16 km (9.95 miles)', '16 km (10 miles)', '16 km (9.9 miles)',
    'Use 3-5 pounds of butter.', "It's 1/4 mile away", 'A 2:1 cup', '1⁄4 cup', 'It is 0.76 metres (2 ft 6 inch)', '3 - 5 miles', '3-5 miles', '3 to 5 miles', '3 – 5 miles', '10-20 km', '10 to 20 km', '5–10 pounds',
    'I just drank 3 pints.', 'I just drank 3 pints (1.42 l).', 'I just drank 3 pints (1.7 l).', 'I just drank 3 pints (1.7 litres).',
    'The shipment weighs 10,000.75 pounds.', 'My new apartment is 500 sq ft.', 'My new apartment is 500 sq ft (46.45 m²).', 'My new apartment is 500 sq ft (46 m2).', 'It is 100 degrees Fahrenheit outside.', 'It is 100 °F outside.',
    'It is 100 °F (37.78 °C) outside.', 'It is 100 °F (38 °C) outside.', 'It is 100 °F (37 °C) outside.', 'It is -22 °F outside.', 'It is -22 degrees Fahrenheit outside.', 'It is -40 °F (-40 °C).', 'It is 0 °C (32 °F).', 'It is 0 °C (33 °F).', 'It is 0 °C.', 'It is 0 °F.', 'It is 100 °C (212 °F).', 'It is 100 °C (200 °F).', 'It is 36.6 °C (97.88 °F).', 'It is 36.6 °C.',
    `Heat up to 18${NB}°C (64.4 °F).`, `Heat up to 18${NB}°C (64.4${NB}°F).`, `Heat up to 18 °C (64.4${NB}°F).`, 'Heat up to 18 °C (64.4 °F).', 'Heat up to 18 °C (64.4 F).', 'Heat up to 18°C.', 'Heat up to 18º C.', 'Heat up to 18 ºC.',
    'She is 5\'6".', 'She is 5\'6" (1.68 m).', 'She is 5\'6" (1.7 m).', 'She is 5 ft 6 in.', 'She is 5 ft 6 inch tall.', 'She is 5ft 6in tall.', 'She is 5′6″ tall.', 'She is 5′ 6″ tall.', 'She is 5 feet 6 inches tall.', 'Tall: 5\'.', 'Tall: 5\'0".', 'Tall: 0\'11".', 'Tall: 6\'12".', 'Tall: 6\'13".',
    'Coordinates: 34°09′22″N 118°7′55″W', 'Millions watched the 1989\'s Superbowl.', "In the 1990's, 5' was normal.",
    'Speed: 60 mph.', 'Speed: 60 mph (96.56 km/h).', 'Speed: 60 mph (100 km/h).', 'Speed: 100 km/h.', 'Speed: 100 km/h (62.14 mph).', 'Speed: 100 kmh (62 mph).', 'Speed: 100 km/h (60 mph).',
    '5 ft x 6 ft', '5 x 6 ft', '5 by 6 ft', '5 ft by 6 ft room', '5 ft × 6 ft', '12 ft. 6 in.', '5 feet, 6 inches', '5 feet and 6 inches', '5 ft and 6 in',
    '100 miles and 200 miles', '100 miles, 200 miles and 300 miles', '1 mile (1.61 km), 2 miles', '1 mile (1.61 km), 2 miles (3.22 km)', '1 mile (1.61 km), 2 miles (3 km)',
    'a 2x4 board 8 ft long', 'a 2 x 4 board', '1 yard', '3 yards of cloth', '3 yards (2.74 m)', '3 yards (2.7 m)', '3 yards (3 m)',
    '', ' ', '5', 'miles', '100', '100.', 'The year 2000 miles away.', 'x100 miles', '100miles', '100 Miles', '100 MILES', '100 mI', '5 Feet', 'Version 1.5 ft', 'a1 ft', '1ft', '10ml', '10 ML', '10 Km', '10 KM', '10 kM',
    'Between 3 and 4 miles', 'Range 3 miles to 4 miles', '3 miles - 4 miles', '3 - 4 miles', '3 miles-4 miles', '10 pounds each, 20 pounds total', '10 pounds. 20 pounds.', 'First 10 pounds. Then 20 pounds (9.07 kg).',
    '1 pound', '2 pounds', '1 lb', '1,5 lb', '1.5 lb', '1 500 lb', `1${NB}500 lb`, "1'500 lb", '1 500 000 lb', '1,500 lb', '1.500 lb', '1.500,5 lb', '1,500.5 lb', '1,500,000.5 lb', '1,50,000 lb',
    '1000000000000 miles', '99999999999999999999 miles', '0.0000001 miles', '0.00000000001 km', '1e10 miles', '1.5e3 miles', '123456789012345678901234567890 ft', '2147483647 ft', '2147483648 ft', '9223372036854775807 ft', '-2147483648 ft', '-0 ft', '0.0 ft', '00 ft', '007 ft',
    '1 mile is 1.609344 km', '1 mile is 1.61 km', '1 mile = 1.61 km', '1 mile = 1609 m', '1 mile = 1,609.34 m', '1 mi = 1.60934 km', '1 mi (1.61 km)', '1 mi (1.6 km)', '1 mi (1.609 km)', '1 mi (1.60934 km)', '1 mi (1.6093 km)', '1 mi (1.609344 km)',
    'It weighs 2 t.', 'It weighs 2 t (4409.25 lb).', 'It weighs 2 t (4,409.25 lb).', 'It weighs 2 t (4400 lb).', 'It weighs 500 g.', 'It weighs 500 g (1.1 lb).', 'It weighs 500 g (1.10 lb).', 'It weighs 500 g (17.64 oz).', 'It weighs 1 kg (2.2 lb).', 'It weighs 1 kg (2.21 lb).',
    '2 m and 3 m', '2 m x 3 m', '2 m × 3 m', '2 m × 3 m (6.56 ft × 9.84 ft)', '2 m (6.56 ft) x 3 m (9.84 ft)', '2 m (6.5 ft) x 3 m (9.84 ft)',
    'Area: 10 ha.', 'Area: 10 ha (24.71 acres).', 'Area: 10 ha (25 acres).', 'Area: 1 a.', 'Area: 100 m².', 'Area: 100 m² (1076.39 sq ft).', 'Area: 100 m² (1,076.39 sq ft).', 'Area: 100 m² (1076 sq ft).', 'Area: 100 m2 (1076.39 ft2).', 'Area: 5 km² (1.93 sq mi).', 'Area: 5 km² (1.93 mi²).',
    'Volume: 10 l.', 'Volume: 10 l (2.64 gal).', 'Volume: 10 m³.', 'Volume: 10 m³ (353.15 cubic feet).', 'Volume: 10 m3 (353.15 ft³).', 'Volume: 1 cm³.', 'Volume: 1 cm³ (0.06 cubic inch).', 'Volume: 1 cm³ (0.061 cubic inch).', 'Volume: 1 cm3.', 'Volume: 10 cubic yards.', 'Volume: 10 cu yd.', 'Volume: 10 yd³.',
    'Length: 1 nm.', 'Length: 1 µm.', 'Length: 1 mm (0.04 inch).', 'Length: 1 mm (0.04 in).', 'Length: 25.4 mm (1 inch).', 'Length: 25.4 mm (1 in).', 'Length: 2.54 cm (1 inch).', 'Length: 2.54 cm (1 inch)', 'Length: 2.54 cm (1″).', 'Length: 2.54 cm (1").',
    'It is 3 feet 2 inches (96.52 cm).', 'It is 3 feet 2 inches (97 cm).', 'It is 3 feet (91.44 cm) and 2 inches.', 'He ran 26.2 miles in 3 hours.', 'He ran 26.2 miles (42.16 km) in 3 hours.', 'He ran 42 km (26.1 mi) in 3 hours.', 'He ran 42 km (26.1 miles) in 3 hours.', 'He ran 42.195 km (26.2 miles).',
    'The price is 5 $ per pound.', 'The price is $5 per pound.', 'The price is 5 dollars per 10 pounds.', '10 ft/s', '10 miles/hour', '10 miles per hour', '10 mph', '10 miles an hour',
    'Rounding: 1 ft = 0.3048 m.', 'Rounding: 3 ft.', 'Rounding: 7 ft.', 'Rounding: 8 ft.', 'Rounding: 9 ft.', 'Rounding: 11 ft.', 'Rounding: 33 ft.', 'Rounding: 333 ft.', 'Rounding: 3333 ft.', 'Rounding: 33333 ft.', 'Rounding: 1 in.', 'Rounding: 1 inch.', 'Rounding: 1/2 inch.', 'Rounding: 0.1 inch.', 'Rounding: 0.01 inch.', 'Rounding: 0.001 inch.', 'Rounding: 0.0001 inch.');
  for (const n of [1, 2, 3, 4, 5, 7, 9, 11, 13, 17, 19, 23, 29, 37, 50, 64, 77, 99, 101, 250, 365, 1001, 5280, 12345]) t.push(`${n} miles`, `${n} ft`, `${n} lb`, `${n} yd`, `${n} inch`);
  return t;
}
const enTexts_ = enTexts();
for (const [lang, id] of [['en-US', 'METRIC_UNITS_EN_US'], ['en-GB', 'METRIC_UNITS_EN_IMPERIAL']]) write(`unit-${lang}`, `CORE-0278 ${id}`, op(lang, id, enTexts_));
// other imperial variants (shared rule class UnitConversionRuleImperial), reduced set
const small = ['I am 6 feet tall.', 'I am 6 feet (2.02 m) tall.', 'The shipment weighs 10,000.75 pounds.', 'I just drank 3 pints.', 'It is 100 °F outside.', 'The path is 100 miles (160.93 km) long.', 'She is 5\'6".', '16 km (9.94 mi)', 'Rounding: 1,234.5 miles', '1.234,5 miles', 'He drove 1 000 miles'];
for (const lang of ['en-CA', 'en-AU', 'en-NZ']) write(`unit-${lang}`, `CORE-0278 variant ${lang}`, op(lang, 'METRIC_UNITS_EN_IMPERIAL', small));
// general en rule (UnitConversionRule, locale ENGLISH) instantiated via extra
write('unit-en-general', 'CORE-0278 METRIC_UNITS_EN_GENERAL', op('en-US', 'METRIC_UNITS_EN_GENERAL', enTexts_.slice(0, 160).concat(small), { extra: ['org.languagetool.rules.en.UnitConversionRule'] }));
// US-specific rule on en-GB text and vice versa (instantiated via extra)
write('unit-en-US-on-GB', 'CORE-0278 US rule class on en-GB', op('en-GB', 'METRIC_UNITS_EN_US', small, { extra: ['org.languagetool.rules.en.UnitConversionRuleUS'] }));
write('unit-en-GB-on-US', 'CORE-0278 imperial class on en-US', op('en-US', 'METRIC_UNITS_EN_IMPERIAL', small, { extra: ['org.languagetool.rules.en.UnitConversionRuleImperial'] }));

// German: comma decimals, point thousands, apostrophes
const deImp = ['Fuß', 'Meilen', 'Meile', 'Pfund', 'Zoll', 'Yards', 'Yard', 'ft', 'sq ft', 'Quadratfuß', 'Gallonen', 'Pints', 'Unzen', 'mph', 'Meilen pro Stunde', '°F', 'Grad Fahrenheit', 'Zoll', 'Acres', 'inch', 'lb', 'mi', 'yd'];
const deMet = ['km', 'm', 'cm', 'mm', 'Meter', 'Kilometer', 'Zentimeter', 'kg', 'Kilogramm', 'g', 'Gramm', 't', 'Tonnen', 'l', 'Liter', 'ml', 'km/h', 'm²', 'm2', 'ha', 'Hektar', 'Quadratmeter', 'm³', 'Kubikmeter', '°C', 'Grad Celsius', 'Kilometer pro Stunde', 'mm²'];
function deTexts() {
  const t = [];
  for (const u of deImp) for (const n of ['6', '100', '10.000,75', '0,5', '-22', '1234567']) t.push(`Es sind ${n} ${u} hier.`);
  for (const u of deMet) for (const n of ['6', '100', '10.000,75', '0,001', '-22', '123456789']) t.push(`Es sind ${n} ${u} hier.`);
  for (const n of ['0', '1', '1,5', '1.5', '1.000', '1.000,5', '1,000.5', '10.000,75', '10,000.75', "330'000", '1 000', `1${NB}000`, '1.234.567', '3,14159', ',5', '1,', '1e3', '-5,5']) t.push(`Nur ${n} Meilen.`, `Nur ${n} km.`, `Nur ${n}${NB}°C.`, `Nur ${n} °F.`, `Nur ${n} Pfund.`);
  t.push('Ich bin 6 Fuß groß.', 'Ich bin 6 Fuß (2,02 m) groß.', 'Ich bin 6 Fuß (1,82 m) groß.', 'Ich bin 6 Fuß (1,83 m) groß.', 'Ich bin 6 Fuß (1,83 Meter) groß.', 'Ich bin 6 Fuß (183 cm) groß.', 'Ich bin 6 Fuß (1.83 m) groß.', 'Ich bin 6 Fuß (ca. 1,83 m) groß.', 'Ich bin 6 Fuß (etwa 1,83 m) groß.', 'Ich bin 6 Fuß (rund 1,83 m) groß.', 'Ich bin 6 Fuß (1,83 Metern) groß.',
    'Der Kostenvoranschlag hatte eine Höhe von 1.800 Pfund Sterling.', 'Der Weg ist 100 Meilen lang.', 'Der Weg ist 10 km (20 Meilen) lang.', 'Der Weg ist 10 km (6,21 Meilen) lang.', 'Der Weg ist 10 km (6,2 Meilen) lang.', 'Der Weg ist 10 km (6 Meilen) lang.', 'Der Weg ist 10 km (6,22 Meilen) lang.', 'Der Weg ist 10 km (6.21 Meilen) lang.', 'Der Weg ist 10 km (6,21 mi) lang.',
    'Der Weg ist 100 Meilen (160,93 Kilometer) lang.', 'Der Weg ist 100 Meilen (160,93 km) lang.', 'Der Weg ist 100 Meilen (160 km) lang.', 'Der Weg ist 100 Meilen (161 km) lang.', 'Der Weg ist 100 Meilen (160,9 km) lang.', 'Der Weg ist 100 Meilen (160,94 km) lang.', 'Der Weg ist 100 Meilen (100 km) lang.',
    'Die Ladung ist 10.000,75 Pfund schwer.', 'Die Ladung ist 10.000,75 Pfund (4,54 Tonnen) schwer.', 'Die Ladung ist 10.000,75 Pfund (4,5 Tonnen) schwer.', 'Die Ladung ist 10.000,75 Pfund (4.536,4 kg) schwer.', 'Die Ladung ist 10.000,75 Pfund (4536 kg) schwer.', 'Die Ladung ist 10,000.75 Pfund schwer.', 'Die Ladung ist 10 000,75 Pfund schwer.',
    'Sie ist 5\'6" groß.', 'Sie ist 5\'6" (1,68 m) groß.', 'Sie ist 5\'6" (1,7 m) groß.', 'Sie ist 5 ft 6 in groß.', 'Sie ist 5′6″ groß.', 'Sie ist 5 Fuß 6 Zoll groß.', 'Meine neue Wohnung ist 500 sq ft groß.', 'Meine neue Wohnung ist 500 sq ft (46,45 Quadratmeter) groß.', 'Meine neue Wohnung ist 500 sq ft (46 m²) groß.', 'Meine neue Wohnung ist 500 sq ft (46,45 m²) groß.',
    'Zwischen 330\'000 und 500\'000/600', 'Heute sind es 100 °F.', 'Heute sind es 100 °F (37,78 °C).', 'Heute sind es 100 °F (38 °C).', 'Heute sind es 100 °F (37,8 °C).', 'Heute sind es 100 Grad Fahrenheit.', 'Heute sind es -22 °F.', 'Heute sind es -22 Grad Fahrenheit.', 'Heute sind es 100 °C (212 °F).', 'Heute sind es 100 °C (200 °F).', 'Heute sind es 0 °C (32 °F).', 'Heute sind es 0 °C (33 °F).', 'Heute sind es 0 °C.', 'Heute sind es 36,6 °C (97,88 °F).', 'Heute sind es 36,6 °C.', 'Heute sind es 36.6 °C.', 'Bis zu 18 °C (64,4 °F).', `Bis zu 18${NB}°C (64,4${NB}°F).`, 'Bis zu 18°C.',
    'Tempo: 60 mph.', 'Tempo: 60 mph (96,56 km/h).', 'Tempo: 100 km/h.', 'Tempo: 100 km/h (62,14 mph).', 'Tempo: 100 km/h (62 mph).', 'Tempo: 100 km/h (60 mph).', 'Tempo: 100 kmh.',
    'Er wiegt 500 g.', 'Er wiegt 500 g (1,1 Pfund).', 'Er wiegt 500 g (1,10 lb).', 'Er wiegt 1 kg (2,2 lb).', 'Er wiegt 1 kg (2,21 lb).', 'Er wiegt 2 t (4.409,25 lb).', 'Er wiegt 2 t (4409,25 lb).', 'Er wiegt 2 t (4400 lb).',
    'Fläche: 10 ha.', 'Fläche: 10 ha (24,71 Acres).', 'Fläche: 100 m² (1076,39 sq ft).', 'Fläche: 100 m² (1.076,39 sq ft).', 'Fläche: 100 m2 (1076 sq ft).', 'Fläche: 5 km².', 'Volumen: 10 l.', 'Volumen: 10 l (2,64 gal).', 'Volumen: 10 m³.', 'Volumen: 10 m3.', 'Volumen: 10 Liter.', 'Volumen: 3 Pints.',
    'Von 3-5 Pfund.', 'Von 3 bis 5 Meilen.', 'Von 3 – 5 Meilen.', 'Von 3–5 Meilen.', '10-20 km', '10 bis 20 km', 'Ein Viertel Meile', '1/4 Meile', '2:1 Pfund', '1⁄4 Pfund',
    '16 Kilometer (10 Meilen)', '16 Kilometer (ca. 10 Meilen)', '16 Kilometer (9,94 Meilen)', '16 Kilometer (9,94 mi)', '16 km (9,94 mi)', '16 km (9,95 mi)',
    '100 Meilen und 200 Meilen', '1 Meile (1,61 km), 2 Meilen', '1 Meile (1,61 km), 2 Meilen (3,22 km)', '5 Fuß x 6 Fuß', '5 x 6 Fuß', '5 ft × 6 ft', '12 ft. 6 in.',
    '', ' ', '5', 'Meilen', '100', '100 meilen', '100 MEILEN', '100 Meilen.', '100Meilen', 'x100 Meilen', '1 Meile', '2 Meilen', '1 Pfund', '10ml', '10 Km', '10 KM',
    '1000000000000 Meilen', '99999999999999999999 Meilen', '0,0000001 Meilen', '1e10 Meilen', '123456789012345678901234567890 ft', '2147483648 ft', '9223372036854775807 ft', '-0 ft', '0,0 ft', '007 ft',
    'Ärger über 100 Meilen für Mädchen 5 Fuß groß', 'Äpfel wiegen 3 Pfund (1,36 kg), Öl 2 Pfund.', 'Größe: 1,80 m. Das sind 5 Fuß 11 Zoll.', 'Größe: 1,80 m (5 Fuß 11 Zoll).', 'Größe: 1,80 m (6 Fuß).', 'Größe: 1,80 m (5,9 ft).', 'Größe: 1,80 m (5,91 ft).',
    'Ein Absatz mit 5 Meilen.\nUnd 10 Meilen (16,09 km).', 'Zwei Sätze. Der erste hat 5 Meilen. Der zweite 6 Meilen.');
  for (const n of [1, 2, 3, 4, 5, 7, 9, 11, 13, 17, 19, 23, 29, 37, 50, 64, 77, 99, 101, 250, 365, 1001, 5280, 12345]) t.push(`${n} Meilen`, `${n} ft`, `${n} Pfund`, `${n} Yards`, `${n} Zoll`);
  return t;
}
write('unit-de-DE', 'CORE-0278 EINHEITEN_METRISCH', op('de-DE', 'EINHEITEN_METRISCH', deTexts()));
const deSmall = ['Ich bin 6 Fuß groß.', 'Ich bin 6 Fuß (2,02 m) groß.', 'Die Ladung ist 10.000,75 Pfund schwer.', 'Der Weg ist 100 Meilen lang.', 'Heute sind es 100 °F.', 'Sie ist 5\'6" groß.', 'Der Weg ist 10 km (6,21 Meilen) lang.'];
for (const lang of ['de-AT', 'de-CH']) write(`unit-${lang}`, `CORE-0278 ${lang} (de rule list)`, op(lang, 'EINHEITEN_METRISCH', deSmall));
// level/paraMode and multi-rule interplay
write('unit-levels', 'CORE-0278 levels and other rules', [
  { op: 'unit-check', args: { lang: 'en-US', ids: ['METRIC_UNITS_EN_US'], cases: ['PICKY', 'DEFAULT'].flatMap((level) => ['I am 6 feet tall.', 'It is 100 °F outside.', 'The path is 100 miles (160.93 km) long.'].map((text) => ({ text, level }))) } },
  { op: 'unit-check', args: { lang: 'en-US', ids: ['METRIC_UNITS_EN_US', 'EN_UNPAIRED_BRACKETS', 'UPPERCASE_SENTENCE_START'], cases: [{ text: 'it is 100 °F (37.78 °C. outside', level: 'PICKY' }, { text: 'I am 6 feet (2.02 m tall. And 5 miles.', level: 'DEFAULT' }] } },
  { op: 'unit-check', args: { lang: 'de-DE', ids: ['EINHEITEN_METRISCH'], cases: ['PICKY', 'DEFAULT'].flatMap((level) => ['Ich bin 6 Fuß groß.'].map((text) => ({ text, level }))) } },
]);
