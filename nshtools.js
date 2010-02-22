#!/usr/bin/env node
/**
 * A collection of methods to help make shell scripting/batch
 * processing easier using NodeJS.
 */
var sys = require('sys'),
    fs = require('fs'),
    path = require('path');

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

exports.createNshtool = createNshtool;
exports.echo = echo;
exports.getOption = getOption;
exports.prompt = prompt;
exports.NoOp = NoOp;
exports.run  = run;
exports.cp = cp;
exports.mv = mv;

