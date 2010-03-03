#!/usr/bin/env node
option_test = '--testme="Hello World"';
nshtools = require(process.cwd() + '/nshtools');
nsh = nshtools.createNshtool();
nsh.echo("Running manual test. e.g. --test='hello world'");
nsh.getOption('--test', function (test_error, value) {
  if (test_error) {
    nsh.echo("Try running: node test-nshtools.getOption.js --test='hello world'");
    return;
  }
  nsh.echo("OK? --test returned [" + value + "]");
});
nsh.echo("Running automated tests.");
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

nsh.echo("Testing Short Option (-t):");
nsh.argv.push('-t');
nsh.getOption('-t', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  nsh.echo('OK, found -t');
  if (arg === undefined) {
    nsh.echo('OK, found -t with related arg undefined OK.');
  }
});

nsh.echo("Testing Short Option (-t optional_arg):");
nsh.argv.push('-t');
nsh.argv.push('optional_arg');
nsh.getOption('-t', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  if (arg === 'optional_arg') {
    nsh.echo('OK, found -t optional_arg.');
  } else {
    nsh.echo('Oops, found -t but not "optional_arg" [' + arg + ']');
  }
});

nsh.echo("Testing Combined short Options (-zxvf):");
nsh.argv.push('-zxvf');
nsh.getOption('-t', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  nsh.echo('OK, found -t');
  if (arg === undefined) {
    nsh.echo('OK, found -t with related arg undefined OK.');
  }
});
nsh.echo("Checking for remaining args: " + (function (args) {
  var buf = [];
  if (nsh.argv.indexOf('-x') < 0) {
    buf.push('Oops, missing -x');
  }
  if (nsh.argv.indexOf('-v') < 0) {
    buf.push('Oops, missing -v');
  }
  if (nsh.argv.indexOf('-f') < 0) {
    buf.push('Oops, missing -f');
  }
  if (buf.length > 0) {
    return "\n\t" + buf.join("\n\t");
  }
  return "Ok, -x, -v, -f found.";
})(nsh.argv));

nsh.argv = [];

nsh.echo("Testing Short Option (-zxvf optional_arg):");
nsh.argv.push('-zxvf');
nsh.argv.push('optional_arg');
nsh.getOption('-z', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  if (arg === undefined) {
    nsh.echo('OK, found -z with undefined optional_arg.');
  } else {
    nsh.echo('Oops, found -z but stole "optional_arg" [' + arg + ']');
  }
});

nsh.getOption('-x', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  if (arg === undefined) {
    nsh.echo('OK, found -x with undefined optional_arg.');
  } else {
    nsh.echo('Oops, found -x but stole "optional_arg" [' + arg + ']');
  }
});

nsh.getOption('-v', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  if (arg === undefined) {
    nsh.echo('OK, found -v with undefined optional_arg.');
  } else {
    nsh.echo('Oops, found -v but stole "optional_arg" [' + arg + ']');
  }
});

nsh.getOption('-f', function(t_error, arg) {
  if (t_error) {
    nsh.echo("Oops should have found this: " + t_error);
  }
  if (arg === undefined) {
    nsh.echo('Oops, found -f with undefined optional_arg.');
  } else {
    nsh.echo('Ok, found -f with "optional_arg" [' + arg + ']');
  }
});






