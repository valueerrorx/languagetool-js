// org.languagetool.rules.IsEnglishWordFilter
import { JavaError, RuntimeException } from '../../lib/java/errors.js';
import { Integer } from '../../lib/java/int.js';
import { javaSplit } from '../../lib/java/strings.js';
import { arrayGet, listGet } from '../../lib/java/arrays.js';
import { Languages } from '../Languages.js';
import { RuleFilter } from '../patterns/RuleFilter.js';

// Java: IsEnglishWordFilter (check that the words are English, alternatively verify that they have the desired postag)
export class IsEnglishWordFilter extends RuleFilter {
  static FQCN = 'org.languagetool.rules.IsEnglishWordFilter';

  // Java: IsEnglishWordFilter#IsEnglishWordFilter()
  constructor() {
    super();
    this.english = null;
    this.tagger = null;
    try {
      this.english = Languages.getLanguageForShortCode('en-US');
    } catch (e) {
      if ((e && e.notPorted === true) || e instanceof JavaError) throw e; // catch (Exception e): Errors and notPorted pass
    }
    if (this.english !== null) {
      this.tagger = this.english.createDefaultTagger();
    }
  }

  // Java: IsEnglishWordFilter#acceptRuleMatch(RuleMatch,Map,int,AnalyzedTokenReadings[],List)
  acceptRuleMatch(match, args, patternTokenPos, patternTokens, tokenPositions) {
    if (this.tagger === null) {
      return null;
    }
    const formPositions = javaSplit(this.getRequired('formPositions', args), ',');
    const forms = [];
    for (const formPosition of formPositions) {
      forms.push(arrayGet(patternTokens, this.getSkipCorrectedReference(tokenPositions, Integer.parseInt(formPosition))).getToken());
    }
    let isEnglish = true;
    const postagsStr = this.getOptional('postags', args);
    if (postagsStr !== null) {
      const postags = javaSplit(postagsStr, ',');
      if (postags.length !== forms.length) {
        throw new RuntimeException('The number of forms and postags has to be the same in disambiguation rule with '
          + 'filter IsEnglishWordFilter.');
      }
      for (let i = 0; i < postags.length; i++) {
        isEnglish = isEnglish && this.wordIsTaggedWith(forms[i], postags[i]);
      }
    } else {
      for (let i = 0; i < forms.length; i++) {
        isEnglish = isEnglish && this.wordIsTagged(forms[i]);
      }
    }
    return (isEnglish ? match : null);
  }

  // Java: IsEnglishWordFilter#wordIsTaggedWith(String,String) (private)
  wordIsTaggedWith(word, postag) {
    return listGet(this.tagger.tag([word]), 0).matchesPosTagRegex(postag);
  }

  // Java: IsEnglishWordFilter#wordIsTagged(String) (private)
  wordIsTagged(word) {
    return listGet(this.tagger.tag([word]), 0).isTagged();
  }
}
