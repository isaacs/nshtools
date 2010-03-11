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

/* It's useful to beable to use things in the working directory */
if (process.paths.indexOf(process.cwd()) < 0) {
  process.paths.push(process.cwd());
}

var sys = require('sys'),
    fs = require('fs'),
    path = require('path');

version = '0.0.2x';
release = '2010.03.11';

/*
 * echo, prompt, run are helpful for creating a simple call
 * and response type interaction for basic utility shell scripts.
 */

/**
 * echo - print a line to the console with or without a new line.
 * @param text - the message to print.
 * @param nonl (optional) - if present suppress the final new line.
 */
echo = function (text, nonl) {
  if (nonl === undefined) {
    sys.puts(text);
  } else {
    sys.print(text);
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
  var self = this, i = 0, next = 1, arg = '';
  arg = self.argv[i];
  while (arg !== undefined) {
    /* Check to see if we have a long option or short */
    if (arg !== undefined && arg.indexOf('--') === 0) {
      if (arg && arg.indexOf(option) === 0) {
        self.argv.splice(i,1);
        callback(undefined, arg.substr(option.length + 1));
        return true;
      }
      i += 1;
    } else if (arg !== undefined && arg.indexOf('-') === 0) {
      next = i + 1;
      if (arg.length === 2) {
        /* Do we have a singleton or a short option list? */
        /* Do we have a short option followed by a non-option arg? */
        if (self.argv[next] !== undefined && self.argv[next].indexOf('-') < 0) {
          arg = self.argv[next];
          self.argv.splice(i,2);
          callback(undefined, arg);
        } else {
          self.argv.splice(i,1);
          callback();
        }
        return true;
      } else {
        /* Check for trailing arg to assign to last letter in short option list */
        /* If we have a list then push the individual short options on to the argv stack. */
        /* Expand the args */
        opts = arg.substr(1).split('');
        self.argv.splice(i,1);/* Trim the combined options */
        for(j in opts) { 
          self.argv.splice(i,0,'-' + opts[j]); 
        }
        self.argv.splice(i,1);
        callback();
        return true;
      }
    } else if (arg !== undefined){
      if (arg && arg.indexOf(option) === 0) {
        self.argv.splice(i,1);
        callback(undefined, arg.substr(option.length + 1));
        return true;
      }
      i += 1;
    }
    arg = self.argv[i];
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
      sys.print(self.work_queue[0].message);
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
  if (callback === undefined) {
    callback = self.NoOp;
  }

  fs.readFile(source,{'encoding' : 'binary'}, function (read_error, content) {
    if (read_error) {
      callback('cp: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, function (write_error) {
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
  if (callback === undefined) {
    callback = self.NoOp;
  }

  fs.readFile(source, {'encoding' : 'binary'}, function (read_error, content) {
    if (read_error) {
      callback('mv: ' + source + ' ' + target + ': ' + read_error);
      return;
    }
    fs.writeFile(target, content, function (write_error) {
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


/**
 * globFolder - an overly simple approach to scan a folder for wild carded content.
 *
 * I think this will be superceded by a real node module that implements glob().
 *
 * @param path - the folder to scan, default path is ".". null, "" and undefined
 * are translated as ".".
 * @param wildcards - a string which will get passed to RegExp (e.g. *.txt)
 * @param callback - the method which will get called when something is found.
 * two parameters are passed - error, path.
 */
globFolder = function (path, wildcards, callback) {
  var self = this;

  if (callback === undefined) {
    callback = self.NoOp;
  }
  if (path === '' || path === null || path === undefined) {
    path = '.';
  }
  fs.readdir(path, function (error, dirs) {
    if (error) {
      callback('ERROR: globFolder("' + path + "','" + wildcards + "'): " + error);
      return;
    }
    re = new RegExp(wildcards);
    for (i in dirs) {
      (function (path) {
        if (path.match(re)) {
          callback(undefined, path);
        }
      })(dirs[i]);
    }
  });
};


/**
 * createNshtool - create a new Nshtool object with
 * all the useful stuff from process, sys, fs and path.
 */
createNshtool = function () {
  var self = {};
  self.work_queue = [];
  self.verbose = false;

  self.version = version;
  self.echo = echo;
  self.getOption = getOption;
  self.prompt = prompt;
  self.task = task;
  self.NoOp = NoOp;
  self.run = run;
  self.cp = cp;
  self.mv = mv;
  self.die = die;
  self.globFolder = globFolder;
  self.ls = fs.readdir;
  self.listDirectory = fs.readdir;
  self.copy = cp;
  self.move = mv;
  self.remove = fs.unlink;
  self.makeDirectory = fs.mkdir;
  self.removeDirectory = fs.rmdir;
  self.readFile = fs.readFile;
  self.writeFile = fs.writeFile;
  self.inspect = sys.inspect;
  self.print = sys.print;
  self.puts = sys.puts;
  self.stat = fs.stat;
  self.unlink = fs.unlink;
  self.argv = process.argv;
  self.env = process.env;
  return self;
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
exports.globFolder = globFolder;


/*
 * Basic aliases for CommonJS interoperability
 */
exports.ls = fs.readdir;
exports.listDirectory = fs.readdir;
exports.copy = cp;
exports.move = mv;
exports.remove = fs.unlink;
exports.makeDirectory = fs.mkdir;
exports.removeDirectory = fs.rmdir;


/**
 * DS or data structures is just what sound likes. A *Simple*
 * implementation of useful data structures (e.g. Stacks, Queues).
 * Thought it might be useful to have with nshtools.
 * 
 * These should work but don't have good tests for them yet ...
 * 
 * Might move out to their own module again in the future,
 * they came from PhizCode's ds.js
 */
var STACK = 1, QUEUE = 2,
    DS = this.DS = function (dsType) {
      this.ds = [];
      if (dsType === undefined) {
        this.dsType = QUEUE;
      } else {
        this.dsType = dsType;  
      }
    };

DS.prototype.view = function (pos) {
  if (this.ds.length === 0) {
    return;
  }
  switch (pos) {
    case 'top':
      if (this.dsType === STACK) {
        pos = this.ds.length - 1;      
      } else {
        pos = 0;
      }
      break;
    case 'bottom':
      if (this.dsType === STACK) {
        pos = 0;    
      } else {
        pos = this.ds.length - 1;            
      }
      break;
  }
  if (pos < 0) {
    pos = this.ds.length + pos;
  }
  if (pos < 0) {
    pos = 0;
  }
  if (pos >= this.ds.length) {
    pos = this.ds.length - 1 ;
  }
  return this.ds[pos];
}

DS.prototype.pop = function () { 
  return this.ds.pop();
};

DS.prototype.push = function (item) { 
  return this.ds.push(item); 
};

DS.prototype.isEmpty = function () { 
  return (this.ds.length === 0); 
};

DS.prototype.size = function () { 
  return (this.ds.length); 
};

DS.prototype.top = function () {
  if (this.ds.length > 0) {
    if (this.dsType === QUEUE) {
      return this.ds[0];
    }
    return this.ds[this.ds.length - 1];   
  }
  return;
};

DS.prototype.bottom = function () {
  if (this.ds.length > 0) {
    if (this.dsType === QUEUE) {
      return this.ds[this.ds.length - 1];    
    }
    return this.ds[0];
  }
  return;
};

DS.prototype.popAll = function () {
  if (this.ds.length > 0) {
    /* Pop implies STACK/FILO so reverse array */
    this.ds.reverse();
    var s = this.ds;

    delete this.ds;
    this.ds = [];
    return s;
  }
  return;
};

DS.prototype.shift = function () { 
  return this.ds.shift();
};

DS.prototype.shiftAll = function () {
  if (this.ds.length > 0) {
    var q = this.ds;

    delete this.ds;
    this.ds = [];
    return q;
  }
  return;
};


exports.STACK = STACK;
exports.QUEUE = QUEUE;
exports.DS = this.DS;
exports.DS.prototype = this.DS.prototype;
exports.DS.prototype.version = DS.version;
exports.DS.prototype.view = DS.prototype.view;
exports.DS.prototype.push = DS.prototype.push;
exports.DS.prototype.shift = DS.prototype.shift;
exports.DS.prototype.pop = DS.prototype.pop;
exports.DS.prototype.isEmpty = DS.prototype.isEmpty;
exports.DS.prototype.size = DS.prototype.size;
exports.DS.prototype.top = DS.prototype.top;
exports.DS.prototype.bottom = DS.prototype.bottom;
exports.DS.prototype.popAll = DS.prototype.popAll;
exports.DS.prototype.shiftAll = DS.prototype.shiftAll;


/**
 * Test - this is a set of methods for integrating assertive tests
 * into shell scripts.
 */
this.createTest = function () { 
  var self = this;

  self.queue = new DS(QUEUE);
  self.msgs = new DS(QUEUE);
  self.successes = 0;
  self.failures = 0;


  self.echo = function (msg) {
    var s;
    if (msg) {
      self.msgs.push(msg);
      return true;
    } else {
      return self.msgs.shiftAll().join("\n");
    }
    return false;
  };


  self.success = function () {
    self.successes += 1;
  };
  

  self.fail = function (text) {
    self.echo(text);
    self.failures += 1;
  };
  

  self.assertTrue = function (expression, text) {
    if (expression === true) {
      self.success();
      return true;
    }
    self.fail("assertTrue Failed: " + text);
    return false;
  };


  self.assertFalse = function (expression, text) {
    if (expression === false) {
      self.success();
      return true;
    }
    self.fail("assertFalse Failed: " + text);
    return false;
  };


  self.assertFail = function (text) {
    self.fail(text);
    return false;
  };


  self.addTest = function(label, callback) {
    self.queue.push({'label' : label, 'callback' : callback});
  };

  
  self.run = function () {
    while (self.queue.length > 0) {
      test = self.queue.shift();
      self.echo(test.label);
      test.callback(test.label);
    }
    return self.echo() + "\n" + 
           self.successes + " passed\n" + 
           self.failures + " failed\n";        
  };

  return self;
};

exports.createTest = this.createTest;

