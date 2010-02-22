#!/usr/bin/env node
option_test = '--testme="Hello World"';
nshtools = require(process.cwd() + '/nshtools');
nsh = nshtools.createNshtool();
nsh.argv.push(option_test);
nsh.getOption('--testme', function (testme_error, value) {
  if (testme_error) {
    nsh.echo("Failed: should have found the --testme option. " + testme_error);
  } else {
    if (value.trim() === '"Hello World"') {
      nsh.echo("Success: --testme returned " + value);  
    } else {
      nsh.echo("ERROR: Get unexpected wrong value: " + value);
    }
  }
});
nsh.getOption('--testme', function (testme_error, value) {
  if (testme_error) {
    nsh.echo("Success: last call should have removed --testme option. " + testme_error);
  } else {
    nsh.echo("Failed: should not still have --testme in nsh.argv list returned " + value);
  }
});
nsh.getOption('--test2', function (test2_error, value) {
  if (test2_error) {
    nsh.echo("Try running: node test-nshtools.getOption.js --test2='hello world'");
    return;
  }
  nsh.echo("--test2 returned [" + value + "]");
});
