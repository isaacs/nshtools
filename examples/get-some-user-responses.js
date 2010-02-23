#!/usr/bin/env node
nshtools = require('nshtools');
nsh = nshtools.createNshtool();
nsh.prompt("What is your name?", function(response) {
  nsh.echo("Glad to me you " + response.trim());
});
nsh.prompt("Are you having a nice day? ", function (response) {
  nsh.echo("So what you're telling me is " + response.trim() + " about today.");
});
nsh.run();/* Run the prompts and fire the callbacks */

