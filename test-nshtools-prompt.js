#!/usr/bin/env node

nshtools = require(process.cwd() + '/nshtools');
sh = nshtools.createShtool();
sh.echo("Try some interactive prompting.");
sh.prompt('Q1? ',function (response) { sh.echo('A1: ' + response) });
sh.prompt('Q2? ',function (response) { sh.echo('A2: ' + response) });
sh.prompt('Q3? ',function (response) { sh.echo('A3: ' + response) });
sh.prompt('Did you answer Q1-Q3? (Y/N) ',function (response) { 
  if (response.toUpperCase().trim() === 'Y') {
    sh.echo('Success'); 
  } else {
    sh.echo('Failed: more work to do debugging nshtools.');
  }
});
sh.run();
