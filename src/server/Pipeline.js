// Java: org.languagetool.server.Pipeline (JLanguageTool that can be frozen; getters return unmodifiable views)
import { JLanguageTool } from '../core/JLanguageTool.js';
import { RuntimeException, UnsupportedOperationException } from '../lib/java/errors.js';
import { unmodifiableList } from '../lib/java/collections/Collections.js';

// Java: Pipeline.IllegalPipelineMutationException
export class IllegalPipelineMutationException extends RuntimeException {
  static FQCN = 'org.languagetool.server.Pipeline$IllegalPipelineMutationException';

  // Java: IllegalPipelineMutationException#IllegalPipelineMutationException()
  constructor() {
    super('Pipeline is frozen; mutating shared JLanguageTool instance is forbidden.');
  }
}

const uoe = () => { throw new UnsupportedOperationException(); };
const SET_BLOCKED = new Set(['add', 'delete', 'clear']);
const MAP_BLOCKED = new Set(['put', 'remove', 'clear', 'putAll', 'putIfAbsent', 'set', 'delete', 'compute', 'computeIfAbsent', 'computeIfPresent', 'merge', 'replace', 'replaceAll']);

// JS: Collections#unmodifiableSet/unmodifiableMap over a JS Set or JavaHashMap (mutators throw UnsupportedOperationException)
function unmodifiableView(coll, blocked) {
  return new Proxy(coll, {
    get(target, prop) {
      if (blocked.has(prop)) return uoe;
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

export class Pipeline extends JLanguageTool {
  static FQCN = 'org.languagetool.server.Pipeline';
  static IllegalPipelineMutationException = IllegalPipelineMutationException;

  setup = false;

  // Java: Pipeline#setupFinished(): prevents any further changes after this method was called
  setupFinished() {
    this.setup = true;
  }

  // Java: Pipeline#preventModificationAfterSetup()
  preventModificationAfterSetup() {
    if (this.setup) {
      throw new IllegalPipelineMutationException();
    }
  }

  // Java: Pipeline#setCleanOverlappingMatches(boolean)
  setCleanOverlappingMatches(cleanOverlappingMatches) {
    this.preventModificationAfterSetup();
    super.setCleanOverlappingMatches(cleanOverlappingMatches);
  }

  // Java: Pipeline#setMaxErrorsPerWordRate(float)
  setMaxErrorsPerWordRate(maxErrorsPerWordRate) {
    this.preventModificationAfterSetup();
    super.setMaxErrorsPerWordRate(maxErrorsPerWordRate);
  }

  // Java: Pipeline#setOutput(PrintStream)
  setOutput(printStream) {
    this.preventModificationAfterSetup();
    super.setOutput(printStream);
  }

  // Java: Pipeline#loadPatternRules(String)
  loadPatternRules(filename) {
    this.preventModificationAfterSetup();
    return super.loadPatternRules(filename);
  }

  // Java: Pipeline#loadFalseFriendRules(String)
  loadFalseFriendRules(filename) {
    this.preventModificationAfterSetup();
    return super.loadFalseFriendRules(filename);
  }

  // Java: Pipeline#activateLanguageModelRules(File)
  activateLanguageModelRules(indexDir) {
    this.preventModificationAfterSetup();
    return super.activateLanguageModelRules(indexDir);
  }

  // Java: Pipeline#activateRemoteRules(File) / (List)
  activateRemoteRules(configsOrFile) {
    this.preventModificationAfterSetup();
    return super.activateRemoteRules(configsOrFile);
  }

  // Java: Pipeline#addMatchFilter(RuleMatchFilter)
  addMatchFilter(filter) {
    this.preventModificationAfterSetup();
    super.addMatchFilter(filter);
  }

  // Java: Pipeline#addRule(Rule)
  addRule(rule) {
    this.preventModificationAfterSetup();
    super.addRule(rule);
  }

  // Java: Pipeline#disableRule(String)
  disableRule(ruleId) {
    this.preventModificationAfterSetup();
    super.disableRule(ruleId);
  }

  // Java: Pipeline#disableRules(List)
  disableRules(ruleIds) {
    this.preventModificationAfterSetup();
    super.disableRules(ruleIds);
  }

  // Java: Pipeline#disableCategory(CategoryId)
  disableCategory(id) {
    this.preventModificationAfterSetup();
    super.disableCategory(id);
  }

  // Java: Pipeline#getDisabledRules()
  getDisabledRules() {
    return unmodifiableView(super.getDisabledRules(), SET_BLOCKED);
  }

  // Java: Pipeline#enableRule(String)
  enableRule(ruleId) {
    this.preventModificationAfterSetup();
    super.enableRule(ruleId);
  }

  // Java: Pipeline#enableRuleCategory(CategoryId)
  enableRuleCategory(id) {
    this.preventModificationAfterSetup();
    super.enableRuleCategory(id);
  }

  // Java: Pipeline#getUnknownWords()
  getUnknownWords() {
    return unmodifiableList(super.getUnknownWords());
  }

  // Java: Pipeline#getCategories()
  getCategories() {
    return unmodifiableView(super.getCategories(), MAP_BLOCKED);
  }

  // Java: Pipeline#getAllRules()
  getAllRules() {
    return unmodifiableList(super.getAllRules());
  }

  // Java: Pipeline#getAllActiveRules()
  getAllActiveRules() {
    return unmodifiableList(super.getAllActiveRules());
  }

  // Java: Pipeline#getAllActiveOfficeRules()
  getAllActiveOfficeRules() {
    return unmodifiableList(super.getAllActiveOfficeRules());
  }

  // Java: Pipeline#getPatternRulesByIdAndSubId(String,String)
  getPatternRulesByIdAndSubId(id, subId) {
    return unmodifiableList(super.getPatternRulesByIdAndSubId(id, subId));
  }

  // Java: Pipeline#setConfigValues(Map)
  setConfigValues(v) {
    this.preventModificationAfterSetup();
    super.setConfigValues(v);
  }
}
