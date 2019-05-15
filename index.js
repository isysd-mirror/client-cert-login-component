var content
var privkey
var cert

window.addEventListener('load', async () => {
  loadDemo()
  var cnel = document.getElementById('client-cn')
  if (cnel && cnel.value && cnel.value.length > 0) {
    // user is logged in!
    showWelcome(cnel.value)
  } else {
    // show registration forms
    showRegister()
  }
})

function loadDemo () {
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    iframes[i].parentNode.removeChild(iframes[i]);
  }

  document.getElementById('demo')
          .nextSibling
          .nextSibling
          .innerHTML = `<div id="demo-content" style="height: 315px; width: 560px; border: 2px solid blue; margin: 1em; padding: 1em;"></div>`

  content = document.getElementById('demo-content')
}

function showRegister (e) {
  if (e && e.preventDefault) e.preventDefault()
  content.innerHTML = `<div id="demo-content">
<form id="register-cert" action="/register" enctype="multipart/form-data" method="post">
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
</div>
`
  document.getElementById('client-cert').addEventListener('change', importSubmit)
  document.getElementById('register-cert').addEventListener('submit', generateSubmit)
}

function showSuccess () {
  content.innerHTML = `<h3>Successfully Registered</h3>`
  if (privkey) {
    content.innerHTML += `
    <p>
    Please <a id="privkey-p12" download="privkey.p12" href="data:application/x-pkcs12;base64,${encodeURIComponent(privkey)}">download</a> (if download wasn't automatically initiated) your new private key file, and install it in your browser.
    </p>
    <p>
    You may also <a id="certificate-link" download="client-cert.pem" href="data:application/x-x509-user-cert;charset=utf-8,${encodeURIComponent(cert)}">download your certificate</a>, though that was already sent to the server, and it is bundled with your private key in the .p12 file.
    </p>
`
  }
  content.innerHTML += `
    <p>
    After installing the certificate in your browser, <a href="/">click here</a>, or reload this page. You should now see a welcome message, instead of a registration form.
    </p>
    <h5>Browser Installation Instructions</h5>
    <ul>
      <li><a href="https://support.securly.com/hc/en-us/articles/206081828-How-to-manually-install-the-Securly-SSL-certificate-in-Chrome" target="_blank">Chrome</a></li>
      <li><a href="https://support.globalsign.com/customer/portal/articles/1211486-install-client-digital-certificate---firefox-for-windows" target="_blank">Firefox</a></li>
      <li><a href="https://support.globalsign.com/customer/en/portal/articles/2374828-in-browser-installation-of-client-certificates" target="_blank">Edge</a></li>
    </ul>

`
  // hack to automatically start file download
  var tmpel = document.getElementById('privkey-p12')
  if (tmpel) tmpel.click()
}

function showWelcome (cn) {
  content.innerHTML = `<h3>Welcome ${cn}</h3>
<p>
You have successfully registered with the MTLS example app. Your session is now end to end encrypted, and you will not need to refresh the session until the next browser restart or cache clear.
</p>`
}

function generateSubmit (e) {
  if (e && e.preventDefault) e.preventDefault()
  var email = document.getElementById('email').value
  if (email.indexOf('@') === -1) {
    document.getElementById('form-error').style.display = "inline"
    return document.getElementById('form-error').innerHTML = "Please enter a valid email."
  }
  var password = document.getElementById('password').value
  var password2 = document.getElementById('password2').value
  if (password !== password2) {
    document.getElementById('form-error').style.display = "inline"
    document.getElementById('form-error').innerHTML = "Passwords do not match."
  } else {
    content.innerHTML = `<span>Generating your key, please wait...</span>
`
    // setTimeout hack to ensure ^^^ tmp message loads
    setTimeout(() => {
      var bundle = generateClientCert(email, password)
      privkey = bundle.privateKeyP12
      cert = bundle.certificate
      register(cert)
    }, 1)
  }
}

function importSubmit (e) {
  if (e && e.preventDefault) e.preventDefault()
  var reader = new FileReader()
  reader.readAsText(document.getElementById('client-cert').files[0])
  reader.onload = checkCert

  function checkCert(evt){
    try {
      var cert = forge.pki.certificateFromPem(evt.target.result)
    } catch(e) {
      document.getElementById('form-error').style.display = "inline"
      document.getElementById('form-error').innerHTML = e.toString()    
    }
    register(evt.target.result)
  }
}

async function register (pem) {
  content.innerHTML = `<span>Registering your key with server...</span>
`
  setTimeout(async () => {
    var registration = await fetch('/register', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-509-user-cert'
      },
      method: "POST",
      body: pem
    })
    if (registration && registration.ok) {
      showSuccess()
    } else {
      showRegister()
      if (registration.status === 401) {
        document.getElementById('form-error').style.display = "inline"
        return document.getElementById('form-error').innerHTML = await registration.text()
      } else {
        document.getElementById('form-error').style.display = "inline"
        return document.getElementById('form-error').innerHTML = "Registration failed. Try again?"
      }
    }
  }, 1)
}

function generateClientCert (email, password) {
  // generate a keypair
  var keys = forge.pki.rsa.generateKeyPair(2048);

  // create a certificate
  var cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  var attrs = [{
    name: 'commonName',
    value: email
  }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
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
  }]);

  // self-sign certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // create PKCS12
  var newPkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey, [cert], password,
    {
      generateLocalKeyId: true,
      friendlyName: 'Client Cert',
      algorithm: '3des'
    }
  )

  var newPkcs12Der = forge.asn1.toDer(newPkcs12Asn1).getBytes();

  var pkcs12Asn1 = forge.asn1.fromDer(newPkcs12Der);
  var pkcs12 = forge.pkcs12.pkcs12FromAsn1(pkcs12Asn1, false, password);

  // base64-encode p12
  var p12Der = forge.asn1.toDer(pkcs12Asn1).getBytes();
  var p12b64 = forge.util.encode64(p12Der);

  return {
    'privateKeyP12': p12b64,
    'certificate': forge.pki.certificateToPem(cert)
  }
}
