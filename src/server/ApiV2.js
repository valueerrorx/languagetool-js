// Java: org.languagetool.server.ApiV2 (/v2/ dispatch; check, maxtextlength; the other endpoints follow with their steps)
import { notPortedYet } from '../core/language/components.js';
import { AnnotatedTextBuilder } from '../core/text/AnnotatedTextBuilder.js';
import { MetaDataKey } from '../core/text/AnnotatedText.js';
import { IllegalArgumentException } from '../lib/java/errors.js';
import { javaTrim } from '../lib/java/strings.js';
import { BadRequestException } from './BadRequestException.js';
import { PathNotFoundException } from './exceptions.js';
import { JsonProcessingException, readTree } from './JsonTree.js';
import { setCommonHeaders } from './ServerTools.js';

export const API_DOC_URL = 'https://languagetool.org/http-api/swagger-ui/#/default'; // Java: LanguageToolHttpHandler.API_DOC_URL
const TEXT_CONTENT_TYPE = 'text/plain';

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
      throw notPortedYet('ApiV2#handleLanguagesRequest');
    } else if (path === 'maxtextlength') {
      this.handleMaxTextLengthRequest(httpExchange, config);
    } else if (path === 'configinfo') {
      throw notPortedYet('ApiV2#handleGetConfigurationInfoRequest');
    } else if (path === 'info') {
      throw notPortedYet('ApiV2#handleSoftwareInfoRequest');
    } else if (path === 'check') {
      await this.handleCheckRequest(httpExchange, parameters, errorRequestLimiter, remoteAddress, config);
    } else if (path === 'words' || path === 'words/add' || path === 'words/delete' || path === 'admin/refreshUser' || path === 'users/me') {
      throw notPortedYet(`ApiV2#handle /v2/${path}`);
    } else {
      throw new PathNotFoundException(`Unsupported action: '${path}'. Please see ${API_DOC_URL}`);
    }
  }

  // Java: ApiV2#handleMaxTextLengthRequest(HttpExchange,HTTPServerConfig)
  handleMaxTextLengthRequest(httpExchange, config) {
    const response = String(config.getMaxTextLengthAnonymous());
    setCommonHeaders(httpExchange, TEXT_CONTENT_TYPE, this.allowOriginUrl);
    const bytes = Buffer.from(response, 'utf8');
    httpExchange.sendResponseHeaders(200, bytes.length);
    httpExchange.write(bytes);
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
      // handleIpLogMatch only logs; no need to check text again rules
      return;
    }
    await this.textChecker.checkText(aText, httpExchange, parameters, errorRequestLimiter, remoteAddress);
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
}

