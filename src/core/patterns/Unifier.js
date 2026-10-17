// org.languagetool.rules.patterns.Unifier (unification of features over tokens)
import { JavaHashMap } from '../../lib/java/collections/JavaHashMap.js';
import { JavaHashSet } from '../../lib/java/collections/JavaHashSet.js';
import { IllegalStateException, NullPointerException, RuntimeException } from '../../lib/java/errors.js';
import { listGet, listSet } from '../../lib/java/arrays.js';
import { AnalyzedTokenReadings } from '../AnalyzedTokenReadings.js';
import { EquivalenceTypeLocator } from './EquivalenceTypeLocator.js';

const UNIFY_IGNORE = 'unify-ignore';

// Java: Map#entrySet() iteration; maps are JavaHashMap/JavaConcurrentHashMap or a JS Map (LinkedHashMap, insertion order)
function entriesOf(map) {
  if (map === null || map === undefined) throw new NullPointerException();
  return map instanceof Map ? [...map] : map.entrySet();
}

// Java: Map#size()
function sizeOf(map) {
  if (map === null || map === undefined) throw new NullPointerException();
  return map instanceof Map ? map.size : map.size();
}

// Java: PatternToken method call on a possibly null map value
function nonNull(o) {
  if (o === null || o === undefined) throw new NullPointerException();
  return o;
}

// Java: Unifier
export class Unifier {
  static FQCN = 'org.languagetool.rules.patterns.Unifier';

  /**
   * Instantiates the unifier.
   */
  // Java: Unifier(Map,Map)
  constructor(equivalenceTypes, equivalenceFeatures) {
    this.tokSequence = [];
    /**
     * List of all equivalences matched per tokens in the sequence, kept exactly
     * in sync with the list in tokSequence.
     */
    this.tokSequenceEquivalences = [];
    this.equivalencesMatched = [];
    this.allFeatsIn = false;
    this.featuresFound = [];
    this.tmpFeaturesFound = [];
    this.equivalencesToBeKept = new JavaHashMap();
    this.unificationFeats = null;
    this.inUnification = false;
    this.uniMatched = false;
    this.uniAllMatched = false;
    this.tokCnt = 0;
    this.readingsCounter = 1;
    this.equivalenceTypes = equivalenceTypes;
    this.equivalenceFeatures = equivalenceFeatures;
  }

  /**
   * Tests if a token has shared features with other tokens.
   */
  // Java: Unifier#isSatisfied(AnalyzedToken,Map)
  isSatisfied(aToken, uFeatures) {
    if (this.allFeatsIn && this.equivalencesMatched.length === 0) {
      return false;
    }
    if (uFeatures === null || uFeatures === undefined) {
      throw new RuntimeException('isSatisfied called without features being set');
    }
    this.unificationFeats = uFeatures;

    let unified = true;
    if (this.allFeatsIn) {
      unified = this.checkNext(aToken, uFeatures);
    } else {
      while (this.equivalencesMatched.length <= this.tokCnt) {
        this.equivalencesMatched.push(new JavaHashMap());
      }
      for (const [featKey, featValue] of entriesOf(uFeatures)) {
        let types = featValue;
        if (types === null || types === undefined || types.length === 0) {
          types = this.equivalenceFeatures.get(featKey);
        }
        if (types === null || types === undefined) {
          throw new IllegalStateException(`Unification feature '${featKey}' is not defined in this unifier. ` +
            'Check that the <unification> block for it exists in the rule file that defines the rule using it ' +
            'and that the rule is matched with the unifier of that file (grammar vs. disambiguation).');
        }
        for (const typeName of types) {
          const testElem = this.equivalenceTypes
            .get(new EquivalenceTypeLocator(featKey, typeName));
          if (testElem === null || testElem === undefined) {
            return false;
          }
          if (testElem.isMatched(aToken)) {
            listGet(this.equivalencesMatched, this.tokCnt).computeIfAbsent(featKey, () => new JavaHashSet()).add(typeName);
          }
        }
        unified = listGet(this.equivalencesMatched, this.tokCnt).containsKey(featKey);
        if (!unified) {
          this.equivalencesMatched.splice(this.tokCnt, 1);
          break;
        }
      }
      if (unified) {
        if (this.tokCnt === 0 || this.tokSequence.length === 0) {
          this.tokSequence.push(new AnalyzedTokenReadings(aToken, 0));
          const equivList = [];
          equivList.push(listGet(this.equivalencesMatched, this.tokCnt));
          this.tokSequenceEquivalences.push(equivList);
        } else {
          listGet(this.tokSequence, 0).addReading(aToken, '');
          listGet(this.tokSequenceEquivalences, 0).push(listGet(this.equivalencesMatched, this.tokCnt));
        }
        this.tokCnt++;
      }
    }
    return unified;
  }

  // Java: Unifier#checkNext(AnalyzedToken,Map)
  checkNext(aToken, uFeatures) {
    let anyFeatUnified = false;
    const tokenFeaturesFound = this.tmpFeaturesFound.slice();
    const equivalencesMatchedHere = new JavaHashMap();
    if (this.allFeatsIn) {
      for (let i = 0; i < this.tokCnt; i++) {
        let allFeatsUnified = true;
        for (const [featKey, featValue] of entriesOf(uFeatures)) {
          let featUnified = false;
          let types = featValue;
          if (types === null || types === undefined || types.length === 0) {
            types = this.equivalenceFeatures.get(featKey);
          }
          if (types === null || types === undefined) {
            throw new NullPointerException();
          }
          for (const typeName of types) {
            const set = listGet(this.equivalencesMatched, i).get(featKey);
            if (set !== null && set.contains(typeName)) {
              const testElem = this.equivalenceTypes.get(new EquivalenceTypeLocator(featKey, typeName));
              const matched = nonNull(testElem).isMatched(aToken);
              featUnified = featUnified || matched;
              // Stores equivalences to be kept
              if (matched) {
                this.equivalencesToBeKept.computeIfAbsent(featKey, () => new JavaHashSet()).add(typeName);
                equivalencesMatchedHere.computeIfAbsent(featKey, () => new JavaHashSet()).add(typeName);
              }
            }
          }
          allFeatsUnified &&= featUnified;
        }
        listSet(tokenFeaturesFound, i, listGet(tokenFeaturesFound, i) || allFeatsUnified);
        anyFeatUnified = anyFeatUnified || allFeatsUnified;
      }
      if (anyFeatUnified) {
        if (this.tokSequence.length === this.readingsCounter) {
          this.tokSequence.push(new AnalyzedTokenReadings(aToken, 0));
          const equivList = [];
          equivList.push(equivalencesMatchedHere);
          this.tokSequenceEquivalences.push(equivList);
        } else {
          if (this.readingsCounter < this.tokSequence.length) {
            listGet(this.tokSequence, this.readingsCounter).addReading(aToken, '');
            listGet(this.tokSequenceEquivalences, this.readingsCounter).push(equivalencesMatchedHere);
          } else {
            anyFeatUnified = false;
          }
        }
        this.tmpFeaturesFound = tokenFeaturesFound;
      }
    }
    return anyFeatUnified;
  }

  /**
   * Call after every complete token (AnalyzedTokenReadings) checked.
   */
  // Java: Unifier#startNextToken()
  startNextToken() {
    this.featuresFound = this.tmpFeaturesFound.slice();
    this.readingsCounter++;
    // Removes features
    for (let j = 0; j < this.tokSequence.length; j++) {
      for (let i = 0; i < listGet(this.tokSequenceEquivalences, j).length; i++) {
        for (const [featKey] of entriesOf(this.equivalenceFeatures)) {
          if (UNIFY_IGNORE !== featKey) {
            const eq = listGet(listGet(this.tokSequenceEquivalences, j), i);
            if (eq.containsKey(featKey)) {
              if (this.equivalencesToBeKept.containsKey(featKey)) {
                eq.get(featKey).retainAll(this.equivalencesToBeKept.get(featKey));
              } else {
                eq.remove(featKey);
              }
            } else {
              eq.remove(featKey);
            }
          }
        }
      }
    }
    this.equivalencesToBeKept.clear();
  }

  /**
   * Starts testing only those equivalences that were previously matched.
   */
  // Java: Unifier#startUnify()
  startUnify() {
    this.allFeatsIn = true;
    for (let i = 0; i < this.tokCnt; i++) {
      this.featuresFound.push(false);
    }
    this.tmpFeaturesFound = this.featuresFound.slice();
  }

  /**
   * Make sure that we really matched all the required features of the unification.
   */
  // Java: Unifier#getFinalUnificationValue(Map)
  getFinalUnificationValue(uFeatures) {
    let tokUnified = 0;
    for (let j = 0; j < this.tokSequence.length; j++) {
      let unifiedTokensFound = false; // assume that nothing has been found
      for (let i = 0; i < listGet(this.tokSequenceEquivalences, j).length; i++) {
        let featUnified = 0;
        const eq = listGet(listGet(this.tokSequenceEquivalences, j), i);
        if (eq.containsKey(UNIFY_IGNORE)) {
          if (i === 0) {
            tokUnified++;
          }
          unifiedTokensFound = true;
          continue;
        } else {
          for (const [featKey] of entriesOf(uFeatures)) {
            const set = eq.get(featKey);
            if (set !== null && set.isEmpty()) {
              featUnified = 0;
            } else {
              featUnified++;
            }
            if (featUnified === sizeOf(this.unificationFeats) && tokUnified <= j) {
              tokUnified++;
              unifiedTokensFound = true;
              break;
            }
          }
        }
      }
      if (!unifiedTokensFound) {
        return false;
      }
    }
    if (tokUnified === this.tokSequence.length) {
      return true;
    }
    return false;
  }

  /**
   * Resets after use of unification. Required.
   */
  // Java: Unifier#reset()
  reset() {
    this.equivalencesMatched.length = 0;
    this.allFeatsIn = false;
    this.tokCnt = 0;
    this.featuresFound.length = 0;
    this.tmpFeaturesFound.length = 0;
    this.tokSequence.length = 0;
    this.tokSequenceEquivalences.length = 0;
    this.readingsCounter = 1;
    this.uniMatched = false;
    this.uniAllMatched = false;
    this.inUnification = false;
  }

  /**
   * Gets a full sequence of filtered tokens, or null.
   */
  // Java: Unifier#getUnifiedTokens()
  getUnifiedTokens() {
    if (this.tokSequence.length === 0) {
      return null;
    }
    const uTokens = [];
    for (let j = 0; j < this.tokSequence.length; j++) {
      let unifiedTokensFound = false; // assume that nothing has been found
      for (let i = 0; i < listGet(this.tokSequenceEquivalences, j).length; i++) {
        let featUnified = 0;
        const eq = listGet(listGet(this.tokSequenceEquivalences, j), i);
        if (eq.containsKey(UNIFY_IGNORE)) {
          this.addTokenToSequence(uTokens, this.tokSequence[j].getAnalyzedToken(i), j);
          unifiedTokensFound = true;
        } else {
          for (const [featKey] of entriesOf(this.unificationFeats)) {
            const set = eq.get(featKey);
            if (set !== null && set.isEmpty()) {
              featUnified = 0;
            } else {
              featUnified++;
            }
            if (featUnified === sizeOf(this.unificationFeats)) {
              this.addTokenToSequence(uTokens, this.tokSequence[j].getAnalyzedToken(i), j);
              unifiedTokensFound = true;
            }
          }
        }
      }
      if (!unifiedTokensFound) {
        return null;
      }
    }
    return uTokens;
  }

  // Java: Unifier#addTokenToSequence(List,AnalyzedToken,int)
  addTokenToSequence(tokenSequence, token, pos) {
    if (tokenSequence.length <= pos || tokenSequence.length === 0) {
      const tmpATR = new AnalyzedTokenReadings(token, 0);
      tokenSequence.push(tmpATR);
    } else {
      listGet(tokenSequence, pos).addReading(token, '');
    }
  }

  /**
   * Tests if the token sequence is unified.
   */
  // Java: Unifier#isUnified(AnalyzedToken,Map,boolean,boolean) / (AnalyzedToken,Map,boolean)
  isUnified(matchToken, uFeatures, lastReading, isMatched = true) {
    if (this.inUnification) {
      if (isMatched) {
        this.uniMatched = this.isSatisfied(matchToken, uFeatures) || this.uniMatched; // |= evaluates isSatisfied
      }
      this.uniAllMatched = this.uniMatched;

      if (lastReading) {
        this.startNextToken();
        this.uniMatched = false;
      }
      return this.uniAllMatched && this.getFinalUnificationValue(uFeatures);
    } else {
      if (isMatched) {
        this.isSatisfied(matchToken, uFeatures);
      }
    }
    if (lastReading) {
      this.inUnification = true;
      this.uniMatched = false;
      this.startUnify();
    }
    return true;
  }

  /**
   * Used to add neutral elements (AnalyzedTokenReadings) to the unified sequence.
   */
  // Java: Unifier#addNeutralElement(AnalyzedTokenReadings)
  addNeutralElement(analyzedTokenReadings) {
    this.tokSequence.push(analyzedTokenReadings);
    const tokEquivs = [];
    const map = new JavaHashMap();
    map.put(UNIFY_IGNORE, new JavaHashSet());
    for (let i = 0; i < analyzedTokenReadings.getReadingsLength(); i++) {
      tokEquivs.push(map);
    }
    this.tokSequenceEquivalences.push(tokEquivs);
    this.readingsCounter++;
  }

  /**
   * Used for getting a unified sequence in case the simple test method isUnified was used; null when not in unification.
   */
  // Java: Unifier#getFinalUnified()
  getFinalUnified() {
    if (this.inUnification) {
      return this.getUnifiedTokens();
    }
    return null;
  }
}
