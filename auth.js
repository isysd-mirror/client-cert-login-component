/*
 * Client certificate authentication implementation.
 * This middleware 
 */
import * as fs from 'fs'
import * as path from 'path'

const certDB = {
  // fill in with commonName: cert pairs
  // super simplified cache again for example...
}

export async function getAllCerts () {
  // check for cached certs
  if (Object.keys(certDB).length === 0) {
    // get this server's cert
    certDB.thisServer = await fs.promises.readFile(path.join(process.env.PKIDIR, 'fullchain.pem')).catch(async e => {
      if (process.env.PKIDIR = path.join(process.cwd(), 'pki')) {
        // looks like we're in an example environment
        // this is an example app, so generate example keys
        var bundle = await generateServerCert({'commonName': 'localhost'})
        // write files for next time
        await fs.promises.writeFile(path.join(process.env.PKIDIR, 'cert.pem'), bundle.certificate)
        await fs.promises.writeFile(path.join(process.env.PKIDIR, 'fullchain.pem'), bundle.certificate)
        await fs.promises.writeFile(path.join(process.env.PKIDIR, 'privkey.pem'), bundle.privateKey)
        // finally return the cert
        return bundle.certificate
      }
      else throw e
    })
    // load all certs in client directory
    var clients = await fs.promises.readdir(process.env.CLIENT_CERT_DIR)
    await Promise.all(clients.map(async c => {
      certDB[c] = await fs.promises.readFile(path.join(process.env.CLIENT_CERT_DIR, c, 'cert.pem'))
      return certDB[c]
    }))
  }
  return Object.values(certDB).join('\n')
}

export async function installCert (cn, cert) {
  // Example function for registering a user by certificate
  // You should really do way more checks first!
  // Check all of the subject fields, and that the cert is only type client.
  certDB[cn] = cert
  await fs.promises.mkdir(path.join(process.env.CLIENT_CERT_DIR, cn), {recursive: true, mode: 0o700})
  await fs.promises.writeFile(path.join(process.env.CLIENT_CERT_DIR, cn, 'cert.pem'), cert)
  // TODO restart server? renegotiate? what?
  return true
}

async function generateServerCert (subject) {
  var keys = forge.pki.rsa.generateKeyPair(2048);

  var cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  var attrs = [subject];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true,
    pathLenConstraint: 1
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  }, {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 6, // URI
      value: 'http://localhost/'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }]
  }, {
    name: 'subjectKeyIdentifier'
  }]);

  // self-sign certificate
  cert.sign(keys.privateKey/*, forge.md.sha256.create()*/);

  // PEM-format keys and cert
  var pem = {
    privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    publicKey: forge.pki.publicKeyToPem(keys.publicKey),
    certificate: forge.pki.certificateToPem(cert)
  };

  return pem
}

export async function getOptions (options) {
  options = options || {}
  if (Object.keys(options).length === 0) {
    options.allowHTTP1 = process.env.ALLOW_HTTP1 || true
    options.maxVersion = 'TLSv1.2'
    options.ca = Buffer.from(await getAllCerts())
    options.key = await fs.promises.readFile(path.join(process.env.PKIDIR, 'privkey.pem'))
    options.cert = await fs.promises.readFile(path.join(process.env.PKIDIR, 'cert.pem'))
    options.requestCert = true
    options.rejectUnauthorized = true
  }
  return options
}

export default getOptions
