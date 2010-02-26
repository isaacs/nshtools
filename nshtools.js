#!/usr/bin/env node
/**
 * A collection of methods to help make shell scripting/batch
 * processing easier using NodeJS.
 *
 * @author R. S. Doiel, <rsdoiel@gmail.com>
 * copyright (c) 2010 R. S. Doiel, all rights reserved
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of the R. S. Doiel nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 *
 */
var sys = require('sys'),
    fs = require('fs'),
    path = require('path');

version = '0.0.0x 2010.02.26';

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
 * getOption - process any command line long option args and fire a callback if present.
 * @param option - the command line arg you are looking for. If found it will remove it from
 * from nsh.argv.
 * @param callback - the callback function to fire.  First arg is error, the second is the contents
 * of the option. (e.g. --prefix=/home/username, then contents would contain /home/username)
 */
getOption = function(option, callback) {
  var self = this, scan_options = true, i = 0, arg = '';
  if (self.argv.length <= 0) {
    scan_options = false;
  } 
  while(scan_options) {
    arg = self.argv[i];
    if (arg && arg.indexOf(option) === 0) {
      delete self.argv[i];
      callback(undefined, arg.substr(option.length + 1));
      return true;
    }
    i += 1;
    if (i >= self.argv.length) {
      scan_options = false;
    }
  }
  callback("Did not find " + option, '');
  return false;
};

/**
 * prompt - adds a prompt and callback to the work queue.
 * @param message - the message to display as prompt
 * @param callback - the callback to be run
 */
prompt = function (message, callback) {
  this.work_queue.push({'message' : message, 'callback' : callback, 'qtype' : 'prompt'});
};

/**
 * task - add a non-prompting task to the work queue.
 * @param label - the label shown when task fired.
 * @param callback - the callback function fired.
 */
task = function (label, callback) {
  if (callback === undefined && label === undefiend) {
    label = 'NoOp';
    callback = self.NoOp;
  }
  if (label === undefined) {
    label = '';
  }
  if (callback === undefined) {
    label += "\n\tWARNING: no callback defined for label, using NoOp.";
    callback = self.NoOp;
  }
  this.work_queue.push({'label' : label, 'callback' : callback, 'qtype' : 'task'});
};

/**
 * NoOp - a function that doesn't do anything.
 */
NoOp = function () {};

/**
 * die - print something to the console using sys.error() and exit the process
 */
die = function (message, exit_val) {
  if (exit_val === undefined) {
    exit_val = 1;
  }
  sys.error(message);
  process.exit(exit_val);
};

/**
 * coma - print something to the console using sys.puts() and return from function.
 */
coma = function(message, return_val) {
  sys.puts(message);
  return return_val;
};
 
/**
 * Run all the queued prompts and callbacks.
 */
run = function () {
  var msg = '', self = this,
      need_to_close_stdio = true;
      
  runTasks = function() {
    var more_tasks, action;
    /* Run through tasks first */
    more_tasks = false;
    if (self.work_queue.length > 0) {
      more_tasks = true;
    }
    while(more_tasks) {
      if (self.work_queue[0].qtype === 'task') {
        action = self.work_queue.shift();
        self.echo(action.label);
        action.callback();
        if (self.work_queue.length === 0) {
          more_tasks = false;
        }
      } else {
        more_tasks = false;
      }
    }
  }
  runTasks();

  /* If we have tasks left then go into interactive mode */
  if (self.work_queue.length > 0) {
    /* Display the first message in queue. */
    if (self.work_queue[0].qtype === 'prompt') {
      self.print(self.work_queue[0].message);
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
            self.print(self.work_queue[0].message);
          }
        } else {
          process.stdio.close();
        }
      }
    });
  }
};


/**
 * createNshtool - create a new Nshtools object.
 */
createNshtool = function () {
  var self = {};
  self.work_queue = [];
  self.verbose = true;

  self.version = version;
  self.echo = echo;
  self.getOption = getOption;
  self.prompt = prompt;
  self.task = task;
  self.NoOp = NoOp;
  self.run = run;
  self.cp = cp;
  self.mv = mv;
  process.mixin(self, process, sys, fs, path);
  
  return self;
};

/*
 * Re-create some common Unix style file system primitives. 
 * E.G. cp, mv
 */

/**
 * cp - copy a file. All three parameters are required.
 * @param source - the filename for the copy source
 * @param target - the filename (not directory name) of the copy target
 * @param callback - the callback to fire as a result of the copy. If an error occurs
 * then an error message is passed to the callback. Otherwise no parameters are passed.
 */
cp = function (source, target, callback) {
  var self = this;

  fs.readFile(source, 'binary', function (read_error, content) {
    if (read_error) {
      callback('cp: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, 'binary', function (write_error) {
      if (write_error) {
        callback('cp: ' + source + ' ' + target + ': ' + write_error);
        return;
      } 
      if (self.verbose) {
        sys.puts(source + " -> " + target);
      }
      callback(undefined);
    });
  });
};

/**
 * mv = copy a file to a new one removing the original after completion. 
 * All three parameters are required.
 * @param source - the filename for the move source
 * @param target - the filename (not directory name) of the move target
 * @param callback - the callback to fire as a result of the move. If an error occurs
 * then an error message is passed when the callback is fired otherwise no parameters are passed.
 */
mv = function (source, target, callback) {
  var self = this;

  fs.readFile(source, 'binary', function (read_error, content) {
    if (read_error) {
      callback('mv: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, 'binary', function (write_error) {
      if (write_error) {
        callback('mv: ' + source + ' ' + target + ': ' + write_error);
        return;
      }
      if (self.verbose) {
        sys.puts(source + " -> " + target);
      }
      fs.unlink(source, function (unlink_error) {
        if (unlink_error) {
          callback('mv: ' + source + ' ' + target + ': ' + unlink_error);
        }
        if (callback !== undefined) {
          callback(undefined);
        }
      });
    });
  });
};

exports.createNshtool = createNshtool;
exports.echo = echo;
exports.getOption = getOption;
exports.prompt = prompt;
exports.NoOp = NoOp;
exports.run  = run;
exports.cp = cp;
exports.mv = mv;
exports.die = die;
exports.coma = coma;

