process.mixin(require("./common"));

var tcp = require("tcp"),
    sys = require("sys"),
    http = require("http");

var PORT = 2143;

var errorCount = 0;
var eofCount = 0;

var server = tcp.createServer(function(socket) {
  socket.close();
});
server.listen(PORT);

var client = http.createClient(PORT);

client.addListener("error", function() {
  sys.puts("ERROR!");
  errorCount++;
});

client.addListener("end", function() {
  sys.puts("EOF!");
  eofCount++;
});

var request = client.request("GET", "/", {"host": "localhost"});
request.addListener('response', function(response) {
  sys.puts("STATUS: " + response.statusCode);
});
request.close();

setTimeout(function () {
  server.close();
}, 500);


process.addListener('exit', function () {
  assert.equal(0, errorCount);
  assert.equal(1, eofCount);
});
