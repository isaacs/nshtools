#!/usr/bin/env node
nshtools = require('nshtools');
nsh = nshtools.createNshtool();
nsh.getOption('--ignore-this', nsh.NoOp);
nsh.echo("That was rather pointless");
