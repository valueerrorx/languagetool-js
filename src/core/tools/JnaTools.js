// Java: org.languagetool.tools.JnaTools
import { System } from '../../lib/java/System.js';

// Java: JnaTools
export class JnaTools {
  static FQCN = 'org.languagetool.tools.JnaTools';

  // Java: JnaTools#setBugWorkaroundProperty()
  static setBugWorkaroundProperty() {
    System.setProperty('jna.nosys', 'true');
  }
}
