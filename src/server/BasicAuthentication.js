// Java: org.languagetool.server.BasicAuthentication
import { Base64 } from '../lib/java/Base64.js';
import { decodeUtf8Java, getBytesUtf8 } from '../lib/java/charset.js';
import { javaSplit, javaTrim } from '../lib/java/strings.js';
import { AuthException } from './exceptions.js';

export class BasicAuthentication {
  static FQCN = 'org.languagetool.server.BasicAuthentication';

  // Java: BasicAuthentication#BasicAuthentication(String)
  constructor(authHeader) {
    if (!authHeader.startsWith('Basic ')) {
      throw new AuthException('Expected Basic Authentication');
    }
    const authEncoded = authHeader.substring('Basic '.length);
    const authDecoded = decodeUtf8Java(Base64.decode(getBytesUtf8(authEncoded)));
    const authParts = javaSplit(authDecoded, ':', 2);
    if (authParts.length !== 2 || javaTrim(authParts[0]) === '' || javaTrim(authParts[1]) === '') {
      throw new AuthException('Expected Basic Authentication');
    }
    this.user = authParts[0];
    this.password = authParts[1];
  }

  // Java: BasicAuthentication#getUser()
  getUser() {
    return this.user;
  }

  // Java: BasicAuthentication#getPassword()
  getPassword() {
    return this.password;
  }
}
