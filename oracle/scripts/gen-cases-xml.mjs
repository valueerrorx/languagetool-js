// Authors oracle/cases/X-XML/*.json (inputs only). Ops sax-dump / xml-validate: docs/review/F07-oracle.md.
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { writeCases } from './gen-probe-cases-numbers.mjs';
import { ROOT } from '../lib/env.mjs';

const RES = path.join(ROOT, 'resources');
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(RES).map((f) => '/' + path.relative(RES, f)).filter((f) => /\.(xml|srx)$/.test(f) && !f.startsWith('/META-INF')).sort();

const profileOf = (f) => (/disambiguation[^/]*\.xml$/.test(f) ? 'disambiguation' : /false-friends\.xml$/.test(f) ? 'falsefriends'
  : /\/rules\/[^/]*\/?.*(grammar|style)[^/]*\.xml$/.test(f) ? 'pattern' : 'plain');
const dump = (f) => ({ op: 'sax-dump', args: { path: f, profile: profileOf(f) } });
const grp = (re) => files.filter((f) => re.test(f));

const cases = [];
cases.push(['sax-core', 'sax-dump: core resources (segment.srx, segment-simple.srx, disambiguation-global.xml, false-friends.xml, logback, server mappers)',
  grp(/^\/(org\/languagetool\/(resource\/(segment|disambiguation-global|org)|rules\/false-friends|server\/)|logback)/).map(dump)]);
for (const l of ['de', 'en', 'fr']) {
  cases.push([`sax-${l}`, `sax-dump: all ${l} XML (grammar variants, style, disambiguation, remote-rule-filters)`,
    grp(new RegExp(`^/org/languagetool/(rules|resource)/${l}/`)).map(dump)]);
}
// grammar-l2-* live in rules/en but are listed by the en group already; assert the groups cover every file
const covered = new Set(cases.flatMap(([, , ops]) => ops.map((o) => o.args.path)));
const rest = files.filter((f) => !covered.has(f));
if (rest.length) cases.push(['sax-rest', 'sax-dump: remaining XML files', rest.map(dump)]);

// same files under the other profiles (limits / resolver differences must not change the digest)
cases.push(['sax-profiles', 'sax-dump: grammar/disambiguation files under the plain profile (JAXP default limits, no resolver)',
  files.filter((f) => /(grammar|style|disambiguation)[^/]*\.xml$/.test(f)).map((f) => ({ op: 'sax-dump', args: { path: f, profile: 'plain' } }))]);

const X = (xml, profile = 'pattern') => ({ op: 'sax-dump', args: { xml, profile } });
const B = (buf, profile = 'pattern') => ({ op: 'sax-dump', args: { bytesBase64: Buffer.from(buf).toString('base64'), profile } });
const H = '<?xml version="1.0" encoding="UTF-8"?>\n';
const syn = [
  X(H + '<rules><rule id="a">x</rule></rules>'),
  X(H + '<rules>\n  <rule id="a"> text  with   spaces \n</rule>\n\t<!-- c --> <?pi x?>\n</rules>\n'),
  X(H + '<r>Ünï ä ß 😀 &#x1F600; &#228; &#10;&#13;&#9;</r>'),
  X(H + '<r>&amp;&lt;&gt;&quot;&apos;</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY e "val &amp; more"><!ENTITY f "[&e;]">]><r a="&e;">&e;&f;</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY e "<b x=\'1\'>in</b>">]><r>&e;</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY lsqb "&#x005B;"><!ENTITY rsqb "&#x005D;">]><r>&lsqb;x&rsqb;</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY e "a">]><r>&u;</r>'),
  X(H + '<r>&u;</r>'),
  X(H + '<r><![CDATA[<a> & ]]> t <![CDATA[]]></r>'),
  X(H + '<r a="x\ty\nz&#9;&#10;  q"  b = \'1\'/>'),
  X('<?xml version="1.0"?>\r\n<r>a\r\nb\rc\nd</r>\r\n'),
  X(H + '<r a="1" a="2"/>'),
  X(H + '<r><a></r>'),
  X(H + '<r></r><r2/>'),
  X(H + '<r>'),
  X(''),
  X('   '),
  X('<r/>'),
  X('<r>x</r>junk'),
  X(H + '<a:r xmlns:a="u" a:b="1"><a:c/></a:r>'),
  X(H + '<r>a ]]> b</r>'),
  X(H + '<r>&#0;</r>'),
  X(H + '<r>&#xD800;</r>'),
  X(H + '<r a=<b/>'),
  X(H + '<r a="<"/>'),
  X(H + '<!DOCTYPE r SYSTEM "missing.dtd"><r>x &foo;</r>'),
  X(H + '<!DOCTYPE r SYSTEM "http://127.0.0.1:9/x.dtd"><r>x</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY % p SYSTEM "none.ent"> %p;]><r>x</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY x SYSTEM "none.ent">]><r>&x;</r>'),
  X(H + '<!DOCTYPE r [<!ELEMENT r (#PCDATA)><!ATTLIST r a CDATA "dflt">]><r/>'),
  X(H + '<!DOCTYPE r [<!ATTLIST r a NMTOKEN #IMPLIED>]><r a="  x  y "/>'),
  X(H + '<!DOCTYPE r [<!ELEMENT r (a)*><!ELEMENT a EMPTY>]><r>\n <a/>\n</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY e "x">]><r a="&e;&e;"/>', 'plain'),
  X('﻿' + H + '<r>bom</r>'),
  B(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(H + '<r>bom8</r>')])),
  B(Buffer.from('﻿<?xml version="1.0" encoding="UTF-16"?><r>ü</r>', 'utf16le')),
  B(Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><r>üä</r>', 'latin1')),
  B(Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><r>ü</r>', 'utf8')),
  B(Buffer.concat([Buffer.from(H + '<r>'), Buffer.from([0xFF, 0xFE, 0x80]), Buffer.from('</r>')])),
  B(Buffer.concat([Buffer.from(H + '<r>'), Buffer.from([0xC3]), Buffer.from('</r>')])),
  B(Buffer.from('<?xml version="1.0" encoding="NOSUCH"?><r/>')),
  B(Buffer.from('<?xml version="1.0" encoding="US-ASCII"?><r>ü</r>', 'utf8')),
  B(Buffer.from('<?xml version="1.1"?><r>\u0085x&#1;</r>', 'utf8')),
  X(H + '<r>' + 'x'.repeat(100000) + '</r>'),
  X(H + '<r>' + '<a b="1"/>\n'.repeat(3000) + '</r>'),
  // entity expansion: pattern profile has limits 0 (unlimited), plain has JAXP defaults
  X(H + '<!DOCTYPE r [<!ENTITY a "' + 'x'.repeat(1000) + '"><!ENTITY b "' + '&a;'.repeat(100) + '"><!ENTITY c "' + '&b;'.repeat(100) + '">]><r>&c;</r>'),
  X(H + '<!DOCTYPE r [<!ENTITY a "' + 'x'.repeat(1000) + '"><!ENTITY b "' + '&a;'.repeat(100) + '"><!ENTITY c "' + '&b;'.repeat(100) + '">]><r>&c;</r>', 'plain'),
  X(H + '<!DOCTYPE r [<!ENTITY a "x"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;"><!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;"><!ENTITY e "&d;&d;&d;&d;&d;&d;&d;&d;&d;&d;"><!ENTITY f "&e;&e;&e;&e;&e;&e;&e;&e;&e;&e;">]><r>&f;</r>', 'plain'),
  X(H + '<!DOCTYPE r [<!ENTITY a "&b;"><!ENTITY b "&a;">]><r>&a;</r>'),
];
cases.push(['sax-synthetic', 'sax-dump: synthetic documents (entities, whitespace, CDATA, encodings, malformed input, limits)', syn]);

// --- xml-validate
const V = (o) => ({ op: 'xml-validate', args: o });
const RULES = '/org/languagetool/rules';
const vfiles = files.filter((f) => f.startsWith(RULES + '/') && /\/(grammar[^/]*|style|remote-rule-filters)\.xml$/.test(f));
const vops = [V({ mode: 'dtd', path: RULES + '/false-friends.xml', schema: RULES + '/false-friends.dtd', docType: 'rules' })];
for (const f of vfiles) {
  const m = f.match(/^\/org\/languagetool\/rules\/([a-z]{2})\/(.*)$/);
  if (/remote-rule-filters/.test(f)) vops.push(V({ mode: 'xsd', path: f, schema: RULES + '/remote-rules.xsd' }));
  else {
    vops.push(V({ mode: 'xsd', path: f, schema: RULES + '/rules.xsd' }));
    // as PatternRuleTest: later grammar files get the unification of the first prepended
    if (m && !/^(grammar|style)\.xml$/.test(m[2]) && !/remote/.test(m[2])) vops.push(V({ mode: 'xsd-merge', base: `${RULES}/${m[1]}/grammar.xml`, path: f, schema: RULES + '/rules.xsd' }));
  }
}
for (const f of files.filter((x) => /disambiguation[^/]*\.xml$/.test(x))) vops.push(V({ mode: 'xsd', path: f, schema: '/org/languagetool/resource/disambiguation.xsd' }));
cases.push(['validate-wave1', 'XMLValidator on wave-1 files: false-friends (DTD), rules (rules.xsd, with unification merge for variants), remote-rule-filters, disambiguation (XSD)', vops]);

const ff = RULES + '/false-friends.dtd';
const okDoc = H + '<rules><rulegroup id="g"><rule><pattern lang="de"><token>a</token></pattern><translation lang="en">b</translation><example type="correct">x</example></rule></rulegroup></rules>';
const sv = [
  V({ mode: 'dtd', path: '/no/such/file.xml', schema: ff, docType: 'rules' }),
  V({ mode: 'dtd', path: RULES + '/false-friends.xml', schema: '/no/such.dtd', docType: 'rules' }),
  V({ mode: 'dtd', path: RULES + '/false-friends.xml', schema: ff, docType: 'other' }),
  V({ mode: 'xsd', path: '/no/such/file.xml', schema: RULES + '/rules.xsd' }),
  V({ mode: 'xsd', path: RULES + '/de/grammar.xml', schema: '/no/such.xsd' }),
  V({ mode: 'xsd', path: RULES + '/de/grammar.xml', schema: RULES + '/pattern.xsd' }),
  V({ mode: 'xsd', path: RULES + '/de/grammar.xml', schema: RULES + '/remote-rules.xsd' }),
  V({ mode: 'xsd-merge', base: '/no/such.xml', path: RULES + '/de/grammar.xml', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-dtd', xml: okDoc, schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: H + '<rules/>', schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<rule>', '<rule><x/>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('</rules>', ''), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<token>a</token>', '<token>a&undefined;</token>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: H + '<!DOCTYPE rules [<!ENTITY e "x">]>' + okDoc.slice(H.length).replace('<token>a</token>', '<token>&e;</token>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<rulegroup id="g">', '<rulegroup id="g"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('id="g"', 'id="1 g"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<rule>', '<rulegroup id="g"><rule>').replace('</rulegroup>', '</rule></rulegroup>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('type="correct"', 'type="maybe"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('lang="en"', 'lang="xx"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('x</example>', 'Ünï ä ß 😀</example>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: '<!-- c -->\n' + okDoc, schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<rules>', '<!DOCTYPE rules SYSTEM "x.dtd">\n<rules>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<token>a</token>', '<token>\uD800</token>'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('encoding="UTF-8"', 'encoding="NOSUCH"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: '<rules/>', schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: '', schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace(' lang="de"', ' lang="de" lang="en"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: okDoc.replace('<translation', '<translation foo="1"'), schema: ff, docType: 'rules' }),
  V({ mode: 'string-dtd', xml: H + '<rules>\n<unclosed>\n</rules>', schema: ff, docType: 'rules' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de"><category id="C" name="n"><rule id="R" name="r"><pattern><token>a</token></pattern><message>m</message></rule></category></rules>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de"><category id="C" name="n"><rule id="R" name="r"><pattern><token>a</token></pattern><message>m</message></rule></category></rules>'.replace('</pattern>', ''), schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de"><category id="C" name="n"><rule id="R" name="r"><pattern><token>a</token></pattern><message>m</message></rule></category>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de">&undefined;</rules>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<!DOCTYPE rules [<!ENTITY e "x">]><rules lang="de"><category id="C" name="&e;"/></rules>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: '<?xml version="1.0" encoding="UTF-16"?><rules lang="de"/>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: '<?xml version="1.0" encoding="UTF-8"?><rules lang="de"/>', schema: '/no/such.xsd' }),
  V({ mode: 'string-xsd', xml: '', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: 'not xml', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de"><category id="C" name="Ünï ä"/></rules>', schema: RULES + '/rules.xsd' }),
  V({ mode: 'string-xsd', xml: H + '<rules lang="de"><category id="C" name="n"><rule id="R" name="r"><pattern><token>a</token></pattern><message>m</message></rule></category><rulegroup/></rules>', schema: RULES + '/rules.xsd' }),
];
cases.push(['validate-synthetic', 'XMLValidator on synthetic broken inputs: missing files/schemas, unclosed tag, undefined entity, internal-DTD entity, bad encoding, DTD/XSD violations', sv]);

writeCases('X-XML', cases);
import fs from 'node:fs';
for (const n of ['sax-synthetic', 'validate-synthetic']) {
  const f = path.join(ROOT, 'oracle/cases/X-XML', n + '.json'); const j = JSON.parse(fs.readFileSync(f)); j.normalize = ['paths']; fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
}
console.log(`X-XML: ${cases.length} case files, ${files.length} XML files (${cases.map(([n, , o]) => `${n}:${o.length}`).join(' ')})`);
