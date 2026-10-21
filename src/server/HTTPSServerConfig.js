// Java: org.languagetool.server.HTTPSServerConfig (deprecated JKS keystore configuration)
import { readFileSync } from 'node:fs';
import { FileNotFoundException, RuntimeException } from '../lib/java/errors.js';
import { File } from '../lib/java/io/File.js';
import { decodeLatin1, loadProperties } from '../lib/java/Properties.js';
import { DEFAULT_PORT, HTTPServerConfig, openError } from './HTTPServerConfig.js';
import { IllegalConfigurationException } from './exceptions.js';

// Java: HTTPSServerConfig
export class HTTPSServerConfig extends HTTPServerConfig {
  static FQCN = 'org.languagetool.server.HTTPSServerConfig';

  keystore = null;
  keyStorePassword = null;

  // Java: HTTPSServerConfig#HTTPSServerConfig(File,String) / (int,boolean,File,String) / (int,boolean,File,String,int,int) / (String[])
  constructor(...a) {
    if (a.length === 1 && Array.isArray(a[0])) {
      super(a[0]);
      const args = a[0];
      let config = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--config') {
          config = new File(args[++i]);
        }
      }
      if (config === null) {
        throw new IllegalConfigurationException('Parameter --config must be set and point to a property file');
      }
      try {
        let buf;
        try {
          buf = readFileSync(config.toString());
        } catch {
          throw openError(config);
        }
        const props = loadProperties(decodeLatin1(buf));
        this.keystore = new File(this.getProperty(props, 'keystore', config));
        this.keyStorePassword = this.getProperty(props, 'password', config);
      } catch (e) {
        if (e instanceof FileNotFoundException) {
          throw new RuntimeException(`Could not load properties from '${config}'`, e); // Java: catch (IOException e)
        }
        throw e;
      }
    } else if (a.length === 2) {
      super(DEFAULT_PORT, false);
      [this.keystore, this.keyStorePassword] = a;
    } else {
      super(a[0], a[1]);
      this.keystore = a[2];
      this.keyStorePassword = a[3];
      if (a.length === 6) {
        this.requestLimit = a[4];
        this.requestLimitPeriodInSeconds = a[5];
      }
    }
  }

  // Java: HTTPSServerConfig#getKeystore()
  getKeystore() {
    return this.keystore;
  }

  // Java: HTTPSServerConfig#getKeyStorePassword()
  getKeyStorePassword() {
    return this.keyStorePassword;
  }
}
