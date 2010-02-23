nshtools.js
===========
R. S. Doiel <rsdoiel@gmail.com>
Version, 0.0.0x, 2010.02.23

## NAME

nshtools.js - an module for scripting those everyday chores around your operating system. E.g. If it was easy to script in Bash it should be easy to script in JavaScript via node.

## SYNPOSIS

nshtools allows the creation of an object that supports

* common file operations like copy, move
* the work queue design pattern with prompts and tasks
* Simple support for long option command line parsing


## Examples

#### copy-tmp-file.js

----

    #!/usr/bin/env node
    nshtools = require('nshtools');
    nsh = nshtools.createNshtool();
    nsh.cp('/tmp/file1.txt','/tmp/file2.txt', function (error) {
      if (error) {
        nsh.echo("Oops, something went wrong: " + error);
        return;
      }
      nsh.echo("Success!");
    });

----

Sometimes you need to find out from the client an answer to a question before carrying out an action.  That's what
run() and prompt() are for.

#### get-some-user-responses.js

----

    #!/usr/bin/env node
    nshtools = require('nshtools');
    nsh = nshtools.createNshtool();
    nsh.prompt("What is your name?", function(response) {
      nsh.echo("Glad to me you " + response.trim());
    });
    nsh.prompt("Are you having a nice day? ", function (response) {
      nsh.echo("So what you're telling me is " + response.trim() + " about today.");
    });
    nsh.run();/* Run the prompts and fire the callbacks */

----

If you want to group a bunch of tasks together that are fired in a queue (maybe with some prompting). Try this -

#### putting-the-pieces-together.js

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
    nsh.prompt("Did you see and tasks fire off? (Y/N) ", function (response) {
      if (response.toUpperCase().trim() === 'Y') {
        nsh.echo("Success!");
      } else {
        nsh.echo("On no, that's not supposed to happen.");
      }
    });
    nsh.run(); /* IMPORTANT: This needs to be the last thing called! */

----

Here's an example of checking for long options on from the command line.

#### hello-getOption.js

----

    #!/usr/bin/env node
    nshtools = require('nshtools');
    nsh = nshtools.createNshtool();
    nsh.getOption('--hello', function(error, value) {
      if (error) {
        nsh.echo("Try running this with --hello=Me and see what happens.");
        return;
      }
      nsh.echo("Hello " + value);
    });

----

### NoOp

All the file related methods expect trailing parameter for the callback. If you don't want to include a callback then you can either use an empty anonymous method (e.g. function (){}) or use the NoOp method that does that for you.

#### noop-with-getOption.js

----

    #!/usr/bin/env node
    nshtools = require('nshtools');
    nsh = nshtools.createNshtool();
    nsh.getOption('--ignore-this', nsh.NoOp);
    nsh.echo("That was rather pointless");

----

It makes more sense for file operations where you're not going to use the outcome (e.g. `nsh.cp('file1.txt','file2.txt', nsh.NoOp)`).


