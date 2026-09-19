import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Objects, generators and professional tooling',
  summary:
    'Design your own types with classes, use inheritance and dunder methods well, write generators and decorators, add type hints, and set up a project the way working developers actually do.',
  outcomes: [
    'Write classes with `__init__`, methods and properties',
    'Use `__str__`, `__repr__` and `__eq__` to make objects behave properly',
    'Choose between inheritance and composition',
    'Write generators with `yield` and understand laziness',
    'Write and apply decorators',
    'Use type hints, dataclasses, virtual environments and tests',
  ],
  steps: [
    {
      id: 'py-s-01',
      title: 'Classes: making your own type',
      read: `You have used types built by other people: \`str\`, \`list\`, \`dict\`. A **class** lets you define your own.

\`\`\`python
class Dog:
    def __init__(self, name):
        self.name = name

rex = Dog("Rex")
\`\`\`

- \`class Dog:\` defines the type. Class names use \`CapWords\`.
- \`Dog("Rex")\` creates an **instance** — one particular dog.
- \`__init__\` is the **initialiser**, run automatically at creation. Its job is to set up the new object's data.
- \`self\` is the instance being worked on. Python passes it automatically; you never write it at the call site.
- \`self.name = name\` stores the value **on that instance**, so each dog has its own.

## Why not just a dict?

A dict holds data. A class holds data *and the behaviour that belongs with it*, in one place with a name. Once you have three functions that all take the same dict as their first argument, you have discovered a class.`,
      sample: {
        lang: 'python',
        caption: 'One class, three independent instances',
        code: `class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed
        self.tricks = []

    def learn(self, trick):
        self.tricks.append(trick)

    def show_off(self):
        if not self.tricks:
            return f"{self.name} knows no tricks yet."
        return f"{self.name} can: {', '.join(self.tricks)}"

rex = Dog("Rex", "collie")
bo = Dog("Bo", "poodle")

rex.learn("sit")
rex.learn("roll over")

print(rex.show_off())
print(bo.show_off())
print(rex.breed, bo.breed)
print(rex.tricks is bo.tricks)`,
        output: `Rex can: sit, roll over
Bo knows no tricks yet.
collie poodle
False`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Inside a method, what is `self`?',
        options: [
          'The class itself',
          'The particular instance the method was called on',
          'A required keyword with no meaning',
          'The module the class lives in',
        ],
        answer: 1,
        explain:
          '`rex.learn("sit")` is really `Dog.learn(rex, "sit")` — Python passes the instance as the first argument. That is why `self.tricks` is *this dog\'s* list and not shared with every other dog.',
        hint: 'Which dog gets the trick when you call `rex.learn(...)`?',
      },
    },

    {
      id: 'py-s-02',
      title: 'Dunder methods: making objects behave like built-ins',
      read: `Methods named with double underscores — "dunder" methods — hook your class into Python's own syntax.

- \`__str__\` — what \`print(obj)\` shows. For humans.
- \`__repr__\` — what the shell shows, and what appears inside a list. For developers; should ideally look like code that would recreate the object.
- \`__eq__\` — what \`==\` means for your type
- \`__len__\` — what \`len(obj)\` returns
- \`__lt__\` — what \`<\` means, which also makes \`sorted()\` work

Without \`__repr__\`, printing a list of your objects gives you \`[<Dog object at 0x7f...>, ...]\`, which is useless while debugging.

## The equality rule

By default \`==\` on two objects asks "are these the same object in memory?" — so two \`Point(1, 2)\` instances are *not* equal. Define \`__eq__\` to compare by value. If you define \`__eq__\` and want the object usable in a set or as a dict key, define \`__hash__\` too (or use a frozen dataclass, which does it for you).`,
      sample: {
        lang: 'python',
        caption: 'The same class with and without dunder methods',
        code: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __str__(self):
        return f"({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __add__(self, other):
        return Point(self.x + other.x, self.y + other.y)

a = Point(1, 2)
b = Point(1, 2)

print(a)
print(repr(a))
print([a, b])
print(a == b)
print(a is b)
print(a + b)`,
        output: `(1, 2)
Point(1, 2)
[Point(1, 2), Point(1, 2)]
True
False
Point(2, 4)`,
      },
      question: {
        kind: 'fill',
        prompt:
          'Which dunder method must you define so that `print(my_object)` shows friendly text instead of `<__main__.Thing object at 0x...>`?',
        placeholder: '__something__',
        accept: ['__str__', '__str__()', 'str'],
        caseSensitive: false,
        explain:
          '`print()` calls `__str__`. If you have not defined it, Python falls back to `__repr__`, and if neither exists you get the default memory-address form. Defining `__repr__` alone therefore covers both cases, which is why it is the one to write first.',
        hint: 'It matches the name of the built-in that converts things to text.',
      },
    },

    {
      id: 'py-s-03',
      title: 'Properties: methods that look like attributes',
      read: `Sometimes a value should be calculated on demand rather than stored. \`@property\` lets a method be read like a plain attribute:

\`\`\`python
class Rectangle:
    @property
    def area(self):
        return self.width * self.height

r.area      # no brackets
\`\`\`

The benefit: \`area\` can never drift out of date, because it is worked out fresh every time.

## Validation on assignment

A setter lets you run code when someone assigns:

\`\`\`python
@temperature.setter
def temperature(self, value):
    if value < -273.15:
        raise ValueError("Below absolute zero")
    self._celsius = value
\`\`\`

The leading underscore on \`_celsius\` is a convention meaning "internal — do not touch from outside". Python does not enforce it; it trusts you.

> The point of properties is that you can start with a plain attribute and *later* turn it into a computed or validated one without changing a single line of calling code.`,
      sample: {
        lang: 'python',
        caption: 'A computed property, and one that validates on assignment',
        code: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    @property
    def area(self):
        return self.width * self.height

    @property
    def is_square(self):
        return self.width == self.height

r = Rectangle(3, 4)
print(r.area)
r.width = 10
print(r.area)
print(r.is_square)

class Thermostat:
    def __init__(self, celsius=20):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("Below absolute zero!")
        self._celsius = value

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32

t = Thermostat()
t.celsius = 25
print(t.fahrenheit)`,
        output: `12
40
False
77.0`,
      },
      question: {
        kind: 'mcq',
        prompt: 'With `area` defined as a `@property`, how do you read it?',
        options: ['`r.area()`', '`r.area`', '`r.get_area()`', '`area(r)`'],
        answer: 1,
        explain:
          'A property is accessed like an attribute, with no brackets — that is the whole point. `r.area()` would try to call the *result* (an int) and raise `TypeError: int object is not callable`.',
        hint: 'It should look like data, not like a function call.',
      },
    },

    {
      id: 'py-s-04',
      title: 'Inheritance, and when not to use it',
      read: `A class can **inherit** from another, getting all its methods and adding or replacing some.

\`\`\`python
class Animal:
    def speak(self):
        return "..."

class Dog(Animal):
    def speak(self):
        return "Woof"
\`\`\`

\`Dog\` **is an** \`Animal\`. It gets everything \`Animal\` has; \`speak\` is **overridden**.

## super()

Call the parent's version from inside the child's:

\`\`\`python
class Puppy(Dog):
    def __init__(self, name, age):
        super().__init__(name)
        self.age = age
\`\`\`

Use \`super().__init__(...)\` whenever a subclass has its own \`__init__\`, or the parent's setup never runs.

## Composition is usually better

The test is strict: use inheritance only for a genuine **is-a** relationship where the child can be used anywhere the parent can. A \`Car\` is not an \`Engine\` — it **has an** engine, so store one as an attribute. That is **composition**, and it is more flexible, easier to change and easier to test.

> Deep inheritance hierarchies are one of the most common sources of unmaintainable code. Prefer shallow trees, or none.`,
      sample: {
        lang: 'python',
        caption: 'Inheritance for is-a, composition for has-a',
        code: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

    def introduce(self):
        return f"{self.name} says {self.speak()}"

class Dog(Animal):
    def speak(self):
        return "Woof"

class Cat(Animal):
    def speak(self):
        return "Meow"

class Puppy(Dog):
    def __init__(self, name, age_weeks):
        super().__init__(name)
        self.age_weeks = age_weeks

    def speak(self):
        return "Yip"

for animal in [Dog("Rex"), Cat("Mog"), Puppy("Bo", 6)]:
    print(animal.introduce())

# composition: a Car HAS an Engine
class Engine:
    def start(self):
        return "vroom"

class Car:
    def __init__(self):
        self.engine = Engine()

    def start(self):
        return f"Car: {self.engine.start()}"

print(Car().start())`,
        output: `Rex says Woof
Mog says Meow
Bo says Yip
Car: vroom`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which of these is the right case for inheritance rather than composition?',
        options: [
          '`Order` and `Customer`',
          '`House` and `Door`',
          '`SavingsAccount` and `BankAccount`',
          '`Playlist` and `Song`',
        ],
        answer: 2,
        explain:
          'A `SavingsAccount` **is a** `BankAccount` — anywhere the program expects an account, a savings account will do. The others are all has-a or references-a relationships: a house *has* doors, a playlist *has* songs, an order *has* a customer.',
        hint: 'Which pair passes the "is a" test with a straight face?',
      },
    },

    {
      id: 'py-s-05',
      title: 'Generators: values produced on demand',
      read: `A function with \`yield\` instead of \`return\` is a **generator**. Calling it does not run the body — it hands you an object that produces values one at a time, pausing at each \`yield\` and resuming where it left off.

\`\`\`python
def countdown(n):
    while n > 0:
        yield n
        n -= 1
\`\`\`

## Why this matters

\`[x for x in range(10_000_000)]\` builds ten million items in memory before you touch any of them. A generator holds **one at a time**. That is the difference between a program that runs and one that dies.

Generators are also the natural way to model infinite or unknown-length sequences: lines arriving from a file, events from a socket, the Fibonacci numbers.

## Generator expressions

\`sum(x * x for x in numbers)\` — like a list comprehension but with round brackets, and nothing is built in memory.

## The catch

A generator is exhausted once consumed. Loop over it twice and the second loop sees nothing. If you need the values again, keep a \`list(...)\` of them.`,
      sample: {
        lang: 'python',
        caption: 'Lazy production, and reading a huge file one line at a time',
        code: `def countdown(n):
    while n > 0:
        yield n
        n -= 1
    yield "Lift off!"

for value in countdown(3):
    print(value)

gen = countdown(2)
print(next(gen))
print(next(gen))

def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

fib = fibonacci()
print([next(fib) for _ in range(10)])

numbers = range(1, 1000001)
print(sum(n * n for n in numbers if n % 3 == 0))

def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()`,
        output: `3
2
1
Lift off!
2
1
[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
111111055555500000`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the main advantage of a generator over building a list?',
        options: [
          'Generators are always faster',
          'Values are produced one at a time, so memory use stays flat no matter how many there are',
          'Generators can be looped over repeatedly',
          'Generators can hold more types of value',
        ],
        answer: 1,
        explain:
          'Laziness is the point: one value exists at a time, so a generator over a billion items uses the same memory as one over ten. They are not always faster, and being single-use is their main drawback, not a benefit.',
        hint: 'Think about what a list has to do before you can use its first item.',
      },
    },

    {
      id: 'py-s-06',
      title: 'Decorators: wrapping a function',
      read: `A **decorator** takes a function and returns a replacement that adds behaviour around it. You have already used two: \`@property\` and \`@staticmethod\`.

\`\`\`python
@timed
def slow_thing():
    ...
\`\`\`

is exactly the same as writing \`slow_thing = timed(slow_thing)\`. The \`@\` is just tidy syntax.

## Writing one

\`\`\`python
def timed(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"took {time.time() - start:.3f}s")
        return result
    return wrapper
\`\`\`

- \`*args, **kwargs\` collect *any* arguments, so the wrapper works on any function
- you must \`return result\`, or the decorated function silently returns \`None\`
- \`@functools.wraps(func)\` on the wrapper copies the original's name and docstring across; without it, debugging and \`help()\` show \`wrapper\` for everything

Decorators are how logging, timing, caching, retries, authentication and route registration are done throughout the Python ecosystem.`,
      sample: {
        lang: 'python',
        caption: 'A timing decorator, and the built-in caching one',
        code: `import functools
import time

def timed(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper

@timed
def slow_sum(n):
    return sum(range(n))

print(slow_sum(1000000))
print(slow_sum.__name__)

@functools.lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(60))`,
        output: `slow_sum took 0.0182s
499999500000
slow_sum
1548008755920`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is `@log` above a function definition equivalent to?',
        options: [
          '`log(my_function())`',
          '`my_function = log(my_function)`',
          '`log = my_function`',
          'Nothing — it is only a comment',
        ],
        answer: 1,
        explain:
          'The decorator is called with the function object and its return value is bound back to the same name. That is why a decorator must return something callable — and why forgetting `return wrapper` makes the decorated function become `None`.',
        hint: 'The decorator receives the function itself, not its result.',
      },
    },

    {
      id: 'py-s-07',
      title: 'Type hints and dataclasses',
      read: `Python does not check types at runtime, but **annotations** document your intent and let tools catch mistakes before you run anything.

\`\`\`python
def greet(name: str, times: int = 1) -> str:
    return f"Hello {name}! " * times
\`\`\`

Editors use these for autocomplete and inline errors; \`mypy\` or \`pyright\` check a whole project. For collections: \`list[str]\`, \`dict[str, int]\`, \`int | None\` (the modern way to write "an int or nothing").

## Dataclasses

Classes that mostly hold data involve a lot of boilerplate. \`@dataclass\` writes it for you:

\`\`\`python
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
\`\`\`

That gives you \`__init__\`, \`__repr__\` and \`__eq__\` for free. \`@dataclass(frozen=True)\` makes instances immutable and hashable, so they work in sets and as dict keys.

Use \`field(default_factory=list)\` for a mutable default — a dataclass will refuse a bare \`= []\`, which is Python protecting you from the shared-default bug you met earlier.`,
      sample: {
        lang: 'python',
        caption: 'Annotated functions, and a dataclass replacing 20 lines of boilerplate',
        code: `from dataclasses import dataclass, field

def average(numbers: list[float]) -> float:
    return sum(numbers) / len(numbers)

def find_user(user_id: int) -> str | None:
    users = {1: "ada"}
    return users.get(user_id)

print(average([1.0, 2.0, 3.0]))
print(find_user(1), find_user(99))

@dataclass
class Book:
    title: str
    author: str
    year: int
    tags: list[str] = field(default_factory=list)

    def cite(self) -> str:
        return f"{self.author} ({self.year}). {self.title}."

b1 = Book("Dune", "Herbert", 1965)
b2 = Book("Dune", "Herbert", 1965)

print(b1)
print(b1 == b2)
print(b1.cite())

@dataclass(frozen=True)
class Coord:
    x: int
    y: int

print({Coord(0, 0), Coord(0, 0), Coord(1, 1)})`,
        output: `2.0
ada None
Book(title='Dune', author='Herbert', year=1965, tags=[])
True
Herbert (1965). Dune.
{Coord(x=0, y=0), Coord(x=1, y=1)}`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does adding `-> str` to a function definition do at runtime?',
        options: [
          'Forces the return value to be converted to a string',
          'Raises an error if the function returns something else',
          'Nothing — it is documentation that tools and editors read',
          'Makes the function run faster',
        ],
        answer: 2,
        explain:
          'Python stores annotations but never enforces them. Their value is in editors, type checkers like mypy, and other humans. Returning an int from a `-> str` function runs fine — and that is exactly the bug a type checker catches for you before it ships.',
        hint: 'Python is dynamically typed; hints are for tooling.',
      },
    },

    {
      id: 'py-s-08',
      title: 'Project layout, virtual environments and pip',
      read: `## Virtual environments

Installing packages globally means two projects that need different versions of the same library fight each other. A **virtual environment** is a private package folder per project.

\`\`\`
python -m venv .venv
source .venv/bin/activate      # Mac / Linux
.venv\\Scripts\\activate         # Windows
pip install requests
pip freeze > requirements.txt
\`\`\`

Add \`.venv/\` to \`.gitignore\` — you share the *list* of dependencies, never the folder itself. Anyone can then rebuild it with \`pip install -r requirements.txt\`.

## A sane layout

\`\`\`
myproject/
  .venv/
  src/myapp/__init__.py
  src/myapp/core.py
  tests/test_core.py
  requirements.txt
  README.md
\`\`\`

A folder with an \`__init__.py\` is a **package**, so \`from myapp.core import thing\` works. (\`__init__.py\` can be empty; its presence is the point.)

## Imports

Prefer absolute imports (\`from myapp.core import parse\`) over relative ones (\`from .core import parse\`) — they survive files being moved and are far easier to read.`,
      sample: {
        lang: 'bash',
        caption: 'Starting a real project from nothing',
        code: `mkdir myproject
cd myproject
python -m venv .venv
source .venv/bin/activate

pip install requests pytest
pip freeze > requirements.txt

mkdir -p src/myapp tests
touch src/myapp/__init__.py src/myapp/core.py
echo ".venv/" > .gitignore

# later, on another machine:
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt`,
        output: `Successfully installed requests-2.32.3 pytest-8.3.2 ...`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why should `.venv/` be in `.gitignore` while `requirements.txt` is committed?',
        options: [
          'The folder is too large to upload',
          'The folder contains machine-specific, rebuildable files, while the text file is the portable record of what to install',
          'Git cannot store binary files',
          'It is only a style preference',
        ],
        answer: 1,
        explain:
          'A virtual environment contains compiled, platform-specific files and absolute paths — it will not work on someone else\'s machine. `requirements.txt` is the reproducible recipe, and anyone can rebuild the environment from it in seconds.',
        hint: 'Which of the two would still work if you copied it to a different operating system?',
      },
    },

    {
      id: 'py-s-09',
      title: 'Testing your code',
      read: `A test is just code that runs your code and checks the answer. The moment a project is bigger than one file, tests are what let you change things without fear.

## pytest

\`\`\`python
# tests/test_math.py
from myapp.core import add

def test_add():
    assert add(2, 3) == 5
\`\`\`

Run \`pytest\` in the project root. It finds files named \`test_*.py\`, runs functions named \`test_*\`, and reports. \`assert\` is plain Python — pytest rewrites it so failures show you both values.

## What makes a good test

- **One behaviour per test**, with a name that says what it checks
- **Edge cases**: empty input, zero, negative, missing key, one item
- **Errors too**: \`with pytest.raises(ValueError):\` asserts that something *does* fail
- **No dependence on order** — each test sets up whatever it needs

## The habit worth building

When you find a bug, write the failing test *first*, then fix it. The test proves the fix works and stops the bug ever coming back.`,
      sample: {
        lang: 'python',
        caption: 'Normal cases, edge cases, and an expected failure',
        code: `import pytest
from myapp.core import average, parse_score

def test_average_of_several():
    assert average([2, 4, 6]) == 4

def test_average_of_one():
    assert average([7]) == 7

def test_average_of_empty_raises():
    with pytest.raises(ValueError):
        average([])

def test_parse_score_strips_whitespace():
    assert parse_score("  42 ") == 42

def test_parse_score_rejects_words():
    with pytest.raises(ValueError):
        parse_score("high")

@pytest.mark.parametrize("value,expected", [("0", 0), ("10", 10), ("-3", -3)])
def test_parse_score_variants(value, expected):
    assert parse_score(value) == expected`,
        output: `$ pytest -q
........                                              [100%]
8 passed in 0.03s`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Write a pytest test function that checks a function `double(3)` returns `6`. Name the test properly so pytest finds it.',
        starter: 'def test_',
        mustInclude: ['def\\s+test_\\w*\\s*\\(\\s*\\)\\s*:', 'assert\\s+double\\s*\\(\\s*3\\s*\\)\\s*==\\s*6'],
        solution: `def test_double_returns_twice_the_input():
    assert double(3) == 6`,
        explain:
          'pytest collects functions whose names start with `test_`, in files named `test_*.py`. The body is a plain `assert` — no special assertion methods needed, and pytest shows you both sides when it fails.',
        hint: 'The function name must begin with `test_`, and the body is one `assert`.',
      },
    },

    {
      id: 'py-s-10',
      title: 'Iterators and the protocols behind for loops',
      read: `\`for x in thing:\` is not magic. Python calls \`iter(thing)\` to get an **iterator**, then calls \`next()\` on it repeatedly until it raises \`StopIteration\`.

Anything implementing that pair of methods can be looped over — including your own classes.

\`\`\`python
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        n = self.start
        while n > 0:
            yield n
            n -= 1
\`\`\`

Making \`__iter__\` a generator is the easy route: \`yield\` gives you the whole protocol for free.

## The wider idea: duck typing

Python does not ask "what class is this?" — it asks "does it support the operation?". Implement \`__len__\` and \`len()\` works. Implement \`__getitem__\` and indexing works. Implement \`__contains__\` and \`in\` works.

This is why so much Python code accepts "any iterable" rather than "a list": your object fits in simply by behaving correctly, with no inheritance required.`,
      sample: {
        lang: 'python',
        caption: 'A custom class that behaves like a real collection',
        code: `class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __iter__(self):
        return iter(self._cards)

    def __len__(self):
        return len(self._cards)

    def __getitem__(self, position):
        return self._cards[position]

    def __contains__(self, card):
        return card in self._cards

deck = Deck(["A", "K", "Q", "J"])

for card in deck:
    print(card, end=" ")
print()

print(len(deck))
print(deck[0], deck[-1])
print(deck[1:3])
print("Q" in deck)
print(sorted(deck))

it = iter(deck)
print(next(it))
print(next(it))`,
        output: `A K Q J
4
A J
['K', 'Q']
True
['A', 'J', 'K', 'Q']
A
K`,
      },
      question: {
        kind: 'fill',
        prompt:
          'Which dunder method must a class define so that `len(my_object)` works?',
        placeholder: '__something__',
        accept: ['__len__', '__len__()', 'len'],
        explain:
          '`len(x)` calls `x.__len__()`. This is the pattern throughout Python: built-in functions and operators delegate to dunder methods, which is what lets your own types slot in beside the built-in ones.',
        hint: 'It is named after the built-in function itself.',
      },
    },

    {
      id: 'py-s-11',
      title: 'Context managers',
      read: `You met \`with open(...) as f:\` — that works because file objects are **context managers**. Any object with \`__enter__\` and \`__exit__\` can be used with \`with\`, and \`__exit__\` is guaranteed to run even if an exception is raised inside the block.

That guarantee is the value: it is how you make sure a lock is released, a connection closed, a temporary setting restored — *whatever happens*.

## The easy way

\`contextlib.contextmanager\` turns a generator into a context manager. Everything before the \`yield\` is setup, everything after is teardown, and a \`try/finally\` makes the teardown unconditional:

\`\`\`python
@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - start:.3f}s")
\`\`\`

## Nesting

\`\`\`python
with open("in.txt") as src, open("out.txt", "w") as dst:
    dst.write(src.read())
\`\`\`

Both get closed, in reverse order, however the block ends.`,
      sample: {
        lang: 'python',
        caption: 'Both ways of writing one, and proof that cleanup always runs',
        code: `import time
from contextlib import contextmanager

class Timer:
    def __init__(self, label):
        self.label = label

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        print(f"{self.label}: {time.perf_counter() - self.start:.3f}s")
        return False   # False: do not swallow exceptions

with Timer("sum"):
    total = sum(range(1000000))

@contextmanager
def working_directory_note(name):
    print(f"-> entering {name}")
    try:
        yield name
    finally:
        print(f"<- leaving {name}")

with working_directory_note("build") as where:
    print(f"doing work in {where}")

try:
    with working_directory_note("risky"):
        raise ValueError("boom")
except ValueError as e:
    print(f"caught: {e}")`,
        output: `sum: 0.018s
-> entering build
doing work in build
<- leaving build
-> entering risky
<- leaving risky
caught: boom`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An exception is raised inside a `with` block. What happens to the cleanup code in `__exit__`?',
        options: [
          'It is skipped',
          'It runs, and then the exception continues to propagate (unless `__exit__` returns True)',
          'It runs and the exception is always swallowed',
          'The program exits immediately',
        ],
        answer: 1,
        explain:
          'Guaranteed cleanup is the entire reason context managers exist. `__exit__` receives the exception details and runs regardless; returning a falsy value lets the exception carry on, which is almost always what you want.',
        hint: 'Compare with `try/finally`.',
      },
    },

    {
      id: 'py-s-12',
      title: 'Putting it together: a small, well-built library',
      read: `Everything in this level applied to one module: a task tracker that is class-based, typed, tested and importable.

What to look for in the sample:

- A **frozen dataclass** for the value-like \`Task\`, so tasks compare by value and cannot be mutated behind your back
- A class holding the collection, with \`__len__\` and \`__iter__\` so it behaves like a real container
- A **property** for the derived \`completion\` figure, so it can never be stale
- A **generator** for filtering, so nothing is built in memory until asked
- **Type hints** throughout, and errors raised for genuinely invalid input
- The whole thing importable, with no \`print\` anywhere in the logic

This is what "well-built" means in practice: small pieces, obvious names, behaviour where the data is, and nothing that assumes it is being used from a terminal.`,
      sample: {
        lang: 'python',
        caption: 'src/tasks/core.py — no printing, fully importable, easy to test',
        code: `from dataclasses import dataclass
from datetime import date
from typing import Iterator

@dataclass(frozen=True)
class Task:
    title: str
    done: bool = False
    due: date | None = None

    def completed(self) -> "Task":
        return Task(self.title, True, self.due)

class TaskList:
    def __init__(self, name: str) -> None:
        if not name.strip():
            raise ValueError("A task list needs a name")
        self.name = name
        self._tasks: list[Task] = []

    def add(self, title: str, due: date | None = None) -> Task:
        task = Task(title.strip(), False, due)
        self._tasks.append(task)
        return task

    def complete(self, title: str) -> bool:
        for i, task in enumerate(self._tasks):
            if task.title == title and not task.done:
                self._tasks[i] = task.completed()
                return True
        return False

    def pending(self) -> Iterator[Task]:
        for task in self._tasks:
            if not task.done:
                yield task

    @property
    def completion(self) -> float:
        if not self._tasks:
            return 0.0
        done = sum(1 for t in self._tasks if t.done)
        return done / len(self._tasks) * 100

    def __len__(self) -> int:
        return len(self._tasks)

    def __iter__(self) -> Iterator[Task]:
        return iter(self._tasks)

    def __repr__(self) -> str:
        return f"TaskList({self.name!r}, {len(self)} tasks)"`,
        output: `>>> tl = TaskList("Today")
>>> tl.add("write tests")
Task(title='write tests', done=False, due=None)
>>> tl.add("ship it")
Task(title='ship it', done=False, due=None)
>>> tl.complete("write tests")
True
>>> tl.completion
50.0
>>> list(tl.pending())
[Task(title='ship it', done=False, due=None)]
>>> tl
TaskList('Today', 2 tasks)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `completion` a `@property` that recalculates, rather than an attribute updated inside `add` and `complete`?',
        options: [
          'Properties are faster than attributes',
          'A stored copy can fall out of sync with the tasks if any code path forgets to update it; a computed one cannot',
          'Python does not allow numeric attributes',
          'It saves memory',
        ],
        answer: 1,
        explain:
          'Derived data should be derived. Storing it means every method that changes the list must remember to update it, and the day someone adds a `remove()` method and forgets, the number silently lies. Computing on read makes that class of bug impossible.',
        hint: 'What happens when a new method is added later and forgets to maintain it?',
      },
    },
  ],
}

export default level
