/**
 * test-readFile-binary.js - node started throwing segfaults on readFile when encoding is specified.
 */

var sys = require('sys'),
  fs = require('fs');


sys.puts("Trying readFile(filename, 'utf8', callback)") ;

fs.readFile('README.asciidoc', {'encoding' :'utf8'}, function (err, data) {
  if (err) {
    sys.error(err);
    process.exit(1);
  }
  sys.puts("README: " + data);
});

fs.readFile('media/sea-rock.png', {'encoding' : 'binary' }, function (err, data) {
  // Copy file and compare with original
  sys.puts(data);
});

