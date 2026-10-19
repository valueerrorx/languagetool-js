// Ported from ValidateFalseFriendsXmlTest (languagetool-core); XMLValidator checks well-formedness only (D-048).
import { describe, it } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { XMLValidator } from '../../../../src/core/resources/XMLValidator.js';

describe('ValidateFalseFriendsXmlTest', () => {
  // Java: ValidateFalseFriendsXmlTest#testFalseFriendsXML
  it('testFalseFriendsXML', () => {
    const validator = new XMLValidator();
    validator.validateWithDtd(JLanguageTool.getDataBroker().getRulesDir() + '/false-friends.xml',
      JLanguageTool.getDataBroker().getRulesDir() + '/false-friends.dtd', 'rules');
  });
});
