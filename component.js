/* global HTMLElement: false, forge: false, FileReader: false, customElements: false, fetch: false */
import { Modal } from './modal.js'

const registerTmpl = document.createElement('template')
registerTmpl.innerHTML = `
  <pp-modal>
    <h1 slot="header">Client Cert Registration</h1>
    <form id="register-cert" enctype="multipart/form-data" method="post">
      <label for="email">Import Certificate</label>
      <input type="file" name="client-cert" id="client-cert"></input>
      <p>Please fill out these details to generate a client certificate, or import one using the button above.</p>
      <label for="email">Email address</label>
      <input type="text" name="email" id="email"></input><br><br>
      <label for="password">Password</label>
      <input type="password" name="password" id="password"></input><br><br>
      <label for="password2">Repeat password</label>
      <input type="password" name="password2" id="password2"></input><br><br>
      <span style="color: red; display: none;" id="form-error"></span><br><br>
      <input type="submit" name="generate" value="Generate Client Certificate" />
    </form>
  <pp-modal>
`

const browserInstTmpl = document.createElement('template')
browserInstTmpl.innerHTML = `
  <p>
    After installing the certificate in your browser, <a onClick="window.location='/'">click here</a>, or reload this page. You should now see a welcome message, instead of a registration form.
  </p>
  <h5>Browser Installation Instructions</h5>
  <ul>
    <li><a href="https://support.securly.com/hc/en-us/articles/206081828-How-to-manually-install-the-Securly-SSL-certificate-in-Chrome" target="_blank">Chrome</a></li>
    <li><a href="https://support.globalsign.com/customer/portal/articles/1211486-install-client-digital-certificate---firefox-for-windows" target="_blank">Firefox</a></li>
    <li><a href="https://support.globalsign.com/customer/en/portal/articles/2374828-in-browser-installation-of-client-certificates" target="_blank">Edge</a></li>
  </ul>
`

const welcomeTmpl = document.createElement('template')
welcomeTmpl.innerHTML = `
  <p>
    You have successfully registered with the MTLS example app. Your session is now end to end encrypted, and you will not need to refresh the session until the next browser restart or cache clear.
  </p>
`

// TODO replace these getters with slotted templates

function getDownloadKeyTmp (cert, privkey) {
  const downloadKeyTmpl = document.createElement('template')
  downloadKeyTmpl.innerHTML = `
    <p>
      Please <a id="privkey-p12" download="privkey.p12" href="data:application/x-pkcs12;base64,${encodeURIComponent(privkey)}">download</a> (if download wasn't automatically initiated) your new private key file, and install it in your browser.
    </p>
    <p>
      You may also <a id="certificate-link" download="client-cert.pem" href="data:application/x-x509-user-cert;charset=utf-8,${encodeURIComponent(cert)}">download your certificate</a>, though that was already sent to the server, and it is bundled with your private key in the .p12 file.
    </p>
`
  return downloadKeyTmpl
}

class ClientCertRegistration extends HTMLElement {
  constructor () {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.appendChild(registerTmpl.content.cloneNode(true))
  }

  static get observedAttributes () {
    return ['cert', 'cn']
  }

  set cert (value) {
    if (value) {
      this.setAttribute('cert', value)
    } else {
      this.removeAttribute('cert');
    }
  }

  get cert () {
    if (this.hasAttribute('cert')) return this.getAttribute('cert')
  }

  set cn (value) {
    if (value) {
      this.setAttribute('cn', value)
      this.shadowRoot.appendChild(welcomeTmpl.content.cloneNode(true))
      this.shadowRoot.querySelector("pp-modal").visible = false
    } else {
      this.removeAttribute('cn');
      this.shadowRoot.querySelector("pp-modal").visible = true
    }
  }

  get cn () {
    if (this.hasAttribute('cn')) return this.getAttribute('cn')
  }

  set formError (value) {
    if (value) {
      this.shadowRoot.querySelector('#form-error').style.display = 'inline'
      this.shadowRoot.querySelector('#form-error').innerHTML = value
    } else {
      this.shadowRoot.querySelector('#form-error').style.display = 'none'
      this.shadowRoot.querySelector('#form-error').innerHTML = ''
    }
  }

  get formError () {
    if (this.shadowRoot.querySelector('#form-error').style.display !== 'none') return this.shadowRoot.querySelector('#form-error').innerHTML
  }

  connectedCallback () {
    if (this.hasOwnProperty('cert')) {
      let value = this.cert
      delete this.cert
      this.cert = value
    }
    if (this.hasOwnProperty('cn')) {
      let value = this.cn
      delete this.cn
      this.cn = value
    }
    console.log(this.cn)
    if (this.cn && this.cn.length > 0) {
      // user is logged in!
      this.shadowRoot.appendChild(welcomeTmpl.content.cloneNode(true))
      this.shadowRoot.querySelector("pp-modal").visible = false
    } else {
      this.shadowRoot.querySelector("pp-modal").visible = true
      this.shadowRoot.querySelector('#client-cert').addEventListener('change', this.importSubmit.bind(this))
      this.shadowRoot.querySelector('#register-cert').addEventListener('submit', this.generateSubmit.bind(this))
    }
  }

  disconnectedCallback () {
    this.shadowRoot.querySelector('#client-cert').removeEventListener('change')
    this.shadowRoot.querySelector('#register-cert').removeEventListener('submit')
  }

  attributeChangedCallback (name, oldVal, newVal) {
    const hasValue = newVal !== null
    console.log(`new ${name} ${newVal}`)
    switch (name) {
      case 'cert':
        break
      case 'cn':
        break
    }
  }

  showAuthenticated (cert, privkey) {
    /*
     * Default view when user is authenticated.
     * In this case it is a personal welcome message.
     * It could be a profile picture, or another complex element.
     * Ideally, it would be nice to integrate this into a menu.
     */
    this.shadowRoot.querySelector("pp-modal").innerHTML = `
  <h1 slot="header">Successfully Registered</h1>
`
    if (privkey) {
      this.shadowRoot.querySelector("pp-modal").innerHTML += getDownloadKeyTmp(cert, privkey).innerHTML
    }
    this.shadowRoot.querySelector("pp-modal").innerHTML += browserInstTmpl.innerHTML

    // hack to automatically start file download
    var tmpel = this.shadowRoot.querySelector('#privkey-p12')
    if (tmpel) tmpel.click()
  }

  generateSubmit (e) {
    var self = this
    if (e && e.preventDefault) e.preventDefault()
    var email = this.shadowRoot.querySelector('#email').value
    if (email.indexOf('@') === -1) {
      this.lastError = 'Please enter a valid email.'
      return
    }
    var password = this.shadowRoot.querySelector('#password').value
    var password2 = this.shadowRoot.querySelector('#password2').value
    if (password !== password2) {
      this.lastError = 'Passwords do not match.'
      return
    } else {
      this.shadowRoot.querySelector('pp-modal').innerHTML = `<h3 slot="header">Generating your key</h3>
<span>Please wait... This may take a minute.</span>
`
      this.generateClientCert(email, password).then((bundle) => {
        var privkey = bundle.privateKeyP12
        this.cert = bundle.certificate
        self.register(email, bundle.certificate, privkey)
      })
    }
  }

  importSubmit (e) {
    var self = this
    if (e && e.preventDefault) e.preventDefault()
    var reader = new FileReader()
    reader.readAsText(this.shadowRoot.querySelector('#client-cert').files[0])
    reader.onload = checkCert

    function checkCert (evt) {
      try {
        var cert = forge.pki.certificateFromPem(evt.target.result)
      } catch (e) {
        self.lastError = e.toString()
      }
      self.cert = evt.target.result
      console.log(cert.subject)
      self.register(cert.subject.getField('CN').value, evt.target.result)
    }
  }

  async register (cn, pem, privkey) {
    /*
     * Send client certificate to the server for registration.
     * Override this method with your own to customize the route/format.
     * Default is to send the cert in the POST body to /register.
     */
    this.innerHTML = `<span>Registering your key with server...</span>
`
    var registration = await fetch('/register', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-509-user-cert'
      },
      method: 'POST',
      body: pem
    })
    if (registration && registration.ok) {
      this.cn = cn
      this.showAuthenticated(pem, privkey)
    } else {
      this.shadowRoot.appendChild(registerTmpl.content.cloneNode(true))
      if (registration.status === 401) {
        this.lastError = await registration.text()
        return false
      } else {
        this.lastError = 'Registration failed. Try again?'
        return false
      }
    }
  }

  async generateClientCert (email, password) {
    /*
     * Generates an RSA 2048 bit key, then an X.509 cert, a CSR and finally a P12 file.
     * Response is the base64 encoded P12, and pem encoded cert.
     */
    // generate a keypair
    return new Promise(async (resolve, reject) => {
      forge.pki.rsa.generateKeyPair({bits: 2048, workers: 2}, function(err, keys) {
        if (err) {
          this.lastError = err.toString()
          reject(err)
        } else {
          // create a certificate
          var cert = forge.pki.createCertificate()
          cert.publicKey = keys.publicKey
          cert.serialNumber = '01'
          cert.validity.notBefore = new Date()
          cert.validity.notAfter = new Date()
          cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
          var attrs = [{
            name: 'commonName',
            value: email
          }]
          cert.setSubject(attrs)
          cert.setIssuer(attrs)
          cert.setExtensions([{
            name: 'basicConstraints',
            cA: true
          }, {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
          }, {
            name: 'subjectAltName',
            altNames: [{
              type: 6, // URI
              value: 'http://localhost'
            }]
          }])

          // self-sign certificate
          cert.sign(keys.privateKey, forge.md.sha256.create())

          // create PKCS12
          var newPkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(
            keys.privateKey, [cert], password,
            {
              generateLocalKeyId: true,
              friendlyName: 'Client Cert',
              algorithm: '3des'
            }
          )

          var newPkcs12Der = forge.asn1.toDer(newPkcs12Asn1).getBytes()

          var pkcs12Asn1 = forge.asn1.fromDer(newPkcs12Der)
          var pkcs12 = forge.pkcs12.pkcs12FromAsn1(pkcs12Asn1, false, password)

          // base64-encode p12
          var p12Der = forge.asn1.toDer(pkcs12Asn1).getBytes()
          var p12b64 = forge.util.encode64(p12Der)

          resolve({
            'privateKeyP12': p12b64,
            'certificate': forge.pki.certificateToPem(cert)
          })
        }
      })

    })
  }
}

customElements.define('client-cert-login', ClientCertRegistration)

export default ClientCertRegistration
