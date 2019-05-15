# Mutual TLS (MTLS) Login Example

### Demo

<div id="demo-content">[![Demo video](https://raw.githubusercontent.com/isysd-mirror/mtls-auth-example/isysd/videos/demo.gif)](https://www.youtube.com/embed/GVVUmgh5GsU)</div>

### About

This app lets users register with an existing client TLS certificate, or generate one in their browser, using [forge](https://github.com/digitalbazaar/forge).

### Usage

To install, clone this repo from git, then run `npm i`.

```
git clone https://github.com/isysd-mirror/mtls-auth-example.git
cd mtls-auth-example
npm i
```

Then to start the server, run `npm start`.

### Configuration

This example app has very basic configuration via environment variables.

| Variable | Default |
|----------|---------|
| PKIDIR   | ./pki   |
| CLIENT_CERT_DIR | ./clients |

The example works best with a server TLS certificate that is trusted by the browser, or the browser may not display the client certificate selection. Either use a real SSL cert signed by a normal CA, or first install the server cert in your browser for the demo session.

For chrome you can also set `chrome://flags/#allow-insecure-localhost` for the test environment.

### License

This app Copyright [Ira Miller](https://iramiller.com), available under the [MIT license](/LICENSE).
