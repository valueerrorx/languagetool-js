// Build info (version, build date, short git id) read from /git.properties via the data broker (D-023: port build metadata).
import { JavaEnum } from '../lib/java/JavaEnum.js';
import { DateTimeParseException, NullPointerException } from '../lib/java/errors.js';
import { loadProperties, decodeLatin1 } from '../lib/java/Properties.js';
import { getDataBroker } from './resources/LtStatics.js';

// Java: OffsetDateTime.parse(text, ofPattern("yyyy-MM-dd'T'HH:mm:ssXX")).format(ofPattern("yyyy-MM-dd HH:mm:ss Z"))
function reformatBuildTime(text) {
  if (text === null || text === undefined) throw new NullPointerException('text');
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(Z|[+-]\d{4})$/.exec(text);
  const bad = () => new DateTimeParseException(`Text '${text}' could not be parsed at index 0`);
  if (!m) throw bad();
  const [, y, mo, d, h, mi, s, off] = m;
  const dim = [31, (+y % 4 === 0 && (+y % 100 !== 0 || +y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > dim[+mo - 1] || +h > 23 || +mi > 59 || +s > 59) throw bad();
  if (off !== 'Z' && (+off.slice(1, 3) > 18 || +off.slice(3, 5) > 59)) throw bad();
  return `${y}-${mo}-${d} ${h}:${mi}:${s} ${off === 'Z' ? '+0000' : off}`;
}

// Java: org.languagetool.LtBuildInfo (enum OS, PREMIUM)
export class LtBuildInfo extends JavaEnum {
  static FQCN = 'org.languagetool.LtBuildInfo';

  // Java: LtBuildInfo#LtBuildInfo(String)
  constructor(name, ordinal, gitPropertiesFilePath) {
    super(name, ordinal);
    const inStream = getDataBroker().getAsStream(gitPropertiesFilePath);
    const gitProperties = inStream !== null ? loadProperties(decodeLatin1(inStream)) : null;
    if (gitProperties !== null) {
      this.buildDate = reformatBuildTime(gitProperties.get('git.build.time') ?? null);
      this.shortGitId = gitProperties.get('git.commit.id.abbrev') ?? null;
      this.version = gitProperties.get('git.build.version') ?? null;
    } else {
      this.buildDate = null;
      this.shortGitId = null;
      this.version = null;
    }
  }

  // Java: LtBuildInfo#getBuildDate()
  getBuildDate() {
    return this.buildDate;
  }

  // Java: LtBuildInfo#getShortGitId()
  getShortGitId() {
    return this.shortGitId;
  }

  // Java: LtBuildInfo#getVersion()
  getVersion() {
    return this.version;
  }
}

LtBuildInfo.OS = new LtBuildInfo('OS', 0, '/git.properties');
LtBuildInfo.PREMIUM = new LtBuildInfo('PREMIUM', 1, '/git-premium.properties');

export const VERSION = LtBuildInfo.OS.getVersion(); // Java: JLanguageTool#VERSION
export const BUILD_DATE = LtBuildInfo.OS.getBuildDate(); // Java: JLanguageTool#BUILD_DATE
export const GIT_SHORT_ID = LtBuildInfo.OS.getShortGitId(); // Java: JLanguageTool#GIT_SHORT_ID
