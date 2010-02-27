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
    nsh.verbose = true;
    nsh.echo("\n\n\tInstalling ..." + new Date());
    nsh.cp("nshtools.js", nsh.prefix_path + nsh.node_lib + '/nshtools.js', function (cp_error) {
      if (cp_error) {
        nsh.echo("Install failed. " + cp_error);
        return;
      }
      nsh.echo("Install complete. " + new Date());
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing installed. " + new Date());
  }
});
nsh.prompt("Do you want to install syncme.js in " + nsh.prefix_path +
nsh.bin_path + "? (Y/N) ",
function(response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.verbose = true;
    nsh.echo("\n\n\tInstalling ..." + new Date());
    nsh.cp("syncme.js", nsh.prefix_path + nsh.bin_path + '/syncme.js', function (cp_error) {
      if (cp_error) {
        nsh.echo("Install failed. " + cp_error);
        return;
      }
      nsh.chmod(nsh.prefix_path + nsh.bin_path + '/syncme.js', 0775, function(error) {
        if (error) {
          nsh.die("ERROR: installing syncme.js: " + error);
        }
        nsh.echo("syncme.js made executable.");
      });
      nsh.echo("Install complete. " + new Date());
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing installed. " + new Date());
  }
});
nsh.run();

