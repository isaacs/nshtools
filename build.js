#!/usr/bin/env node
/**
 * build.js - a simple nshoolt's build script.  Basically this one
 * just scans for txt files and runs them through asciidoc.
 */

/* It's helpful to add the working path to the node search path */
if(process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var nsh = require('nshtools').createNshtool();

ABOUT = "NAME\n" +
"\nbuild.js - generate HTML pages for nshtools\n\n" +
"SYNPOSIS\n\n" +
"build.js looks for files ending in .asciidoc and invokes asciidoc to turn them into web pages.\n\n" +
"EXAMPLES\n\n" +
"build.js is simple.\n" +
"\n\tnode build.js\n\n";



nsh.getOption('--help', function(option_error, arg) {
  if (option_error) {
    /* don't need help. */
    return;
  }
  nsh.die(ABOUT,0);
});

/* Main script body */
(function () {
  nsh.globFolder('.', '.asciidoc$', function (error, filename) {
    if (error) {
      nsh.die(error);
    }
    nsh.exec('asciidoc ' + filename, function (error, stdout, stderr) {
      if (error) {
        nsh.echo("Problem converting " + filename + " html");
        nsh.echo(stderr)
        nsh.die(error);
      }
      nsh.echo(stderr)
      nsh.echo("Processed " + filename);
    });
  });

  nsh.globFolder('docs', '.asciidoc$', function (error, filename) {
    if (error) {
      // docs doesn't exist so skip it.
      return;
    }
    
    nsh.exec('asciidoc --verbose ' + 'docs/' + filename, function (error, stdout, stderr) {
      if (error) {
        nsh.echo("Problem converting " + 'docs/' + filename + " html");
        nsh.echo(stderr)
        nsh.die(error);
      }
      nsh.echo(stderr)
      nsh.echo(stdout);
    });
  });
})();
