import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Functions, files and real program structure',
  summary:
    'Stop writing one long script. Break work into functions, handle errors properly, read and write files, and use the standard library — the skills that turn snippets into programs.',
  outcomes: [
    'Write functions with parameters, defaults and return values',
    'Understand scope and why globals are a trap',
    'Use tuples, sets and comprehensions where they fit',
    'Import from the standard library and write your own modules',
    'Read and write files safely with `with`',
    'Handle errors with try/except instead of crashing',
  ],
  steps: [
    {
      id: 'py-i-01',
      title: 'Functions: naming a block of work',
      read: `A **function** is a named block of code you can run whenever you like.

\`\`\`python
def greet():
    print("Hello!")

greet()
\`\`\`

- \`def\` starts the **definition**, followed by the name, empty brackets and a colon.
- The indented body is the function's code. **Defining it does not run it.**
- \`greet()\` — with brackets — is the **call**, which actually runs the body.

That distinction matters: \`greet\` is the function itself, \`greet()\` is the result of running it.

## Why bother

1. **No repetition.** Write it once, call it from five places. Fix a bug once.
2. **Naming.** \`calculate_shipping()\` tells a reader what a block does far better than 15 lines of arithmetic.
3. **Testing.** Small named pieces can be checked independently.

## The rule of thumb

If you catch yourself copy-pasting code, or if a block needs a comment to explain what it does, it wants to be a function with that comment as its name.`,
      sample: {
        lang: 'python',
        caption: 'Define once (nothing runs), call many times',
        code: `def greet():
    print("Hello!")
    print("Welcome to the program.")

print("Starting...")
greet()
greet()
print("Done.")

def show_banner():
    print("=" * 30)
    print("  SHOPPING LIST  ".center(30))
    print("=" * 30)

show_banner()`,
        output: `Starting...
Hello!
Welcome to the program.
Hello!
Welcome to the program.
Done.
==============================
        SHOPPING LIST
==============================`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What does this print?\n\n```python\ndef hello():\n    print("hi")\n\nprint("start")\nhello\n```',
        options: ['`start` then `hi`', '`hi` then `start`', 'Just `start`', 'Just `hi`'],
        answer: 2,
        explain:
          '`hello` without brackets just refers to the function object — it does not call it. Only `hello()` runs the body. Forgetting the brackets is a silent bug: no error, nothing happens.',
        hint: 'Look very carefully at the last line.',
      },
    },

    {
      id: 'py-i-02',
      title: 'Parameters and return values',
      read: `Functions become useful when you feed them data and get an answer back.

## Parameters: data going in

Names inside the brackets of the \`def\` are **parameters**; the values you pass at the call are **arguments**.

\`\`\`python
def greet(name):
    print(f"Hello, {name}!")

greet("Sam")
\`\`\`

## return: data coming out

\`return\` sends a value back to whoever called the function and **ends the function immediately**.

\`\`\`python
def add(a, b):
    return a + b

total = add(2, 3)
\`\`\`

## print is not return

The single most common confusion in this topic:

- \`print\` shows something to a human. The value is gone.
- \`return\` hands a value back to your code, so you can store it, use it in maths, pass it on.

A function with no \`return\` gives back \`None\`. So \`x = print("hi")\` sets \`x\` to \`None\` — the \`"hi"\` went to the screen, not into \`x\`.

> Rule: functions that *calculate* should return; only the outer layer of your program should print.`,
      sample: {
        lang: 'python',
        caption: 'Same job, one returns and one only prints — watch the difference',
        code: `def add(a, b):
    return a + b

def show_add(a, b):
    print(a + b)

result = add(2, 3)
print(result * 10)

nothing = show_add(2, 3)
print(nothing)

def area(width, height):
    return width * height

def describe(width, height):
    return f"{width}x{height} = {area(width, height)}"

print(describe(3, 4))

# return exits immediately
def first_negative(numbers):
    for n in numbers:
        if n < 0:
            return n
    return None

print(first_negative([4, 8, -3, -9]))`,
        output: `5
50
5
None
3x4 = 12
-3`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Write a function `double` that takes one number and **returns** twice its value. (Do not print anything.)',
        starter: 'def double(',
        mustInclude: ['def\\s+double\\s*\\(\\s*\\w+\\s*\\)\\s*:', 'return\\s+'],
        solution: `def double(n):
    return n * 2`,
        explain:
          'One parameter, and `return` so the caller gets a usable value back. `print(n * 2)` would show the number but hand back `None`, so `double(5) * 3` would then crash.',
        hint: 'Two lines: the `def` line ending in a colon, and an indented `return`.',
      },
    },

    {
      id: 'py-i-03',
      title: 'Default and keyword arguments',
      read: `## Defaults

Give a parameter a default value and callers may leave it out:

\`\`\`python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

greet("Sam")               # Hello, Sam!
greet("Sam", "Morning")    # Morning, Sam!
\`\`\`

Parameters **with** defaults must come after those without — Python needs to know where the required ones stop.

## Keyword arguments

At the call site you can name arguments, which makes order irrelevant and the code far more readable:

\`\`\`python
send(to="sam", subject="Hi", urgent=True)
\`\`\`

Compare with \`send("sam", "Hi", True)\` — what does \`True\` mean there? Use keywords for booleans and for anything non-obvious.

## The mutable default trap

\`\`\`python
def add_item(item, basket=[]):   # BUG
\`\`\`

That list is created **once**, when the function is defined, and shared by every call that omits the argument. Items pile up across calls. The fix is always the same:

\`\`\`python
def add_item(item, basket=None):
    if basket is None:
        basket = []
\`\`\``,
      sample: {
        lang: 'python',
        caption: 'Defaults, keywords, and the shared-list bug',
        code: `def order(item, quantity=1, gift_wrap=False):
    line = f"{quantity} x {item}"
    if gift_wrap:
        line += " (gift wrapped)"
    return line

print(order("mug"))
print(order("mug", 3))
print(order("mug", gift_wrap=True))
print(order(quantity=2, item="pen"))

# the trap
def broken(item, basket=[]):
    basket.append(item)
    return basket

print(broken("a"))
print(broken("b"))

def fixed(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

print(fixed("a"))
print(fixed("b"))`,
        output: `1 x mug
3 x mug
1 x mug (gift wrapped)
2 x pen
['a']
['a', 'b']
['a']
['b']`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which function definition is invalid Python?',
        options: [
          '`def f(a, b=2):`',
          '`def f(a=1, b=2):`',
          '`def f(a=1, b):`',
          '`def f(a, b, c=3):`',
        ],
        answer: 2,
        explain:
          'A parameter without a default cannot follow one with a default — Python cannot tell which positional argument is which. It raises `SyntaxError: non-default argument follows default argument`.',
        hint: 'Defaults have to be at the end.',
      },
    },

    {
      id: 'py-i-04',
      title: 'Scope: where variables live',
      read: `A variable created **inside** a function exists only inside that function. When the function returns, it is gone. This is called **local scope**, and it is a feature, not a limitation: it means you can name a variable \`total\` in fifty different functions without them interfering.

\`\`\`python
def f():
    x = 10     # local to f
    print(x)

f()
print(x)       # NameError — x does not exist out here
\`\`\`

## Reading outer variables

A function *can read* a variable defined at the top level (a **global**):

\`\`\`python
TAX_RATE = 0.2

def with_tax(price):
    return price * (1 + TAX_RATE)
\`\`\`

But **assigning** to it inside the function creates a new local variable instead of changing the global. Python has a \`global\` keyword to override that — and you should almost never use it.

## Do this instead

Pass what you need in as parameters, and return what you produce. A function whose behaviour depends only on its arguments is easy to understand and easy to test. Constants that never change (written in CAPITALS by convention) are the one reasonable exception.`,
      sample: {
        lang: 'python',
        caption: 'Locals vanish; assigning to a global inside a function makes a local',
        code: `TAX_RATE = 0.2

def with_tax(price):
    tax = price * TAX_RATE
    return price + tax

print(with_tax(100))
# print(tax)  -> NameError: name 'tax' is not defined

count = 0

def broken_increment():
    count = count + 1   # UnboundLocalError

def working_increment(current):
    return current + 1

count = working_increment(count)
count = working_increment(count)
print(count)`,
        output: `120.0
2`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What happens here?\n\n```python\ntotal = 5\n\ndef bump():\n    total = total + 1\n\nbump()\n```',
        options: [
          '`total` becomes 6',
          '`UnboundLocalError` — the assignment makes `total` local, and it is read before it exists',
          'Nothing at all',
          '`SyntaxError`',
        ],
        answer: 1,
        explain:
          'Because `bump` assigns to `total`, Python treats `total` as local throughout the whole function — including on the right-hand side, where it has no value yet. Pass it in and return it instead: `def bump(total): return total + 1`.',
        hint: 'Assigning to a name anywhere in a function makes it local for the whole function.',
      },
    },

    {
      id: 'py-i-05',
      title: 'Tuples and returning several values',
      read: `A **tuple** is like a list, but **immutable** — once made it cannot be changed. Round brackets instead of square:

\`\`\`python
point = (3, 4)
\`\`\`

Use a tuple when the collection is a fixed record rather than a growing pile: coordinates, an RGB colour, a database row. Its immutability is a promise to the reader that nothing will reassign it.

## Unpacking

You can pull a tuple apart into separate variables in one go:

\`\`\`python
x, y = point
\`\`\`

The number of names must match the number of items. This is also how the classic swap works, with no temporary variable:

\`\`\`python
a, b = b, a
\`\`\`

## Returning several values

A function can \`return a, b\` — it builds a tuple — and the caller unpacks it. This is how Python does "multiple return values".

\`\`\`python
def min_max(numbers):
    return min(numbers), max(numbers)

lowest, highest = min_max(scores)
\`\`\`

Use \`_\` as the name for a value you do not care about: \`_, highest = min_max(scores)\`.`,
      sample: {
        lang: 'python',
        caption: 'Tuples are fixed records; unpacking is how you take them apart',
        code: `point = (3, 4)
x, y = point
print(x, y)

a, b = 1, 2
a, b = b, a
print(a, b)

def stats(numbers):
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

low, high, avg = stats([4, 8, 15, 16, 23, 42])
print(f"low={low} high={high} avg={avg:.1f}")

# a list of tuples, unpacked in the loop
people = [("Ada", 36), ("Alan", 41)]
for name, age in people:
    print(f"{name} is {age}")

# tuples refuse to change
# point[0] = 99  -> TypeError: 'tuple' object does not support item assignment`,
        output: `3 4
2 1
low=4 high=42 avg=18.0
Ada is 36
Alan is 41`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Write a function `split_name` that takes a full name like `"Ada Lovelace"` and returns the first and last name as two values.',
        starter: 'def split_name(full):',
        mustInclude: ['def\\s+split_name\\s*\\(', 'return\\s+.*,'],
        solution: `def split_name(full):
    parts = full.split()
    return parts[0], parts[-1]`,
        explain:
          '`return a, b` builds a tuple, which the caller unpacks with `first, last = split_name("Ada Lovelace")`. Using `parts[-1]` rather than `parts[1]` copes with middle names.',
        hint: '`.split()` gives you a list; return two items from it, separated by a comma.',
      },
    },

    {
      id: 'py-i-06',
      title: 'Sets and choosing the right collection',
      read: `A **set** is an unordered collection of **unique** items. Curly braces, no key/value pairs:

\`\`\`python
tags = {"python", "code", "python"}   # -> {'python', 'code'}
\`\`\`

(Note: \`{}\` on its own is an empty *dictionary*. For an empty set you must write \`set()\`.)

## What sets are good at

- **Removing duplicates**: \`list(set(items))\`
- **Fast membership tests**: \`x in my_set\` is near-instant no matter how large the set is, whereas \`x in my_list\` scans the whole list
- **Comparing groups**: \`a & b\` (in both), \`a | b\` (in either), \`a - b\` (in a but not b)

## Choosing a collection

- **list** — ordered, duplicates allowed, you will index or append → the default
- **tuple** — a fixed record that should not change
- **dict** — look things up by a name/key
- **set** — uniqueness matters, or you only ever ask "is it in here?"

Picking the right one usually makes the code shorter *and* faster.`,
      sample: {
        lang: 'python',
        caption: 'Deduplication and set maths',
        code: `visitors = ["ada", "alan", "ada", "grace", "alan"]
unique = set(visitors)
print(unique)
print(len(unique))

monday = {"ada", "alan"}
tuesday = {"alan", "grace"}

print(monday & tuesday)
print(monday | tuesday)
print(monday - tuesday)
print(monday ^ tuesday)

tags = set()
tags.add("python")
tags.add("python")
print(tags)
print("python" in tags)`,
        output: `{'ada', 'grace', 'alan'}
3
{'alan'}
{'ada', 'grace', 'alan'}
{'ada'}
{'ada', 'grace'}
{'python'}
True`,
      },
      question: {
        kind: 'fill',
        prompt: 'What does `len(set([1, 2, 2, 3, 3, 3]))` give?',
        placeholder: 'A number',
        accept: ['3'],
        explain:
          'The set keeps only unique values — `{1, 2, 3}` — so its length is **3**. This one-liner is the standard way to count distinct values.',
        hint: 'How many different numbers are in that list?',
      },
    },

    {
      id: 'py-i-07',
      title: 'List comprehensions',
      read: `A very common loop shape is "make a new list from an old one":

\`\`\`python
squares = []
for n in numbers:
    squares.append(n * n)
\`\`\`

Python has a one-line form for exactly that — a **list comprehension**:

\`\`\`python
squares = [n * n for n in numbers]
\`\`\`

Read it left to right: *"\`n * n\`, for each \`n\` in \`numbers\`"*. The expression comes first, then the loop.

## Adding a filter

\`\`\`python
evens = [n for n in numbers if n % 2 == 0]
\`\`\`

The \`if\` at the end keeps only the items that pass.

## Dict and set versions

- \`{name: len(name) for name in names}\` — a dict comprehension
- \`{word.lower() for word in words}\` — a set comprehension

## When not to use one

If it no longer fits comfortably on one line, or needs two conditions and a nested loop, write the ordinary loop. Comprehensions are for readability; a clever unreadable one has missed the point entirely.`,
      sample: {
        lang: 'python',
        caption: 'The same work, written both ways',
        code: `numbers = [1, 2, 3, 4, 5, 6]

squares = []
for n in numbers:
    squares.append(n * n)
print(squares)

squares = [n * n for n in numbers]
print(squares)

evens = [n for n in numbers if n % 2 == 0]
print(evens)

names = ["ada", "alan", "grace"]
print([name.title() for name in names])
print({name: len(name) for name in names})
print([n for n in numbers if n > 2 and n < 6])

prices = {"tea": 2.5, "coffee": 3.0}
print({item: price * 1.2 for item, price in prices.items()})`,
        output: `[1, 4, 9, 16, 25, 36]
[1, 4, 9, 16, 25, 36]
[2, 4, 6]
['Ada', 'Alan', 'Grace']
{'ada': 3, 'alan': 4, 'grace': 5}
[3, 4, 5]
{'tea': 3.0, 'coffee': 3.5999999999999996}`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'A list `words` exists. Write a **single line** that builds a list of only the words longer than 3 characters, in upper case.',
        starter: 'long_words = ',
        mustInclude: ['\\[\\s*\\w+\\s*\\.\\s*upper\\s*\\(\\s*\\)\\s+for\\s+\\w+\\s+in\\s+words\\s+if\\s+len\\s*\\(', '>\\s*3'],
        solution: 'long_words = [word.upper() for word in words if len(word) > 3]',
        explain:
          'Expression first (`word.upper()`), then the loop (`for word in words`), then the filter (`if len(word) > 3`). The filter runs before the expression, so short words are never upper-cased at all.',
        hint: 'Shape: `[EXPRESSION for item in words if CONDITION]`',
      },
    },

    {
      id: 'py-i-08',
      title: 'Modules: using other people’s code',
      read: `Python ships with a huge **standard library** — hundreds of ready-made modules. You get at them with \`import\`.

\`\`\`python
import math
print(math.sqrt(16))
\`\`\`

## Three import styles

- \`import math\` → use as \`math.sqrt(...)\`. Clearest; prefer this.
- \`from math import sqrt\` → use as \`sqrt(...)\`. Fine for one or two names.
- \`from math import *\` → imports everything. **Avoid** — you can no longer tell where a name came from, and it can silently overwrite your own variables.

## Ones worth knowing today

- \`math\` — \`sqrt\`, \`floor\`, \`ceil\`, \`pi\`
- \`random\` — \`randint(a, b)\`, \`choice(seq)\`, \`shuffle(list)\`
- \`datetime\` — dates and times
- \`json\` — convert between Python objects and JSON text
- \`os\` / \`pathlib\` — files and paths

## Your own modules

Any \`.py\` file is a module. Put functions in \`helpers.py\`, then \`import helpers\` from a file next to it and call \`helpers.my_function()\`. That is all a module is.`,
      sample: {
        lang: 'python',
        caption: 'Standard library modules, and importing your own file',
        code: `import math
import random
from datetime import date

print(math.sqrt(144))
print(math.pi)
print(math.ceil(4.1))

random.seed(42)
print(random.randint(1, 6))
print(random.choice(["rock", "paper", "scissors"]))

today = date.today()
print(today.year)

# helpers.py next to this file:
#     def shout(text):
#         return text.upper() + "!"
# then:
# import helpers
# print(helpers.shout("hello"))`,
        output: `12.0
3.141592653589793
5
6
paper
2026`,
      },
      question: {
        kind: 'mcq',
        prompt: 'You want a random whole number from 1 to 6 inclusive. Which line is right?',
        options: [
          '`random.randint(1, 6)`',
          '`random.randint(1, 7)`',
          '`random.range(1, 6)`',
          '`math.randint(1, 6)`',
        ],
        answer: 0,
        explain:
          '`random.randint(a, b)` is unusual in Python: **both ends are included**, so `randint(1, 6)` gives 1–6. (That differs from `range`, where the stop value is excluded — a genuine inconsistency worth remembering.)',
        hint: 'Unlike `range`, `randint` includes its upper bound.',
      },
    },

    {
      id: 'py-i-09',
      title: 'Reading and writing files',
      read: `Programs that forget everything when they close are limited. Files fix that.

## Always use \`with\`

\`\`\`python
with open("notes.txt") as f:
    text = f.read()
\`\`\`

\`with\` guarantees the file is closed again, even if an error happens inside the block. Opening a file without \`with\` and forgetting to close it is a real bug that can lose data.

## Modes

- \`"r"\` — read (the default). Errors if the file is missing.
- \`"w"\` — write. **Creates the file, or empties an existing one.** Be careful.
- \`"a"\` — append. Adds to the end, keeps what is there.

## Reading

- \`f.read()\` — the whole file as one string
- \`f.readlines()\` — a list of lines (each still ending in \`\\n\`)
- \`for line in f:\` — one line at a time, and the only option that works on a file too big for memory

## Writing

\`f.write(text)\` does **not** add a newline — include \`\\n\` yourself. Use \`.strip()\` when reading lines back to remove it.`,
      sample: {
        lang: 'python',
        caption: 'Write, append, then read back — with `with` every time',
        code: `with open("scores.txt", "w") as f:
    f.write("Ada,92\\n")
    f.write("Alan,78\\n")

with open("scores.txt", "a") as f:
    f.write("Grace,95\\n")

with open("scores.txt") as f:
    for line in f:
        name, score = line.strip().split(",")
        print(f"{name} scored {score}")

with open("scores.txt") as f:
    lines = f.readlines()
print(f"{len(lines)} rows")

total = 0
with open("scores.txt") as f:
    for line in f:
        total += int(line.strip().split(",")[1])
print(f"Average: {total / len(lines):.1f}")`,
        output: `Ada scored 92
Alan scored 78
Grace scored 95
3 rows
Average: 88.3`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You want to add a line to a log file without destroying what is already in it. Which mode?',
        options: ['`open("log.txt", "w")`', '`open("log.txt", "a")`', '`open("log.txt", "r")`', '`open("log.txt", "x")`'],
        answer: 1,
        explain:
          '`"a"` appends to the end. `"w"` would wipe the file the instant it opened — a mistake that has destroyed a lot of real data. `"r"` cannot write, and `"x"` fails if the file already exists.',
        hint: 'One of these erases the file before you have written anything.',
      },
    },

    {
      id: 'py-i-10',
      title: 'Handling errors with try / except',
      read: `An uncaught error stops your program dead. When you can *predict* a failure — bad user input, a missing file, a dead network — you handle it instead.

\`\`\`python
try:
    age = int(input("Age: "))
except ValueError:
    print("That was not a whole number.")
\`\`\`

Python runs the \`try\` block; if the named error occurs it jumps to the matching \`except\` and carries on afterwards.

## Catch specific errors

\`except ValueError:\` is good. A bare \`except:\` catches *everything*, including your own typos and Ctrl+C, and turns real bugs into silent weirdness. Always name what you expect.

## The full shape

- \`except SomeError as e:\` — gives you the error object, so you can print the detail
- \`else:\` — runs only if no error happened
- \`finally:\` — runs either way, for cleanup

## Do not over-use it

\`try/except\` is for things genuinely outside your control. A wrong index or a misspelled variable is a bug to fix, not an error to swallow.`,
      sample: {
        lang: 'python',
        caption: 'Validating input, and handling a missing file',
        code: `while True:
    try:
        age = int(input("Age: "))
        break
    except ValueError:
        print("Whole numbers only, please.")

print(f"You are {age}")

try:
    with open("config.txt") as f:
        settings = f.read()
except FileNotFoundError:
    print("No config file — using defaults.")
    settings = "theme=dark"

print(settings)

def safe_divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None

print(safe_divide(10, 2))
print(safe_divide(10, 0))`,
        output: `Age: twenty
Whole numbers only, please.
Age: 30
You are 30
No config file — using defaults.
theme=dark
5.0
None`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Wrap `number = int(text)` in a try/except that catches `ValueError` and sets `number = 0` instead.',
        starter: 'try:',
        mustInclude: ['try\\s*:', 'number\\s*=\\s*int\\s*\\(\\s*text\\s*\\)', 'except\\s+ValueError\\s*:', 'number\\s*=\\s*0'],
        solution: `try:
    number = int(text)
except ValueError:
    number = 0`,
        explain:
          '`int()` raises `ValueError` when the text is not a number, so that is the exception to name. Catching `ValueError` specifically means a genuine bug — say, a `NameError` from a typo — still surfaces loudly.',
        hint: 'Four lines, two of them indented under the colons.',
      },
    },

    {
      id: 'py-i-11',
      title: 'None, truthiness and guard clauses',
      read: `## None

\`None\` means "no value". It is what a function returns when it has no \`return\`, and what \`.get()\` gives for a missing key.

Test it with \`is\`, not \`==\`:

\`\`\`python
if result is None:
\`\`\`

\`is\` asks "is this the very same object?", which is exactly the right question for the one-and-only \`None\`.

## Truthiness

Any value can be used as a condition. These are all **falsy**:

\`False\`, \`None\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, \`()\`, \`set()\`

Everything else is **truthy**. So \`if items:\` means "if the list has anything in it" — cleaner than \`if len(items) > 0:\`.

Careful though: \`if count:\` is False when \`count\` is \`0\`, which may or may not be what you meant. When 0 is a legitimate value, compare explicitly.

## Guard clauses

Rather than wrapping the body in a big \`if\`, deal with the awkward cases first and return early. The happy path then sits un-indented at the bottom, which is much easier to read.`,
      sample: {
        lang: 'python',
        caption: 'Nested and indented, versus guard clauses and flat',
        code: `def describe_nested(items):
    if items is not None:
        if len(items) > 0:
            return f"{len(items)} items, first is {items[0]}"
        else:
            return "empty"
    else:
        return "nothing given"

def describe(items):
    if items is None:
        return "nothing given"
    if not items:
        return "empty"
    return f"{len(items)} items, first is {items[0]}"

print(describe(None))
print(describe([]))
print(describe(["a", "b"]))

for value in [0, "", [], "hi", 5, None]:
    print(f"{value!r:>6} -> {bool(value)}")`,
        output: `nothing given
empty
2 items, first is a
     0 -> False
    '' -> False
    [] -> False
  'hi' -> True
     5 -> True
  None -> False`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which of these is **truthy**?',
        options: ['`[]`', '`""`', '`"0"`', '`0`'],
        answer: 2,
        explain:
          '`"0"` is a string one character long — a non-empty string, so truthy. The number `0`, the empty string and the empty list are all falsy. This catches people out when reading `"0"` from a file or from `input()`.',
        hint: 'One of them is a string that is not empty.',
      },
    },

    {
      id: 'py-i-12',
      title: 'Putting it together: a contacts app that remembers',
      read: `A program built from functions, storing data in a JSON file so it survives between runs.

What to notice in the sample:

1. **One job per function.** \`load_contacts\`, \`save_contacts\`, \`add_contact\`, \`find_contact\`. Each is small enough to check at a glance.
2. **No printing in the logic.** The functions return data; \`main()\` does the talking. That means you could put a web interface on this tomorrow without touching them.
3. **Errors handled at the edges** — where the file is read, and where input is parsed.
4. **\`if __name__ == "__main__":\`** — this block runs when the file is executed directly, but *not* when it is imported by another file. It is how a Python file can be both a program and a library.

The \`json\` module converts between Python dicts/lists and text, so saving state is two lines.`,
      sample: {
        lang: 'python',
        caption: 'Functions that return data, a main() that talks to the user',
        code: `import json

FILE = "contacts.json"

def load_contacts():
    try:
        with open(FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        print("Contacts file was corrupt — starting fresh.")
        return {}

def save_contacts(contacts):
    with open(FILE, "w") as f:
        json.dump(contacts, f, indent=2)

def add_contact(contacts, name, phone):
    contacts[name.lower()] = phone
    return contacts

def find_contact(contacts, name):
    return contacts.get(name.lower())

def main():
    contacts = load_contacts()
    while True:
        choice = input("(a)dd, (f)ind, (l)ist, (q)uit: ").strip().lower()
        if choice == "a":
            name = input("Name: ").strip()
            phone = input("Phone: ").strip()
            add_contact(contacts, name, phone)
            save_contacts(contacts)
            print(f"Saved {name}")
        elif choice == "f":
            phone = find_contact(contacts, input("Name: "))
            print(phone if phone else "Not found.")
        elif choice == "l":
            for name, phone in sorted(contacts.items()):
                print(f"{name.title():<12} {phone}")
        elif choice == "q":
            break

if __name__ == "__main__":
    main()`,
        output: `(a)dd, (f)ind, (l)ist, (q)uit: a
Name: Ada
Phone: 555-0101
Saved Ada
(a)dd, (f)ind, (l)ist, (q)uit: l
Ada          555-0101`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `if __name__ == "__main__":` achieve?',
        options: [
          'It makes the program run faster',
          'The block runs when this file is executed directly, but not when another file imports it',
          'It is required in every Python file',
          'It defines the entry point the operating system looks for',
        ],
        answer: 1,
        explain:
          'Python sets `__name__` to `"__main__"` in the file you actually ran, and to the module name in anything imported. The guard lets one file be both a runnable program and an importable library — import it for its functions and `main()` stays quiet.',
        hint: 'Think about what happens when someone writes `import contacts`.',
      },
    },
  ],
}

export default level
