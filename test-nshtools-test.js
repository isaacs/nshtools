#!/usr/bin/env node
/**
 * test-nshtools-test.js - Test the merged test object a basic minimal level.
 *
 * @author R. S. Doiel, <rsdoiel@gmail.com>
 * copyright (c) 2010, R. S. Doiel, all rights reserved
 *
 * Released under "The BSD License" as described at http://opensource.org/licenses/bsd-license.php
 */

if (process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var nshtools = require('nshtools'),
    nsh = nshtools.createNshtool(),
    test = nshtools.createTest();

nsh.echo("Running some test of the test object.");
nsh.echo("Testing test.echo(): " + (function() {
  var test_messages = [], result = '';
  test_messages.push('This is a test of test.echo: ');
  test_messages.push("Message two.");
  test_messages.push("Message three.");

  test.echo(test_messages[0]);
  test.echo(test_messages[1]);
  test.echo(test_messages[2]);
  result = test.echo();
  
  if (result === test_messages.join("\n")) {
    test.success();
    return "Ok, test.echo() worked";
  }
  test.fail("Oops, test.echo() returned: " + result);
  return "Oops, test.echo() returned: " + result;
})());

nsh.echo("Testing test.success(): " + (function () {
  var i = test.successes;
  test.success();
  
  if (test.successes === (i + 1)) {
    return "Ok, test.success() worked.";
  }
  test.fail("Oops, test.success() failed.");
  return "Oops, test.sucess() failed: expected [" + (i + 1) + "] found [" + test.successes + "]";
})());

