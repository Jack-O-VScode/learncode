import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'How Python really works',
  summary:
    'The deep end: the data model, closures and descriptors, memory and performance, concurrency and async, packaging, and the judgement calls that separate working code from good code.',
  outcomes: [
    'Reason about names, objects, references and mutation',
    'Use closures, descriptors and metaprogramming deliberately',
    'Explain the GIL and pick threads, processes or async correctly',
    'Write async code that actually overlaps work',
    'Profile before optimising, and know what actually costs',
    'Package and publish a project properly',
  ],
  steps: [
    {
      id: 'py-p-01',
      title: 'Names, objects and identity',
      read: `Python has no variables in the C sense — no boxes holding values. It has **objects** floating in memory and **names** pointing at them.

\`a = [1, 2, 3]\` creates a list object and binds the name \`a\` to it. \`b = a\` binds a second name to the **same object**. There is one list and two names.

This explains every "why did my list change?" bug:

\`\`\`python
def add_item(items):
    items.append("x")   # mutates the caller's list

def rebind(items):
    items = ["x"]       # rebinds the local name only
\`\`\`

## is vs ==

- \`==\` asks "equal value?" (via \`__eq__\`)
- \`is\` asks "the same object?" (identity, i.e. \`id()\`)

Use \`is\` only for \`None\`, \`True\`, \`False\` and sentinels. CPython caches small ints and short strings, so \`256 is 256\` is True while \`257 is 257\` may not be — an implementation detail you must never rely on.

## Copying

\`b = a[:]\` or \`list(a)\` gives a **shallow** copy: a new outer list, but the same inner objects. For nested structures use \`copy.deepcopy\`.`,
      sample: {
        lang: 'python',
        caption: 'Mutation travels through references; rebinding does not',
        code: `import copy

a = [1, 2, 3]
b = a
b.append(4)
print(a, b, a is b)

def add_item(items):
    items.append("x")

def rebind(items):
    items = ["x"]

data = [1]
add_item(data)
print(data)
rebind(data)
print(data)

shallow = [[1, 2], [3, 4]]
copied = shallow[:]
copied[0].append(99)
print(shallow)

deep = copy.deepcopy(shallow)
deep[0].append(100)
print(shallow)
print(deep)`,
        output: `[1, 2, 3, 4] [1, 2, 3, 4] True
[1, 'x']
[1, 'x']
[[1, 2, 99], [3, 4]]
[[1, 2, 99], [3, 4]]
[[1, 2, 99, 100], [3, 4]]`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What does this print?\n\n```python\nouter = [[0], [0]]\ncopied = outer[:]\ncopied[0][0] = 9\nprint(outer)\n```',
        options: ['`[[0], [0]]`', '`[[9], [0]]`', '`[[9], [9]]`', 'An error'],
        answer: 1,
        explain:
          '`outer[:]` copies the *outer* list only — both lists still point at the same two inner lists. Mutating an inner list is visible through both. `copy.deepcopy(outer)` is what you need to isolate them.',
        hint: 'How many new list objects does a slice copy actually create?',
      },
    },

    {
      id: 'py-p-02',
      title: 'Closures and the function factory pattern',
      read: `A nested function that refers to a name from its enclosing function **closes over** that name — it keeps it alive after the outer function has returned. That is a **closure**.

\`\`\`python
def multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

triple = multiplier(3)
triple(10)   # 30
\`\`\`

\`factor\` is gone from the call stack, but \`triple\` still holds it. Every decorator you write is a closure over \`func\`.

## nonlocal

Assigning inside the inner function creates a new local, exactly as with globals. \`nonlocal count\` says "assign to the enclosing function's variable".

## The late-binding trap

\`\`\`python
fns = [lambda: i for i in range(3)]
[f() for f in fns]   # [2, 2, 2] — not [0, 1, 2]
\`\`\`

Closures capture the **variable**, not its value at creation. By the time you call them, \`i\` is 2. The fix is to bind at definition time with a default argument: \`lambda i=i: i\`.

This is one of the most common real-world Python bugs, and it appears constantly in loops that build callbacks or event handlers.`,
      sample: {
        lang: 'python',
        caption: 'Closures, nonlocal, and the late-binding bug with its fix',
        code: `def multiplier(factor):
    def multiply(x):
        return x * factor
    return multiply

double = multiplier(2)
triple = multiplier(3)
print(double(10), triple(10))
print(double.__closure__[0].cell_contents)

def counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

tick = counter()
print(tick(), tick(), tick())

broken = [lambda: i for i in range(3)]
print([f() for f in broken])

fixed = [lambda i=i: i for i in range(3)]
print([f() for f in fixed])`,
        output: `20 30
2
1 2 3
[2, 2, 2]
[0, 1, 2]`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why does `[lambda: i for i in range(3)]` produce three functions that all return 2?',
        options: [
          'Lambdas can only be created once',
          'Each lambda captures the variable `i`, not its value — and by call time `i` is 2',
          '`range(3)` ends at 2, so all get 2',
          'List comprehensions evaluate lazily',
        ],
        answer: 1,
        explain:
          'Closures are by reference. All three lambdas share the same `i`, whose final value is 2. Adding a default argument (`lambda i=i: i`) evaluates `i` at definition time and freezes each value.',
        hint: 'When is the body of a lambda actually evaluated?',
      },
    },

    {
      id: 'py-p-03',
      title: 'Descriptors and how attributes really resolve',
      read: `\`obj.attr\` runs a well-defined lookup:

1. \`type(obj).__mro__\` is searched for a **data descriptor** (an object defining \`__set__\` or \`__delete__\`) — if found, it wins
2. \`obj.__dict__\` — the instance's own attributes
3. the class hierarchy again, for non-data descriptors (plain functions, \`classmethod\`, \`staticmethod\`) and normal class attributes
4. \`__getattr__\` as the final fallback

A **descriptor** is any object defining \`__get__\`, \`__set__\` or \`__delete__\`. This is not exotic machinery bolted on — it is how \`property\`, methods themselves, \`classmethod\`, \`staticmethod\` and \`__slots__\` are all implemented.

## Why write one

When several attributes need the same validation, a descriptor beats copy-pasting five properties.

## __getattr__ vs __getattribute__

- \`__getattr__\` is called only when normal lookup **fails** — safe and useful (proxies, lazy loading)
- \`__getattribute__\` intercepts **every** access — easy to make infinitely recursive, rarely the right tool`,
      sample: {
        lang: 'python',
        caption: 'One validating descriptor reused across several attributes',
        code: `class Positive:
    def __set_name__(self, owner, name):
        self.private = f"_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self.private)

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.private[1:]} must be positive, got {value}")
        setattr(obj, self.private, value)

class Order:
    quantity = Positive()
    price = Positive()

    def __init__(self, quantity, price):
        self.quantity = quantity
        self.price = price

o = Order(3, 9.99)
print(o.quantity, o.price)

try:
    o.quantity = -1
except ValueError as e:
    print(e)

class Lazy:
    def __getattr__(self, name):
        print(f"(computing {name})")
        value = name.upper()
        setattr(self, name, value)
        return value

lazy = Lazy()
print(lazy.greeting)
print(lazy.greeting)`,
        output: `3 9.99
quantity must be positive, got -1
(computing greeting)
GREETING
GREETING`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `lazy.greeting` computed only once in the sample?',
        options: [
          'Python caches `__getattr__` results automatically',
          '`__getattr__` runs only when normal lookup fails, and `setattr` put the value in the instance dict for next time',
          '`__getattr__` can only run once per object',
          'The print statement is suppressed on repeat calls',
        ],
        answer: 1,
        explain:
          'The first access finds nothing, so `__getattr__` runs and stores the value with `setattr`. The second access finds it in `obj.__dict__` at step 2 of the lookup, so `__getattr__` is never reached. That is the standard lazy-attribute idiom.',
        hint: 'Look at what `setattr` does inside the method.',
      },
    },

    {
      id: 'py-p-04',
      title: 'Memory: __slots__, interning and object cost',
      read: `Every ordinary Python object carries a \`__dict__\` so attributes can be added at any time. That flexibility costs memory — a few hundred bytes per instance. With a million instances it dominates.

## __slots__

Declaring \`__slots__\` replaces the per-instance dict with a fixed array of named fields:

\`\`\`python
class Point:
    __slots__ = ("x", "y")
\`\`\`

Typically 40–60% less memory and slightly faster attribute access. The trade-off: you cannot add new attributes at runtime, and you lose \`__dict__\` (which some libraries expect). Use it for high-count data objects, not for general classes.

## Where the memory actually goes

- A \`list\` of a million ints: the list holds a million **pointers**, and each int is a separate object of ~28 bytes
- \`array.array\` or a NumPy array stores raw values contiguously — vastly smaller and cache-friendly
- \`sys.getsizeof\` reports the object alone, not what it references; use \`tracemalloc\` for real figures

## Garbage collection

CPython frees objects by **reference counting**, instantly when the last reference goes. A cycle detector runs periodically to catch objects that reference each other. \`weakref\` lets you hold a reference that does not keep an object alive — the fix for caches that leak.`,
      sample: {
        lang: 'python',
        caption: 'Measuring the cost of a million small objects',
        code: `import sys
import tracemalloc

class Loose:
    def __init__(self, x, y):
        self.x, self.y = x, y

class Tight:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x, self.y = x, y

for cls in (Loose, Tight):
    tracemalloc.start()
    points = [cls(i, i) for i in range(100000)]
    current, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f"{cls.__name__:6} {current / 1024 / 1024:.1f} MB")
    del points

print(sys.getsizeof([1, 2, 3]))
print(sys.getsizeof(1))

t = Tight(1, 2)
try:
    t.z = 3
except AttributeError as e:
    print(e)`,
        output: `Loose  18.3 MB
Tight   7.2 MB
88
28
'Tight' object has no attribute 'z'`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the real cost of adding `__slots__` to a class?',
        options: [
          'Attribute access becomes slower',
          'You can no longer add attributes that were not declared, and instances lose `__dict__`',
          'The class can no longer be subclassed',
          'Instances can no longer be pickled',
        ],
        answer: 1,
        explain:
          'Slots trade dynamism for memory. Attribute access is actually marginally *faster*; subclassing and pickling still work (a subclass without its own `__slots__` simply regains a `__dict__`). The restriction is that undeclared attributes raise `AttributeError`.',
        hint: 'What does the per-instance dictionary make possible in the first place?',
      },
    },

    {
      id: 'py-p-05',
      title: 'The GIL: threads, processes and what actually runs in parallel',
      read: `CPython has a **Global Interpreter Lock**: only one thread executes Python bytecode at a time, in a given interpreter. So:

- **CPU-bound work does not speed up with threads.** Four threads doing maths take the same wall-clock time as one, plus overhead.
- **I/O-bound work does.** The GIL is released while waiting on a socket, a disk or a subprocess, so other threads run meanwhile.

## Choosing

- **Waiting** on network/disk, modest concurrency → \`threading\` or \`ThreadPoolExecutor\`
- **Waiting** on thousands of connections → \`asyncio\` (one thread, no per-thread stack)
- **Computing** → \`multiprocessing\` / \`ProcessPoolExecutor\`, one interpreter per core. Data is pickled between processes, so pass large data via shared memory or files, not as arguments.

## Threads are still dangerous

The GIL does *not* make your code thread-safe. \`counter += 1\` is read-modify-write, and a thread can be pre-empted between bytecodes. Use \`threading.Lock\`, or better, a \`queue.Queue\` — hand data between threads rather than sharing it.

> Python 3.13+ ships an experimental free-threaded build without the GIL. The advice above still holds for the standard interpreter that virtually everyone runs.`,
      sample: {
        lang: 'python',
        caption: 'Same work, three ways — note which one actually gets faster',
        code: `import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def cpu_work(n):
    return sum(i * i for i in range(n))

def io_work(seconds):
    time.sleep(seconds)
    return seconds

def timed(label, fn):
    start = time.perf_counter()
    fn()
    print(f"{label:22} {time.perf_counter() - start:.2f}s")

timed("cpu, serial", lambda: [cpu_work(5_000_000) for _ in range(4)])

timed("cpu, 4 threads", lambda: list(
    ThreadPoolExecutor(4).map(cpu_work, [5_000_000] * 4)))

timed("cpu, 4 processes", lambda: list(
    ProcessPoolExecutor(4).map(cpu_work, [5_000_000] * 4)))

timed("io, serial", lambda: [io_work(0.5) for _ in range(4)])

timed("io, 4 threads", lambda: list(
    ThreadPoolExecutor(4).map(io_work, [0.5] * 4)))`,
        output: `cpu, serial            1.84s
cpu, 4 threads         1.91s
cpu, 4 processes       0.53s
io, serial             2.01s
io, 4 threads          0.50s`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You need to resize 5,000 images as fast as possible on an 8-core machine. What do you reach for?',
        options: [
          '`threading` — more threads means more speed',
          '`asyncio` — it is the modern approach',
          '`ProcessPoolExecutor` — image resizing is CPU-bound, so it needs real parallelism across cores',
          'A plain `for` loop; Python parallelises automatically',
        ],
        answer: 2,
        explain:
          'Resizing is CPU work, and the GIL serialises CPU-bound Python across threads. Processes each get their own interpreter and lock, so they genuinely use all 8 cores. (If the resizing happens inside a C library that releases the GIL, threads can help too — but processes are the safe default.)',
        hint: 'Is the program waiting, or computing?',
      },
    },

    {
      id: 'py-p-06',
      title: 'asyncio: concurrency without threads',
      read: `\`async def\` defines a **coroutine**. \`await\` says "this may take a while — let the event loop run something else until it is done". One thread, thousands of concurrent operations, no locks.

## The rule that matters

\`await\` only yields control if the thing you are awaiting is genuinely async. \`time.sleep(1)\` inside a coroutine blocks the **entire** event loop and every other task with it. Use \`await asyncio.sleep(1)\`, and an async library (\`httpx\`, \`aiohttp\`, \`asyncpg\`) rather than a blocking one.

## Awaiting sequentially is not concurrency

\`\`\`python
a = await fetch(1)     # waits
b = await fetch(2)     # then waits again
\`\`\`

To overlap, hand the loop several things at once:

\`\`\`python
a, b = await asyncio.gather(fetch(1), fetch(2))
\`\`\`

Or use \`asyncio.TaskGroup\` (3.11+), which also cancels siblings properly if one fails.

## When to use it

Async shines with many concurrent I/O operations — web servers, scrapers, chat. For a handful of calls, threads are simpler and just as fast. Async is invasive: one blocking call anywhere ruins it.`,
      sample: {
        lang: 'python',
        caption: 'Sequential awaits versus gather — the difference is the whole point',
        code: `import asyncio
import time

async def fetch(name, seconds):
    print(f"  start {name}")
    await asyncio.sleep(seconds)
    print(f"  done  {name}")
    return f"{name}-result"

async def sequential():
    a = await fetch("A", 1)
    b = await fetch("B", 1)
    return [a, b]

async def concurrent():
    return await asyncio.gather(fetch("A", 1), fetch("B", 1))

async def with_task_group():
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch("C", 1))
        t2 = tg.create_task(fetch("D", 1))
    return [t1.result(), t2.result()]

async def main():
    for label, coro in [("sequential", sequential()), ("gather", concurrent())]:
        start = time.perf_counter()
        await coro
        print(f"{label}: {time.perf_counter() - start:.2f}s")
    await with_task_group()

asyncio.run(main())`,
        output: `  start A
  done  A
  start B
  done  B
sequential: 2.00s
  start A
  start B
  done  A
  done  B
gather: 1.00s
  start C
  start D
  done  C
  done  D`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A coroutine calls `time.sleep(2)` instead of `await asyncio.sleep(2)`. What happens?',
        options: [
          'Nothing different — they are equivalent',
          'The whole event loop is blocked for 2 seconds, so every other task stalls too',
          'A `SyntaxError`',
          'Only that one coroutine pauses; the rest carry on',
        ],
        answer: 1,
        explain:
          'Everything runs on one thread. `time.sleep` does not hand control back to the event loop, so no other task can progress. A single blocking call is enough to destroy the concurrency of an entire async program — and it is the most common async bug there is.',
        hint: 'How many threads is the event loop running on?',
      },
    },

    {
      id: 'py-p-07',
      title: 'Designing errors',
      read: `## EAFP

Python's style is *Easier to Ask Forgiveness than Permission*: try the operation, handle the failure — rather than checking first and hoping nothing changes in between.

\`\`\`python
try:
    value = config["timeout"]
except KeyError:
    value = 30
\`\`\`

Checking first (\`if "timeout" in config\`) does the lookup twice and, with anything shared or on disk, is a race condition.

## Your own exception types

\`\`\`python
class AppError(Exception): pass
class ConfigError(AppError): pass
\`\`\`

A common base class lets callers catch your whole library with one \`except AppError\`, or a specific failure when they care. Put useful data on the exception, not just a message string.

## Rules worth holding to

- Never write a bare \`except:\` — it swallows \`KeyboardInterrupt\` and your own typos
- Never \`except Exception: pass\`. Silent failure is worse than a crash, because the crash at least tells you where
- Re-raise with a bare \`raise\` to keep the original traceback
- \`raise NewError(...) from original\` preserves the cause chain
- Raise at the level that *detects* the problem; catch at the level that can *decide* what to do

## Exception groups

3.11 added \`ExceptionGroup\` and \`except*\`, for when several concurrent tasks fail at once and you need all the failures, not just the first.`,
      sample: {
        lang: 'python',
        caption: 'A small exception hierarchy carrying real data',
        code: `class AppError(Exception):
    """Base for every error this application raises."""

class ConfigError(AppError):
    def __init__(self, key, message="missing"):
        self.key = key
        super().__init__(f"config key {key!r}: {message}")

class RetryableError(AppError):
    def __init__(self, message, retry_after=5):
        self.retry_after = retry_after
        super().__init__(message)

def load_timeout(config):
    try:
        raw = config["timeout"]
    except KeyError as e:
        raise ConfigError("timeout") from e
    try:
        return int(raw)
    except (TypeError, ValueError) as e:
        raise ConfigError("timeout", f"expected a number, got {raw!r}") from e

for config in [{"timeout": "30"}, {}, {"timeout": "soon"}]:
    try:
        print(load_timeout(config))
    except ConfigError as e:
        print(f"{type(e).__name__}: {e} (key={e.key})")

try:
    raise RetryableError("upstream is down", retry_after=30)
except AppError as e:
    print(f"caught by base class: {e}")`,
        output: `30
ConfigError: config key 'timeout': missing (key=timeout)
ConfigError: config key 'timeout': expected a number, got 'soon' (key=timeout)
caught by base class: upstream is down`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `raise ConfigError(...) from e` add over a plain `raise ConfigError(...)`?',
        options: [
          'It makes the new exception catchable',
          'It links the original exception as the cause, so the traceback shows both',
          'It suppresses the original exception entirely',
          'Nothing — `from` is decorative',
        ],
        answer: 1,
        explain:
          'Explicit chaining prints "The above exception was the direct cause of the following exception", keeping the original traceback attached. Without it you still get implicit chaining ("During handling..."), but `from` states the relationship deliberately — and `from None` is how you deliberately hide an irrelevant internal cause.',
        hint: 'Think about what you want to see in the traceback at 3am.',
      },
    },

    {
      id: 'py-p-08',
      title: 'Measure before you optimise',
      read: `Guessing which line is slow is almost always wrong. Measure.

- \`timeit\` — for microbenchmarks. Runs the snippet many times and takes the best, cancelling out noise.
- \`cProfile\` — for whole programs: \`python -m cProfile -s cumtime app.py\`. Read the \`cumtime\` column and find the hot function.
- \`tracemalloc\` — where memory went.
- Line-level tools (\`line_profiler\`, \`py-spy\`) — when the hot function is long.

## The order of attack

1. **Better algorithm.** \`x in list\` is O(n); \`x in set\` is O(1). Turning a nested loop into a dict lookup beats any micro-optimisation ever written.
2. **Do less work.** Cache (\`functools.lru_cache\`), stream instead of loading, filter early.
3. **Move the loop out of Python.** Built-ins, comprehensions, \`str.join\`, NumPy — these run in C. A Python-level loop is roughly 50× slower.
4. **Only then** micro-optimise, or reach for C extensions.

## Amdahl's law, informally

Making a function twice as fast is worthless if it is 2% of the runtime. Optimise the top of the profile, and stop when it is fast enough.`,
      sample: {
        lang: 'python',
        caption: 'The same task, four ways — the algorithm change dwarfs everything else',
        code: `import timeit

setup = """
haystack_list = list(range(100000))
haystack_set = set(haystack_list)
"""

print("list lookup:", timeit.timeit(
    "99999 in haystack_list", setup=setup, number=1000))
print("set lookup: ", timeit.timeit(
    "99999 in haystack_set", setup=setup, number=1000))

build = """
def with_concat(n):
    s = ""
    for i in range(n):
        s += str(i)
    return s

def with_join(n):
    return "".join(str(i) for i in range(n))

def with_list_comp(n):
    return "".join([str(i) for i in range(n)])
"""

for name in ("with_concat", "with_join", "with_list_comp"):
    t = timeit.timeit(f"{name}(10000)", setup=build, number=100)
    print(f"{name:16} {t:.3f}s")`,
        output: `list lookup: 0.9312
set lookup:  0.0000412
with_concat      0.612s
with_join        0.331s
with_list_comp   0.298s`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A profile shows `parse_row` at 78% of runtime and `format_output` at 3%. You can make either 2× faster. Which do you do?',
        options: [
          '`format_output`, because it is easier',
          '`parse_row` — halving 78% saves 39% of total runtime, while halving 3% saves 1.5%',
          'Both equally, since both are 2× faster',
          'Neither; rewrite the program in C',
        ],
        answer: 1,
        explain:
          'Speedups are worth what they remove from the total. This is why you profile first: intuition consistently points at the interesting code rather than the expensive code.',
        hint: 'Multiply the speedup by the share of runtime.',
      },
    },

    {
      id: 'py-p-09',
      title: 'Metaprogramming, used sparingly',
      read: `Python lets code inspect and modify itself. It is powerful, and it is how ORMs, serialisers and web frameworks avoid boilerplate — but every use makes the code harder to follow, so the bar is high.

## The toolkit, in increasing order of danger

- \`getattr\`/\`setattr\`/\`hasattr\` — dynamic attribute access. Ordinary and fine.
- \`inspect\` — read signatures, source, the call stack. Great for tooling.
- \`__init_subclass__\` — a hook that runs whenever a class is subclassed. Handles most "register every subclass" needs with no metaclass at all.
- \`__getattr__\` on a class — proxies and lazy loading.
- **Metaclasses** — classes whose instances are classes. \`type\` is the default one.

## The rule

> "Metaclasses are deeper magic than 99% of users should ever worry about. If you wonder whether you need them, you don't." — Tim Peters

\`__init_subclass__\` and decorators solve nearly everything metaclasses were once used for, and both are far easier to read.`,
      sample: {
        lang: 'python',
        caption: 'A plugin registry, three ways — prefer the first',
        code: `class Plugin:
    registry = {}

    def __init_subclass__(cls, name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        Plugin.registry[name or cls.__name__.lower()] = cls

class JsonPlugin(Plugin, name="json"):
    def run(self): return "json!"

class CsvPlugin(Plugin, name="csv"):
    def run(self): return "csv!"

print(Plugin.registry)
print(Plugin.registry["csv"]().run())

# a decorator does the same job with no inheritance
handlers = {}

def handles(event):
    def register(func):
        handlers[event] = func
        return func
    return register

@handles("click")
def on_click(x, y):
    return f"clicked {x},{y}"

print(handlers["click"](3, 4))

# a metaclass: same result, more machinery
class AutoRepr(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        if "__repr__" not in ns:
            cls.__repr__ = lambda self: f"<{name} {self.__dict__}>"
        return cls

class Widget(metaclass=AutoRepr):
    def __init__(self, size): self.size = size

print(Widget(3))`,
        output: `{'json': <class '__main__.JsonPlugin'>, 'csv': <class '__main__.CsvPlugin'>}
csv!
clicked 3,4
<Widget {'size': 3}>`,
      },
      question: {
        kind: 'mcq',
        prompt: 'You need every subclass of `Handler` to register itself automatically. What is the right tool?',
        options: [
          'A metaclass',
          '`__init_subclass__` on the base class',
          'Editing `globals()` at import time',
          '`eval` on the class body',
        ],
        answer: 1,
        explain:
          '`__init_subclass__` exists precisely for this and is readable by anyone. Metaclasses can do it too, but bring inheritance conflicts and a much steeper learning curve for no extra benefit here.',
        hint: 'Pick the least powerful tool that does the job.',
      },
    },

    {
      id: 'py-p-10',
      title: 'Packaging and publishing',
      read: `A modern Python project is described by one file: \`pyproject.toml\`. \`setup.py\` is legacy.

\`\`\`toml
[project]
name = "mytool"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = ["requests>=2.31"]

[project.scripts]
mytool = "mytool.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
\`\`\`

\`[project.scripts]\` is what creates a real command on the user's PATH.

## Building and publishing

\`\`\`
pip install build twine
python -m build            # makes dist/*.whl and dist/*.tar.gz
twine upload dist/*
\`\`\`

Publish to **TestPyPI** first. A version number on PyPI can never be reused, even after deletion.

## Versioning

Semantic versioning: MAJOR.MINOR.PATCH. Breaking change → major. New feature → minor. Fix → patch. Pin dependencies with ranges (\`>=2.31,<3\`) in a library, and exactly (a lockfile) in an application — libraries must compose, applications must reproduce.

## Editable installs

\`pip install -e .\` installs your project pointing at your source tree, so edits take effect immediately. This is how you develop a package.`,
      sample: {
        lang: 'bash',
        caption: 'From source folder to an installable command',
        code: `pip install -e ".[dev]"
pytest
ruff check .

python -m build
ls dist/
# mytool-0.1.0-py3-none-any.whl
# mytool-0.1.0.tar.gz

twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ mytool
mytool --help`,
        output: `Successfully installed mytool-0.1.0
usage: mytool [-h] [--verbose] PATH`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why install your own project with `pip install -e .` while developing?',
        options: [
          'It installs faster',
          'It links the install to your source tree, so code edits take effect without reinstalling',
          'It skips dependency resolution',
          'It is required before you can run tests',
        ],
        answer: 1,
        explain:
          'An editable install puts a pointer to your working directory on the import path. You get proper package imports (`from mytool.core import x`) with no reinstall loop — and no `sys.path` hacks at the top of your test files.',
        hint: 'What does the "e" stand for?',
      },
    },

    {
      id: 'py-p-11',
      title: 'Reading source and judging libraries',
      read: `At this level your biggest speed-up is no longer writing code faster — it is choosing well and reading other people's code confidently.

## Judging a dependency

Before adding one, check:
- **Last release date** and open-issue trend. An abandoned library becomes your maintenance burden.
- **Its own dependency tree.** One convenient package can drag in thirty.
- **Licence.** GPL in a proprietary product is a real problem.
- **Size of the problem it solves.** If it is 40 lines you could write and test yourself, write them. \`left-pad\` is a genuine cautionary tale.

## Reading unfamiliar source

1. Start at the public API — what does the README tell people to call?
2. Follow one path all the way down, ignoring everything else.
3. Read the tests: they are executable documentation of intended behaviour.
4. \`inspect.getsource(obj)\` prints the source of anything at runtime.

## Reading the standard library

It is installed on your machine and largely written in readable Python. \`dataclasses.py\`, \`functools.py\` and \`pathlib.py\` are excellent reading and will teach you more idiom than any tutorial.`,
      sample: {
        lang: 'python',
        caption: 'Investigating any object from the shell',
        code: `import inspect
import functools
from dataclasses import dataclass

print(inspect.signature(functools.lru_cache))
print(functools.reduce.__doc__.splitlines()[0])

@dataclass
class Point:
    x: int
    y: int

print(inspect.getsource(Point.__init__))
print(Point.__dataclass_fields__.keys())
print([n for n in dir(functools) if not n.startswith("_")])
print(inspect.getfile(functools))`,
        output: `(maxsize=128, typed=False)
reduce(function, iterable[, initial], /) -> value
def __init__(self, x, y):
    self.x = x
    self.y = y

dict_keys(['x', 'y'])
['WRAPPER_ASSIGNMENTS', 'WRAPPER_UPDATES', 'cache', 'cached_property', 'cmp_to_key', 'lru_cache', 'partial', 'partialmethod', 'reduce', 'singledispatch', 'singledispatchmethod', 'total_ordering', 'update_wrapper', 'wraps']
/usr/lib/python3.12/functools.py`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A library you need was last released four years ago, has 180 open issues and pulls in 22 dependencies. What is the most useful thing to check next?',
        options: [
          'Its star count on GitHub',
          'Whether a maintained alternative exists, or whether the part you need is small enough to implement and test yourself',
          'Whether the README is well written',
          'Nothing — install it and see',
        ],
        answer: 1,
        explain:
          'An unmaintained dependency with a wide tree is future work you have not scheduled: security patches, Python-version breakage and transitive conflicts all land on you. Stars measure past popularity, not current health.',
        hint: 'What happens the next time Python has a breaking release?',
      },
    },

    {
      id: 'py-p-12',
      title: 'Capstone: a production-shaped tool',
      read: `Everything in one small program — a log analyser that could genuinely ship.

What makes it production-shaped:

1. **Streaming.** \`iter_lines\` is a generator, so a 10 GB log uses constant memory.
2. **Separated layers.** Parsing, aggregating and reporting are independent functions. Every one is testable without a file, a terminal or a clock.
3. **A frozen dataclass with \`__slots__\`** for the hot record type — millions of these, so per-instance cost matters.
4. **\`Counter\` and \`defaultdict\`** instead of hand-rolled dicts.
5. **Errors that carry context.** A bad line names its line number instead of collapsing the run.
6. **\`argparse\`** for a real command-line interface, with the entry point registered in \`pyproject.toml\`.
7. **Type hints throughout**, so \`mypy\` can check it in CI.

> The measure of senior code is not cleverness. It is that the next person — including you in a year — can read it, test it, and change it without fear.`,
      sample: {
        lang: 'python',
        caption: 'src/logstat/core.py — streaming, layered, typed',
        code: `from __future__ import annotations

import argparse
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

LINE = re.compile(
    r'(?P<ip>\\S+) \\S+ \\S+ \\[(?P<ts>[^\\]]+)\\] '
    r'"(?P<method>\\w+) (?P<path>\\S+)[^"]*" (?P<status>\\d{3}) (?P<bytes>\\d+|-)'
)

class LogFormatError(ValueError):
    def __init__(self, lineno: int, line: str) -> None:
        self.lineno = lineno
        super().__init__(f"line {lineno}: unparseable: {line[:60]!r}")

@dataclass(frozen=True, slots=True)
class Entry:
    ip: str
    method: str
    path: str
    status: int
    size: int

def iter_lines(path: Path) -> Iterator[str]:
    with path.open(encoding="utf-8", errors="replace") as f:
        yield from f

def parse(lines: Iterable[str], strict: bool = False) -> Iterator[Entry]:
    for lineno, line in enumerate(lines, start=1):
        match = LINE.match(line)
        if match is None:
            if strict:
                raise LogFormatError(lineno, line)
            continue
        raw = match.groupdict()
        yield Entry(
            ip=raw["ip"],
            method=raw["method"],
            path=raw["path"],
            status=int(raw["status"]),
            size=0 if raw["bytes"] == "-" else int(raw["bytes"]),
        )

@dataclass(slots=True)
class Report:
    total: int = 0
    bytes_sent: int = 0
    by_status: Counter[int] = None
    top_paths: Counter[str] = None
    errors_by_ip: defaultdict[str, int] = None

def summarise(entries: Iterable[Entry]) -> Report:
    report = Report(by_status=Counter(), top_paths=Counter(),
                    errors_by_ip=defaultdict(int))
    for entry in entries:
        report.total += 1
        report.bytes_sent += entry.size
        report.by_status[entry.status] += 1
        report.top_paths[entry.path] += 1
        if entry.status >= 500:
            report.errors_by_ip[entry.ip] += 1
    return report

def render(report: Report, top: int = 5) -> str:
    lines = [
        f"requests   {report.total:,}",
        f"bytes      {report.bytes_sent / 1_048_576:.1f} MiB",
        "status     " + ", ".join(
            f"{code}:{n}" for code, n in sorted(report.by_status.items())),
        "top paths:",
    ]
    lines += [f"  {n:>6}  {path}" for path, n in report.top_paths.most_common(top)]
    if report.errors_by_ip:
        worst = max(report.errors_by_ip.items(), key=lambda kv: kv[1])
        lines.append(f"most 5xx   {worst[0]} ({worst[1]})")
    return "\\n".join(lines)

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Summarise an access log.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--top", type=int, default=5)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)

    try:
        report = summarise(parse(iter_lines(args.path), strict=args.strict))
    except FileNotFoundError:
        parser.error(f"no such file: {args.path}")
    except LogFormatError as e:
        parser.error(str(e))

    print(render(report, top=args.top))
    return 0`,
        output: `$ logstat access.log --top 3
requests   1,482,003
bytes      18,204.6 MiB
status     200:1401882, 301:44120, 404:35100, 500:901
top paths:
  412998  /api/v1/items
  201004  /
   98123  /static/app.js
most 5xx   10.0.14.22 (612)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `parse` written as a generator taking an iterable of lines, rather than a function taking a file path and returning a list?',
        options: [
          'Generators are always faster than lists',
          'It keeps memory flat on huge files, and lets tests pass a plain list of strings with no file involved',
          'Because `re` requires a generator',
          'To avoid importing `pathlib`',
        ],
        answer: 1,
        explain:
          'Two wins from one decision. Streaming means a 10 GB log never lands in memory, and depending on an *iterable of strings* rather than a path means the test suite is `list(parse(["a line"]))` — no fixtures, no temp files, no I/O. Accepting the most general input your function can work with is a habit worth making automatic.',
        hint: 'Think about both the 10 GB file and the unit test.',
      },
    },
  ],
}

export default level
