process.mixin(require("../common"));
tcp = require("tcp");
fs=require("fs");

var tests_run = 0;

function tlsTest (port, host, caPem, keyPem, certPem) {
  var N = 50;
  var count = 0;
  var sent_final_ping = false;

  var server = tcp.createServer(function (socket) {
    assert.equal(true, socket.remoteAddress !== null);
    assert.equal(true, socket.remoteAddress !== undefined);
    if (host === "127.0.0.1")
      assert.equal(socket.remoteAddress, "127.0.0.1");
    else if (host == null)
      assert.equal(socket.remoteAddress, "127.0.0.1");

    socket.setEncoding("utf8");
    socket.setNoDelay();
    socket.timeout = 0;

    socket.addListener("data", function (data) {
      var verified = socket.verifyPeer();
      var peerDN = socket.getPeerCertificate("DNstring");
      assert.equal(verified, 1);
      assert.equal(peerDN, "C=UK,ST=Acknack Ltd,L=Rhys Jones,O=node.js,"
                           + "OU=Test TLS Certificate,CN=localhost");
      puts("server got: " + JSON.stringify(data));
      assert.equal("open", socket.readyState);
      assert.equal(true, count <= N);
      if (/PING/.exec(data)) {
        socket.write("PONG");
      }
    });

    socket.addListener("end", function () {
      assert.equal("writeOnly", socket.readyState);
      socket.close();
    });

    socket.addListener("close", function (had_error) {
      assert.equal(false, had_error);
      assert.equal("closed", socket.readyState);
      socket.server.close();
    });
  });

  server.setSecure('X509_PEM', caPem, 0, keyPem, certPem);
  server.listen(port, host);

  var client = tcp.createConnection(port, host);

  client.setEncoding("utf8");
  client.setSecure('X509_PEM', caPem, 0, keyPem, caPem);

  client.addListener("connect", function () {
    assert.equal("open", client.readyState);
    var verified = client.verifyPeer();
    var peerDN = client.getPeerCertificate("DNstring");
    assert.equal(verified, 1);
    assert.equal(peerDN, "C=UK,ST=Acknack Ltd,L=Rhys Jones,O=node.js,"
			 + "OU=Test TLS Certificate,CN=localhost");
    client.write("PING");
  });

  client.addListener("data", function (data) {
    assert.equal("PONG", data);
    count += 1;

    puts("client got PONG");

    if (sent_final_ping) {
      assert.equal("readOnly", client.readyState);
      return;
    } else {
      assert.equal("open", client.readyState);
    }

    if (count < N) {
      client.write("PING");
    } else {
      sent_final_ping = true;
      client.write("PING");
      client.close();
    }
  });

  client.addListener("close", function () {
    assert.equal(N+1, count);
    assert.equal(true, sent_final_ping);
    tests_run += 1;
  });
}


var have_tls;
try {
  var dummy_server = tcp.createServer();
  dummy_server.setSecure();
  have_tls=true;
} catch (e) {
  have_tls=false;
} 

if (have_tls) {
  var caPem = fs.readFileSync(fixturesDir+"/test_ca.pem");
  var certPem = fs.readFileSync(fixturesDir+"/test_cert.pem");
  var keyPem = fs.readFileSync(fixturesDir+"/test_key.pem");

  /* All are run at once, so run on different ports */
  tlsTest(PORT, "localhost", caPem, keyPem, certPem);
  tlsTest(PORT+1, null, caPem, keyPem, certPem);

  process.addListener("exit", function () {
    assert.equal(2, tests_run);
  });
} else {
  puts("Not compiled with TLS support -- skipping test");
  process.exit(0);
}
