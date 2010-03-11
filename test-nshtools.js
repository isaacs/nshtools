#!/usr/bin/env node

/**
 * test-nshtools.js - a wrapper for all the separate tests.
 */
if (process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var nsh = require('nshtools').createNshtool(), sys = require('sys'),
  tests = [];

tests.push("node test-nshtools-ds.js");
tests.push("node test-nshtools-getOption.js");
tests.push("node test-nshtools-globFolder.js");
tests.push("node test-nshtools-run.js");
tests.push("node test-nshtools-test.js");
tests.push("echo 'You should manually interactive tests: test-nshtools-basic.js, test-nshtools-prompt.js, test-nshtools-die.js'");

sys.puts("Running Automated Tests");
for (test in tests) {
 (function (testname) {
    sys.exec(testname, function (err, stderr, stdout) {
      if (err) {
        sys.error('TEST ERROR: ' + err);
      }
      if (stderr.trim() !== "") {
        sys.puts(stderr);
      }
      if (stdout.trim() !== "") {
        sys.puts(stdout);
      }
      sys.puts("Finished: " + testname + ": " + new Date());
    });
 })(tests[test]);
}
