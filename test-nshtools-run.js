#!/usr/bin/env node
nshtools = require(process.cwd() + '/nshtools');
nsh = nshtools.createNshtool();

nsh.task("Task 1", nsh.NoOp);
nsh.task("Task 2", nsh.NoOp);
nsh.task("Task 3", nsh.NoOp);
nsh.task("Should have run three tasks by now.", nsh.NoOp);
nsh.run();
