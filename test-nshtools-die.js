#!/usr/bin/env node
if (process.paths.indexOf('.') < 0) {
  process.paths.push('.');
}
var nshtools = require('nshtools');
nsh = nshtools.createNshtool();

nsh.echo("We should die next.");
nsh.die("This should be the last statement.");
nsh.echo("Ooops: something went wrong.");
