var events = require('events');

exports.print = function () {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stdio.write(arguments[i]);
  }
};

exports.puts = function () {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stdio.write(arguments[i] + '\n');
  }
};

exports.debug = function (x) {
  process.stdio.writeError("DEBUG: " + x + "\n");
};

exports.error = function (x) {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    process.stdio.writeError(arguments[i] + '\n');
  }
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} value The object to print out
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable) properties of objects.
 */
exports.inspect = function (obj, showHidden, depth) {
  var seen = [];
  function format(value, recurseTimes) {
    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined': return 'undefined';
      case 'string':    return JSON.stringify(value).replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
      case 'number':    return '' + value;
      case 'boolean':   return '' + value;
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return 'null';
    }

    // Look up the keys of the object.
    if (showHidden) {
      var keys = Object.getOwnPropertyNames(value).map(function (key) { return '' + key; });
    } else {
      var keys = Object.keys(value);
    }

    var visible_keys = Object.keys(value);

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (value instanceof RegExp) {
        return '' + value;
      } else {
        return '[Function]';
      }
    }

    // Dates without properties can be shortcutted
    if (value instanceof Date && keys.length === 0) {
        return value.toUTCString();
    }

    var base, type, braces;
    // Determine the object type
    if (value instanceof Array) {
      type = 'Array';
      braces = ["[", "]"];
    } else {
      type = 'Object';
      braces = ["{", "}"];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      base = (value instanceof RegExp) ? ' ' + value : ' [Function]';
    } else {
      base = "";
    }
    
    // Make dates with properties first say the date
    if (value instanceof Date) {
      base = ' ' + value.toUTCString();
    }

    seen.push(value);

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if( recurseTimes < 0 ) {
      if (value instanceof RegExp) {
        return '' + value;
      } else {
        return "[object Object]";
      }
    }

    output = keys.map(function (key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = "[Getter/Setter]";
          } else {
            str = "[Getter]";
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = "[Setter]";
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = "[" + key + "]";
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if ( recurseTimes === null) {
            str = format(value[key]);
          }
          else {
            str = format(value[key], recurseTimes - 1);
          }
          if( str.indexOf('\n') > -1 ) {
            str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
          }
        } else {
          str = '[Circular]';
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if( name.match(/^"([a-zA-Z_0-9]+)"$/) ) {
          name = name.substr(1, name.length-2);
        }
        else {
          name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        }
      }

      return name + ": " + str;
    });
    

    var length = output.reduce(function(prev, cur) {
        return prev + cur.length + 1;
      },0);

    if( length > 50 ) {
      output = braces[0] + (base === '' ? '' : base + '\n,') + ' ' + output.join('\n, ') + '\n' +braces[1];
    }
    else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};

exports.p = function () {
  for (var i = 0, len = arguments.length; i < len; ++i) {
    exports.error(exports.inspect(arguments[i]));
  }
};

exports.exec = function (command, callback) {
  var child = process.createChildProcess("/bin/sh", ["-c", command]);
  var stdout = "";
  var stderr = "";

  child.addListener("output", function (chunk) {
    if (chunk) stdout += chunk;
  });

  child.addListener("error", function (chunk) {
    if (chunk) stderr += chunk;
  });

  child.addListener("exit", function (code) {
    if (code == 0) {
      if (callback) callback(null, stdout, stderr);
    } else {
      var e = new Error("Command failed: " + stderr);
      e.code = code;
      if (callback) callback(e, stdout, stderr);
    }
  });
};

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be revritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype
 * @param {function} superCtor Constructor function to inherit prototype from
 */
exports.inherits = process.inherits;

