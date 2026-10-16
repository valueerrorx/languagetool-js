// Java: org.languagetool.server.BadRequestException
import { RuntimeException } from '../lib/java/errors.js';

// Java: org.languagetool.server.BadRequestException (request is malformed)
export class BadRequestException extends RuntimeException {
  static FQCN = 'org.languagetool.server.BadRequestException';
}
