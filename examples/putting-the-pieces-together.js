#!/usr/bin/env node
nshtools = require('nshtools');
nsh = nshtools.createNshtool();
nsh.task("Starting up ...", function () { nsh.echo("Started " + new Date()) } );
nsh.task("List a directory", function() {
  nsh.exec("ls -l", function(ls_error, contents) {
    if (ls_error) {
      nsh.echo(ls_error);
      return;
    }
    nsh.echo(contents);
  });
});
nsh.prompt("Did you see and tasks fire off? (Y/N) ", function (response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.echo("Success!");
  } else {
    nsh.echo("On no, that's not supposed to happen.");
  }
});
nsh.run();/* IMPORTANT: This needs to be the last thing called! */

