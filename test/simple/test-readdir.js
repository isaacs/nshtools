process.mixin(require("../common"));

var got_error = false,
    readdirDir = path.join(fixturesDir, "readdir")

var files = ['are'
            , 'dir'
            , 'empty'
            , 'files'
            , 'for'
            , 'just'
            , 'testing.js'
            , 'these'
            ];


puts('readdirSync ' + readdirDir);
var f = fs.readdirSync(readdirDir);
p(f);
assert.deepEqual(files, f.sort());


puts("readdir " + readdirDir);
fs.readdir(readdirDir, function (err, f) {
  if (err) {
    puts("error");
    got_error = true;
  } else {
    p(f);
    assert.deepEqual(files, f.sort());
  }
});

process.addListener("exit", function () {
  assert.equal(false, got_error);
  puts("exit");
});
