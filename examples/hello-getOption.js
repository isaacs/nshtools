#!/usr/bin/env node
nshtools = require('nshtools');
nsh = nshtools.createNshtool();
nsh.getOption('--hello', function(error, value) {
  if (error) {
    nsh.echo("Try running this with --hello=Me and see what happens.");
    return;
  }
  nsh.echo("Hello " + value);
});

