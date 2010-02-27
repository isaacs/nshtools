#!/usr/bin/env node

/**
 * syncme.js - take a list of git repos and walk through them doing a pull.
 *
 *
 */
(function () {
  var nsh = require('nshtools').createNshtool(),
      syncme_conf = nsh.env.HOME + '/.syncme',
      TrackedRepos = {},
      ABOUT = "NAME\n" +
  "\tsyncme.js - utility to do a git-pull on a list of cloned repositories\n" +
  "\nSYNOPSIS\n\n" +
  "syncme.js is an example script that reads $HOME/.syncme to get a list of git\n" +
  "repos and do a git pull to update the local contents.  If $HOME/.syncme\n" +
  "doesn't exist it will try to create an empty one. You edit syncme's\n" +
  "configuration with syncme. There are four basic options.\n\n" +
  "\t--add=NICKNAME:PATH\n" +
  "\t\tAdd a nickname and git repository clone's path to syncme\n\n" +
  "\t--remove=NICKNAME\n" +
  "\t\tRemove a nickname and it's path from syncme\n\n" +
  "\t--view\n" +
  "\t\tView a list of nicknames and paths syncme knows about\n\n" +
  "\t--run\n" +
  "\t\tRun git pull in all the locations tha syncme knows about\n\n" +
  "\t--help\n" + 
  "\t\tShow this help message.\n\n" +
  "If no options are specified syncme.js assumes the --run option.\n";
  
  
  /* Before doing anything read in .syncme.conf or create it. */
  nsh.getOption('--help', function(help_error, arg) {
    if (help_error) {
      /* Help not requested so skip */
      return;
    }
    nsh.die(ABOUT,0);
  });

  /* Push --run if no args are given to syncme.js */
  if (nsh.ARGV.length < 3) {
    nsh.ARGV.push('--run');
  }

  nsh.readFile(syncme_conf, function(read_error, data) {
    if (read_error) {
      nsh.writeFile(syncme_conf, JSON.stringify(TrackedRepos), 'utf8', 
      function(write_error) {
        if (write_error) {
          nsh.die("Can't read/write " + syncme_conf + ": " + write_error, 1);
        }
        nsh.echo("Created " + syncme_conf);
      });
    }
    TrackedRepos = JSON.parse(data);
  
    nsh.getOption('--add', function (option_error, arg) {
      var pair, key = 0, value = 1;
      if (option_error) {
        /* Add option not selected, skip */
        return;
      }
      if (arg.indexOf(':') < 0) {
        nsh.die(ABOUT + "ERROR: You need to specify a nickname and path separated by a colon", 1);
      }
      pair = arg.split(':', 2);
      nsh.echo("Added " + pair[value] + ' as ' + pair[key]);
      TrackedRepos[pair[key]] = pair[value];
      nsh.writeFile(syncme_conf, JSON.stringify(TrackedRepos), 
      function(error) {
        if (error) {
          nsh.die("ERROR: Can't write " + syncme_conf + ": " + error);
        }
      });      
    });
    nsh.getOption('--remove', function (option_error, value) {
      if (option_error) {
        /* Add option not selected, skip */
        return;
      }
      if (arg.indexOf(':') < 0) {
        nsh.die(ABOUT + "ERROR: You need to specify a nickname and path separated by a colon", 1);
      }
      nsh.echo("Removed " + arg);
      if (TrackedRepos[arg] === undefined) {
        nsh.die("ERROR: Can't find " + arg + " to remove.");
      }
      delete TrackedRepos[arg];
      nsh.writeFile(syncme_conf, JSON.stringify(TrackedRepos), 
      function(error) {
        if (error) {
          nsh.die("ERROR: Can't write " + syncme_conf + ": " + error);
        }
      });      
    });
    nsh.getOption('--view', function (option_error, value) {
      if (option_error) {
        /* Add option not selected, skip */
        return;
      }
      for(i in TrackedRepos) {
        nsh.echo(i + "\n\t" + TrackedRepos[i]);
      }
    });
    nsh.getOption('--run', function (option_error, value) {
      if (option_error) {
        /* Add option not selected, skip */
        return;
      }
      for(i in TrackedRepos) {
        (function(i, path) {
          nsh.task(i, function () {
            nsh.echo("Syncing: " + path);
            nsh.exec("cd " + path + ";git pull", function(error, stdout, stderr) {
              if (error) {
                nsh.die("ERROR: syncme.js: cd " + path + ";git pull\n" + error);
              }
              nsh.echo(stdout);
              nsh.echo(stderr);
            });
          });
        })(i,TrackedRepos[i]);
        /* We have a tasks all lined up so run them. */
        nsh.run();
      }
    });
  });
})();