// org.languagetool.rules.de.GermanCompoundRule
import { AbstractCompoundRule } from '../../../core/rules/AbstractCompoundRule.js';
import { CompoundRuleData } from '../../../core/rules/CompoundRuleData.js';
import { Rule } from '../../../core/rules/model/Rule.js';
import { Categories } from '../../../core/rules/model/Category.js';
import { Example } from '../../../core/rules/model/Examples.js';
import { PatternTokenBuilder } from '../../../core/patterns/PatternTokenBuilder.js';
import { token, tokenRegex } from '../../../core/patterns/PatternRuleBuilderHelper.js';
import '../../../core/disambiguation/DisambiguationPatternRule.js';
import { GermanyGerman } from '../language/GermanyGerman.js';

let compoundData = null; // Java: static volatile compoundData
let antiPatterns = null; // Java: static ANTI_PATTERNS (built at class load, here on first use)

// Java: GermanCompoundRule#ANTI_PATTERNS
function antiPatternsOf() {
  if (antiPatterns === null) {
    antiPatterns = Rule.makeAntiPatterns([
      [ // "Die Bürger konnten an die 900 Meter Kabel in Eigenregie verlegen."
        tokenRegex('an|um'),
        token('die'),
        tokenRegex('\\d+'),
      ],
      [ // "Lohnt sich die Werbung vom ausgegebenen Euro aus gedacht?"
        new PatternTokenBuilder().tokenRegex('von|vom').setSkip(5).build(),
        token('aus'),
        token('gedacht'),
      ],
      [ // "Die Bürger konnten an die 900 Meter Kabel in Eigenregie verlegen."
        tokenRegex('rund|etwa|zirka|cirka|ungefähr|annähernd|grob|wohl|gegen|schätzungsweise'),
        tokenRegex('\\d+'),
      ],
      [ // "Die Bürger konnten ca. 900 Meter Kabel in Eigenregie verlegen."
        token('ca'),
        token('.'),
        tokenRegex('\\d+'),
      ],
      [ // Eigenname
        token('Kung'),
        token('Fu'),
        tokenRegex('Panda|Fighting'),
      ],
      [ // Eigenname
        token('Harlem'),
        token('Gospel'),
        token('Singers'),
      ],
      [ // Englisch
        token('Always'),
        token('on'),
        tokenRegex('my|your|the|an?|their'),
      ],
      [ // sich selbst gerecht werden
        tokenRegex('sich|uns|ihm|ihr|mir|euch'),
        token('selbst'),
        tokenRegex('gerecht.*'),
      ],
    ], GermanyGerman.getInstance());
  }
  return antiPatterns;
}

// Java: GermanCompoundRule
export class GermanCompoundRule extends AbstractCompoundRule {
  static FQCN = 'org.languagetool.rules.de.GermanCompoundRule';

  // Java: GermanCompoundRule(ResourceBundle,Language,UserConfig)
  constructor(messages, lang, userConfig) {
    super(messages, lang, userConfig,
      'Dieses Wort wird mit Bindestrich geschrieben.',
      'Dieses Wort wird zusammengeschrieben.',
      'Diese Wörter werden zusammengeschrieben oder mit Bindestrich getrennt.',
      'Zusammenschreibung von Wörtern');
    super.setCategory(Categories.COMPOUNDING.getCategory(messages));
    this.addExamplePair(Example.wrong('Wenn es schlimmer wird, solltest Du zum <marker>HNO Arzt</marker> gehen.'),
      Example.fixed('Wenn es schlimmer wird, solltest Du zum <marker>HNO-Arzt</marker> gehen.'));
  }

  // Java: GermanCompoundRule#getId()
  getId() {
    return 'DE_COMPOUNDS';
  }

  // Java: GermanCompoundRule#getDescription()
  getDescription() {
    return "Zusammenschreibung von Wörtern, z. B. 'CD-ROM' statt 'CD ROM'";
  }

  // Java: GermanCompoundRule#getCompoundRuleData()
  getCompoundRuleData() {
    if (compoundData === null) {
      compoundData = new CompoundRuleData('/de/compounds.txt', '/de/compound-cities.txt');
    }
    return compoundData;
  }

  // Java: GermanCompoundRule#isMisspelled(String)
  isMisspelled(word) {
    return GermanyGerman.getInstance().getDefaultSpellingRule().isMisspelled(word);
  }

  // Java: GermanCompoundRule#getAntiPatterns()
  getAntiPatterns() {
    return antiPatternsOf();
  }
}
