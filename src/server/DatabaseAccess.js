// Java: org.languagetool.server.DatabaseAccess and DatabaseAccessOpenSource (no database: dbDriver is not supported yet, see DB steps)
import { IllegalArgumentException, IllegalStateException, InvocationTargetException, NotImplementedException, NullPointerException, RuntimeException, isThrowable } from '../lib/java/errors.js';
import { Pattern } from '../lib/java/regex/index.js';
import { javaTrim } from '../lib/java/strings.js';
import { notPortedYet } from '../core/language/components.js';
import { AuthException } from './exceptions.js';
import { BadRequestException } from './BadRequestException.js';
import { DatabaseLogger } from './DatabaseLogger.js';
import { JwtContent } from './JwtContent.js';

const NON_PREMIUM_MSG = 'This server does not support username/password';
const WHITESPACE_PATTERN = Pattern.compile('.*\\s.*');

export class DatabaseAccess {
  static FQCN = 'org.languagetool.server.DatabaseAccess';
  static instance = null;

  // Java: DatabaseAccess#init(HTTPServerConfig)
  static init(config) {
    if (DatabaseAccess.instance === null) {
      // Premium.isPremiumVersion() is false in this build: DatabaseAccessOpenSource
      try {
        DatabaseAccess.instance = new DatabaseAccessOpenSource(config);
      } catch (e) {
        if (!isThrowable(e)) throw e;
        throw new RuntimeException(new InvocationTargetException(e)); // Java: clazz.getConstructor(..).newInstance(config)
      }
    }
  }

  // Java: DatabaseAccess#reset()
  static reset() {
    DatabaseAccess.instance = null;
  }

  // Java: DatabaseAccess#getInstance()
  static getInstance() {
    if (DatabaseAccess.instance === null) {
      throw new IllegalStateException('DatabaseAccess.init() has not been called yet or failed');
    }
    return DatabaseAccess.instance;
  }

  // Java: DatabaseAccess#isReady()
  static isReady() {
    return DatabaseAccess.instance !== null;
  }
}

export class DatabaseAccessOpenSource extends DatabaseAccess {
  static FQCN = 'org.languagetool.server.DatabaseAccessOpenSource';

  // Java: DatabaseAccessOpenSource#DatabaseAccessOpenSource(HTTPServerConfig)
  constructor(config) {
    super();
    this.sqlSessionFactory = null;
    if (config.dbDriver !== null) {
      // Properties.setProperty("url"/"username"/"password", null) -> NullPointerException (ConcurrentHashMap rejects null values)
      if (config.dbUrl === null || config.dbUsername === null || config.dbPassword === null) throw new NullPointerException();
      // MyBatis session factory: the pooled data source connects lazily (database features follow in the DB steps, D-026)
      this.sqlSessionFactory = { configured: true };
      if (!config.dbLogging) {
        DatabaseLogger.getInstance().disableLogging();
      }
    }
    // else: INFO log "Not setting up database access, dbDriver is not configured" (logging follows with F71)
  }

  // Java: DatabaseAccessOpenSource#addWord(String,Long,String)
  addWord(word, userId, groupName) {
    return this.addWordForUser(word, userId);
  }

  // Java: DatabaseAccessOpenSource#deleteWord(String,Long,String)
  deleteWord(word, userId, groupName) {
    return this.deleteWordForUser(word, userId);
  }

  // Java: DatabaseAccessOpenSource#deleteWordBatch(List,Long,String)
  deleteWordBatch(words, userId, groupName) {
    let deleted = false;
    for (const word of words) {
      if (this.deleteWordForUser(word, userId)) {
        deleted = true;
      }
    }
    return deleted;
  }

  // Java: DatabaseAccessOpenSource#addWordBatch(List,Long,String)
  addWordBatch(words, userId, groupName) {
    words.forEach((w) => this.addWordForUser(w, userId));
  }

  // Java: DatabaseAccessOpenSource#getUserInfoWithPassword(String,String)
  getUserInfoWithPassword() {
    throw new NotImplementedException(NON_PREMIUM_MSG);
  }

  // Java: DatabaseAccessOpenSource#getExtendedUserInfo(String) / (long)
  getExtendedUserInfo() {
    throw new NotImplementedException(NON_PREMIUM_MSG);
  }

  // Java: DatabaseAccessOpenSource#getUserInfoWithApiKey(String,String)
  getUserInfoWithApiKey(username, apiKey) {
    this.getUserId(username, apiKey);
    throw notPortedYet('DatabaseAccessOpenSource#getUserInfoWithApiKey (UserInfoEntry of a database user)');
  }

  // Java: DatabaseAccessOpenSource#getUserInfoWithAddonToken(String,String)
  getUserInfoWithAddonToken() {
    throw new NotImplementedException(NON_PREMIUM_MSG);
  }

  // Java: DatabaseAccessOpenSource#validateAuthHeader(String)
  validateAuthHeader() {
    return JwtContent.NONE;
  }

  // Java: DatabaseAccessOpenSource#invalidateUserInfoCache(String)
  invalidateUserInfoCache() {
    throw new NotImplementedException(NON_PREMIUM_MSG);
  }

  // Java: DatabaseAccessOpenSource#getUserRequestCount(Long)
  getUserRequestCount() {
    return null;
  }

  // Java: DatabaseAccessOpenSource#getWords(Long,int,int)
  getWordsForUser() {
    if (this.sqlSessionFactory === null) {
      return [];
    }
    throw notPortedYet('DatabaseAccessOpenSource#getWords (database)');
  }

  // Java: DatabaseAccessOpenSource#addWord(String,Long)
  addWordForUser(word) {
    this.validateWord(word);
    if (this.sqlSessionFactory === null) {
      return false;
    }
    throw notPortedYet('DatabaseAccessOpenSource#addWord (database)');
  }

  // Java: DatabaseAccessOpenSource#getUserId(String,String)
  getUserId(username, apiKey) {
    if (username === null || username === undefined || javaTrim(username) === '') {
      throw new IllegalArgumentException('username must be set');
    }
    if (apiKey === null || apiKey === undefined || javaTrim(apiKey) === '') {
      throw new IllegalArgumentException('apiKey must be set');
    }
    if (this.sqlSessionFactory === null) {
      throw new AuthException('This is the endpoint for the basic version of LanguageTool. '
        + "When using 'username' and 'apiKey' to access the premium version, use api.languagetoolplus.com instead.");
    }
    throw notPortedYet('DatabaseAccessOpenSource#getUserId (database)');
  }

  // Java: DatabaseAccessOpenSource#deleteWord(String,Long)
  deleteWordForUser() {
    if (this.sqlSessionFactory === null) {
      return false;
    }
    throw notPortedYet('DatabaseAccessOpenSource#deleteWord (database)');
  }

  // Java: DatabaseAccessOpenSource#getOrCreateServerId()
  getOrCreateServerId() {
    return null;
  }

  // Java: DatabaseAccessOpenSource#getOrCreateClientId(String)
  getOrCreateClientId(client) {
    if (this.sqlSessionFactory === null || client === null || client === undefined) {
      return null;
    }
    throw notPortedYet('DatabaseAccessOpenSource#getOrCreateClientId (database)');
  }

  // Java: DatabaseAccessOpenSource#getDictGroups(Long)
  getDictGroups() {
    return [];
  }

  // Java: DatabaseAccessOpenSource#getOrCreateDictGroup(Long,String)
  getOrCreateDictGroup() {
    throw new NotImplementedException(NON_PREMIUM_MSG);
  }

  // Java: DatabaseAccessOpenSource#validateWord(String)
  validateWord(word) {
    if (word === null || word === undefined || javaTrim(word) === '') {
      throw new BadRequestException('Invalid word, cannot be empty or whitespace only');
    }
    if (WHITESPACE_PATTERN.matcher(word).matches()) {
      throw new BadRequestException(`Invalid word, you can only add words that don't contain spaces: '${word}'`);
    }
  }

  // Java: DatabaseAccessOpenSource#getWords(UserLimits,List,int,int)
  getWords(limits, groups, offset, limit) {
    return this.getWordsForUser(limits.getPremiumUid(), offset, limit);
  }

  // Java: DatabaseAccessOpenSource#getRules(UserLimits,Language,List)
  getRules() {
    return [];
  }
}
