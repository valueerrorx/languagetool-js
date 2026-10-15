# F07 oracle checkpoint (X-XML)

Status: done. Fixtures tests/golden/X-XML (800 KB, 8 cases, 190 requests), cases by oracle/scripts/gen-cases-xml.mjs, Java ops oracle/harness/src/ltjs/oracle/XmlOps.java (`sax-dump`, `xml-validate`). JS adapters: none yet (parity: 8 NOT PORTED). File list = every `*.xml`/`*.srx` of resources/ (32 files, `npm run resources`; wave-1 grammar/style/disambiguation/remote-rule-filters/false-friends/segment*.srx/disambiguation-global/server mappers/logback). The .xsd/.dtd files are only schema inputs of xml-validate.

## sax-dump {path | xml | bytesBase64, profile}
`path` = classpath path via data broker (leading slash); `xml` = UTF-8 string; `bytesBase64` = raw bytes (encoding detection by the parser).
Parser = `SAXParserFactory.newInstance()` defaults (non-validating, NOT namespace aware: names are qNames, no prefix handling), feature `load-external-dtd=false` (external DTD subset is skipped; internal subset is processed), parse of an InputStream. Profiles:
- `pattern` / `disambiguation`: as PatternRuleLoader/DisambiguationRuleLoader: properties `jdk.xml.maxGeneralEntitySizeLimit`, `totalEntitySizeLimit`, `entityExpansionLimit` = 0 (unlimited) and EntityResolver = `RuleEntityResolver` (only systemIds ending `.ent`; others -> default resolution).
- `plain`: JAXP default limits (64000 expansions etc.), no resolver. `falsefriends` = `plain` (FalseFriendRuleLoader sets only load-external-dtd=false).
No ErrorHandler is set, so warnings/recoverable errors are ignored, fatal errors throw (reported in `error`, events so far still counted).

### Canonical event stream (lines, UTF-8, each terminated by `\n` for the hash)
- `S<TAB>qName` followed per attribute, sorted by qName in Java `String.compareTo` order (UTF-16 code units), by `<TAB>name=value`. Value = attribute value as delivered by the parser (after entity expansion and attribute-value normalisation).
- `T<TAB>text`: one event per maximal run of character data between two element events. All `characters()` and `ignorableWhitespace()` chunks are concatenated; CDATA content is plain text; comments, PIs, DOCTYPE and the xml-stylesheet PIs produce no event and do not split the run (text before and after a comment is ONE node). A run of length 0 emits nothing. Whitespace-only runs are emitted like any other (no trimming). The parser's line-end normalisation (CRLF/CR -> LF) is already applied.
- `E<TAB>qName` at endElement.
- Escaping in text and values: `\` -> `\\`, TAB -> `\t`, LF -> `\n`, CR -> `\r`; nothing else is escaped. Hash = SHA-256 over the UTF-8 bytes of all lines (each + `\n`), lowercase hex.
### Result fields
`profile`, `error` (null or `{class,message,line,column,causes[]}`; line/column only for SAXParseException), `events`, `elementTotal`, `attributeTotal` (sum of attribute counts over all elements), `textNodes`, `textChars` (UTF-16 units), `maxDepth`, `sha256`, `elementCounts{qName:n}`, `attributeNameCounts{name:n}` (both sorted by name), `first200` = first 200 event lines verbatim (same escaping, no trailing `\n`); a line longer than 300 UTF-16 units is cut to 300 and suffixed `...[len=<full length>]`.
Fixture cases: sax-core, sax-de, sax-en, sax-fr (all files of the module), sax-profiles (grammar/style/disambiguation under `plain`: digests must equal the pattern-profile ones), sax-synthetic (50 documents: entities incl. nested/undefined/external `.ent`/recursive/expansion beyond 64000 (error under plain, fine under pattern), CDATA, CRLF, char refs, attr normalisation, BOM, UTF-16, ISO-8859-1, invalid UTF-8, unknown/mismatched encoding, malformed XML). Messages with temp paths are normalised with `paths`.

## xml-validate {mode, ...}
Calls `org.languagetool.XMLValidator` (static init sets the entity size system properties; stderr of the validator's own ErrorHandler is captured in stderr.bin, not compared). Modes: `dtd` (validateWithDtd path/schema/docType), `xsd` (validateWithXmlSchema path/schema), `xsd-merge` (base,path,schema: unification of the base prepended, as PatternRuleTest), `string-dtd` (validateXMLString xml/schema/docType), `string-xsd` (validateStringWithXmlSchema). Result `{mode, ok:true}` or `{mode, ok:false, error:{class,message,line?,column?,causes[]}}` (chain up to 10 causes; line/column from SAXParseException).
Cases: validate-wave1 (36: false-friends via DTD; all grammar/style via rules.xsd, variants additionally merged; remote-rule-filters via remote-rules.xsd; disambiguation via disambiguation.xsd) and validate-synthetic (40: missing file/schema/wrong schema, DTD violations, unclosed tag, undefined entity, internal-DTD entity, invalid char, bad encoding, no XML declaration, empty input). Real Java findings pinned: fr/style.xml fails XSD (`cvc-id.1 ... IDREF 'number'`, line 22790); `string-dtd` strips an existing DOCTYPE.
JS side needs XSD/DTD validation to reproduce messages; if not feasible mark UNORACLED-in-JS / report as deviation candidate (DTD and XSD messages come from Xerces).

## Environment
JDK 17, pinned env per docs/ORACLE.md (fixed clock, Europe/Vienna, UTF-8). Regenerate: `node oracle/scripts/gen-cases-xml.mjs && npm run oracle -- X-XML`.
