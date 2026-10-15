// JS twin of harness op "i18n-buildinfo" (I18nOps#buildInfo).
import { VERSION, BUILD_DATE, GIT_SHORT_ID } from '../../src/core/LtBuildInfo.js';

// Java: I18nOps#buildInfo(JsonNode)
export function run() {
  return { version: VERSION, buildDate: BUILD_DATE, gitShortId: GIT_SHORT_ID };
}
