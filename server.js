import * as https from 'https'
import * as url from 'url'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import express from 'express'
import bodyParser from 'body-parser'
import marked from 'marked'
import forge from 'node-forge'
import clientCertificateAuth from 'client-certificate-auth'
import manifestToHtml from '../manifest-to-html/manifest-to-html.js'
import { getOptions, installCert } from './auth.js'
process.env.PKIDIR = process.env.PKIDIR || path.join(process.cwd(), 'pki')
process.env.CLIENT_CERT_DIR = process.env.CLIENT_CERT_DIR || path.join(process.cwd(), 'clients')

var manifest
var manifestHtml

var app = express();

app.get('/', async function(req, res) {
  if (req.connection && req.connection.getPeerCertificate) {
    var cert = req.connection.getPeerCertificate(true)
    if (cert && cert.subject && cert.subject.CN) manifestHtml = manifestHtml.replace('<body>', `<body>
<input type="hidden" id="client-cn" value="${cert.subject.CN}"></input>
`)
  }
  res.send(manifestHtml)
})

app.get('/README.md', function(req, res) {
  res.sendFile('./README.md', {
    root: process.cwd(),
    headers: {
      'content-type': 'text/markdown'
    }
  })
})

app.get('/manifest.json', function(req, res) {
  res.sendFile('./manifest.json', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/json'
    }
  })
})

app.get('/favicon.ico', function(req, res) {
  res.sendFile('./images/favicon.ico', {
    root: process.cwd(),
    headers: {
      'content-type': 'image/x-icon'
    }
  })
})

app.get('/android-chrome-192x192.png', function(req, res) {
  res.sendFile('./images/android-chrome-192x192.png', {
    root: process.cwd(),
    headers: {
      'content-type': 'image/png'
    }
  })
})

app.get('/512px-Icon_DINA_Schwerpunkte_Parldigi_01_Open_Source_Software_Schwarz.png', function(req, res) {
  res.sendFile('./images/512px-Icon_DINA_Schwerpunkte_Parldigi_01_Open_Source_Software_Schwarz.png', {
    root: process.cwd(),
    headers: {
      'content-type': 'image/png'
    }
  })
})

app.get('/forge.all.min.js', function(req, res) {
  res.sendFile('./node_modules/node-forge/dist/forge.all.min.js', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/javascript'
    }
  })
})

app.get('/marked.min.js', function(req, res) {
  res.sendFile('./node_modules/marked/marked.min.js', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/javascript'
    }
  })
})


app.get('/jquery.min.js', function(req, res) {
  res.sendFile('./node_modules/jquery/dist/jquery.min.js', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/javascript'
    }
  })
})

app.get('/sw.js', function(req, res) {
  res.sendFile('./sw.js', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/javascript'
    }
  })
})

app.get('/index.js', function(req, res) {
  res.sendFile('./index.js', {
    root: process.cwd(),
    headers: {
      'content-type': 'application/javascript'
    }
  })
})

app.get('/client-cert.json', clientCertificateAuth(getOptions, () => true), function(req, res) {
  res.send(JSON.stringify(req.connection.getPeerCertificate(true).subject));
});

app.post('/register', bodyParser.text({'type': 'application/x-509-user-cert'}), function (req, res) {
  var cert = forge.pki.certificateFromPem(req.body)
  var cn = cert.subject.getField('CN').value
  var caStore = forge.pki.createCaStore()
  
  forge.pki.verifyCertificateChain(caStore, [cert], async function(vfd, depth, chain) {
    try {
      installCert(cn, req.body)
    } catch (e) {
      if (e && e.code && e.code === 'EEXIST') {
        return res.status(401).send(`This common name is already registered. Please pick a unique one.`)
      } else {
        return res.status(500).send(`Unable to register cert ${req.body.cert}`)
      }
    }
    return res.send('')
  })
})

// Start the server
getOptions().then(async opts => {
  // preload this for cache
  manifest = await fs.promises.readFile('manifest.json', 'utf-8')
  manifestHtml = await manifestToHtml(manifest)
  manifestHtml = manifestHtml.replace('<body>', '<body>\n\n' + marked(await fs.promises.readFile('README.md', 'utf-8')))
  opts.rejectUnauthorized = false // set to false initially for public view
  https.createServer(opts, app).listen(4000)
  console.log(`https://localhost:4000`)
})

