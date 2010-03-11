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
nsh.prompt("Do you want to uninstall nshtools.js in " + nsh.prefix_path + nsh.node_lib + "? (Y/N) ",
function (response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.verbose = false;
    nsh.echo("\n\n\tUninstalling ..." + new Date() + "\n");
    nsh.remove("nshtools.js", nsh.prefix_path + nsh.node_lib + '/nshtools.js', function (remove_error) {
      if (remove_error) {
        nsh.die("Uninstall failed. " + remove_error + "\n");
      }
      nsh.echo("\nnshtools uninstall complete. " + new Date() + "\n");
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing uninstalled. " + new Date() + "\n");
  }
});
nsh.prompt("Do you want to install syncme.js in " + nsh.prefix_path +
nsh.bin_path + "? (Y/N) ",
function(response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.verbose = false;
    nsh.echo("\n\n\tUninstalling ..." + new Date() + "\n");
    nsh.remove("syncme.js", nsh.prefix_path + nsh.bin_path + '/syncme.js', function (remove_error) {
      if (remove_error) {
        nsh.echo("Uninstall failed. " + remove_error + "\n");
        return;
      }
      nsh.echo("\nsyncme.js install complete. " + new Date() + "\n");
    });
  } else {
    nsh.echo("\n\n\tNo action taken. Nothing uninstalled. " + new Date() + "\n");
  }
});
nsh.run();

