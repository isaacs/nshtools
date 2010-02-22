#!/usr/bin/env node
/**
 * Simple tests for shtools module.
 */
nshtools = require(process.cwd() + '/nshtools');

sh = nshtools.createShtool();
sh.verbose = true;
sh.task("Basic file operation test.", function (error, result) {
  sh.writeFile('/tmp/test.txt', "Hello World: " + new Date(), 'utf8', function(create_error, result) {
    if (create_error) {
      sh.echo("create /tmp/test.txt: " + error);
      return;
    }
    sh.stat('/tmp/test.txt', function(stat_error, stat) {
      if (stat_error) {
        sh.echo("Can't stat /tmp/test.txt: " + stat_error);
        return false;
      }
      if (stat.isFile()) {
        sh.echo("File exists /tmp/test.txt");
        sh.cp('/tmp/test.txt', '/tmp/test2.txt', function(cp_error) {
          if (cp_error) {
            sh.echo("cp_error: " + cp_error);
            return;
          }
        
          sh.stat('/tmp/test2.txt', function(stat2_error, stat2) {
            if (stat2_error) {
              sh.echo("ERROR: /tmp/test2.txt: " + stat2_error);
              return false;
            }
            sh.echo("/tmp/test2.txt copied");
            sh.mv("/tmp/test.txt","/tmp/test1.txt", function(mv_error) {
              if (mv_error) {
                sh.echo("mv_error /tmp/test.txt /tmp/test1.txt: " + mv_error);
                return;
              }
              sh.echo("Attempting to removing /tmp/test1.txt, /tmp/test2.txt");
              sh.unlink('/tmp/test1.txt', function(unlink_error) {
                if (unlink_error) {
                  sh.echo("Can't remove /tmp/test1.txt: " + unlink_error);
                  return;
                }
                sh.echo("Removed /tmp/test1.txt OK");
              });
              sh.unlink('/tmp/test2.txt', function(unlink_error) {
                if (unlink_error) {
                  sh.echo("Can't remove /tmp/test2.txt: " + unlink_error);
                  return;
                }
                sh.echo("Removed /tmp/test2.txt OK");
              });
            });
          });
        });
      } else {
        sh.echo("/tmp/test.txt is NOT a file. -> " + sys.inspect(stat));
      }
    });
  });
});
sh.prompt("Did you get some results working with files? (Y/N) ", function(respose) {
  if (response.toUpperCase().trim() === 'Y') {
    sys.puts("Success");
  } else {
    sys.puts("Failure: Task integration not working right.  Need to debug.");
  }
});
sh.run();
