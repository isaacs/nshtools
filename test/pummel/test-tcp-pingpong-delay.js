process.mixin(require("../common"));
tcp = require("tcp");


var tests_run = 0;

function pingPongTest (port, host, on_complete) {
  var N = 100;
  var DELAY = 1;
  var count = 0;
  var client_closed = false;

  var server = tcp.createServer(function (socket) {
    socket.setEncoding("utf8");

    socket.addListener("data", function (data) {
      puts(data);
      assert.equal("PING", data);
      assert.equal("open", socket.readyState);
      assert.equal(true, count <= N);
      setTimeout(function () {
        assert.equal("open", socket.readyState);
        socket.write("PONG");
      }, DELAY);
    });

    socket.addListener("timeout", function () {
      debug("server-side timeout!!");
      assert.equal(false, true);
    });

    socket.addListener("end", function () {
      puts("server-side socket EOF");
      assert.equal("writeOnly", socket.readyState);
      socket.close();
    });

    socket.addListener("close", function (had_error) {
      puts("server-side socket close");
      assert.equal(false, had_error);
      assert.equal("closed", socket.readyState);
      socket.server.close();
    });
  });
  server.listen(port, host);

  var client = tcp.createConnection(port, host);

  client.setEncoding("utf8");

  client.addListener("connect", function () {
    assert.equal("open", client.readyState);
    client.write("PING");
  });

  client.addListener("data", function (data) {
    puts(data);
    assert.equal("PONG", data);
    assert.equal("open", client.readyState);

    setTimeout(function () {
      assert.equal("open", client.readyState);
      if (count++ < N) {
        client.write("PING");
      } else {
        puts("closing client");
        client.close();
        client_closed = true;
      }
    }, DELAY);
  });

  client.addListener("timeout", function () {
    debug("client-side timeout!!");
    assert.equal(false, true);
  });

  client.addListener("close", function () {
    puts("client close");
    assert.equal(N+1, count);
    assert.equal(true, client_closed);
    if (on_complete) on_complete();
    tests_run += 1;
  });
}

pingPongTest(PORT);

process.addListener("exit", function () {
  assert.equal(1, tests_run);
});
