#!/usr/bin/env node
/**
 * test-nshtools-ds.js - Test the merged in ds.js code at a basic minimal level.
 *
 * @author R. S. Doiel, <rsdoiel@gmail.com>
 * copyright (c) 2010, R. S. Doiel, all rights reserved
 *
 * Released under "The BSD License" as described at http://opensource.org/licenses/bsd-license.php
 */

if (process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var nshtools = require('nshtools'),
    nsh = nshtools.createNshtool(),
    error_count = 0,
    LFTAB = "\n\t";
    OK = "Ok",
    queue = new nshtools.DS(nshtools.QUEUE), stack = new nshtools.DS(nshtools.STACK);

TestQueue = function () {
  /* Test the Queue */
  var items = [1, "two", {3:'three'}, ['a','b',3,'d']], i = 0;

  nsh.echo("Testing queue.push() and queue.bottom()");
  for (i = 0; i < items.length; i += 1) {
    nsh.echo("Checking queue.push() and queue.bottom():" + LFTAB + (function () {
      queue.push(items[i]);
      if (queue.bottom() === items[i]) {
        return OK;
      }
      error_count += 1;
      return "Oops! [" + nsh.inspect(items[i]) + "] != [" + nsh.inspect(queue.bottom()) + "]";
    })());
  }
  nsh.echo("Checking queue.top():" + LFTAB + (function () {
    if (queue.top() === items[0]) {
     return OK;
    }
    return "Oops! [" + nsh.inspect(queue.top()) + "] != [" + nsh.inspect(items[0]) + "]";
  })());

  nsh.echo("Checking number of elements in items and queue: " + LFTAB +  (function () {
   if (queue.size() === items.length) {
     return OK;
   }
   return "Oops! size wrong [" + queue.size() + "] != [" + items.length + "]";
  })());

  nsh.echo("Testing queue.shift()");
  for (i in items) {
    nsh.echo("Checking queue.shift():" + LFTAB + (function () {
      var j = queue.shift(), k = items.shift();
      if (j === k) {
        return OK;
      }
      return "Oops! [" + nsh.inspect(j)  + "] != [" + nsh.inspect(k) + "]";
    })());
  }
  nsh.echo("==================================")
  if (error_count > 0) {
    nsh.echo("TestQueue() Failed: " + error_count);
  } else {
    nsh.echo("TestQueue() Passed");
  }
  nsh.echo("==================================")
};


/* Test the Stack */
TestStack = function () {
  /* Test the Stack */
  var items = [1, "two", {3:'three'}, ['a','b',3,'d']], i = 0;

  nsh.echo("Testing stack.push() and stack.top()");
  for (i = 0; i < items.length; i += 1) {
    nsh.echo("Checking stack.push() and stack.top():" + LFTAB + (function () {
      stack.push(items[i]);
      if (stack.top() === items[i]) {
        return OK;
      }
      error_count += 1;
      return "Oops! [" + nsh.inspect(items[i]) + "] != [" + nsh.inspect(stack.top()) + "]";
    })());
  }
  nsh.echo("Checking stack.bottom():" + LFTAB + (function () {
    if (stack.bottom() === items[0]) {
     return OK;
    }
    return "Oops! [" + nsh.inspect(stack.bottom()) + "] != [" + nsh.inspect(items[0]) + "]";
  })());

  nsh.echo("Checking number of elements in items and stack: " + LFTAB +  (function () {
   if (stack.size() === items.length) {
     return OK;
   }
   return "Oops! size wrong [" + stack.size() + "] != [" + items.length + "]";
  })());

  nsh.echo("Testing stack.pop()");
  for (i in items) {
    nsh.echo("Checking stack.pop():" + LFTAB + (function () {
      var j = stack.pop(), k = items.pop();
      if (j === k) {
        return OK;
      }
      return "Oops! [" + nsh.inspect(j)  + "] != [" + nsh.inspect(k) + "]";
    })());
  }
  nsh.echo("==================================")
  if (error_count > 0) {
    nsh.echo("TestStack() Failed: " + error_count);
  } else {
    nsh.echo("TestStack() Passed");
  }
  nsh.echo("==================================")
};


/* Run the test sequences */
TestQueue();
TestStack();

