#!/usr/bin/env node
/**
 * Simple tests for shtools module.
 */
nshtools = require(process.cwd() + '/nshtools');

nsh = nshtools.createNshtool();
nsh.verbose = true;

nsh.task("Basic file operation test.", function (error, result) {
  nsh.writeFile('/tmp/test.txt', "Hello World: " + new Date(), 'utf8', function(create_error, result) {
    if (create_error) {
      nsh.echo("create /tmp/test.txt: " + error);
      return;
    }
    nsh.stat('/tmp/test.txt', function(stat_error, stat) {
      if (stat_error) {
        nsh.echo("Can't stat /tmp/test.txt: " + stat_error);
        return false;
      }
      if (stat.isFile()) {
        nsh.echo("File exists /tmp/test.txt");
        nsh.cp('/tmp/test.txt', '/tmp/test2.txt', function(cp_error) {
          if (cp_error) {
            nsh.echo("cp_error: " + cp_error);
            return;
          }
        
          nsh.stat('/tmp/test2.txt', function(stat2_error, stat2) {
            if (stat2_error) {
              nsh.echo("ERROR: /tmp/test2.txt: " + stat2_error);
              return false;
            }
            nsh.echo("/tmp/test2.txt copied");
            nsh.mv("/tmp/test.txt","/tmp/test1.txt", function(mv_error) {
              if (mv_error) {
                nsh.echo("mv_error /tmp/test.txt /tmp/test1.txt: " + mv_error);
                return;
              }
              nsh.echo("Attempting to removing /tmp/test1.txt, /tmp/test2.txt");
              nsh.unlink('/tmp/test1.txt', function(unlink_error) {
                if (unlink_error) {
                  nsh.echo("Can't remove /tmp/test1.txt: " + unlink_error);
                  return;
                }
                nsh.echo("Removed /tmp/test1.txt OK");
              });
              nsh.unlink('/tmp/test2.txt', function(unlink_error) {
                if (unlink_error) {
                  nsh.echo("Can't remove /tmp/test2.txt: " + unlink_error);
                  return;
                }
                nsh.echo("Removed /tmp/test2.txt OK");
              });
            });
          });
        });
      } else {
        nsh.echo("/tmp/test.txt is NOT a file. -> " + sys.inspect(stat));
      }
    });
  });
});

nsh.prompt("Did you get some results working with files? (Y/N)\n\n", function(response) {
  if (response.toUpperCase().trim() === 'Y') {
    nsh.puts("Success");
  } else {
    nsh.puts("Failure: Task integration not working right.  Need to debug.");
  }
});

nsh.run();
