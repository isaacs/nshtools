#!/usr/bin/env node

/* Bootstrap nshtools installation. */
nshtools = require(process.cwd() + '/nshtools');
nsh = nshtools.createNshtool();
nsh.getOption('--prefix', function(prefix_error, prefix_path) {
  nsh.bin_path = '/bin';
  if (prefix_error) {
    nsh.echo('Using default install prefix: ' + nsh.env.HOME);
    nsh.prefix_path = nsh.env.HOME;
    nsh.node_lib = '/.node_libraries';
  } else {
    nsh.prefix_path = prefix_path.trim();
    nsh.node_lib = '/lib/node/libraries';
  }
});
nsh.prompt("Do you want to install nshtools.js in " + nsh.prefix_path + nsh.node_lib + "? (Y/N) ",
function (response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.verbose = false;
    nsh.echo("\n\n\tInstalling ..." + new Date() + "\n");
    nsh.cp("nshtools.js", nsh.prefix_path + nsh.node_lib + '/nshtools.js', function (cp_error) {
      if (cp_error) {
        nsh.die("Install failed. " + cp_error + "\n");
      }
      nsh.echo("\nnshtools install complete. " + new Date() + "\n");
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing installed. " + new Date() + "\n");
  }
});
nsh.prompt("Do you want to install syncme.js in " + nsh.prefix_path +
nsh.bin_path + "? (Y/N) ",
function(response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.verbose = false;
    nsh.echo("\n\n\tInstalling ..." + new Date() + "\n");
    nsh.cp("syncme.js", nsh.prefix_path + nsh.bin_path + '/syncme.js', function (cp_error) {
      if (cp_error) {
        nsh.echo("Install failed. " + cp_error + "\n");
        return;
      }
      nsh.chmod(nsh.prefix_path + nsh.bin_path + '/syncme.js', 0775, function(error) {
        if (error) {
          nsh.die("ERROR: installing syncme.js: " + error + "\n");
        }
        nsh.echo("syncme.js made executable." + "\n");
      });
      nsh.echo("\nsyncme.js install complete. " + new Date() + "\n");
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing installed. " + new Date() + "\n");
  }
});
nsh.run();

