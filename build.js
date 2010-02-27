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

/* Main script body */
(function () {
  nsh.stat('README', function (err, stat) {
    if (err) {
      /* README is probably called README.txt or README.md, skip it. */
      return;
    }
    nsh.exec("asciidoc --verbose --out-file=index.html README", function (error, stdout, stderr) {
      if (error) {
        nsh.echo("Problem converting " + filename + " html");
        nsh.echo(stderr)
        nsh.die(error);
      }
      nsh.echo(stderr)
      nsh.echo(stdout);
     });
  });
  nsh.globFolder('.', '.asciidoc$', function (error, filename) {
    if (error) {
      nsh.die(error);
    }
    /*
    if (filename === "README.asciidoc") {
      filename = "--out-file=index.html README.asciidoc";
    }
    */
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

  nsh.globFolder('docs', '.asciidoc$', function (error, filename) {
    if (error) {
      // docs doesn't exist so skip it.
      return; // nsh.die(error);
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
