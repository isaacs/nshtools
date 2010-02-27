// Copyright 2009 Ryan Dahl <ry@tinyclouds.org>
#include <node.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h> /* PATH_MAX */
#include <assert.h>
#include <unistd.h>
#include <errno.h>
#include <dlfcn.h> /* dlopen(), dlsym() */
#include <sys/types.h>
#include <unistd.h> /* setuid, getuid */

#include <node_events.h>
#include <node_dns.h>
#include <node_net.h>
#include <node_file.h>
#include <node_idle_watcher.h>
#include <node_http.h>
#include <node_signal_handler.h>
#include <node_stat.h>
#include <node_timer.h>
#include <node_child_process.h>
#include <node_constants.h>
#include <node_stdio.h>
#include <node_natives.h>
#include <node_version.h>

#include <v8-debug.h>

using namespace v8;

extern char **environ;

namespace node {

static Persistent<Object> process;

static Persistent<String> dev_symbol;
static Persistent<String> ino_symbol;
static Persistent<String> mode_symbol;
static Persistent<String> nlink_symbol;
static Persistent<String> uid_symbol;
static Persistent<String> gid_symbol;
static Persistent<String> rdev_symbol;
static Persistent<String> size_symbol;
static Persistent<String> blksize_symbol;
static Persistent<String> blocks_symbol;
static Persistent<String> atime_symbol;
static Persistent<String> mtime_symbol;
static Persistent<String> ctime_symbol;

static Persistent<String> rss_symbol;
static Persistent<String> vsize_symbol;
static Persistent<String> heap_total_symbol;
static Persistent<String> heap_used_symbol;

static Persistent<String> listeners_symbol;
static Persistent<String> uncaught_exception_symbol;
static Persistent<String> emit_symbol;

static int option_end_index = 0;
static bool use_debug_agent = false;
static bool debug_wait_connect = false;
static int debug_port=5858;


static ev_async eio_want_poll_notifier;
static ev_async eio_done_poll_notifier;
static ev_idle  eio_poller;

static ev_timer  gc_timer;
#define GC_INTERVAL 2.0


// Node calls this every GC_INTERVAL seconds in order to try and call the
// GC. This watcher is run with maximum priority, so ev_pending_count() == 0
// is an effective measure of idleness.
static void GCTimeout(EV_P_ ev_timer *watcher, int revents) {
  assert(watcher == &gc_timer);
  assert(revents == EV_TIMER);
  if (ev_pending_count(EV_DEFAULT_UC) == 0) V8::IdleNotification();
}


static void DoPoll(EV_P_ ev_idle *watcher, int revents) {
  assert(watcher == &eio_poller);
  assert(revents == EV_IDLE);

  //printf("eio_poller\n");

  if (eio_poll() != -1) {
    //printf("eio_poller stop\n");
    ev_idle_stop(EV_DEFAULT_UC_ watcher);
  }
}


// Called from the main thread.
static void WantPollNotifier(EV_P_ ev_async *watcher, int revents) {
  assert(watcher == &eio_want_poll_notifier);
  assert(revents == EV_ASYNC);

  //printf("want poll notifier\n");

  if (eio_poll() == -1) {
    //printf("eio_poller start\n");
    ev_idle_start(EV_DEFAULT_UC_ &eio_poller);
  }
}


static void DonePollNotifier(EV_P_ ev_async *watcher, int revents) {
  assert(watcher == &eio_done_poll_notifier);
  assert(revents == EV_ASYNC);

  //printf("done poll notifier\n");

  if (eio_poll() != -1) {
    //printf("eio_poller stop\n");
    ev_idle_stop(EV_DEFAULT_UC_ &eio_poller);
  }
}


// EIOWantPoll() is called from the EIO thread pool each time an EIO
// request (that is, one of the node.fs.* functions) has completed.
static void EIOWantPoll(void) {
  // Signal the main thread that eio_poll need to be processed.
  ev_async_send(EV_DEFAULT_UC_ &eio_want_poll_notifier);
}


static void EIODonePoll(void) {
  // Signal the main thread that we should stop calling eio_poll().
  // from the idle watcher.
  ev_async_send(EV_DEFAULT_UC_ &eio_done_poll_notifier);
}


enum encoding ParseEncoding(Handle<Value> encoding_v, enum encoding _default) {
  HandleScope scope;

  if (!encoding_v->IsString()) return _default;

  String::Utf8Value encoding(encoding_v->ToString());

  if (strcasecmp(*encoding, "utf8") == 0) {
    return UTF8;
  } else if (strcasecmp(*encoding, "utf-8") == 0) {
    return UTF8;
  } else if (strcasecmp(*encoding, "ascii") == 0) {
    return ASCII;
  } else if (strcasecmp(*encoding, "binary") == 0) {
    return BINARY;
  } else if (strcasecmp(*encoding, "raw") == 0) {
    fprintf(stderr, "'raw' (array of integers) has been removed. "
                    "Use 'binary'.\n");
    return BINARY;
  } else if (strcasecmp(*encoding, "raws") == 0) {
    fprintf(stderr, "'raws' encoding has been renamed to 'binary'. "
                    "Please update your code.\n");
    return BINARY;
  } else {
    return _default;
  }
}

Local<Value> Encode(const void *buf, size_t len, enum encoding encoding) {
  HandleScope scope;

  if (!len) return scope.Close(String::Empty());

  if (encoding == BINARY) {
    const unsigned char *cbuf = static_cast<const unsigned char*>(buf);
    uint16_t * twobytebuf = new uint16_t[len];
    for (size_t i = 0; i < len; i++) {
      // XXX is the following line platform independent?
      twobytebuf[i] = cbuf[i];
    }
    Local<String> chunk = String::New(twobytebuf, len);
    delete [] twobytebuf; // TODO use ExternalTwoByteString?
    return scope.Close(chunk);
  }

  // utf8 or ascii encoding
  Local<String> chunk = String::New((const char*)buf, len);
  return scope.Close(chunk);
}

// Returns -1 if the handle was not valid for decoding
ssize_t DecodeBytes(v8::Handle<v8::Value> val, enum encoding encoding) {
  HandleScope scope;

  if (val->IsArray()) {
    fprintf(stderr, "'raw' encoding (array of integers) has been removed. "
                    "Use 'binary'.\n");
    assert(0);
    return -1;
  }

  Local<String> str = val->ToString();

  if (encoding == UTF8) return str->Utf8Length();

  return str->Length();
}

#ifndef MIN
# define MIN(a, b) ((a) < (b) ? (a) : (b))
#endif

// Returns number of bytes written.
ssize_t DecodeWrite(char *buf, size_t buflen,
                    v8::Handle<v8::Value> val,
                    enum encoding encoding) {
  HandleScope scope;

  // XXX
  // A lot of improvement can be made here. See:
  // http://code.google.com/p/v8/issues/detail?id=270
  // http://groups.google.com/group/v8-dev/browse_thread/thread/dba28a81d9215291/ece2b50a3b4022c
  // http://groups.google.com/group/v8-users/browse_thread/thread/1f83b0ba1f0a611

  if (val->IsArray()) {
    fprintf(stderr, "'raw' encoding (array of integers) has been removed. "
                    "Use 'binary'.\n");
    assert(0);
    return -1;
  }

  Local<String> str = val->ToString();

  if (encoding == UTF8) {
    str->WriteUtf8(buf, buflen);
    return buflen;
  }

  if (encoding == ASCII) {
    str->WriteAscii(buf, 0, buflen);
    return buflen;
  }

  // THIS IS AWFUL!!! FIXME

  assert(encoding == BINARY);

  uint16_t * twobytebuf = new uint16_t[buflen];

  str->Write(twobytebuf, 0, buflen);

  for (size_t i = 0; i < buflen; i++) {
    unsigned char *b = reinterpret_cast<unsigned char*>(&twobytebuf[i]);
    assert(b[1] == 0);
    buf[i] = b[0];
  }

  delete [] twobytebuf;

  return buflen;
}

static Persistent<FunctionTemplate> stats_constructor_template;

Local<Object> BuildStatsObject(struct stat * s) {
  HandleScope scope;

  if (dev_symbol.IsEmpty()) {
    dev_symbol = NODE_PSYMBOL("dev");
    ino_symbol = NODE_PSYMBOL("ino");
    mode_symbol = NODE_PSYMBOL("mode");
    nlink_symbol = NODE_PSYMBOL("nlink");
    uid_symbol = NODE_PSYMBOL("uid");
    gid_symbol = NODE_PSYMBOL("gid");
    rdev_symbol = NODE_PSYMBOL("rdev");
    size_symbol = NODE_PSYMBOL("size");
    blksize_symbol = NODE_PSYMBOL("blksize");
    blocks_symbol = NODE_PSYMBOL("blocks");
    atime_symbol = NODE_PSYMBOL("atime");
    mtime_symbol = NODE_PSYMBOL("mtime");
    ctime_symbol = NODE_PSYMBOL("ctime");
  }

  Local<Object> stats =
    stats_constructor_template->GetFunction()->NewInstance();

  /* ID of device containing file */
  stats->Set(dev_symbol, Integer::New(s->st_dev));

  /* inode number */
  stats->Set(ino_symbol, Integer::New(s->st_ino));

  /* protection */
  stats->Set(mode_symbol, Integer::New(s->st_mode));

  /* number of hard links */
  stats->Set(nlink_symbol, Integer::New(s->st_nlink));

  /* user ID of owner */
  stats->Set(uid_symbol, Integer::New(s->st_uid));

  /* group ID of owner */
  stats->Set(gid_symbol, Integer::New(s->st_gid));

  /* device ID (if special file) */
  stats->Set(rdev_symbol, Integer::New(s->st_rdev));

  /* total size, in bytes */
  stats->Set(size_symbol, Integer::New(s->st_size));

  /* blocksize for filesystem I/O */
  stats->Set(blksize_symbol, Integer::New(s->st_blksize));

  /* number of blocks allocated */
  stats->Set(blocks_symbol, Integer::New(s->st_blocks));

  /* time of last access */
  stats->Set(atime_symbol, NODE_UNIXTIME_V8(s->st_atime));

  /* time of last modification */
  stats->Set(mtime_symbol, NODE_UNIXTIME_V8(s->st_mtime));

  /* time of last status change */
  stats->Set(ctime_symbol, NODE_UNIXTIME_V8(s->st_ctime));

  return scope.Close(stats);
}


// Extracts a C str from a V8 Utf8Value.
const char* ToCString(const v8::String::Utf8Value& value) {
  return *value ? *value : "<str conversion failed>";
}

static void ReportException(TryCatch &try_catch, bool show_line = false) {
  Handle<Message> message = try_catch.Message();
  if (message.IsEmpty()) {
    fprintf(stderr, "Error: (no message)\n");
    fflush(stderr);
    return;
  }

  Handle<Value> error = try_catch.Exception();
  Handle<String> stack;

  if (error->IsObject()) {
    Handle<Object> obj = Handle<Object>::Cast(error);
    Handle<Value> raw_stack = obj->Get(String::New("stack"));
    if (raw_stack->IsString()) stack = Handle<String>::Cast(raw_stack);
  }

  if (show_line) {
    // Print (filename):(line number): (message).
    String::Utf8Value filename(message->GetScriptResourceName());
    const char* filename_string = ToCString(filename);
    int linenum = message->GetLineNumber();
    fprintf(stderr, "%s:%i\n", filename_string, linenum);
    // Print line of source code.
    String::Utf8Value sourceline(message->GetSourceLine());
    const char* sourceline_string = ToCString(sourceline);
    fprintf(stderr, "%s\n", sourceline_string);
    // Print wavy underline (GetUnderline is deprecated).
    int start = message->GetStartColumn();
    for (int i = 0; i < start; i++) {
      fprintf(stderr, " ");
    }
    int end = message->GetEndColumn();
    for (int i = start; i < end; i++) {
      fprintf(stderr, "^");
    }
    fprintf(stderr, "\n");
  }

  if (stack.IsEmpty()) {
    message->PrintCurrentStackTrace(stderr);
  } else {
    String::Utf8Value trace(stack);
    fprintf(stderr, "%s\n", *trace);
  }
  fflush(stderr);
}

// Executes a str within the current v8 context.
Local<Value> ExecuteString(Local<String> source, Local<Value> filename) {
  HandleScope scope;
  TryCatch try_catch;

  Local<Script> script = Script::Compile(source, filename);
  if (script.IsEmpty()) {
    ReportException(try_catch);
    exit(1);
  }

  Local<Value> result = script->Run();
  if (result.IsEmpty()) {
    ReportException(try_catch);
    exit(1);
  }

  return scope.Close(result);
}

static Handle<Value> ByteLength(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 || !args[0]->IsString()) {
    return ThrowException(Exception::Error(String::New("Bad argument.")));
  }

  Local<Integer> length = Integer::New(DecodeBytes(args[0], ParseEncoding(args[1], UTF8)));

  return scope.Close(length);
}

static Handle<Value> Loop(const Arguments& args) {
  HandleScope scope;

  // TODO Probably don't need to start this each time.
  // Avoids failing on test/mjsunit/test-eio-race3.js though
  ev_idle_start(EV_DEFAULT_UC_ &eio_poller);

  ev_loop(EV_DEFAULT_UC_ 0);
  return Undefined();
}

static Handle<Value> Unloop(const Arguments& args) {
  HandleScope scope;
  int how = EVUNLOOP_ONE;
  if (args[0]->IsString()) {
    String::Utf8Value how_s(args[0]->ToString());
    if (0 == strcmp(*how_s, "all")) {
      how = EVUNLOOP_ALL;
    }
  }
  ev_unloop(EV_DEFAULT_ how);
  return Undefined();
}

static Handle<Value> Chdir(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 1 || !args[0]->IsString()) {
    return ThrowException(Exception::Error(String::New("Bad argument.")));
  }

  String::Utf8Value path(args[0]->ToString());

  int r = chdir(*path);

  if (r != 0) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }

  return Undefined();
}

static Handle<Value> Cwd(const Arguments& args) {
  HandleScope scope;

  char output[PATH_MAX];
  char *r = getcwd(output, PATH_MAX);
  if (r == NULL) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }
  Local<String> cwd = String::New(output);

  return scope.Close(cwd);
}

static Handle<Value> Umask(const Arguments& args){
  HandleScope scope;

  if(args.Length() < 1 || !args[0]->IsInt32()) {
    return ThrowException(Exception::TypeError(
          String::New("argument must be an integer.")));
  }
  unsigned int mask = args[0]->Uint32Value();
  unsigned int old = umask((mode_t)mask);

  return scope.Close(Uint32::New(old));
}


static Handle<Value> GetUid(const Arguments& args) {
  HandleScope scope;
  int uid = getuid();
  return scope.Close(Integer::New(uid));
}

static Handle<Value> GetGid(const Arguments& args) {
  HandleScope scope;
  int gid = getgid();
  return scope.Close(Integer::New(gid));
}


static Handle<Value> SetGid(const Arguments& args) {
  HandleScope scope;
  
  if (args.Length() < 1) {
    return ThrowException(Exception::Error(
	  String::New("setgid requires 1 argument")));
  }

  Local<Integer> given_gid = args[0]->ToInteger();
  int gid = given_gid->Int32Value();
  int result;
  if ((result == setgid(gid)) != 0) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }
  return Undefined();
}

static Handle<Value> SetUid(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1) {
    return ThrowException(Exception::Error(
          String::New("setuid requires 1 argument")));
  }

  Local<Integer> given_uid = args[0]->ToInteger();
  int uid = given_uid->Int32Value();
  int result;
  if ((result = setuid(uid)) != 0) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }
  return Undefined();
}


v8::Handle<v8::Value> Exit(const v8::Arguments& args) {
  HandleScope scope;
  fflush(stderr);
  Stdio::Flush();
  exit(args[0]->IntegerValue());
  return Undefined();
}

#ifdef __sun
#define HAVE_GETMEM 1
#include <unistd.h> /* getpagesize() */

#if (!defined(_LP64)) && (_FILE_OFFSET_BITS - 0 == 64)
#define PROCFS_FILE_OFFSET_BITS_HACK 1
#undef _FILE_OFFSET_BITS
#else
#define PROCFS_FILE_OFFSET_BITS_HACK 0
#endif

#include <procfs.h>

#if (PROCFS_FILE_OFFSET_BITS_HACK - 0 == 1)
#define _FILE_OFFSET_BITS 64
#endif

int getmem(size_t *rss, size_t *vsize) {
  pid_t pid = getpid();

  size_t page_size = getpagesize();
  char pidpath[1024];
  sprintf(pidpath, "/proc/%d/psinfo", pid);

  psinfo_t psinfo;
  FILE *f = fopen(pidpath, "r");
  if (!f) return -1;

  if (fread(&psinfo, sizeof(psinfo_t), 1, f) != 1) {
    fclose (f);
    return -1;
  }

  /* XXX correct? */

  *vsize = (size_t) psinfo.pr_size * page_size;
  *rss = (size_t) psinfo.pr_rssize * 1024;

  fclose (f);

  return 0;
}
#endif


#ifdef __FreeBSD__
#define HAVE_GETMEM 1
#include <kvm.h>
#include <sys/param.h>
#include <sys/sysctl.h>
#include <sys/user.h>
#include <fcntl.h>
#include <unistd.h>

int getmem(size_t *rss, size_t *vsize) {
  kvm_t *kd = NULL;
  struct kinfo_proc *kinfo = NULL;
  pid_t pid;
  int nprocs;

  pid = getpid();

  kd = kvm_open(NULL, NULL, NULL, O_RDONLY, "kvm_open");
  if (kd == NULL) goto error;

  kinfo = kvm_getprocs(kd, KERN_PROC_PID, pid, &nprocs);
  if (kinfo == NULL) goto error;

  *rss = kinfo->ki_rssize * PAGE_SIZE;
  *vsize = kinfo->ki_size;

  kvm_close(kd);

  return 0;

error:
  if (kd) kvm_close(kd);
  return -1;
}
#endif  // __FreeBSD__


#ifdef __APPLE__
#define HAVE_GETMEM 1
/* Researched by Tim Becker and Michael Knight
 * http://blog.kuriositaet.de/?p=257
 */

#include <mach/task.h>
#include <mach/mach_init.h>

int getmem(size_t *rss, size_t *vsize) {
  struct task_basic_info t_info;
  mach_msg_type_number_t t_info_count = TASK_BASIC_INFO_COUNT;

  int r = task_info(mach_task_self(),
                    TASK_BASIC_INFO,
                    (task_info_t)&t_info,
                    &t_info_count);

  if (r != KERN_SUCCESS) return -1;

  *rss = t_info.resident_size;
  *vsize  = t_info.virtual_size;

  return 0;
}
#endif  // __APPLE__

#ifdef __linux__
# define HAVE_GETMEM 1
# include <sys/param.h> /* for MAXPATHLEN */

int getmem(size_t *rss, size_t *vsize) {
  FILE *f = fopen("/proc/self/stat", "r");
  if (!f) return -1;

  int itmp;
  char ctmp;
  char buffer[MAXPATHLEN];
  size_t page_size = getpagesize();

  /* PID */
  if (fscanf(f, "%d ", &itmp) == 0) goto error;
  /* Exec file */
  if (fscanf (f, "%s ", &buffer[0]) == 0) goto error;
  /* State */
  if (fscanf (f, "%c ", &ctmp) == 0) goto error;
  /* Parent process */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* Process group */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* Session id */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* TTY */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* TTY owner process group */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* Flags */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Minor faults (no memory page) */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Minor faults, children */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Major faults (memory page faults) */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Major faults, children */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* utime */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* stime */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* utime, children */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* stime, children */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* jiffies remaining in current time slice */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* 'nice' value */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;
  /* jiffies until next timeout */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* jiffies until next SIGALRM */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* start time (jiffies since system boot) */
  if (fscanf (f, "%d ", &itmp) == 0) goto error;

  /* Virtual memory size */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  *vsize = (size_t) itmp;

  /* Resident set size */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  *rss = (size_t) itmp * page_size;

  /* rlim */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Start of text */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* End of text */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;
  /* Start of stack */
  if (fscanf (f, "%u ", &itmp) == 0) goto error;

  fclose (f);

  return 0;

error:
  fclose (f);
  return -1;
}
#endif  // __linux__

v8::Handle<v8::Value> MemoryUsage(const v8::Arguments& args) {
  HandleScope scope;

#ifndef HAVE_GETMEM
  return ThrowException(Exception::Error(String::New("Not support on your platform. (Talk to Ryan.)")));
#else
  size_t rss, vsize;

  int r = getmem(&rss, &vsize);

  if (r != 0) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }

  Local<Object> info = Object::New();

  if (rss_symbol.IsEmpty()) {
    rss_symbol = NODE_PSYMBOL("rss");
    vsize_symbol = NODE_PSYMBOL("vsize");
    heap_total_symbol = NODE_PSYMBOL("heapTotal");
    heap_used_symbol = NODE_PSYMBOL("heapUsed");
  }

  info->Set(rss_symbol, Integer::NewFromUnsigned(rss));
  info->Set(vsize_symbol, Integer::NewFromUnsigned(vsize));

  // V8 memory usage
  HeapStatistics v8_heap_stats;
  V8::GetHeapStatistics(&v8_heap_stats);
  info->Set(heap_total_symbol,
            Integer::NewFromUnsigned(v8_heap_stats.total_heap_size()));
  info->Set(heap_used_symbol,
            Integer::NewFromUnsigned(v8_heap_stats.used_heap_size()));

  return scope.Close(info);
#endif
}


v8::Handle<v8::Value> Kill(const v8::Arguments& args) {
  HandleScope scope;

  if (args.Length() < 1 || !args[0]->IsNumber()) {
    return ThrowException(Exception::Error(String::New("Bad argument.")));
  }

  pid_t pid = args[0]->IntegerValue();

  int sig = SIGTERM;

  if (args.Length() >= 2) {
    if (args[1]->IsNumber()) {
      sig = args[1]->Int32Value();
    } else if (args[1]->IsString()) {
      Local<String> signame = args[1]->ToString();

      Local<Value> sig_v = process->Get(signame);
      if (!sig_v->IsNumber()) {
        return ThrowException(Exception::Error(String::New("Unknown signal")));
      }
      sig = sig_v->Int32Value();
    }
  }

  int r = kill(pid, sig);

  if (r != 0) {
    return ThrowException(Exception::Error(String::New(strerror(errno))));
  }

  return Undefined();
}

typedef void (*extInit)(Handle<Object> exports);

// DLOpen is node.dlopen(). Used to load 'module.node' dynamically shared
// objects.
Handle<Value> DLOpen(const v8::Arguments& args) {
  HandleScope scope;

  if (args.Length() < 2) return Undefined();

  String::Utf8Value filename(args[0]->ToString()); // Cast
  Local<Object> target = args[1]->ToObject(); // Cast

  // Actually call dlopen().
  // FIXME: This is a blocking function and should be called asynchronously!
  // This function should be moved to file.cc and use libeio to make this
  // system call.
  void *handle = dlopen(*filename, RTLD_LAZY);

  // Handle errors.
  if (handle == NULL) {
    Local<Value> exception = Exception::Error(String::New(dlerror()));
    return ThrowException(exception);
  }

  // Get the init() function from the dynamically shared object.
  void *init_handle = dlsym(handle, "init");
  // Error out if not found.
  if (init_handle == NULL) {
    Local<Value> exception =
      Exception::Error(String::New("No 'init' symbol found in module."));
    return ThrowException(exception);
  }
  extInit init = (extInit)(init_handle); // Cast

  // Execute the C++ module
  init(target);

  return Undefined();
}

Handle<Value> Compile(const Arguments& args) {
  HandleScope scope;

  if (args.Length() < 2) {
    return ThrowException(Exception::TypeError(
          String::New("needs two arguments.")));
  }

  Local<String> source = args[0]->ToString();
  Local<String> filename = args[1]->ToString();

  TryCatch try_catch;

  Local<Script> script = Script::Compile(source, filename);
  if (try_catch.HasCaught()) {
    // Hack because I can't get a proper stacktrace on SyntaxError
    ReportException(try_catch, true);
    exit(1);
  }

  Local<Value> result = script->Run();
  if (try_catch.HasCaught()) return try_catch.ReThrow();

  return scope.Close(result);
}

static void OnFatalError(const char* location, const char* message) {
  if (location) {
    fprintf(stderr, "FATAL ERROR: %s %s\n", location, message);
  } else {
    fprintf(stderr, "FATAL ERROR: %s\n", message);
  }
  exit(1);
}

static int uncaught_exception_counter = 0;

void FatalException(TryCatch &try_catch) {
  HandleScope scope;

  // Check if uncaught_exception_counter indicates a recursion
  if (uncaught_exception_counter > 0) {
    ReportException(try_catch);
    exit(1);
  }

  if (listeners_symbol.IsEmpty()) {
    listeners_symbol = NODE_PSYMBOL("listeners");
    uncaught_exception_symbol = NODE_PSYMBOL("uncaughtException");
    emit_symbol = NODE_PSYMBOL("emit");
  }

  Local<Value> listeners_v = process->Get(listeners_symbol);
  assert(listeners_v->IsFunction());

  Local<Function> listeners = Local<Function>::Cast(listeners_v);

  Local<String> uncaught_exception_symbol_l = Local<String>::New(uncaught_exception_symbol);
  Local<Value> argv[1] = { uncaught_exception_symbol_l  };
  Local<Value> ret = listeners->Call(process, 1, argv);

  assert(ret->IsArray());

  Local<Array> listener_array = Local<Array>::Cast(ret);

  uint32_t length = listener_array->Length();
  // Report and exit if process has no "uncaughtException" listener
  if (length == 0) {
    ReportException(try_catch);
    exit(1);
  }

  // Otherwise fire the process "uncaughtException" event
  Local<Value> emit_v = process->Get(emit_symbol);
  assert(emit_v->IsFunction());

  Local<Function> emit = Local<Function>::Cast(emit_v);

  Local<Value> error = try_catch.Exception();
  Local<Value> event_argv[2] = { uncaught_exception_symbol_l, error };

  uncaught_exception_counter++;
  emit->Call(process, 2, event_argv);
  // Decrement so we know if the next exception is a recursion or not
  uncaught_exception_counter--;
}


static ev_async debug_watcher;
volatile static bool debugger_msg_pending = false;

static void DebugMessageCallback(EV_P_ ev_async *watcher, int revents) {
  HandleScope scope;
  assert(watcher == &debug_watcher);
  assert(revents == EV_ASYNC);
  Debug::ProcessDebugMessages();
}

static void DebugMessageDispatch(void) {
  // This function is called from V8's debug thread when a debug TCP client
  // has sent a message.

  // Send a signal to our main thread saying that it should enter V8 to
  // handle the message.
  debugger_msg_pending = true;
  ev_async_send(EV_DEFAULT_UC_ &debug_watcher);
}

static Handle<Value> CheckBreak(const Arguments& args) {
  HandleScope scope;

  // TODO FIXME This function is a hack to wait until V8 is ready to accept
  // commands. There seems to be a bug in EnableAgent( _ , _ , true) which
  // makes it unusable here. Ideally we'd be able to bind EnableAgent and
  // get it to halt until Eclipse connects.

  if (!debug_wait_connect)
    return Undefined();

  printf("Waiting for remote debugger connection...\n");

  const int halfSecond = 50;
  const int tenMs=10000;
  debugger_msg_pending = false;
  for (;;) {
    if (debugger_msg_pending) {
      Debug::DebugBreak();
      Debug::ProcessDebugMessages();
      debugger_msg_pending = false;

      // wait for 500 msec of silence from remote debugger
      int cnt = halfSecond;
        while (cnt --) {
        debugger_msg_pending = false;
        usleep(tenMs);
        if (debugger_msg_pending) {
          debugger_msg_pending = false;
          cnt = halfSecond;
        }
      }
      break;
    }
    usleep(tenMs);
  }
  return Undefined();
}


static void Load(int argc, char *argv[]) {
  HandleScope scope;

  Local<FunctionTemplate> process_template = FunctionTemplate::New();
  node::EventEmitter::Initialize(process_template);

  process = Persistent<Object>::New(process_template->GetFunction()->NewInstance());

  // Add a reference to the global object
  Local<Object> global = Context::GetCurrent()->Global();
  process->Set(String::NewSymbol("global"), global);

  // process.version
  process->Set(String::NewSymbol("version"), String::New(NODE_VERSION));
  // process.installPrefix
  process->Set(String::NewSymbol("installPrefix"), String::New(NODE_PREFIX));

  // process.platform
#define xstr(s) str(s)
#define str(s) #s
  process->Set(String::NewSymbol("platform"), String::New(xstr(PLATFORM)));

  // process.argv
  int i, j;
  Local<Array> arguments = Array::New(argc - option_end_index + 1);
  arguments->Set(Integer::New(0), String::New(argv[0]));
  for (j = 1, i = option_end_index + 1; i < argc; j++, i++) {
    Local<String> arg = String::New(argv[i]);
    arguments->Set(Integer::New(j), arg);
  }
  // assign it
  process->Set(String::NewSymbol("ARGV"), arguments);
  process->Set(String::NewSymbol("argv"), arguments);

  // create process.env
  Local<Object> env = Object::New();
  for (i = 0; environ[i]; i++) {
    // skip entries without a '=' character
    for (j = 0; environ[i][j] && environ[i][j] != '='; j++) { ; }
    // create the v8 objects
    Local<String> field = String::New(environ[i], j);
    Local<String> value = Local<String>();
    if (environ[i][j] == '=') {
      value = String::New(environ[i]+j+1);
    }
    // assign them
    env->Set(field, value);
  }
  // assign process.ENV
  process->Set(String::NewSymbol("ENV"), env);
  process->Set(String::NewSymbol("env"), env);

  process->Set(String::NewSymbol("pid"), Integer::New(getpid()));

  // define various internal methods
  NODE_SET_METHOD(process, "loop", Loop);
  NODE_SET_METHOD(process, "unloop", Unloop);
  NODE_SET_METHOD(process, "compile", Compile);
  NODE_SET_METHOD(process, "_byteLength", ByteLength);
  NODE_SET_METHOD(process, "reallyExit", Exit);
  NODE_SET_METHOD(process, "chdir", Chdir);
  NODE_SET_METHOD(process, "cwd", Cwd);
  NODE_SET_METHOD(process, "getuid", GetUid);
  NODE_SET_METHOD(process, "setuid", SetUid);

  NODE_SET_METHOD(process, "setgid", SetGid);
  NODE_SET_METHOD(process, "getgid", GetGid);

  NODE_SET_METHOD(process, "umask", Umask);
  NODE_SET_METHOD(process, "dlopen", DLOpen);
  NODE_SET_METHOD(process, "kill", Kill);
  NODE_SET_METHOD(process, "memoryUsage", MemoryUsage);
  NODE_SET_METHOD(process, "checkBreak", CheckBreak);

  // Assign the EventEmitter. It was created in main().
  process->Set(String::NewSymbol("EventEmitter"),
               EventEmitter::constructor_template->GetFunction());

  // Initialize the stats object
  Local<FunctionTemplate> stat_templ = FunctionTemplate::New();
  stats_constructor_template = Persistent<FunctionTemplate>::New(stat_templ);
  process->Set(String::NewSymbol("Stats"),
      stats_constructor_template->GetFunction());


  // Initialize the C++ modules..................filename of module
  IdleWatcher::Initialize(process);            // idle_watcher.cc
  Stdio::Initialize(process);                  // stdio.cc
  Timer::Initialize(process);                  // timer.cc
  SignalHandler::Initialize(process);          // signal_handler.cc
  Stat::Initialize(process);                   // stat.cc
  ChildProcess::Initialize(process);           // child_process.cc
  DefineConstants(process);                    // constants.cc
  // Create node.dns
  Local<Object> dns = Object::New();
  process->Set(String::NewSymbol("dns"), dns);
  DNS::Initialize(dns);                         // dns.cc
  Local<Object> fs = Object::New();
  process->Set(String::NewSymbol("fs"), fs);
  File::Initialize(fs);                         // file.cc
  // Create node.tcp. Note this separate from lib/tcp.js which is the public
  // frontend.
  Local<Object> tcp = Object::New();
  process->Set(String::New("tcp"), tcp);
  Server::Initialize(tcp);                      // tcp.cc
  Connection::Initialize(tcp);                  // tcp.cc
  // Create node.http.  Note this separate from lib/http.js which is the
  // public frontend.
  Local<Object> http = Object::New();
  process->Set(String::New("http"), http);
  HTTPServer::Initialize(http);                 // http.cc
  HTTPConnection::Initialize(http);             // http.cc



  // Compile, execute the src/node.js file. (Which was included as static C
  // string in node_natives.h. 'natve_node' is the string containing that
  // source code.)

  // The node.js file returns a function 'f'

#ifndef NDEBUG
  TryCatch try_catch;
#endif

  Local<Value> f_value = ExecuteString(String::New(native_node),
                                       String::New("node.js"));
#ifndef NDEBUG
  if (try_catch.HasCaught())  {
    ReportException(try_catch);
    exit(10);
  }
#endif
  assert(f_value->IsFunction());
  Local<Function> f = Local<Function>::Cast(f_value);

  // Now we call 'f' with the 'process' variable that we've built up with
  // all our bindings. Inside node.js we'll take care of assigning things to
  // their places.

  // We start the process this way in order to be more modular. Developers
  // who do not like how 'src/node.js' setups the module system but do like
  // Node's I/O bindings may want to replace 'f' with their own function.

  Local<Value> args[1] = { Local<Value>::New(process) };

  f->Call(global, 1, args);

#ifndef NDEBUG
  if (try_catch.HasCaught())  {
    ReportException(try_catch);
    exit(11);
  }
#endif
}

static void PrintHelp();

static void ParseDebugOpt(const char* arg) {
  const char *p = 0;

  use_debug_agent = true;
  if (!strcmp (arg, "--debug-brk")) {
    debug_wait_connect = true;
    return;
  } else if (!strcmp(arg, "--debug")) {
    return;
  } else if (strstr(arg, "--debug-brk=") == arg) {
    debug_wait_connect = true;
    p = 1 + strchr(arg, '=');
    debug_port = atoi(p);
  } else if (strstr(arg, "--debug=") == arg) {
    p = 1 + strchr(arg, '=');
    debug_port = atoi(p);
  }
  if (p && debug_port > 1024 && debug_port <  65536)
      return;

  fprintf(stderr, "Bad debug option.\n");
  if (p) fprintf(stderr, "Debug port must be in range 1025 to 65535.\n");

  PrintHelp();
  exit(1);
}

static void PrintHelp() {
  printf("Usage: node [options] script.js [arguments] \n"
         "  -v, --version      print node's version\n"
         "  --debug[=port]     enable remote debugging via given TCP port\n"
         "                     without stopping the execution\n"
         "  --debug-brk[=port] as above, but break in script.js and\n"
         "                     wait for remote debugger to connect\n"
         "  --cflags           print pre-processor and compiler flags\n"
         "  --v8-options       print v8 command line options\n\n"
         "Documentation can be found at http://nodejs.org/api.html"
         " or with 'man node'\n");
}

// Parse node command line arguments.
static void ParseArgs(int *argc, char **argv) {
  // TODO use parse opts
  for (int i = 1; i < *argc; i++) {
    const char *arg = argv[i];
    if (strstr(arg, "--debug") == arg) {
      ParseDebugOpt(arg);
      argv[i] = const_cast<char*>("");
      option_end_index = i;
    } else if (strcmp(arg, "--version") == 0 || strcmp(arg, "-v") == 0) {
      printf("%s\n", NODE_VERSION);
      exit(0);
    } else if (strcmp(arg, "--cflags") == 0) {
      printf("%s\n", NODE_CFLAGS);
      exit(0);
    } else if (strcmp(arg, "--help") == 0 || strcmp(arg, "-h") == 0) {
      PrintHelp();
      exit(0);
    } else if (strcmp(arg, "--v8-options") == 0) {
      argv[i] = const_cast<char*>("--help");
      option_end_index = i+1;
    } else if (argv[i][0] != '-') {
      option_end_index = i-1;
      break;
    }
  }
}

}  // namespace node


int main(int argc, char *argv[]) {
  // Parse a few arguments which are specific to Node.
  node::ParseArgs(&argc, argv);
  // Parse the rest of the args (up to the 'option_end_index' (where '--' was
  // in the command line))
  V8::SetFlagsFromCommandLine(&node::option_end_index, argv, false);

  // Error out if we don't have a script argument.
  if (argc < 2) {
    fprintf(stderr, "No script was specified.\n");
    node::PrintHelp();
    return 1;
  }

  // Ignore the SIGPIPE
  evcom_ignore_sigpipe();

  // Initialize the default ev loop.
  ev_default_loop(EVFLAG_AUTO);


  ev_timer_init(&node::gc_timer, node::GCTimeout, GC_INTERVAL, GC_INTERVAL);
  // Set the gc_timer to max priority so that it runs before all other
  // watchers. In this way it can check if the 'tick' has other pending
  // watchers by using ev_pending_count() - if it ran with lower priority
  // then the other watchers might run before it - not giving us good idea
  // of loop idleness.
  ev_set_priority(&node::gc_timer, EV_MAXPRI);
  ev_timer_start(EV_DEFAULT_UC_ &node::gc_timer);
  ev_unref(EV_DEFAULT_UC);


  // Setup the EIO thread pool
  { // It requires 3, yes 3, watchers.
    ev_idle_init(&node::eio_poller, node::DoPoll);

    ev_async_init(&node::eio_want_poll_notifier, node::WantPollNotifier);
    ev_async_start(EV_DEFAULT_UC_ &node::eio_want_poll_notifier);
    ev_unref(EV_DEFAULT_UC);

    ev_async_init(&node::eio_done_poll_notifier, node::DonePollNotifier);
    ev_async_start(EV_DEFAULT_UC_ &node::eio_done_poll_notifier);
    ev_unref(EV_DEFAULT_UC);

    eio_init(node::EIOWantPoll, node::EIODonePoll);
    // Don't handle more than 10 reqs on each eio_poll(). This is to avoid
    // race conditions. See test/mjsunit/test-eio-race.js
    eio_set_max_poll_reqs(10);
  }

  V8::Initialize();
  HandleScope handle_scope;

  V8::SetFatalErrorHandler(node::OnFatalError);

  // If the --debug flag was specified then initialize the debug thread.
  if (node::use_debug_agent) {
    // Initialize the async watcher for receiving messages from the debug
    // thread and marshal it into the main thread. DebugMessageCallback()
    // is called from the main thread to execute a random bit of javascript
    // - which will give V8 control so it can handle whatever new message
    // had been received on the debug thread.
    ev_async_init(&node::debug_watcher, node::DebugMessageCallback);
    ev_set_priority(&node::debug_watcher, EV_MAXPRI);
    // Set the callback DebugMessageDispatch which is called from the debug
    // thread.
    Debug::SetDebugMessageDispatchHandler(node::DebugMessageDispatch);
    // Start the async watcher.
    ev_async_start(EV_DEFAULT_UC_ &node::debug_watcher);
    // unref it so that we exit the event loop despite it being active.
    ev_unref(EV_DEFAULT_UC);

    // Start the debug thread and it's associated TCP server on port 5858.
    bool r = Debug::EnableAgent("node " NODE_VERSION, node::debug_port);

    // Crappy check that everything went well. FIXME
    assert(r);
    // Print out some information.
    printf("debugger listening on port %d\n", node::debug_port);
  }

  // Create the one and only Context.
  Persistent<Context> context = Context::New();
  Context::Scope context_scope(context);

  // Create all the objects, load modules, do everything.
  // so your next reading stop should be node::Load()!
  node::Load(argc, argv);

  node::Stdio::Flush();

#ifndef NDEBUG
  // Clean up.
  context.Dispose();
  V8::Dispose();
#endif  // NDEBUG
  return 0;
}

