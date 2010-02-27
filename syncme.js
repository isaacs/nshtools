#!/usr/bin/env node

/**
 * syncme.js - take a list of git repos and walk through them doing a pull.
 *
 *
 */
if (process.paths.indexOf('.') < 0) {
  process.paths.push('.');
}

var nshtools = require('nshtools'),
    nsh = nshtools.createNshtool(),
    syncme_conf = nsh.env.HOME + './.syncme.conf',
    TackedRepos = {}, USAGE;

USAGE = "\n\tNAME: syncme.js\n" +
        "\n\n\tProcess a list of saved git repo clones and do a git pull.\n" +
        "


/* Before doing anything read in .syncme.conf or create it. */
nsh.readFile(syncme_conf, function(read_error, data) {
  if (stat_error) {
    nsh.writeFile(syncme_conf, JSON.stringify(TrackedRepos), 'utf8', function(write_error) {
      nsh.die("Can't read/write " + syncme_conf + ": " + write_error, 1);
      nsh.echo("Created " + syncme_conf);
    });
  }
  
  nsh.getOption('--add', function (add_error, arg) {
    var parts, key, value;
    if (arg.indexOf(':') < 0) {
      nsh.die(USAGE, 1);
    }
    nsh.echo("Adding " + parts[1] + ' as ' + parts[0] + ' to ' + synceme_conf);
  });
  nsh.getOption('--remove', function (add_error, value) {
    nsh.echo("Removing " + value + ' to ' + synceme_conf);
  });

});




nsh.echo("Syncing git-repos.");

nsh.task("Sync node", function (){
  nsh.chdir
});