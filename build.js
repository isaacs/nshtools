#!/usr/bin/env node
/**
 * build.js - a simple nshoolt's build script.  Basically this one
 * just scans for txt files and runs them through asciidoc.
 */

/* It's helpful to add the working path to the node search path */
if(process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var nshtools = require('nshtools'),
    nsh = nshtools.createNshtool();


/* Main script body */
(function () {
  nsh.globFolder('.', '.txt$', function (error, filename) {
    if (error) {
      nsh.die(error);
    }
    if (filename === "README.txt") {
      /* FIXME: need an easy way to convert AsciiDoc to Markdown for github project page.
      nsh.cp("README.txt","README.md", nsh.NoOp); */
      filename = "--out-file=index.html README.txt";
    }
    nsh.exec('asciidoc --verbose ' + filename, function (error, stdout, stderr) {
      if (error) {
        nsh.echo("Problem converting " + filename + " html");
        nsh.echo(stderr)
        nsh.die(error);
      }
      nsh.echo(stderr)
      nsh.echo(stdout);
    });
  });

  nsh.globFolder('docs', '.txt$', function (error, filename) {
    if (error) {
      nsh.die(error);
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
