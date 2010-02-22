nshtools.js
===========
R. S. Doiel <rsdoiel@gmail.com>
Version, 0.0.0x, 2010.02.22

== NAME

nshtools.js - an object for scripting those everyday chores around your operating system. I.E. If I would have used Bash I should be able to do something almost as easily using JavaScript via node.

== SYNPOSIS

So you're doing some node programming.  You need to write a quickly installer or monitor. In the past you might have written a shell script that called wget or something.  Why not just use node? Because there isn't the highlevel view of your OS that you get with shell.  nshtools.js seeks to fill in the gap until something official comes along.

=== Examples

copy-tmp-file-example.js
----
        #!/usr/bin/env node
        nshtools = require('nshtools');
        nsh = nshtools.createNshtool();
        nsh.cp('/tmp/file1.txt','/tmp/file2.txt', function () {
          nsh.echo("Success!");
        });
----

Somes you need to find out from the client an answer to a question before carring out an action.  That's what
run() and prompt() are for.

----
get-some-user-responses.js

        #!/usr/bin/env node
        nshtools = require('nshtools');
        nsh = nshtools.createNshtool();
        nsh.prompt("What is your name?", function(response) {
          nsh.echo("Glad to me you " + response.trim());
        });
        nsh.prompt("Are you having a nice day? ", function (response) {
          nsh.echo("So what you're telling me is " + response.trim());
        });
        nsh.run();/* Run the prompts and fire the callbacks */
----

If you want to group a bunch of tasks together that are fired in a queue (maybe with some prompting). Try this -

putting-the-peices-together.js
----
        #!/usr/bin/env node
        nshtools = require('nshtools');
        nsh = nshtools.createNshtool();
        nsh.task("Starting up ...", function () { nsh.echo("Started " + new Date()) } );
        nsh.task("List a directory", function() {
          nsh.exec("ls -l", function(ls_error, contents) {
            if (ls_error) {
              nsh.echo(ls_error);
              return;
            }
            nsh.echo(contents);
          });
        });
        nsh.prompt("Did you see and tasks fire off? (Y/N) ",function (response) {
          if (response.toUpperCase().trim() === 'Y') {
            nsh.echo("Success!");
          } else {
            nsh.echo("On no, that's not supposed to happen.");
          }
        });
        nsh.run();/* IMPORTANT: This needs to be the last thing called! */


Here's an example of checking for long options on from the command line.

helloworld-getOption.js

        #!/usr/bin/env node
        nshtools = require('nshtools');
        nsh = nshtools.createNshtool();
        nsh.getOption('--helloworld=Me', function(error, value) {
         if (error) {
           nsh.echo("Try running this with --helloworld=Me and see what happens.");
           return;
         }
         nsh.echo("Hello " + value);
        });
----
