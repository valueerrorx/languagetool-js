// Java: server exception classes (TextTooLongException, PathNotFoundException, PortBindingException, UnavailableException, AuthException)
import { Exception, RuntimeException } from '../lib/java/errors.js';

// Java: org.languagetool.server.TextTooLongException
export class TextTooLongException extends RuntimeException {
  static FQCN = 'org.languagetool.server.TextTooLongException';
}

// Java: org.languagetool.server.PathNotFoundException
export class PathNotFoundException extends RuntimeException {
  static FQCN = 'org.languagetool.server.PathNotFoundException';
}

// Java: org.languagetool.server.PortBindingException
export class PortBindingException extends RuntimeException {
  static FQCN = 'org.languagetool.server.PortBindingException';
}

// Java: org.languagetool.server.UnavailableException
export class UnavailableException extends RuntimeException {
  static FQCN = 'org.languagetool.server.UnavailableException';
}

// Java: org.languagetool.server.AuthException
export class AuthException extends RuntimeException {
  static FQCN = 'org.languagetool.server.AuthException';
}

// Java: java.net.BindException
export class BindException extends Exception {
  static FQCN = 'java.net.BindException';
}
