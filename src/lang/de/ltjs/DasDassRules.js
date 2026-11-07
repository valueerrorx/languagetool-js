// LTJS layer (D-061): das/dass rules beyond Java. Each rule has its own LTJS_* id and can be disabled via disabledRules.
import { Rule } from '../../../core/rules/model/Rule.js';
import { RuleMatch } from '../../../core/rules/model/RuleMatch.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { ITSIssueType } from '../../../core/rules/model/ITSIssueType.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { getUrl } from '../../../core/Tools.js';
import {
  hasTag, isUnknown, isStrictFiniteVerb, lower, isLowerCase, isUpperCase, isFiniteVerb, isVerb, verbLemmas, lemmas,
  clauseEnd, clauseStart, verbFinal, isImperativeInitial, hasSubjectCandidate, articleReading, articleReadingV2, hasNeuterAntecedentBefore, hasNeuterAntecedent, relativeImpossible, coreArgumentCount, coreArguments, NP_CHAIN, dassFor, dasFor,
} from './DasDassTools.js';

const URL = 'https://languagetool.org/insights/de/beitrag/das-versus-dass/';

// verbs of saying, thinking, perceiving and similar verbs with a dass clause (lemmas; separable verbs with their particle)
const DASS_VERBS = new Set([
  'sagen', 'meinen', 'glauben', 'denken', 'hoffen', 'wissen', 'hören', 'lesen', 'sehen', 'merken', 'bemerken', 'feststellen',
  'befürchten', 'fürchten', 'bezweifeln', 'zeigen', 'erzählen', 'berichten', 'mitteilen', 'behaupten', 'erklären', 'annehmen',
  'vermuten', 'erfahren', 'erkennen', 'beweisen', 'belegen', 'betonen', 'versprechen', 'übersehen', 'schreiben', 'sicherstellen',
  'beachten', 'bedenken', 'ahnen', 'spüren', 'fühlen', 'träumen', 'wünschen', 'verlangen', 'fordern', 'garantieren',
  'bestätigen', 'zugeben', 'verraten', 'vorschlagen', 'beschließen', 'ankündigen', 'antworten', 'versichern', 'beteuern',
  'einräumen', 'kritisieren', 'bemängeln', 'beklagen', 'bedauern', 'beobachten', 'entdecken', 'herausfinden', 'vergessen',
  'verschweigen', 'leugnen', 'bestreiten', 'schätzen', 'prognostizieren', 'warnen', 'ausschließen', 'voraussetzen',
  'vorhersagen', 'erwarten', 'begrüßen', 'erwähnen', 'melden', 'mitbekommen', 'wetten', 'schwören', 'zusichern', 'verkünden',
  'bekanntgeben', 'klarstellen', 'unterstreichen', 'hervorheben', 'anmerken', 'einwenden', 'entgegnen', 'erwidern', 'zugestehen',
  'kapieren', 'begreifen', 'realisieren', 'registrieren', 'mutmaßen', 'spekulieren', 'unterstellen', 'vorwerfen', 'befehlen',
  'anordnen', 'festlegen', 'vereinbaren', 'verabreden', 'abmachen', 'bezeugen', 'nachweisen', 'verdeutlichen', 'offenbaren',
  'erahnen', 'folgern', 'vorgeben', 'vortäuschen', 'finden', 'verstehen', 'einsehen', 'berücksichtigen', 'gewährleisten',
  'verhindern', 'vermeiden', 'erreichen', 'bewirken', 'ermöglichen', 'zulassen', 'erlauben', 'verbieten', 'empfehlen', 'raten',
  'bitten', 'beantragen', 'dementieren', 'demonstrieren', 'bedeuten', 'gestehen', 'eingestehen', 'darlegen', 'erläutern',
  'schildern', 'festhalten', 'vermerken', 'hinzufügen', 'ergänzen', 'argumentieren', 'urteilen', 'herausstellen', 'akzeptieren',
  'hinnehmen', 'notieren', 'prüfen', 'überprüfen', 'kontrollieren', 'vorsehen', 'regeln', 'bestimmen', 'nahelegen', 'andeuten',
  'signalisieren', 'suggerieren', 'implizieren', 'besagen', 'ermitteln', 'berechnen', 'angeben', 'aussagen', 'bekräftigen',
  'monieren', 'begründen', 'ausrechnen', 'vorrechnen', 'lernen', 'aufpassen', 'anführen',
]);

// verbs that need a correlate in the clause before the comma ('davon ausgehen', 'kann es sein', 'stimmt es')
const CORRELATE_VERBS = new Map([
  ['ausgehen', ['davon']], ['hinweisen', ['darauf']], ['zusammenhängen', ['damit']], ['abhängen', ['davon']],
  ['sorgen', ['dafür']], ['achten', ['darauf']], ['aufpassen', ['darauf']], ['bestehen', ['darauf', 'darin']],
  ['liegen', ['daran']], ['führen', ['dazu']], ['beitragen', ['dazu']], ['rechnen', ['damit']], ['zeugen', ['davon']],
  ['überzeugen', ['davon']], ['sprechen', ['dafür', 'dagegen']], ['ankommen', ['darauf']], ['freuen', ['darüber', 'darauf', 'es']],
  ['stören', ['es']], ['überraschen', ['es']], ['erstaunen', ['es']], ['beruhigen', ['es']],
  ['ärgern', ['darüber', 'es']], ['beschweren', ['darüber']], ['beklagen', ['darüber']], ['wundern', ['darüber', 'es']],
  ['erinnern', ['daran']], ['denken', ['daran']], ['glauben', ['daran']], ['zweifeln', ['daran']], ['gewöhnen', ['daran']],
  ['sein', ['es']], ['stimmen', ['es']], ['heißen', ['es']], ['scheinen', ['es']], ['passieren', ['es']], ['geschehen', ['es']],
  ['vorkommen', ['es']], ['auffallen', ['es']], ['gelingen', ['es']], ['feststehen', ['es']], ['ergeben', ['es', 'sich']],
  ['zeigen', ['es', 'sich']], ['herausstellen', ['sich']], ['ausreichen', ['es']], ['genügen', ['es']], ['reichen', ['es']],
]);

// neuter nouns that take a dass clause (no relative 'das' after them); compounds ending in one of them count too
const DASS_NOUNS_NEUTER = [
  'Gefühl', 'Problem', 'Ergebnis', 'Argument', 'Risiko', 'Versprechen', 'Glück', 'Pech', 'Zeichen', 'Signal', 'Gerücht', 'Indiz',
  'Faktum', 'Wissen', 'Bewusstsein', 'Prinzip', 'Ziel', 'Vertrauen', 'Verständnis', 'Einverständnis', 'Bedürfnis', 'Verbot',
  'Gebot', 'Gesetz', 'Urteil', 'Beispiel', 'Phänomen', 'Erlebnis', 'Ereignis', 'Detail', 'Missverständnis', 'Interesse',
  'Anliegen', 'Kriterium', 'Merkmal', 'Motiv', 'Paradox', 'Dilemma', 'Thema', 'Wunder', 'Fazit', 'Resultat', 'Eingeständnis',
  'Geständnis', 'Bekenntnis', 'Zugeständnis', 'Versäumnis', 'Erstaunen', 'Staunen', 'Entsetzen', 'Unbehagen', 'Empfinden',
  'Verdienst', 'Verlangen', 'Bestreben', 'Vorhaben', 'Bemühen', 'Bedauern', 'Erschrecken', 'Ansinnen', 'Ersuchen', 'Begehren',
  'Vergnügen', 'Kompliment', 'Lob', 'Fakt', 'Ideal', 'Axiom', 'Dogma', 'Wort', 'Angebot', 'Hindernis', 'Erfordernis', 'Ärgernis',
  'Manko', 'Plus', 'Minus', 'Pro', 'Kontra', 'Statement', 'Votum', 'Credo', 'Motto', 'Glaubensbekenntnis', 'Postulat', 'Theorem',
  'Kalkül', 'Szenario', 'Faszinosum', 'Unglück', 'Misstrauen', 'Privileg', 'Resümee', 'Abkommen', 'Übereinkommen',
  'Einvernehmen', 'Omen', 'Vorzeichen', 'Verhängnis', 'Wunschdenken', 'Klischee', 'Stereotyp', 'Vorurteil', 'Image', 'Bild',
  'Märchen', 'Gerede', 'Geheimnis', 'Rätsel', 'Attest', 'Zertifikat', 'Zeugnis', 'Gelübde', 'Ehrenwort', 'Gebet', 'Schicksal',
  'Novum', 'Kuriosum', 'Symptom', 'Anzeichen', 'Kennzeichen', 'Charakteristikum', 'Gespür', 'Unwissen', 'Hoffen', 'Bangen',
  'Gesuch', 'Dekret', 'Edikt', 'Exempel', 'Los', 'Dankeschön', 'Konzept', 'Kapitel', 'Mysterium', 'Debakel', 'Skandal',
  'Desaster', 'Drama',
];

// predicative adjectives with a dass clause ('es ist wichtig, dass', 'ich bin froh, dass')
const DASS_ADJECTIVES = new Set([
  'wichtig', 'klar', 'sicher', 'froh', 'gut', 'schön', 'schade', 'toll', 'super', 'besser', 'möglich', 'unmöglich',
  'wahrscheinlich', 'unwahrscheinlich', 'notwendig', 'nötig', 'erforderlich', 'entscheidend', 'logisch', 'offensichtlich',
  'bekannt', 'unbestritten', 'fraglich', 'zweifelhaft', 'richtig', 'falsch', 'wahr', 'seltsam', 'merkwürdig', 'komisch',
  'erstaunlich', 'überraschend', 'traurig', 'ärgerlich', 'peinlich', 'verständlich', 'normal', 'typisch', 'sinnvoll',
  'wünschenswert', 'denkbar', 'egal', 'interessant', 'bewusst', 'überzeugt', 'stolz', 'dankbar', 'glücklich', 'gewiss',
  'besorgt', 'enttäuscht', 'erleichtert', 'beruhigt', 'unklar', 'bezeichnend', 'auffällig', 'unbestreitbar', 'unvermeidlich',
  'ausgeschlossen', 'verwunderlich', 'bedauerlich', 'erfreulich', 'unerlässlich', 'zwingend', 'vorstellbar', 'undenkbar',
  'selbstverständlich', 'okay', 'ok', 'fair', 'unfair', 'gerecht', 'ungerecht', 'praktisch', 'hilfreich', 'angenehm',
  'unangenehm', 'lustig', 'schlimm', 'schlecht', 'sauer', 'wütend', 'überrascht', 'erstaunt', 'gespannt', 'zuversichtlich',
  'optimistisch', 'pessimistisch', 'einverstanden', 'erfreut', 'gewohnt', 'unbedingt', 'eindeutig', 'offen', 'fest', 'deutlich',
]);
const COPULAS = new Set(['sein', 'werden', 'bleiben', 'scheinen', 'finden', 'halten', 'machen', 'erachten']);

// words that may stand between a dass verb and the comma ('meinte aber,', 'sagte mir gestern,')
const SKIPPABLE = /^(ADV|PRO:PER|PRO:REF|NEG|PA2:PRD|ADJ:PRD)/;
const SKIPPABLE_WORDS = new Set(['aber', 'doch', 'jedoch', 'auch', 'ja', 'nur', 'allerdings', 'nicht', 'immer', 'schon', 'noch', 'es', 'selbst', 'sofort', 'dies']);

const DETERMINER = /^(ART|PRO:POS|PRO:DEM|PRO:IND)/;

// Base: shared setup of the LTJS das/dass rules.
class LtjsDasDassRule extends Rule {
  constructor(messages, language) {
    super(messages);
    this.language = language;
    super.setCategory(Categories.GRAMMAR.getCategory(messages));
    this.setLocQualityIssueType(ITSIssueType.Grammar);
    this.setUrl(getUrl(URL));
  }

  estimateContextForSureMatch() {
    return 0;
  }

  match(sentence) {
    const tokens = sentence.getTokensWithoutWhitespace();
    const matches = [];
    for (let i = 1; i < tokens.length; i++) {
      const m = this.matchAt(sentence, tokens, i);
      if (m !== null) matches.push(m);
    }
    return this.toRuleMatchArray(matches);
  }

  // das (token i) -> dass
  dassMatch(sentence, t, msg) {
    const m = new RuleMatch(this, sentence, t.getStartPos(), t.getEndPos(), msg, "Konjunktion 'dass'");
    m.setSuggestedReplacement(dassFor(t));
    return m;
  }
}

// ', das' + verb-final clause with its own subject; das is not an article of a following noun (V2) - the conjunction reading
function dassClause(tokens, i, sentenceStart = false) {
  const clause = verbFinalClause(tokens, i, !sentenceStart); // also across und/oder: 'das sie ihn und Robert beobachtete'
  if (clause === null) return null;
  const { s, vf } = clause;
  const ct = clause.tokens;
  if (!hasSubjectCandidate(ct, s, vf.clusterStart)) return null;
  if (sentenceStart ? articleReadingV2(ct, s, vf) : articleReading(ct, s, vf)) return null;
  return clause;
}

const COORDINATION = new Set(['und', 'oder', 'sowie', 'sondern']);

// no relative 'das' possible: no neuter antecedent before the comma at k, or the clause has no role left for it
function noRelativeDas(tokens, k, clause) {
  return !hasNeuterAntecedentBefore(tokens, k) || relativeImpossible(clause.tokens, clause.s, clause.vf);
}

const isDas = (t) => t.getToken() === 'das';
const isComma = (t) => t !== undefined && t.getToken() === ',';

// Java: none (LTJS). 'Ich habe gehört, das die Miete steigt.' -> dass
export class LtjsDasDassVerbRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich habe gehört, <marker>das</marker> die Miete steigt.'),
      Example.fixed('Ich habe gehört, <marker>dass</marker> die Miete steigt.'));
  }

  getId() {
    return 'LTJS_DAS_DASS_VERB';
  }

  getDescription() {
    return "'das' statt 'dass' nach Verben des Sagens, Denkens und Wahrnehmens";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1])) return null;
    const verb = findDassVerb(tokens, i - 1);
    if (verb === null) return null;
    const clause = dassClause(tokens, i);
    if (clause === null || !(verbConjunct(tokens, i - 1) || noRelativeDasAfterPrefield(tokens, i - 1) || noRelativeDas(tokens, i - 1, clause))) return null;
    return this.dassMatch(sentence, tokens[i],
      `Meinten Sie die Konjunktion 'dass'? Nach '${verb}' folgt hier vermutlich ein mit 'dass' eingeleiteter Nebensatz.`);
  }
}

// the comma at k ends a coordinated verb phrase without nouns ('danken Ihnen für Ihr Verständnis und hoffen,'): a noun before
// 'und' cannot be the antecedent of a relative clause after it
function verbConjunct(tokens, k) {
  let j = k - 1;
  while (j > 1 && (isVerb(tokens[j]) || hasTag(tokens[j], SKIPPABLE) || SKIPPABLE_WORDS.has(lower(tokens[j]))) && isLowerCase(tokens[j])
    && !hasTag(tokens[j], /^(SUB|EIG|ART|PRO:(DEM|POS|IND))/)) j--;
  const v = j + 1;
  return v < k && ['und', 'oder', 'aber'].includes(tokens[j].getToken()) && isFiniteVerb(tokens[v]) && !hasTag(tokens[v], /^(ADJ|PA2|SUB)/);
}

// main clause from sentence start to the comma at k with a prepositional phrase or adverb before the finite verb
// ('In einem Praktikum bei X habe ich gelernt,'): nouns there cannot be the antecedent of a relative clause after the comma
function noRelativeDasAfterPrefield(tokens, k) {
  if (k < 4 || !hasTag(tokens[1], /^(PRP|ADV)/) || hasTag(tokens[1], /^(KON|PRO)/)) return false;
  let f = 2;
  while (f < k && !(isFiniteVerb(tokens[f]) && isLowerCase(tokens[f]) && !hasTag(tokens[f], /^(ART|PRO|ADJ|SUB|PRP)/))) {
    if (isVerb(tokens[f]) && !hasTag(tokens[f], /^(SUB|ADJ)/)) return false;
    if (!/^[\p{L}\d]/u.test(tokens[f].getToken())) return false; // only words: no comma, quote or bracket before the verb
    f++;
  }
  if (f >= k - 1) return false;
  for (let j = f + 1; j < k; j++) if (!/^[\p{L}\d]/u.test(tokens[j].getToken())) return false;
  return !hasNeuterAntecedent(tokens, f + 1, k);
}

const DA_CORRELATES = new Set(['darauf', 'davon', 'damit', 'dafür', 'daran', 'darüber', 'dazu', 'darin', 'dadurch', 'danach', 'darum',
  'daraus', 'dabei', 'dagegen']);

// a verb reading (with a separated particle) that takes a dass clause
function isDassVerb(t, particle, clauseWords) {
  for (const l of verbLemmas(t)) {
    if (isDassLemma(particle !== null ? [particle + l, l] : [l], clauseWords)) return true;
  }
  return false;
}

// one of the lemmas takes a dass clause (directly or with a correlate among the clause words)
function isDassLemma(candidates, clauseWords) {
  for (const lemma of candidates) {
    const correlates = CORRELATE_VERBS.get(lemma);
    if (correlates !== undefined && correlates.some((c) => clauseWords.has(c))) return true;
    if (DASS_VERBS.has(lemma)) return true;
  }
  return false;
}

// the dass verb before the comma at index k (skipping adverbs, pronouns, a particle; any verb with a da-correlate); returns the text or null
function findDassVerb(tokens, k) {
  const cs = clauseStart(tokens, k);
  const clauseWords = new Set();
  for (let j = cs; j < k; j++) clauseWords.add(lower(tokens[j]));
  const correlate = [...clauseWords].some((w) => DA_CORRELATES.has(w));
  let particle = null;
  let skipped = 0;
  let sawVerb = false;
  for (let j = k - 1; j >= cs && skipped <= 4; j--) {
    const t = tokens[j];
    if (particle === null && !sawVerb && j === k - 1 && hasTag(t, /^ZUS/) && isLowerCase(t) && !isVerb(t)) {
      particle = lower(t);
      continue;
    }
    if (isImperativeInitial(tokens, j)) { // 'Achten Sie darauf,' (tagged as noun only)
      const l = lower(t);
      if (correlate || isDassLemma(particle !== null ? [particle + l, l] : [l], clauseWords)) return t.getToken();
      break;
    }
    if (isVerb(t)) {
      sawVerb = true;
      if (correlate || isDassVerb(t, particle, clauseWords)) return t.getToken();
      continue; // verb chain: 'gezeigt werden', 'mitteilen müssen'
    }
    if (sawVerb) break;
    if (hasTag(t, SKIPPABLE) || SKIPPABLE_WORDS.has(lower(t)) || DA_CORRELATES.has(lower(t))) {
      skipped++;
      continue;
    }
    break;
  }
  // a da-correlate right before the comma ('erhoffte sich ... daraus,')
  if (!sawVerb && DA_CORRELATES.has(lower(tokens[k - 1]))) {
    for (let j = cs; j < k - 1; j++) if (isFiniteVerb(tokens[j]) && !hasTag(tokens[j], /^(ART|PRO|SUB)/)) return tokens[k - 1].getToken();
  }
  // particle far from its finite verb ('wies ... nach,')
  if (particle !== null && !sawVerb) {
    for (let j = cs; j < k - 1; j++) {
      if (isFiniteVerb(tokens[j]) && isDassVerb(tokens[j], particle, clauseWords)) return `${tokens[j].getToken()} ... ${particle}`;
    }
  }
  return null;
}

// Java: none (LTJS). 'Ich bin der Meinung, das ...', 'Das Problem ist, das ...' -> dass
export class LtjsDasDassNounRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Viele sind der Meinung, <marker>das</marker> Handys ablenken.'),
      Example.fixed('Viele sind der Meinung, <marker>dass</marker> Handys ablenken.'));
  }

  getId() {
    return 'LTJS_DAS_DASS_NOMEN';
  }

  getDescription() {
    return "'das' statt 'dass' nach Nomen wie 'Meinung', 'Hoffnung', 'Problem' und nach 'Das Problem ist,'";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1]) || i < 3) return null;
    const before = tokens[i - 2];
    let msg;
    let neuterNoun = false;
    if (hasTag(before, /^SUB/) && isUpperCase(before)) {
      neuterNoun = hasTag(before, /^SUB:[A-Z]+:SIN:NEU/);
      msg = neuterNoun
        ? `Meinten Sie die Konjunktion 'dass'? Der Nebensatz nach '${before.getToken()}' ist vollständig; für ein Relativpronomen 'das' bleibt darin keine Rolle.`
        : `Meinten Sie die Konjunktion 'dass'? Nach '${before.getToken()}' folgt hier vermutlich ein mit 'dass' eingeleiteter Nebensatz; ein Relativpronomen müsste sich nach dem Genus des Nomens richten.`;
    } else if (copulaWithoutPredicate(tokens, i - 1)) {
      msg = `Meinten Sie die Konjunktion 'dass'? Nach '... ${before.getToken()},' steht hier vermutlich ein Nebensatz mit 'dass'.`;
      return dassClause(tokens, i) === null ? null : this.dassMatch(sentence, tokens[i], msg);
    } else {
      return null;
    }
    const clause = dassClause(tokens, i);
    if (clause === null) return null;
    if (neuterNoun ? !relativeImpossible(clause.tokens, clause.s, clause.vf) : !noRelativeDas(tokens, i - 1, clause)) return null;
    return this.dassMatch(sentence, tokens[i], msg);
  }
}

// 'Das Problem ist,' / 'Fakt ist auch,': sentence-initial main clause ending in a finite form of 'sein' (+ adverbs) before the comma
function copulaWithoutPredicate(tokens, k) {
  let j = k - 1;
  while (j > 1 && hasTag(tokens[j], /^ADV/) && isLowerCase(tokens[j]) && !isVerb(tokens[j])) j--;
  const t = tokens[j];
  if (!(isFiniteVerb(t) && verbLemmas(t).has('sein'))) return false;
  if (clauseStart(tokens, k) !== 1 || j < 2) return false;
  const first = tokens[1];
  if (hasTag(first, /^(KON|PRO:(REL|INR|RIN))/) || /^(was|wer|wie|wo|wann|warum|wieso|weshalb|ob)$/i.test(first.getToken())) return false;
  for (let x = 1; x < j; x++) if (isVerb(tokens[x]) && !hasTag(tokens[x], /^(SUB|ADJ)/)) return false;
  return true;
}

// Java: none (LTJS). 'Es ist wichtig, das alle ...', 'Ich bin froh, das du da bist.' -> dass
export class LtjsDasDassAdjectiveRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Es ist wichtig, <marker>das</marker> alle denselben Stand haben.'),
      Example.fixed('Es ist wichtig, <marker>dass</marker> alle denselben Stand haben.'));
  }

  getId() {
    return 'LTJS_DAS_DASS_ADJ';
  }

  getDescription() {
    return "'das' statt 'dass' nach 'es ist wichtig', 'ich bin froh' usw.";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1])) return null;
    const k = i - 1;
    const cs = clauseStart(tokens, k);
    let j = k - 1;
    let skipped = 0;
    while (j >= cs && skipped < 3 && (hasTag(tokens[j], /^(ADV|PRO:PER|PRO:REF)/) && !hasTag(tokens[j], /^ADJ/))) {
      j--;
      skipped++;
    }
    if (j < cs) return null;
    const adj = tokens[j];
    if (!hasTag(adj, /^(ADJ:PRD|PA2:PRD)/) || ![...lemmas(adj, /^(ADJ|PA2)/), lower(adj)].some((l) => DASS_ADJECTIVES.has(l))) return null;
    let copula = false;
    for (let x = cs; x < j; x++) if ([...verbLemmas(tokens[x])].some((l) => COPULAS.has(l))) copula = true;
    if (!copula) return null;
    const clause = dassClause(tokens, i);
    if (clause === null || !noRelativeDas(tokens, k, clause)) return null;
    return this.dassMatch(sentence, tokens[i],
      `Meinten Sie die Konjunktion 'dass'? Nach '${adj.getToken()}' folgt hier vermutlich ein mit 'dass' eingeleiteter Nebensatz.`);
  }
}

// Java: none (LTJS). ', das das Treffen verschoben wird' -> dass das (no neuter antecedent for a relative 'das')
export class LtjsDasDasRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich wollte Bescheid geben, <marker>das</marker> das Treffen verschoben wird.'),
      Example.fixed('Ich wollte Bescheid geben, <marker>dass</marker> das Treffen verschoben wird.'));
  }

  getId() {
    return 'LTJS_DAS_DAS';
  }

  getDescription() {
    return "'das das' statt 'dass das'";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1]) || i + 1 >= tokens.length) return null;
    const next = tokens[i + 1];
    if (!isLowerCase(next) || !hasTag(next, DETERMINER) || hasTag(next, /^PRO:IND/) && !hasTag(next, /^(ART|PRO:POS|PRO:DEM)/)) return null;
    const clause = dassClause(tokens, i);
    if (clause === null || !noRelativeDas(tokens, i - 1, clause)) return null;
    return this.dassMatch(sentence, tokens[i],
      `Meinten Sie die Konjunktion 'dass'? Auf '${tokens[i].getToken()} ${next.getToken()}' folgt hier ein Nebensatz mit Verb am Ende, und es gibt kein sächliches Bezugswort für ein Relativpronomen.`);
  }
}

// Java: none (LTJS). 'Es regnete so stark, das ich nass wurde.' -> dass
export class LtjsSoAdjDassRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich war so nervös, <marker>das</marker> ich kaum schlafen konnte.'),
      Example.fixed('Ich war so nervös, <marker>dass</marker> ich kaum schlafen konnte.'));
  }

  getId() {
    return 'LTJS_SO_ADJ_DASS';
  }

  getDescription() {
    return "'so ..., das' statt 'so ..., dass'";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1])) return null;
    const k = i - 1;
    let j = k - 1;
    let n = 0;
    while (j > 0 && n < 3 && lower(tokens[j]) !== 'so' && hasTag(tokens[j], /^(ADJ|ADV|PA2|VER)/) && isLowerCase(tokens[j])) {
      j--;
      n++;
    }
    if (j <= 0 || n === 0 || lower(tokens[j]) !== 'so' || !hasTag(tokens[j], /^ADV/)) return null;
    if (!hasTag(tokens[j + 1], /^(ADJ|ADV|PA2)/)) return null;
    const prev = tokens[j - 1];
    if (['und', 'oder', 'genau', 'ebenso', 'nur'].includes(lower(prev))) return null;
    if (dassClause(tokens, i) === null) return null; // after 'so ADJ,' a consecutive clause, no relative clause
    return this.dassMatch(sentence, tokens[i],
      "Meinten Sie die Konjunktion 'dass'? Nach 'so ...' folgt hier vermutlich ein Folgesatz mit 'dass'.");
  }
}

// Java: none (LTJS). ', so das die Straße gesperrt war' -> sodass / so dass
export class LtjsSodassRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Es schneite stark, <marker>so das</marker> die Straße gesperrt wurde.'),
      Example.fixed('Es schneite stark, <marker>sodass</marker> die Straße gesperrt wurde.'));
  }

  getId() {
    return 'LTJS_SODASS';
  }

  getDescription() {
    return "'so das' statt 'sodass'";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || tokens[i - 1].getToken() !== 'so' || !isComma(tokens[i - 2])) return null;
    if (dassClause(tokens, i) === null && !finiteVerbInClause(tokens, i)) return null;
    const so = tokens[i - 1];
    const m = new RuleMatch(this, sentence, so.getStartPos(), tokens[i].getEndPos(),
      "Meinten Sie die Konjunktion 'sodass' (auch: 'so dass')? Hier leitet 'so das' vermutlich einen Folgesatz ein.", "Konjunktion 'sodass'");
    m.setSuggestedReplacements(['sodass', 'so dass']);
    return m;
  }
}

// a finite verb after the first word of the clause after index i (also across und/oder): ', so das es hier kälter ist als im Tal'
// (', so das Ministerium' reports a source and has no verb)
function finiteVerbInClause(tokens, i) {
  let e = clauseEnd(tokens, i + 1);
  if (e < tokens.length && COORDINATION.has(tokens[e].getToken())) e = clauseEnd(tokens, e + 1);
  for (let j = i + 2; j < e; j++) if (isStrictFiniteVerb(tokens[j]) || isMainClauseVerb(tokens[j])) return true;
  return false;
}

// Java: none (LTJS). 'Das er kommt, freut mich.' -> Dass (subject clause before the finite verb of the main clause)
export class LtjsDassSentenceStartRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('<marker>Das</marker> er so schnell zurückkommt, hätte ich nicht gedacht.'),
      Example.fixed('<marker>Dass</marker> er so schnell zurückkommt, hätte ich nicht gedacht.'));
  }

  getId() {
    return 'LTJS_DASS_SATZANFANG';
  }

  getDescription() {
    return "'Das' statt 'Dass' am Satzanfang";
  }

  matchAt(sentence, tokens, i) {
    if (i !== 1 || tokens[i].getToken() !== 'Das') return null;
    const c = dassClause(tokens, i, true);
    const ct = c?.tokens;
    if (c === null || !isComma(ct[c.e])) return null;
    let after = ct[c.e + 1];
    if (after !== undefined && !isFiniteVerb(after)) { // a zu-infinitive of the clause first ('Das Schüler lernen müssen, verantwortungsvoll ... umzugehen, ist')
      const e2 = clauseEnd(ct, c.e + 1);
      const z = ct[e2 - 1];
      if (isComma(ct[e2]) && (hasTag(z, /^VER:EIZ/) || (lower(ct[e2 - 2]) === 'zu' && hasTag(z, /^VER:INF/)))) after = ct[e2 + 1];
    }
    if (after === undefined || !isFiniteVerb(after) || !isLowerCase(after)) return null;
    return this.dassMatch(sentence, tokens[i],
      "Meinten Sie die Konjunktion 'Dass'? Der Nebensatz am Satzanfang ist hier vermutlich das Subjekt oder Objekt des folgenden Hauptsatzes.");
  }
}

// a neuter noun that takes a dass clause (also compounds: 'Hauptproblem')
function isDassNounNeuter(t) {
  for (const l of lemmas(t, /^SUB/)) {
    for (const n of DASS_NOUNS_NEUTER) if (l === n || l.endsWith(n.toLowerCase())) return true;
  }
  return false;
}

// Java: none (LTJS). 'Das Formular, dass Sie dafür benötigen, ...' -> das (relative pronoun)
export class LtjsDassRelativeRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Das Formular, <marker>dass</marker> Sie dafür benötigen, finden Sie online.'),
      Example.fixed('Das Formular, <marker>das</marker> Sie dafür benötigen, finden Sie online.'));
  }

  getId() {
    return 'LTJS_DASS_RELATIVPRONOMEN';
  }

  getDescription() {
    return "'dass' statt Relativpronomen 'das'";
  }

  matchAt(sentence, tokens, i) {
    const t = tokens[i];
    if (t.getToken() !== 'dass' || !isComma(tokens[i - 1]) || i < 3) return null;
    const gapNoun = objectGapAntecedent(tokens, i);
    if (gapNoun !== null) return this.relativeMatch(sentence, t, gapNoun);
    const last = tokens[i - 2];
    if (!(hasTag(last, /^(SUB|EIG)/) && isUpperCase(last))) return null;
    const clause = verbFinalClause(tokens, i, false);
    if (clause === null) return null;
    const { s, e, vf } = clause;
    const args = coreArguments(tokens, s, vf.clusterStart).filter((a) => !a.time);
    const subjectless = !args.some((a) => a.cases.has('NOM'));
    // the antecedent: the noun before the comma, or (clause without subject) the head of the noun phrase chain ('Ein Buch von X, dass')
    const noun = isNeuterAntecedentNoun(tokens, i - 2) ? tokens[i - 2] : (subjectless ? chainHead(tokens, i - 2) : null);
    if (noun === null) return null;
    const dassNoun = isDassNounNeuter(noun);
    if (subjectless) {
      // no subject: the relative pronoun is missing ('Ein Gutachten, dass im Auftrag erstellt wurde')
      const cluster = tokens.slice(vf.clusterStart, vf.last + 1);
      const lemmasOfCluster = new Set(cluster.flatMap((x) => [...verbLemmas(x)]));
      const copulaOrPassive = [...lemmasOfCluster].some((l) => l === 'sein' || l === 'werden' || l === 'bleiben');
      if (dassNoun && copulaOrPassive) return null; // 'das Problem, dass mir kalt ist', 'das Risiko, dass gestreikt wird'
      if (copulaOrPassive && nounIsObjectOfVerb(tokens, i - 2)) return null; // 'Das bedeutet für das Unternehmen, dass investiert wird'
    } else {
      // one argument only, inside the main clause ('Das Formular, dass Sie benötigen, finden Sie ...')
      if (dassNoun || !isComma(tokens[e])) return null;
      const after = tokens[e + 1];
      if (after === undefined || !isVerb(after) || !isLowerCase(after)) return null;
      let d = i - 3;
      while (d > 0 && hasTag(tokens[d], /^(ADJ|PA1|PA2)/) && isLowerCase(tokens[d])) d--;
      if (noun !== tokens[i - 2]) return null;
      if (!hasTag(noun, /^EIG/) && (d <= 0 || !hasTag(tokens[d], /^(ART|PRO:(POS|DEM|IND)):.*SIN:NEU/))) return null;
      if (coreArgumentCount(tokens, s, vf.clusterStart) > 1) return null;
    }
    if (noun !== tokens[i - 2] && nounIsObjectOfVerb(tokens, tokens.indexOf(noun))) return null;
    return this.relativeMatch(sentence, t, noun);
  }

  // dass (token t) -> das, relative to noun
  relativeMatch(sentence, t, noun) {
    const m = new RuleMatch(this, sentence, t.getStartPos(), t.getEndPos(),
      `Meinten Sie das Relativpronomen 'das'? Der Nebensatz bezieht sich vermutlich auf '${noun.getToken()}'; 'dass' ist eine Konjunktion.`,
      "Relativpronomen 'das'");
    m.setSuggestedReplacement(dasFor(t));
    return m;
  }
}

// verbs that need an accusative object in the active voice ('dass er gemalt hatte' lacks one: 'das er gemalt hatte')
const OBJECT_VERBS = new Set([
  'betreffen', 'verwenden', 'benutzen', 'nutzen', 'überraschen', 'besitzen', 'enthalten', 'benötigen', 'brauchen', 'kaufen',
  'kennen', 'erhalten', 'bekommen', 'bauen', 'herstellen', 'entwickeln', 'erfinden', 'bestellen', 'mieten', 'buchen', 'reparieren',
  'malen', 'zeichnen', 'beschreiben', 'gebrauchen', 'gestalten', 'organisieren', 'verfassen', 'übersetzen', 'veröffentlichen',
  'produzieren', 'verursachen', 'auslösen', 'beeinflussen', 'prägen', 'erschaffen', 'bevorzugen', 'erwerben', 'betreiben',
  'beinhalten', 'umfassen', 'lieben', 'hassen', 'genießen', 'besuchen', 'bewohnen', 'komponieren', 'anschauen', 'ansehen',
  'besichtigen', 'fotografieren', 'aufbauen', 'einrichten', 'renovieren', 'ausprobieren', 'testen', 'empfangen', 'machen',
]);
// verbs with a dative and an accusative object: a personal pronoun there is the dative ('dass uns eine Freundin empfohlen hatte')
const DATIVE_OBJECT_VERBS = new Set([
  'geben', 'schenken', 'empfehlen', 'weiterempfehlen', 'anbieten', 'liefern', 'schicken', 'senden', 'leihen', 'verkaufen',
  'mitbringen', 'überlassen', 'vererben', 'vermieten', 'verschenken', 'beibringen', 'schulden',
]);
const OBJECT_CLAUSE_WORDS = new Set(['dass', 'ob', 'wie', 'was', 'wer', 'wo', 'warum', 'wann', 'wieso', 'weshalb', 'welche', 'welcher', 'welches', 'wohin', 'woher']);

// the verb-final clause after 'dass' at i lacks the accusative object of its verb and has exactly one subject candidate
function objectGap(tokens, clause) {
  const { s, e, vf } = clause;
  const cluster = tokens.slice(vf.clusterStart, vf.last + 1);
  const all = new Set(cluster.flatMap((x) => [...verbLemmas(x)]));
  if ((all.has('werden') || all.has('sein') || all.has('bleiben')) && cluster.some((x) => hasTag(x, /^VER:PA2/))) return false; // passive, sein-perfect
  for (let j = s; j < vf.clusterStart; j++) {
    if (lower(tokens[j]) === 'es' && all.has('geben')) return false; // 'dass es ... gegeben hat': existential
    if (lower(tokens[j]) === 'bis' && j > s && (hasTag(tokens[j - 1], /^ZAL/) || /^\d/.test(tokens[j - 1].getToken()))) return false; // '1.000 bis 2.300 Infizierte' is no PP
  }
  const main = new Set(cluster.flatMap((x) => [...lemmas(x, /^VER:(?!AUX|MOD)/)]));
  const dative = [...main].some((l) => DATIVE_OBJECT_VERBS.has(l));
  if (!dative && ![...main].some((l) => OBJECT_VERBS.has(l))) return false;
  if (e < tokens.length && (tokens[e].getToken() === ':' || (isComma(tokens[e]) && objectClauseFollows(tokens, e + 1)))) return false;
  let count = 0;
  let nominative = false;
  for (const a of coreArguments(tokens, s, vf.clusterStart)) {
    if (a.time || !(a.cases.has('NOM') || a.cases.has('AKK'))) continue;
    if (dative && a.dativePronoun) continue;
    count++;
    if (a.cases.has('NOM')) nominative = true;
  }
  return count === 1 && nominative;
}

// the verb-final clause has no subject candidate (or only plural nouns), an active verb that agrees with 'das' (3rd person singular only)
// and some other word ('ein Museum errichtet, dass bis 1948 bestand', 'das Crescendo, dass seine Briefe kennzeichnet')
function subjectGap(tokens, clause) {
  const { s, vf } = clause;
  if (vf.clusterStart === s) return false;
  if (coreArguments(tokens, s, vf.clusterStart).some((a) => !a.time && a.cases.has('NOM') && !a.pluralNoun)) return false;
  if (hasTag(tokens[vf.last], /^VER:(AUX:|MOD:)?[13]:PLU/)) return false; // 2nd person plural: no noun subject
  for (let j = s; j < vf.clusterStart; j++) if (lower(tokens[j]) === 'es' || hasTag(tokens[j], /^PRO:(PER|IND|DEM):NOM/) || (isUnknown(tokens[j]) && !/^\d/.test(tokens[j].getToken()))) return false;
  const cluster = tokens.slice(vf.clusterStart, vf.last + 1);
  if (cluster.some((x) => [...verbLemmas(x)].some((l) => l === 'sein' || l === 'werden' || l === 'bleiben'))) return false;
  return hasTag(tokens[vf.last], /^VER:(AUX:|MOD:)?3:SIN/);
}

// an object clause or zu-infinitive starts at index j ('dass er empfohlen hat, die Tür zu schließen')
function objectClauseFollows(tokens, j) {
  if (j >= tokens.length) return false;
  if (OBJECT_CLAUSE_WORDS.has(lower(tokens[j]))) return true;
  const e = clauseEnd(tokens, j);
  for (let x = j; x < e; x++) if (hasTag(tokens[x], /^VER:EIZ/) || (lower(tokens[x]) === 'zu' && x + 1 < e && hasTag(tokens[x + 1], /^VER:INF/))) return true;
  return false;
}

// the antecedent of 'dass' at i if the clause lacks its object: the neuter noun before the comma (or head of its chain),
// or a neuter noun of the main clause before a final verb or particle ('brachte ein Bild mit, dass er gemalt hatte')
function objectGapAntecedent(tokens, i) {
  const clause = verbFinalClause(tokens, i, false);
  if (clause === null) return null;
  const k = i - 1;
  const last = tokens[k - 1];
  const nounBefore = hasTag(last, /^(SUB|EIG)/) && isUpperCase(last);
  const og = objectGap(tokens, clause);
  if (!og && !subjectGap(tokens, clause)) return null;
  if (nounBefore) return isNeuterAntecedentNoun(tokens, k - 1) ? last : chainHead(tokens, k - 1);
  if (!isLowerCase(last) || !(isVerb(last) || hasTag(last, /^(ZUS|PRP)/)) || findDassVerb(tokens, k) !== null) return null; // PRP before a comma: a particle
  if ([...lemmas(last, /^(ADJ|PA2)/), lower(last)].some((l) => DASS_ADJECTIVES.has(l))) return null; // 'bekannt, dass'
  const cs = clauseStart(tokens, k);
  let found = null;
  for (let x = cs; x < k - 1; x++) {
    const w = lower(tokens[x]);
    if (w === 'es' || w === 'so' || DA_CORRELATES.has(w)) return null;
    if (hasTag(tokens[x], /^(SUB|EIG)/) && isUpperCase(tokens[x]) && isNeuterAntecedentNoun(tokens, x) && (og || !isDassNounNeuter(tokens[x]))) {
      found = tokens[x]; // the nearest one; a missing subject alone does not override a noun with a dass clause ('ein Szenario zugrunde liegt, dass')
    }
  }
  return found;
}

const NEUTER_ONLY_DETERMINERS = new Set(['das', 'dieses', 'jenes', 'jedes', 'manches', 'welches']);

// a neuter singular noun; nouns that are also masculine/feminine ('Jiddische') need a neuter-only determiner
function isNeuterAntecedentNoun(tokens, n) {
  const noun = tokens[n];
  if (!hasTag(noun, /^(SUB|EIG):[A-Z]+:SIN:NEU/) || !isUpperCase(noun)) return false;
  if (!hasTag(noun, /^(SUB|EIG):[A-Z]+:[A-Z]+:(MAS|FEM)/)) return true;
  let d = n - 1;
  while (d > 0 && hasTag(tokens[d], /^(ADJ|PA1|PA2)/) && isLowerCase(tokens[d])) d--;
  return d > 0 && NEUTER_ONLY_DETERMINERS.has(tokens[d].getToken().toLowerCase());
}

// first noun of the noun phrase chain ending at index n if it is neuter and the rest are attributes ('ein Gremium der Zusammenarbeit')
function chainHead(tokens, n) {
  let j = n;
  while (j > 1 && NP_CHAIN(tokens[j - 1]) && !['und', 'oder', 'sowie', 'wie', 'als'].includes(tokens[j - 1].getToken())
    && !hasTag(tokens[j - 1], /^(ADV|NEG)/)) j--;
  for (let x = j; x < n; x++) {
    if (hasTag(tokens[x], /^(SUB|EIG)/) && isUpperCase(tokens[x])) {
      if (!isNeuterAntecedentNoun(tokens, x)) return null;
      // the nouns after the head must be attributes: in a prepositional phrase or genitive
      const between = tokens.slice(x + 1, n);
      return between.some((t) => hasTag(t, /^PRP/) || hasTag(t, /^(ART|PRO:POS):GEN/)) ? tokens[x] : null;
    }
  }
  return null;
}

// the noun at index n is a dative or prepositional object after a verb of its segment ('Das bedeutet für das Unternehmen,')
function nounIsObjectOfVerb(tokens, n) {
  let j = n - 1;
  while (j > 0 && hasTag(tokens[j], /^(ADJ|PA1|PA2)/) && isLowerCase(tokens[j]) && !hasTag(tokens[j], /^VER/)) j--;
  const det = tokens[j];
  const inPP = hasTag(det, /^PRP/) || (j > 0 && hasTag(tokens[j - 1], /^PRP/) && isLowerCase(tokens[j - 1]));
  const dative = hasTag(det, /^(ART|PRO:(POS|DEM|IND)):DAT/) && !hasTag(det, /^(ART|PRO:(POS|DEM|IND)):(NOM|AKK)/);
  if (!inPP && !dative) return false;
  for (let x = j - 1; x > 0 && !isComma(tokens[x]); x--) if (hasTag(tokens[x], /^VER/)) return true;
  return false;
}

// verb-final clause after index i (one retry across und/oder/sondern, one embedded relative clause and a comparison after
// the verb are skipped), without further checks; tokens of the result: the sentence without the embedded clause
function verbFinalClause(tokens, i, embedded = true) {
  const s = i + 1;
  let e = clauseEnd(tokens, s);
  let vf = verbFinal(tokens, s, e);
  if (vf === null && e < tokens.length && COORDINATION.has(tokens[e].getToken())) {
    e = clauseEnd(tokens, e + 1);
    vf = verbFinal(tokens, s, e);
  }
  if (vf !== null || !embedded) return vf === null ? null : { s, e, vf, tokens };
  for (let j = s + 2; j < e; j++) { // 'dass ... kürzere Strecken gebraucht werden als bei Rückenwind'
    const w = tokens[j].getToken();
    if (w !== 'als' && w !== 'wie') continue;
    const k = w === 'wie' && j - 1 >= s + 2 && tokens[j - 1].getToken() === 'so' ? j - 1 : j; // 'dass es gut ist so wie es ist'
    if ((vf = verbFinal(tokens, s, k)) !== null) return { s, e: k, vf, tokens };
  }
  const e2 = embeddedClauseEnd(tokens, s, e);
  if (e2 < 0 || embeddedClauseEnd(tokens, s, e2) >= 0 || startsRelative(tokens, e2 + 1)) return null; // 'welches ..., unter denen ...'
  const view = [...tokens.slice(0, e), ...tokens.slice(e2 + 1)];
  e = clauseEnd(view, e);
  vf = verbFinal(view, s, e);
  return vf === null ? null : { s, e, vf, tokens: view };
}

const RELATIVE_WORDS = new Set(['der', 'die', 'das', 'dem', 'den', 'deren', 'dessen', 'denen', 'welcher', 'welche', 'welches', 'welchem', 'welchen', 'wo', 'wie']);

// a relative clause starts at r ('die', 'mit der')
function startsRelative(tokens, r) {
  if (r < tokens.length && hasTag(tokens[r], /^PRP/) && isLowerCase(tokens[r])) r++;
  return r < tokens.length && RELATIVE_WORDS.has(tokens[r].getToken());
}

// index of the comma that closes a verb-final relative (or 'wie') clause after the comma at e ('dass Augusta, mit der sie ... hatte, einen Groll hegte'), else -1
function embeddedClauseEnd(tokens, s, e) {
  if (e <= s || !isComma(tokens[e]) || e + 2 >= tokens.length) return -1;
  if (!startsRelative(tokens, e + 1)) return -1;
  const r = hasTag(tokens[e + 1], /^PRP/) && isLowerCase(tokens[e + 1]) ? e + 2 : e + 1;
  const e2 = clauseEnd(tokens, r + 1);
  if (e2 - r > 15 || !isComma(tokens[e2]) || verbFinal(tokens, r + 1, e2) === null) return -1;
  return e2;
}

// Java: none (LTJS). 'Er machte klar, das er bleibt.' -> dass: ', das' + verb-final clause with its own subject and no neuter word before
export class LtjsDasDassCommaRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Vor der Abreise erfuhr er, <marker>das</marker> der Zug ausfällt.'),
      Example.fixed('Vor der Abreise erfuhr er, <marker>dass</marker> der Zug ausfällt.'));
  }

  getId() {
    return 'LTJS_DAS_DASS_KOMMA';
  }

  getDescription() {
    return "'das' statt 'dass' nach Komma ohne sächliches Bezugswort";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || !isComma(tokens[i - 1]) || i < 3) return null;
    for (let j = 1; j < i - 1; j++) if (possibleNeuterWord(tokens, j)) return null;
    if (dassClause(tokens, i) === null) return null;
    return this.dassMatch(sentence, tokens[i],
      "Meinten Sie die Konjunktion 'dass'? Der Nebensatz hat ein eigenes Subjekt und das Verb am Ende, und davor steht kein sächliches Bezugswort für ein Relativpronomen 'das'.");
  }
}

// a word that could be (part of) a neuter antecedent: neuter singular noun or name, unknown word, pronoun like 'etwas', abbreviation, number
function possibleNeuterWord(tokens, j) {
  const t = tokens[j];
  if (hasTag(t, /^(SUB|EIG):[A-Z]+:SIN:(NEU|NOG)/) || hasTag(t, /^(ABK|ZAL)/) || NEUTER_WORDS.has(lower(t))) return !(j === 1 && isImperativeInitial(tokens, 1));
  if (hasTag(t, /^PRO:(DEM|IND):[A-Z]+:SIN:NEU/) && !(j + 1 < tokens.length && (hasTag(tokens[j + 1], /^(SUB|EIG|ADJ|PA1|PA2)/) || isUpperCase(tokens[j + 1])))) return true; // 'hinter dem, das'
  if (!/^[\p{L}]/u.test(t.getToken())) return /\d/.test(t.getToken()) || ['"', '„', '“', '»', '«', '(', ')', '‚', '‘', '’', ':', ';', '/', '–', '-'].includes(t.getToken());
  return isUnknown(t) || (isUpperCase(t) && j > 1 && !hasTag(t, /^(SUB|EIG)/));
}
const NEUTER_WORDS = new Set(['was', 'etwas', 'nichts', 'alles', 'vieles', 'einiges', 'manches', 'weniges', 'dasjenige', 'dasselbe', 'jenes',
  'welches', 'eines', 'keines', 'beides', 'folgendes', 'anderes', 'mehreres', 'dies', 'dieses', 'das', 'jedes', 'sowas', 'solches']);

const OHNE = new Set(['ohne', 'statt', 'anstatt']);

// Java: none (LTJS). '... erhalten ohne das zusätzliche Kosten entstehen' -> ohne dass
export class LtjsOhneDassRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Er verließ den Raum, ohne <marker>das</marker> jemand etwas merkte.'),
      Example.fixed('Er verließ den Raum, ohne <marker>dass</marker> jemand etwas merkte.'));
  }

  getId() {
    return 'LTJS_OHNE_DASS';
  }

  getDescription() {
    return "'ohne das', '(an)statt das' statt 'ohne dass', '(an)statt dass'";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || i < 3 || !OHNE.has(tokens[i - 1].getToken())) return null;
    // ', ohne das' may start a relative clause ('ein Werkzeug, ohne das man nicht arbeiten kann'); without the comma Java's
    // COMMA_IN_FRONT_RELATIVE_CLAUSE flags 'erhalten ohne das' and an overlapping match here would replace its comma suggestion
    if (!isComma(tokens[i - 2]) || hasNeuterAntecedentBefore(tokens, i - 2)) return null;
    if (dassClause(tokens, i) === null) return null;
    return this.dassMatch(sentence, tokens[i],
      `Meinten Sie die Konjunktion '${tokens[i - 1].getToken()} dass'? Hier folgt ein Nebensatz mit eigenem Subjekt und Verb am Ende.`);
  }
}

// Java: none (LTJS). ', dass verhindert eine körnige Konsistenz', 'Ist dass für Sie in Ordnung?' -> das
export class LtjsDassStattDasRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ist <marker>dass</marker> für Sie in Ordnung?'),
      Example.fixed('Ist <marker>das</marker> für Sie in Ordnung?'));
  }

  getId() {
    return 'LTJS_DASS_STATT_DAS';
  }

  getDescription() {
    return "'dass' statt Artikel oder Pronomen 'das'";
  }

  matchAt(sentence, tokens, i) {
    const t = tokens[i];
    if (t.getToken() !== 'dass' || i + 1 >= tokens.length || verbFinalClause(tokens, i) !== null) return null;
    const s = i + 1;
    const e = clauseEnd(tokens, s);
    const next = tokens[s];
    let msg = null;
    // not attributive ('dass bestimmte Kompetenzen', 'dass bestimmte medizinische Wirkstoffe nicht gelangen können')
    if (isMainClauseVerb(next) && e > s + 1 && !isUpperCase(tokens[s + 1]) && !hasTag(tokens[s + 1], /^(SUB|EIG|ADJ|PA1|PA2)/) && !isFiniteVerb(tokens[e - 1])) {
      msg = "Meinten Sie das Pronomen 'das'? Auf 'dass' folgt hier direkt ein konjugiertes Verb; ein Nebensatz mit 'dass' hat das Verb am Ende.";
    } else if (hasTag(next, /^SUB:[A-Z]+:SIN:NEU/) && isUpperCase(next) && s + 1 < e && isMainClauseVerb(tokens[s + 1]) && e > s + 2) {
      msg = `Meinten Sie den Artikel 'das'? '${next.getToken()}' ist hier das Subjekt eines Hauptsatzes.`;
    } else if (i > 1 && e >= s + 2 && e < tokens.length && hasTag(tokens[e], /^SENT_END$/) && ['.', '?', '!'].includes(tokens[e].getToken())) {
      for (let j = s; j < e; j++) { // only known words, none of them can be a verb (unknown words may be verbs: 'giebt', 'gerathe')
        const w = tokens[j];
        if (!/^[\p{L}\d]/u.test(w.getToken()) || isUnknown(w) || (isVerb(w) && !hasTag(w, /^(ADV|ADJ|PRP|ZUS|SUB|KON|ART|PRO)/))) return null;
      }
      msg = "Meinten Sie das Pronomen 'das'? Der Satzteil nach 'dass' hat kein Verb; ein Nebensatz mit 'dass' braucht eines.";
    }
    if (msg === null) return null;
    const m = new RuleMatch(this, sentence, t.getStartPos(), t.getEndPos(), msg, "Artikel/Pronomen 'das'");
    m.setSuggestedReplacement(dasFor(t));
    return m;
  }
}

// Java: none (LTJS). 'Ich glaube das es geht.' -> 'glaube, dass': dass verb + 'das' + verb-final clause with its own subject, comma and dass both missing
export class LtjsDasDassOhneKommaRule extends LtjsDasDassRule {
  constructor(messages, language) {
    super(messages, language);
    this.addExamplePair(Example.wrong('Ich <marker>glaube das</marker> es morgen regnet.'),
      Example.fixed('Ich <marker>glaube, dass</marker> es morgen regnet.'));
  }

  getId() {
    return 'LTJS_DAS_DASS_OHNE_KOMMA';
  }

  getDescription() {
    return "Fehlendes Komma und 'das' statt 'dass' nach Verben des Sagens und Denkens";
  }

  matchAt(sentence, tokens, i) {
    if (!isDas(tokens[i]) || i < 2 || !isLowerCase(tokens[i])) return null;
    // the dass verb directly before 'das' (one personal pronoun may stand between: 'sagt er das', 'glaubst du das')
    let v = i - 1;
    if (hasTag(tokens[v], /^PRO:(PER|REF)/) && isLowerCase(tokens[v]) && !isMainClauseVerb(tokens[v]) && v > 1) v--;
    const verb = tokens[v];
    if (!(isMainClauseVerb(verb) || (v === 1 && isFiniteVerb(verb) && !hasTag(verb, /^(ART|PRO|ADJ|ADV|SUB|PRP|KON|ZAL)/))) || !isStrictFiniteVerb(verb) || [...verbLemmas(verb)].every((l) => !PLAIN_DASS_VERBS.has(l))) return null;
    // the first word of the clause is a nominative personal pronoun: no article/relative reading of 'das' is possible
    const next = tokens[i + 1];
    if (next === undefined || !isLowerCase(next) || !hasTag(next, /^PRO:PER:NOM/) || NOT_SUBJECT.has(lower(next))) return null;
    const clause = dassClause(tokens, i);
    if (clause === null) return null;
    const m = new RuleMatch(this, sentence, tokens[i - 1].getStartPos(), tokens[i].getEndPos(),
      `Hier scheint ein Komma zu fehlen, und vermutlich ist die Konjunktion 'dass' gemeint: Nach '${verb.getToken()}' folgt hier ein Nebensatz mit eigenem Subjekt und dem Verb am Ende.`, "Komma und Konjunktion 'dass'");
    m.setSuggestedReplacement(`${tokens[i - 1].getToken()}, dass`);
    return m;
  }
}

// verbs of saying and thinking whose object is normally a dass clause, never a noun phrase 'das' (a plain 'das' object is common for the others)
const PLAIN_DASS_VERBS = new Set(['sagen', 'meinen', 'glauben', 'denken', 'hoffen', 'wissen', 'befürchten', 'fürchten', 'vermuten', 'behaupten',
  'annehmen', 'erzählen', 'berichten', 'versprechen', 'bezweifeln', 'merken', 'bemerken', 'feststellen', 'erkennen', 'betonen', 'versichern',
  'beteuern', 'schwören', 'wünschen', 'ahnen', 'spüren', 'fühlen', 'erwarten', 'verlangen', 'mitteilen', 'hören', 'sehen']);
const NOT_SUBJECT = new Set(['mich', 'dich', 'ihn', 'uns', 'euch', 'ihnen', 'ihm', 'mir', 'dir']);

// a lowercase finite verb that is no article, pronoun, adjective, adverb, noun, preposition, conjunction or number
function isMainClauseVerb(t) {
  return isFiniteVerb(t) && isLowerCase(t) && !hasTag(t, /^(ART|PRO|ADJ|ADV|SUB|PRP|KON|ZAL)/);
}

// rule ids of the LTJS das/dass rules for German
export const LTJS_DAS_DASS_RULE_IDS = Object.freeze([
  'LTJS_DAS_DAS', 'LTJS_DAS_DASS_VERB', 'LTJS_DAS_DASS_NOMEN', 'LTJS_DAS_DASS_ADJ', 'LTJS_SO_ADJ_DASS', 'LTJS_SODASS',
  'LTJS_DASS_SATZANFANG', 'LTJS_DASS_RELATIVPRONOMEN', 'LTJS_DAS_DASS_KOMMA', 'LTJS_OHNE_DASS', 'LTJS_DASS_STATT_DAS', 'LTJS_DAS_DASS_OHNE_KOMMA',
]);

// the LTJS das/dass rules for German
export function getLtjsGermanDasDassRules(messages, language) {
  return [ // equal matches of two rules: the later rule wins (CleanOverlappingFilter), so the generic rules come first
    new LtjsDasDassCommaRule(messages, language),
    new LtjsDasDasRule(messages, language),
    new LtjsDasDassVerbRule(messages, language),
    new LtjsDasDassNounRule(messages, language),
    new LtjsDasDassAdjectiveRule(messages, language),
    new LtjsSoAdjDassRule(messages, language),
    new LtjsSodassRule(messages, language),
    new LtjsDassSentenceStartRule(messages, language),
    new LtjsDassRelativeRule(messages, language),
    new LtjsOhneDassRule(messages, language),
    new LtjsDassStattDasRule(messages, language),
    new LtjsDasDassOhneKommaRule(messages, language),
  ];
}

