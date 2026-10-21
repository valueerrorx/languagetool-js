// Java: org.languagetool.server.ApiV2 (/v2/ dispatch: languages, maxtextlength, configinfo, info, check, words, users/me, admin/refreshUser)
import { JLanguageTool } from '../core/JLanguageTool.js';
import { Languages } from '../core/Languages.js';
import { BUILD_DATE, GIT_SHORT_ID, VERSION } from '../core/LtBuildInfo.js';
import { Premium } from '../core/rules/model/Premium.js';
import { RuleOption } from '../core/rules/model/RuleOption.js';
import { TextLevelRule } from '../core/rules/model/TextLevelRule.js';
import { Float } from '../lib/java/float.js';
import { Double } from '../lib/java/numbers.js';
import { ArrayIndexOutOfBoundsException, ClassCastException, IllegalStateException, NullPointerException } from '../lib/java/errors.js';
import { javaSplit } from '../lib/java/strings.js';
import { AuthException } from './exceptions.js';
import { BasicAuthentication } from './BasicAuthentication.js';
import { DatabaseAccess } from './DatabaseAccess.js';
import { getUserLimits as serverToolsGetUserLimits, setAllowOrigin } from './ServerTools.js';
import { AnnotatedTextBuilder } from '../core/text/AnnotatedTextBuilder.js';
import { MetaDataKey } from '../core/text/AnnotatedText.js';
import { IllegalArgumentException } from '../lib/java/errors.js';
import { Integer } from '../lib/java/int.js';
import { javaTrim } from '../lib/java/strings.js';
import { BadRequestException } from './BadRequestException.js';
import { PathNotFoundException } from './exceptions.js';
import { JsonProcessingException, readTree } from './JsonTree.js';
import { setCommonHeaders } from './ServerTools.js';
import { LoggerFactory } from '../lib/slf4j/Logger.js';
import { JavaHashMap } from '../lib/java/collections/JavaHashMap.js';
import { abstractMapToString } from '../lib/java/toString.js';

export const API_DOC_URL = 'https://languagetool.org/http-api/swagger-ui/#/default'; // Java: LanguageToolHttpHandler.API_DOC_URL
const JSON_CONTENT_TYPE = 'application/json';
const TEXT_CONTENT_TYPE = 'text/plain';
const WHITESPACE_SPLIT = '\\s+';

// Java: JsonGenerator over a StringWriter (compact output, field names may repeat)
class JsonGenerator {
  constructor() {
    this.out = '';
    this.needComma = [false];
  }

  // value/field separator handling of the generator
  comma() {
    if (this.needComma[this.needComma.length - 1]) this.out += ',';
    this.needComma[this.needComma.length - 1] = true;
  }

  start(open) {
    this.comma();
    this.out += open;
    this.needComma.push(false);
  }

  end(close) {
    this.needComma.pop();
    this.out += close;
  }

  field(name) {
    this.comma();
    this.out += `${JSON.stringify(name)}:`;
    this.needComma[this.needComma.length - 1] = false;
  }

  // Java: JsonGenerator#writeStartObject()
  writeStartObject() { this.start('{'); }

  // Java: JsonGenerator#writeEndObject()
  writeEndObject() { this.end('}'); }

  // Java: JsonGenerator#writeStartArray()
  writeStartArray() { this.start('['); }

  // Java: JsonGenerator#writeEndArray()
  writeEndArray() { this.end(']'); }

  // Java: JsonGenerator#writeObjectFieldStart(String)
  writeObjectFieldStart(name) { this.field(name); this.writeStartObject(); }

  // Java: JsonGenerator#writeArrayFieldStart(String)
  writeArrayFieldStart(name) { this.field(name); this.writeStartArray(); }

  // Java: JsonGenerator#writeString(String)
  writeString(value) { this.comma(); this.out += JSON.stringify(value); }

  // Java: JsonGenerator#writeStringField(String,String)
  writeStringField(name, value) { this.field(name); this.writeString(value); }

  // Java: JsonGenerator#writeBooleanField(String,boolean)
  writeBooleanField(name, value) { this.field(name); this.comma(); this.out += value ? 'true' : 'false'; }

  // Java: JsonGenerator#writeNumberField(String,...) with the number text already formatted by the caller
  writeNumberTextField(name, text) { this.field(name); this.comma(); this.out += text; }
}

// Java: (float)/(double) cast of an Object holding a boxed Float/Double
function castBox(o, kind) {
  // DEV-025: Java ClassCastException for the Integer min/max of the 2-arg RuleOption ctor; numeric conversion instead
  if (typeof o === 'number') return kind === 'Float' ? Math.fround(o) : o;
  if (o !== null && typeof o === 'object' && o.kind === kind) return o.value;
  const actual = typeof o === 'number' ? 'java.lang.Integer' : typeof o === 'boolean' ? 'java.lang.Boolean' : o !== null && typeof o === 'object' && o.kind ? `java.lang.${o.kind}` : 'java.lang.String';
  throw new ClassCastException(`class ${actual} cannot be cast to class java.lang.${kind}`);
}

// Java: JsonGenerator#writeNumber(float) / (double): NaN and Infinity are written as quoted strings
const jsonFloat = (f) => (Number.isFinite(f) ? Float.toString(f) : JSON.stringify(Float.toString(f)));
const jsonDouble = (d) => (Number.isFinite(d) ? Double.toString(d) : JSON.stringify(Double.toString(d)));

// Java: (int) cast of an Object holding a boxed Integer
function castInt(o) {
  if (typeof o === 'number') return o;
  const actual = typeof o === 'boolean' ? 'java.lang.Boolean' : o !== null && typeof o === 'object' && o.kind ? `java.lang.${o.kind}` : 'java.lang.String';
  throw new ClassCastException(`class ${actual} cannot be cast to class java.lang.Integer`);
}

// Java: Map#get(Object) with null for a missing key
const param = (parameters, key) => (parameters.has(key) ? parameters.get(key) : null);

export class ApiV2 {
  static FQCN = 'org.languagetool.server.ApiV2';

  // Java: ApiV2#ApiV2(TextChecker,String)
  constructor(textChecker, allowOriginUrl) {
    this.textChecker = textChecker;
    this.allowOriginUrl = allowOriginUrl;
  }

  // Java: ApiV2#handleRequest(String,HttpExchange,Map,ErrorRequestLimiter,String,HTTPServerConfig)
  async handleRequest(path, httpExchange, parameters, errorRequestLimiter, remoteAddress, config) {
    if (path === 'languages') {
      this.handleLanguagesRequest(httpExchange);
    } else if (path === 'maxtextlength') {
      this.handleMaxTextLengthRequest(httpExchange, config);
    } else if (path === 'configinfo') {
      this.handleGetConfigurationInfoRequest(httpExchange, parameters, config);
    } else if (path === 'info') {
      this.handleSoftwareInfoRequest(httpExchange);
    } else if (path === 'check') {
      await this.handleCheckRequest(httpExchange, parameters, errorRequestLimiter, remoteAddress, config);
    } else if (path === 'words') {
      this.handleWordsRequest(httpExchange, parameters, config);
    } else if (path === 'words/add') {
      this.handleWordAddRequest(httpExchange, parameters, config);
    } else if (path === 'words/delete') {
      this.handleWordDeleteRequest(httpExchange, parameters, config);
    } else if (path === 'admin/refreshUser') {
      this.handleRefreshUserInfoRequest(httpExchange, parameters, config);
    } else if (path === 'users/me') {
      this.handleGetUserInfoRequest(httpExchange, parameters, config);
    } else {
      throw new PathNotFoundException(`Unsupported action: '${path}'. Please see ${API_DOC_URL}`);
    }
  }

  // Java: ApiV2#handleLanguagesRequest(HttpExchange)
  handleLanguagesRequest(httpExchange) {
    const response = this.getLanguages();
    this.sendBody(httpExchange, JSON_CONTENT_TYPE, response);
  }

  // Java: common tail of the handlers: setCommonHeaders, sendResponseHeaders(200, length), write
  sendBody(httpExchange, contentType, response) {
    setCommonHeaders(httpExchange, contentType, this.allowOriginUrl);
    const bytes = Buffer.from(response, 'utf8');
    httpExchange.sendResponseHeaders(200, bytes.length);
    httpExchange.write(bytes);
  }

  // Java: ApiV2#handleMaxTextLengthRequest(HttpExchange,HTTPServerConfig)
  handleMaxTextLengthRequest(httpExchange, config) {
    const response = String(config.getMaxTextLengthAnonymous());
    setCommonHeaders(httpExchange, TEXT_CONTENT_TYPE, this.allowOriginUrl);
    const bytes = Buffer.from(response, 'utf8');
    httpExchange.sendResponseHeaders(200, bytes.length);
    httpExchange.write(bytes);
  }

  // Java: ApiV2#handleGetConfigurationInfoRequest(HttpExchange,Map,HTTPServerConfig)
  handleGetConfigurationInfoRequest(httpExchange, parameters, config) {
    if (param(parameters, 'language') === null) {
      throw new BadRequestException("'language' parameter missing");
    }
    const lang = Languages.getLanguageForShortCode(parameters.get('language'));
    const response = this.getConfigurationInfo(lang, config);
    this.sendBody(httpExchange, JSON_CONTENT_TYPE, response);
  }

  // Java: ApiV2#handleSoftwareInfoRequest(HttpExchange)
  handleSoftwareInfoRequest(httpExchange) {
    const response = this.getSoftwareInfo();
    this.sendBody(httpExchange, JSON_CONTENT_TYPE, response);
  }

  // Java: ApiV2#handleCheckRequest(HttpExchange,Map,ErrorRequestLimiter,String,HTTPServerConfig)
  async handleCheckRequest(httpExchange, parameters, errorRequestLimiter, remoteAddress, config) {
    let aText;
    if (parameters.has('text') && parameters.has('data')) {
      throw new BadRequestException("Set only 'text' or 'data' parameter, not both");
    } else if (parameters.has('text')) {
      aText = new AnnotatedTextBuilder().addText(parameters.get('text')).build();
    } else if (parameters.has('data')) {
      let data;
      try {
        data = readTree(parameters.get('data'));
      } catch (e) {
        if (e instanceof JsonProcessingException) throw new BadRequestException("Could not parse JSON from 'data' parameter", e);
        throw e;
      }
      if (data.get('text') !== null && data.get('annotation') !== null) {
        throw new BadRequestException("'data' key in JSON requires either 'text' or 'annotation' key, not both");
      } else if (data.get('text') !== null) {
        aText = this.getAnnotatedTextFromString(data, data.get('text').asText());
      } else if (data.get('annotation') !== null) {
        aText = this.getAnnotatedTextFromJson(data);
      } else {
        throw new BadRequestException("'data' key in JSON requires 'text' or 'annotation' key");
      }
    } else {
      throw new BadRequestException("Missing 'text' or 'data' parameter");
    }
    // get from config
    if (config.logIp && javaTrim(aText.getPlainText()) === config.logIpMatchingPattern) {
      this.handleIpLogMatch(httpExchange, remoteAddress, parameters);
      // no need to check text again rules
      return;
    }
    await this.textChecker.checkText(aText, httpExchange, parameters, errorRequestLimiter, remoteAddress);
  }

  // Java: ApiV2#handleIpLogMatch(HttpExchange,String,Map)
  handleIpLogMatch(httpExchange, remoteAddress, parameters) {
    const logger = LoggerFactory.getLogger('org.languagetool.server.ApiV2');
    const hm = new JavaHashMap();
    for (const [k, v] of parameters) hm.put(k, v);
    logger.info(`Found log-my-IP text in request from: ${remoteAddress} to: ${httpExchange.getLocalAddressText()}, requestParams: ${abstractMapToString({ entries: () => hm.entrySet() })}`);
  }

  // Java: ApiV2#getAnnotatedTextFromString(JsonNode,String)
  getAnnotatedTextFromString(data, text) {
    const textBuilder = new AnnotatedTextBuilder().addText(text);
    if (data.has('metaData')) {
      const metaData = data.get('metaData');
      for (const key of metaData.fieldNames()) {
        const val = metaData.get(key).asText();
        let metaDataKey = null;
        try {
          metaDataKey = MetaDataKey.valueOf(key);
        } catch (e) {
          if (!(e instanceof IllegalArgumentException)) throw e;
        }
        if (metaDataKey !== null) textBuilder.addGlobalMetaData(metaDataKey, val);
        else textBuilder.addGlobalMetaData(key, val);
      }
    }
    return textBuilder.build();
  }

  // Java: ApiV2#getAnnotatedTextFromJson(JsonNode)
  getAnnotatedTextFromJson(data) {
    const atb = new AnnotatedTextBuilder();
    for (const node of data.get('annotation').elements()) {
      if (node.get('text') !== null && node.get('markup') !== null) {
        throw new BadRequestException(`Only either 'text' or 'markup' are supported in an object in 'annotation' list, not both: ${node}`);
      } else if (node.get('text') !== null && node.get('interpretAs') !== null) {
        throw new BadRequestException(`'text' cannot be used with 'interpretAs' (only 'markup' can): ${node}`);
      } else if (node.get('text') !== null) {
        atb.addText(node.get('text').asText());
      } else if (node.get('markup') !== null) {
        if (node.get('interpretAs') !== null) {
          atb.addMarkup(node.get('markup').asText(), node.get('interpretAs').asText());
        } else {
          atb.addMarkup(node.get('markup').asText());
        }
      } else {
        throw new BadRequestException(`Only 'text' and 'markup' are supported in 'annotation' list: ${node}`);
      }
    }
    return atb.build();
  }

  // Java: ApiV2#handleWordsRequest(HttpExchange,Map,HTTPServerConfig)
  handleWordsRequest(httpExchange, params, config) {
    this.ensureGetMethod(httpExchange, '/words');
    const limits = this.getUserLimits(params, config);
    const db = DatabaseAccess.getInstance();
    const offset = param(params, 'offset') !== null ? Integer.parseInt(params.get('offset')) : 0;
    const limit = param(params, 'limit') !== null ? Integer.parseInt(params.get('limit')) : 10;
    // INFO log "Started reading dictionary for user: ..." (logging follows with F71)
    if (params.has('dict')) {
      throw new IllegalArgumentException("Use parameter 'dicts', not 'dict' in GET /words API method.");
    }
    // optional parameter: groups in comma separated list
    let groups = null;
    if (params.has('dicts')) {
      groups = javaSplit(params.get('dicts'), ',');
    } else if (limits.getAccount() !== null
      && limits.getAccount().getDefaultDictionary() !== null
      && limits.getAccount().getDefaultDictionary() !== '') {
      groups = [limits.getAccount().getDefaultDictionary()];
    }
    const words = db.getWords(limits, groups, offset, limit);
    // INFO log "Finished reading dictionary for user: ..." (logging follows with F71)
    this.writeListResponse('words', words, httpExchange);
  }

  // Java: ApiV2#handleWordAddRequest(HttpExchange,Map,HTTPServerConfig)
  handleWordAddRequest(httpExchange, parameters, config) {
    this.ensurePostMethod(httpExchange, '/words/add');
    const limits = this.getUserLimits(parameters, config);
    const db = DatabaseAccess.getInstance();
    let dict = param(parameters, 'dict');
    if (dict === null
      && limits.getAccount() !== null
      && limits.getAccount().getDefaultDictionary() !== null
      && limits.getAccount().getDefaultDictionary() !== '') {
      dict = limits.getAccount().getDefaultDictionary();
    }
    /*
     *  experimental batch mode for adding words,
     *  use mode=batch, words="word1 word2 word3" (whitespace delimited list) instead of word parameter
     */
    if (param(parameters, 'mode') === 'batch') {
      const words = this.splitWords(parameters);
      db.addWordBatch(words, limits.getPremiumUid(), dict);
      this.writeResponse('added', true, httpExchange);
    } else {
      const added = db.addWord(param(parameters, 'word'), limits.getPremiumUid(), dict);
      this.writeResponse('added', added, httpExchange);
    }
  }

  // Java: ApiV2#handleWordDeleteRequest(HttpExchange,Map,HTTPServerConfig)
  handleWordDeleteRequest(httpExchange, parameters, config) {
    this.ensurePostMethod(httpExchange, '/words/delete');
    const limits = this.getUserLimits(parameters, config);
    const db = DatabaseAccess.getInstance();
    let dict = param(parameters, 'dict');
    if (dict === null
      && limits.getAccount() !== null
      && limits.getAccount().getDefaultDictionary() !== null
      && limits.getAccount().getDefaultDictionary() !== '') {
      dict = limits.getAccount().getDefaultDictionary();
    }
    let deleted;
    if (param(parameters, 'mode') === 'batch') { // Experimental
      const words = this.splitWords(parameters);
      deleted = db.deleteWordBatch(words, limits.getPremiumUid(), dict);
      this.writeResponse('deleted', deleted, httpExchange);
    } else {
      deleted = db.deleteWord(param(parameters, 'word'), limits.getPremiumUid(), dict);
      this.writeResponse('deleted', deleted, httpExchange);
    }
  }

  // Java: Arrays.asList(parameters.get("words").split("\\s+")) (missing parameter: NullPointerException)
  splitWords(parameters) {
    // DEV-024: Java NPE (500) without words; 400
    if (param(parameters, 'words') === null) {
      throw new BadRequestException("Missing 'words' parameter");
    }
    return javaSplit(parameters.get('words'), WHITESPACE_SPLIT);
  }

  // Java: ApiV2#handleRefreshUserInfoRequest(HttpExchange,Map,HTTPServerConfig)
  handleRefreshUserInfoRequest(httpExchange, params, config) {
    this.ensurePostMethod(httpExchange, '/admin/refreshUser');
    const limits = this.getUserLimits(params, config);
    const db = DatabaseAccess.getInstance();
    if (limits.getPremiumUid() !== null) {
      const user = param(params, 'username');
      if (user !== null) {
        db.invalidateUserInfoCache(user);
        this.writeResponse('success', true, httpExchange);
      } else {
        this.writeResponse('success', false, httpExchange);
      }
    } else {
      this.writeResponse('success', false, httpExchange);
    }
  }

  // Java: ApiV2#handleGetUserInfoRequest(HttpExchange,Map,HTTPServerConfig)
  handleGetUserInfoRequest(httpExchange, parameters, config) {
    if (httpExchange.getRequestMethod().toLowerCase() === 'options') {
      setAllowOrigin(httpExchange, this.allowOriginUrl);
      httpExchange.getResponseHeaders().set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      const requestHeaders = httpExchange.getRequestHeaders().get('Access-Control-Request-Headers');
      if (requestHeaders !== null) {
        httpExchange.getResponseHeaders().set('Access-Control-Allow-Headers', requestHeaders.join(', '));
      }
      httpExchange.sendResponseHeaders(204, -1);
    } else {
      this.ensureGetMethod(httpExchange, '/users/me');
      if (!httpExchange.getRequestHeaders().containsKey('Authorization')) {
        throw new AuthException('Expected Basic Authentication');
      }
      const authParameter = parameters.has('authMethod') ? parameters.get('authMethod') : 'password';
      if (!(authParameter === 'password' || authParameter === 'apiKey' || authParameter === 'addonToken')) {
        throw new IllegalArgumentException(`Unknown authMethod: ${authParameter}`);
      }
      const authHeader = httpExchange.getRequestHeaders().getFirst('Authorization');
      const basicAuthentication = new BasicAuthentication(authHeader);
      const user = basicAuthentication.getUser();
      const password = basicAuthentication.getPassword();
      let userInfo = null;
      if (authParameter === 'password') {
        userInfo = DatabaseAccess.getInstance().getUserInfoWithPassword(user, password);
      } else if (authParameter === 'addonToken') {
        userInfo = DatabaseAccess.getInstance().getUserInfoWithAddonToken(user, password);
      } else if (authParameter === 'apiKey') {
        userInfo = DatabaseAccess.getInstance().getUserInfoWithApiKey(user, password);
      }
      const format = parameters.has('format') ? parameters.get('format') : 'extended';
      if (userInfo !== null) {
        if (format === 'minimal') {
          this.sendJson(httpExchange, JSON.stringify(userInfo));
        } else {
          this.sendJson(httpExchange, JSON.stringify(DatabaseAccess.getInstance().getExtendedUserInfo(user)));
        }
      } else {
        throw new IllegalStateException('Could not fetch user information');
      }
    }
  }

  // Java: ApiV2#ensureGetMethod(HttpExchange,String)
  ensureGetMethod(httpExchange, url) {
    if (httpExchange.getRequestMethod().toLowerCase() !== 'get') {
      throw new BadRequestException(`${url} needs to be called with GET`);
    }
  }

  // Java: ApiV2#ensurePostMethod(HttpExchange,String)
  ensurePostMethod(httpExchange, url) {
    if (httpExchange.getRequestMethod().toLowerCase() !== 'post') {
      throw new BadRequestException(`${url} needs to be called with POST`);
    }
  }

  // Java: ApiV2#getUserLimits(Map,HTTPServerConfig)
  getUserLimits(parameters, config) {
    const limits = serverToolsGetUserLimits(parameters, config);
    if (limits.getPremiumUid() === null) {
      throw new BadRequestException('This end point needs a user id');
    }
    return limits;
  }

  // Java: ApiV2#writeResponse(String,boolean,HttpExchange)
  writeResponse(fieldName, added, httpExchange) {
    const g = new JsonGenerator();
    g.writeStartObject();
    g.writeBooleanField(fieldName, added);
    g.writeEndObject();
    this.sendJson(httpExchange, g.out);
  }

  // Java: ApiV2#writeListResponse(String,List,HttpExchange)
  writeListResponse(fieldName, words, httpExchange) {
    const g = new JsonGenerator();
    g.writeStartObject();
    g.writeArrayFieldStart(fieldName);
    for (const word of words) {
      g.writeString(word);
    }
    g.writeEndArray();
    g.writeEndObject();
    this.sendJson(httpExchange, g.out);
  }

  // Java: ApiV2#sendJson(HttpExchange,StringWriter)
  sendJson(httpExchange, response) {
    this.sendBody(httpExchange, JSON_CONTENT_TYPE, response);
  }

  // Java: ApiV2#getLanguages()
  getLanguages() {
    const g = new JsonGenerator();
    g.writeStartArray();
    const languages = [...Languages.get()];
    const longCodes = new Set();
    for (const lang of languages) {
      g.writeStartObject();
      g.writeStringField('name', lang.getName());
      g.writeStringField('code', lang.getShortCode());
      g.writeStringField('longCode', lang.getShortCodeWithCountryAndVariant());
      longCodes.add(lang.getShortCodeWithCountryAndVariant());
      g.writeEndObject();
    }
    // add mappings like "fr-FR -> fr" because LibreOffice 7.4 needs them:
    const codeMap = Languages.getLongCodeToLangMapping();
    for (const [key, value] of codeMap.entrySet()) {
      if (!longCodes.has(key)) {
        g.writeStartObject();
        g.writeStringField('name', value.getName());
        g.writeStringField('code', value.getShortCode());
        g.writeStringField('longCode', key);
        g.writeEndObject();
      }
    }
    g.writeEndArray();
    return g.out;
  }

  // Java: ApiV2#getSoftwareInfo()
  getSoftwareInfo() {
    const g = new JsonGenerator();
    g.writeStartObject();
    g.writeObjectFieldStart('software');
    g.writeStringField('name', 'LanguageTool');
    g.writeStringField('version', VERSION);
    g.writeStringField('buildDate', BUILD_DATE);
    g.writeStringField('commit', GIT_SHORT_ID);
    g.writeBooleanField('premium', Premium.isPremiumVersion());
    if (Premium.isPremiumVersion()) {
      const premium = Premium.get();
      g.writeObjectFieldStart('premiumBuildInfo');
      g.writeStringField('version', premium.getVersion());
      g.writeStringField('buildDate', premium.getBuildDate());
      g.writeStringField('commit', premium.getShortGitId());
      g.writeEndObject();
    }
    g.writeEndObject();
    g.writeEndObject();
    return g.out;
  }

  // Java: ApiV2#getConfigurationInfo(Language,HTTPServerConfig)
  getConfigurationInfo(lang, config) {
    const lt = new JLanguageTool(lang);
    if (this.textChecker.config.languageModelDir !== null) {
      lt.activateLanguageModelRules(this.textChecker.config.languageModelDir);
    }
    let rules = lt.getAllRules();
    rules = rules.filter((rule) => !Premium.get().isPremiumRule(rule));
    const g = new JsonGenerator();
    g.writeStartObject();

    g.writeObjectFieldStart('software');
    g.writeStringField('name', 'LanguageTool');
    g.writeStringField('version', VERSION);
    g.writeStringField('buildDate', BUILD_DATE);
    g.writeBooleanField('premium', Premium.isPremiumVersion());
    g.writeEndObject();

    g.writeObjectFieldStart('parameter');
    g.writeNumberTextField('maxTextLength', String(config.getMaxTextHardLength()));
    g.writeEndObject();

    g.writeArrayFieldStart('rules');
    for (const rule of rules) {
      g.writeStartObject();
      g.writeStringField('ruleId', rule.getId());
      g.writeStringField('description', rule.getDescription());
      if (rule.isDictionaryBasedSpellingRule()) {
        g.writeStringField('isDictionaryBasedSpellingRule', 'yes');
      }
      if (rule.isDefaultOff()) {
        g.writeStringField('isDefaultOff', 'yes');
      }
      if (rule.isOfficeDefaultOff()) {
        g.writeStringField('isOfficeDefaultOff', 'yes');
      }
      if (rule.isOfficeDefaultOn()) {
        g.writeStringField('isOfficeDefaultOn', 'yes');
      }
      const ruleOptions = rule.getRuleOptions();
      if (ruleOptions !== null && ruleOptions.length > 0) { // DEV-025: Java AIOOBE for an empty array
        //  Compatibility to old version (< 6.5)
        if (typeof ruleOptions[0].getDefaultValue() === 'number') {
          g.writeStringField('hasConfigurableValue', 'yes');
          g.writeStringField(RuleOption.CONF_TEXT, ruleOptions[0].getConfigureText());
          g.writeStringField(RuleOption.MAX_CONF_VALUE, String(castInt(ruleOptions[0].getMaxConfigurableValue())));
          g.writeStringField(RuleOption.MIN_CONF_VALUE, String(castInt(ruleOptions[0].getMinConfigurableValue())));
          g.writeStringField(RuleOption.DEFAULT_VALUE, String(castInt(ruleOptions[0].getDefaultValue())));
        }
        //  new Version (>= 6.5)
        g.writeArrayFieldStart('ruleOptions');
        for (const rOption of ruleOptions) {
          g.writeStartObject();
          const o = rOption.getDefaultValue();
          if (typeof o === 'number') {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'Integer');
            g.writeNumberTextField(RuleOption.DEFAULT_VALUE, String(o));
            g.writeNumberTextField(RuleOption.MIN_CONF_VALUE, String(castInt(rOption.getMinConfigurableValue())));
            g.writeNumberTextField(RuleOption.MAX_CONF_VALUE, String(castInt(rOption.getMaxConfigurableValue())));
          } else if (o !== null && typeof o === 'object' && o.kind === 'Character') {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'Character');
            g.writeStringField(RuleOption.DEFAULT_VALUE, o.toString());
            g.writeStringField(RuleOption.DEFAULT_VALUE, String(rOption.getMinConfigurableValue()));
            g.writeStringField(RuleOption.DEFAULT_VALUE, String(rOption.getMaxConfigurableValue()));
          } else if (typeof o === 'boolean') {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'Boolean');
            g.writeBooleanField(RuleOption.DEFAULT_VALUE, o);
            g.writeNumberTextField(RuleOption.MIN_CONF_VALUE, String(castInt(rOption.getMinConfigurableValue())));
            g.writeNumberTextField(RuleOption.MAX_CONF_VALUE, String(castInt(rOption.getMaxConfigurableValue())));
          } else if (o !== null && typeof o === 'object' && o.kind === 'Float') {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'Float');
            g.writeNumberTextField(RuleOption.DEFAULT_VALUE, jsonFloat(o.value));
            g.writeNumberTextField(RuleOption.MIN_CONF_VALUE, jsonFloat(castBox(rOption.getMinConfigurableValue(), 'Float')));
            g.writeNumberTextField(RuleOption.MAX_CONF_VALUE, jsonFloat(castBox(rOption.getMaxConfigurableValue(), 'Float')));
          } else if (o !== null && typeof o === 'object' && o.kind === 'Double') {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'Double');
            g.writeNumberTextField(RuleOption.DEFAULT_VALUE, jsonDouble(o.value));
            g.writeNumberTextField(RuleOption.MIN_CONF_VALUE, jsonDouble(castBox(rOption.getMinConfigurableValue(), 'Double')));
            g.writeNumberTextField(RuleOption.MAX_CONF_VALUE, jsonDouble(castBox(rOption.getMaxConfigurableValue(), 'Double')));
          } else {
            g.writeStringField(RuleOption.DEFAULT_TYPE, 'String');
            g.writeStringField(RuleOption.DEFAULT_VALUE, o.toString());
            g.writeStringField(RuleOption.MIN_CONF_VALUE, String(rOption.getMinConfigurableValue()));
            g.writeStringField(RuleOption.MAX_CONF_VALUE, String(rOption.getMaxConfigurableValue()));
          }
          g.writeStringField(RuleOption.CONF_TEXT, rOption.getConfigureText());
          g.writeEndObject();
        }
        g.writeEndArray();
      }
      g.writeStringField('categoryId', rule.getCategory().getId().toString());
      g.writeStringField('categoryName', rule.getCategory().getName());
      g.writeStringField('locQualityIssueType', rule.getLocQualityIssueType().toString());
      if (rule instanceof TextLevelRule) {
        g.writeStringField('isTextLevelRule', 'yes');
        g.writeStringField('minToCheckParagraph', String(rule.minToCheckParagraph()));
      }
      g.writeEndObject();
    }
    g.writeEndArray();

    g.writeEndObject();
    return g.out;
  }
}
