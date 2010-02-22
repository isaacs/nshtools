#!/usr/bin/env node
/**
 * A collection of methods to help make shell scripting/batch
 * processing easier using NodeJS.
 */
var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert');

/*
 * echo, prompt, run are helpful for creating a simple call
 * and response type interaction for basic utility shell scripts.
 */

/**
 * echo - print a line to the console with or without a new line.
 * @param message - the message to print.
 * @param nonl (optional) - if present suppress the final new line.
 */
echo = function (message, nonl) {
  if (nonl === undefined) {
    sys.puts(message);
  } else {
    sys.print(message);
  }
};


/**
 * prompt - adds a prompt and callback to the work queue.
 * @param message - the message to display as prompt
 * @param callback - the callback to be run
 */
prompt = function (message, callback) {
  this.work_queue.push({'message' : message, 'callback' : callback, qtype : 'prompt'});
};

/**
 * task - add a non-prompting task to the work queue.
 * @param label - the label shown when task fired.
 * @param callback - the callback function fired.
 */
task = function (label, callback) {
  this.work_queue.push({'callback' : callback, qtype : 'task'});
};

/**
 * NOOP - a function that doesn't do anything.
 */
NOOP = function () {};

/**
 * Run all the queued prompts and callbacks.
 */
run = function () {
  var msg = '', self = this,
      need_to_close_stdio = true;
      
  runTasks = function() {
    var more_tasks, task;
    /* Run through tasks first */
    if (self.work_queue.length > 0) {
      more_tasks = true;
    }
    while(more_tasks) {
     if (self.work_queue[0].qtype === 'task') {
       task = self.work_queue.shift();
       sys.puts(task.label);
       task.callback(); 
     } else {
       more_tasks = false;
     }
    }
  }
  runTasks();

  /* If we have tasks left then go into interactive mode */
  if (self.work_queue.length > 0) {
    /* Display the first message in queue. */
    if (self.work_queue.length > 0) {
      if (self.work_queue[0].qtype === 'prompt') {
        sys.print(self.work_queue[0].message);
      }
    }
    /* If we're running in node-repl we'll throw an error on the
      since this will be a second open. Ignore. */
    try {
      process.stdio.open();
    } catch (err) {
     // Ignore stdio is already open, probably in node-repl
    }
    process.stdio.addListener('data', function(data) {
      var action = self.work_queue[0];
      if (self.work_queue[0] === undefined) {
        process.stdio.close();
      } else {
        action.callback(data);
        self.work_queue.shift();
        /* Run any non prompting tasks */
        runTasks();
        /* Prompt for next action. */
        if (self.work_queue.length > 0) {
          if (self.work_queue[0].qtype === 'prompt') {
            sys.print(self.work_queue[0].message);
          }
        } else {
          process.stdio.close();
        }
      }
    });
  }
};


/**
 * createShtool - create a new shtools object.
 */
createShtool = function () {
  var self = {};
  self.work_queue = [];
  self.verbose = true;

  self.echo = echo;
  self.prompt = prompt;
  self.task = task;
  self.NOOP = NOOP;
  self.run = run;
  self.cp = cp;
  self.mv = mv;
  process.mixin(self, process, sys, fs, path, assert);
  
  return self;
};

/*
 * Re-create some common Unix style file system primitives. 
 * E.G. cp, mv
 */

/**
 * cp = copy a file.
 */
cp = function (source, target, callback) {
  var self = this;

  fs.readFile(source, 'binary', function (read_error, content) {
    if (read_error) {
      sys.error('cp: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, 'binary', function (write_error) {
      if (write_error) {
        sys.error('cp: ' + source + ' ' + target + ': ' + write_error);
        return;
      } 
      if (self.verbose) {
        sys.puts(source + " -> " + target);
      }
      if (callback !== undefined) {
        callback();
      }
    });
  });
};

/**
 * mv = copy a file.
 */
mv = function (source, target, callback) {
  var self = this;

  fs.readFile(source, 'binary', function (read_error, content) {
    if (read_error) {
      sys.error('mv: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, 'binary', function (write_error) {
      if (write_error) {
        sys.error('mv: ' + source + ' ' + target + ': ' + write_error);
        return;
      }
      if (self.verbose) {
        sys.puts(source + " -> " + target);
      }
      fs.unlink(source, function (unlink_error) {
        if (unlink_error) {
          sys.puts('mv: ' + source + ' ' + target + ': ' + unlink_error);
        }
        if (callback !== undefined) {
          callback();
        }
      });
    });
  });
};

exports.createShtool = createShtool;
exports.echo = echo;
exports.prompt = prompt;
exports.NOOP = NOOP;
exports.run  = run;
exports.cp = cp;
exports.mv = mv;

