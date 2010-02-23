#!/usr/bin/env node
nshtools = require('nshtools');
nsh = nshtools.createNshtool();
nsh.cp('/tmp/file1.txt','/tmp/file2.txt', function (error) {
  if (error) {
    nsh.echo("Oops, something went wrong: " + error);
    return;
  }
  nsh.echo("Success!");
});

