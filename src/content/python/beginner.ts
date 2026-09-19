import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Your very first lines of code',
  summary:
    'Assumes you have never programmed in your life. Install Python, print your first message, store values in variables, do maths, ask the user questions and make your program decide things.',
  outcomes: [
    'Run a Python file on your own computer',
    'Print text and values to the screen',
    'Use variables, numbers, strings and booleans',
    'Read input from the person using your program',
    'Make decisions with if / elif / else',
    'Read an error message and fix the mistake',
  ],
  steps: [
    {
      id: 'py-b-01',
      title: 'What a program actually is',
      read: `A computer does nothing on its own. It waits for **instructions**, and it follows them one at a time, in order, exactly as written. A *program* is just a list of those instructions written in a language the computer can be made to understand.

Python is one of those languages. It was designed to look close to English, which is why it is the friendliest first language. When you write:

## The golden rule

Python reads your file **top to bottom, one line at a time**. Line 1 finishes completely, then line 2 starts. That is the single most important idea in this whole level. Every confusing bug you ever have will make sense once you ask yourself: *"what order did the computer do these in?"*

The instruction below, \`print(...)\`, means "show this on the screen". The round brackets hold the thing you want shown, and the quote marks say "this is plain text, not code".

> You do not need to understand *why* the brackets and quotes are there yet. For now, copy the shape exactly. Understanding follows habit.`,
      sample: {
        lang: 'python',
        caption: 'Three instructions, run in order from top to bottom',
        code: `print("Hello, world!")
print("I am learning Python.")
print("This is line three.")`,
        output: `Hello, world!
I am learning Python.
This is line three.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'If you swapped the first and last lines of the sample, what would the program print first?',
        options: [
          '"This is line three."',
          '"Hello, world!"',
          'All three at the same time',
          'Nothing — swapping lines breaks the program',
        ],
        answer: 0,
        explain:
          'Python runs lines in the order they appear. Move a line to the top and it happens first. Nothing about the lines themselves changes — only *when* they run.',
        hint: 'Top to bottom, one line at a time.',
      },
    },

    {
      id: 'py-b-02',
      title: 'Getting Python onto your computer',
      read: `Before you can run anything you need Python installed, plus somewhere to type code.

## Install Python

- **Windows** — go to *python.org/downloads*, click the big yellow button, run the installer, and **tick the box that says "Add python.exe to PATH"** before clicking Install. That tickbox saves a lot of pain later.
- **Mac** — go to *python.org/downloads* and run the installer. (The Python that already comes with macOS is old; install your own.)
- **Linux** — you almost certainly have it: run \`python3 --version\`.

## Somewhere to write code

Download **Visual Studio Code** (free, code.visualstudio.com), open it, and install the "Python" extension when it offers.

## Two ways to run code

1. **A file** — make a file called \`hello.py\`, type your code, save it, then in a terminal run \`python hello.py\` (on Mac/Linux you may need \`python3 hello.py\`). This is how real programs work and how you will do everything in this course.
2. **The shell** — type \`python\` on its own in a terminal and you get a \`>>>\` prompt where each line runs the moment you press Enter. Perfect for trying one small thing.

> The \`.py\` on the end of the filename is what tells everything "this is Python". A file called \`hello.txt\` will not run.`,
      sample: {
        lang: 'bash',
        caption: 'A whole session in the terminal, from nothing to a running program',
        code: `python --version
# Python 3.12.1

# make a file, then run it:
python hello.py`,
        output: `Python 3.12.1
Hello, world!`,
      },
      question: {
        kind: 'fill',
        prompt:
          'You have written your code and saved it as `hello.py`. What do you type in the terminal to run it? (Write the whole command.)',
        placeholder: 'e.g. something hello.py',
        accept: ['python hello.py', 'python3 hello.py', 'py hello.py'],
        explain:
          'You name the program that understands Python (`python`, or `python3` on many Macs and Linux machines), then the file you want it to read. Python opens the file and runs it top to bottom.',
        hint: 'Two words: the interpreter, then the filename.',
      },
    },

    {
      id: 'py-b-03',
      title: 'Text: strings and quotes',
      read: `A piece of text in a program is called a **string** — think of it as a string of characters threaded together.

To make a string you wrap text in quotes. Python accepts single quotes or double quotes, as long as you close with the same one you opened with:

- \`'hello'\` — fine
- \`"hello"\` — also fine
- \`"hello'\` — an error, the quotes do not match

## Why the quotes matter

Quotes are how Python tells *text* apart from *instructions*. \`print\` with no quotes means "run the printing instruction". \`"print"\` with quotes means "the five letters p, r, i, n, t".

## Quotes inside quotes

If your text contains an apostrophe, wrap it in double quotes: \`"it's fine"\`. If it contains a double quote, wrap it in single quotes: \`'she said "hi"'\`. Pick the quote your text does not use.

## Joining and repeating

\`+\` glues two strings together. \`*\` repeats one. Note that \`+\` does not add a space — you have to include it yourself.`,
      sample: {
        lang: 'python',
        caption: 'Making, joining and repeating strings',
        code: `print("Hello")
print('Single quotes work too')
print("It's fine to use an apostrophe in here")
print("Ba" + "na" + "na")
print("-" * 20)
print("Hi " + "there")`,
        output: `Hello
Single quotes work too
It's fine to use an apostrophe in here
Banana
--------------------
Hi there`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which line below causes an error?',
        options: [
          `print("Let's go")`,
          `print('She said "hi"')`,
          `print('Let's go')`,
          `print("She said \\"hi\\"")`,
        ],
        answer: 2,
        explain:
          "`'Let's go'` closes the string early. Python sees the string `'Let'`, then the loose word `s`, and gives up. Wrap it in double quotes instead: `\"Let's go\"`.",
        hint: 'Find the line where a quote inside the text is the same kind as the quotes around it.',
      },
    },

    {
      id: 'py-b-04',
      title: 'Variables: giving a value a name',
      read: `A **variable** is a name that holds a value, so you can use it later without retyping it.

You create one with \`=\`. Read \`=\` as *"gets"*, not as "equals":

\`\`\`python
name = "Sam"
\`\`\`

That says: *"the name \`name\` now gets the value \`"Sam"\`."* Python does the right-hand side first, then attaches the label.

## Rules for names

- Letters, digits and underscores only; cannot start with a digit.
- Case matters: \`score\` and \`Score\` are two different variables.
- No spaces — use \`high_score\`, not \`high score\`. This lower-case-with-underscores style is called *snake_case* and is what Python programmers use.
- Pick names that say what they hold. \`total_price\` beats \`tp\` beats \`x\`.

## Variables can change

Assigning again just re-points the name at a new value. The old one is forgotten.`,
      sample: {
        lang: 'python',
        caption: 'Creating variables, using them, then changing one',
        code: `name = "Sam"
age = 17
print(name)
print(age)

# reuse the value as many times as you like
print("Hello, " + name + "!")

# change it — the label now points somewhere new
age = 18
print(age)`,
        output: `Sam
17
Hello, Sam!
18`,
      },
      question: {
        kind: 'fill',
        prompt: `What does this print?

\`\`\`python
score = 10
score = 25
print(score)
\`\`\``,
        placeholder: 'The exact output',
        accept: ['25'],
        explain:
          'The second assignment replaces the first. By the time `print` runs, `score` holds `25` — the `10` is gone. Assignment is not a permanent promise; it is "from now on, this name means this value".',
      },
    },

    {
      id: 'py-b-05',
      title: 'Numbers and maths',
      read: `Python has two kinds of number you will use constantly:

- **int** — a whole number: \`7\`, \`0\`, \`-40\`
- **float** — a number with a decimal point: \`7.5\`, \`0.1\`, \`-2.0\`

Numbers are **not** written in quotes. \`7\` is a number you can do maths with; \`"7"\` is a piece of text that happens to look like a number.

## The operators

- \`+\` add, \`-\` subtract
- \`*\` multiply (a star, not an ×)
- \`/\` divide — **always** gives a float, so \`10 / 2\` is \`5.0\`
- \`//\` floor divide — divides and throws away the remainder: \`7 // 2\` is \`3\`
- \`%\` modulo — gives **only** the remainder: \`7 % 2\` is \`1\`
- \`**\` power: \`2 ** 10\` is \`1024\`

## Order of operations

Python follows normal maths rules: \`**\` first, then \`*\`, \`/\`, \`//\`, \`%\`, then \`+\` and \`-\`. Brackets beat everything, so use them whenever you are unsure — they are free and they make the code clearer.

> \`%\` looks obscure now but it is everywhere in real code: \`n % 2 == 0\` is how you test whether a number is even.`,
      sample: {
        lang: 'python',
        caption: 'Every operator, and the two division surprises',
        code: `print(7 + 3)
print(7 - 3)
print(7 * 3)
print(7 / 3)
print(7 // 3)
print(7 % 3)
print(7 ** 3)

print(2 + 3 * 4)
print((2 + 3) * 4)`,
        output: `10
4
21
2.3333333333333335
2
1
343
14
20`,
      },
      question: {
        kind: 'fill',
        prompt: 'What is the value of `17 % 5`?',
        placeholder: 'A number',
        accept: ['2'],
        explain:
          '`%` gives the remainder. 5 goes into 17 three times (15), leaving **2** left over. `17 // 5` would give you the 3.',
        hint: 'How much is left over after taking away as many whole 5s as possible?',
      },
    },

    {
      id: 'py-b-06',
      title: 'Types, and converting between them',
      read: `Every value has a **type**. The three you know so far:

- \`str\` — text, in quotes
- \`int\` — whole number
- \`float\` — decimal number

Type matters because operators behave differently depending on it. \`+\` on two numbers adds. \`+\` on two strings glues. \`+\` on one of each is an **error**, because Python refuses to guess what you meant.

## Converting

Three functions convert between types:

- \`int("42")\` → the number \`42\`
- \`str(42)\` → the text \`"42"\`
- \`float("3.5")\` → the number \`3.5\`

\`int("hello")\` fails, and rightly so — there is no number in there. \`int(3.9)\` gives \`3\`: it chops the decimal off, it does **not** round.

## Checking a type

\`type(x)\` tells you what something is. Very handy when a bug makes no sense.`,
      sample: {
        lang: 'python',
        caption: 'The classic beginner error, and the fix',
        code: `age = 17
print(type(age))
print(type("17"))

# This would crash:
# print("I am " + age + " years old")
# TypeError: can only concatenate str (not "int") to str

# Convert the number to text first:
print("I am " + str(age) + " years old")

# And text to a number when you need maths:
year = int("2024")
print(year + 1)
print(int(3.9))`,
        output: `<class 'int'>
<class 'str'>
I am 17 years old
2025
3`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `int("8") + int("2")` give?',
        options: ['`"82"`', '`10`', '`82`', 'An error'],
        answer: 1,
        explain:
          'Both strings are converted to numbers first, so it is `8 + 2` = `10`. Without the `int()` calls, `"8" + "2"` would glue the text together and give `"82"`.',
        hint: 'Work out what each `int(...)` produces before looking at the `+`.',
      },
    },

    {
      id: 'py-b-07',
      title: 'Asking the user a question',
      read: `So far your programs always do the same thing. \`input()\` changes that — it stops, waits for the person to type something and press Enter, and hands you back what they typed.

\`\`\`python
name = input("What is your name? ")
\`\`\`

The text in the brackets is the prompt shown to the user. The trailing space just makes it look nicer.

## The one thing that catches everyone

**\`input()\` always gives you a string.** Even if the user types \`25\`, you get the text \`"25"\`, not the number. So this is broken:

\`\`\`python
age = input("Age? ")
print(age + 1)   # TypeError!
\`\`\`

Wrap it in \`int()\` to get a number:

\`\`\`python
age = int(input("Age? "))
\`\`\`

Read that inside-out: \`input(...)\` runs first and produces text, then \`int(...)\` turns that text into a number.`,
      sample: {
        lang: 'python',
        caption: 'Text input stays text; number input needs converting',
        code: `name = input("What is your name? ")
age = int(input("How old are you? "))

print("Hi " + name + "!")
print("Next year you will be " + str(age + 1))`,
        output: `What is your name? Sam
How old are you? 17
Hi Sam!
Next year you will be 18`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Write one line that asks "How many apples? ", converts the answer to a whole number, and stores it in a variable called `apples`.',
        starter: 'apples = ',
        mustInclude: ['apples\\s*=\\s*int\\s*\\(\\s*input\\s*\\(', 'How many apples'],
        solution: 'apples = int(input("How many apples? "))',
        explain:
          '`input(...)` collects the text, `int(...)` turns it into a number, and `=` stores the result in `apples`. Miss the `int()` and any maths on `apples` will fail.',
        hint: 'Three pieces, nested: the variable, `int(`, and `input("...")`.',
      },
    },

    {
      id: 'py-b-08',
      title: 'f-strings: the good way to mix text and values',
      read: `Gluing with \`+\` and \`str()\` works, but it gets ugly fast:

\`\`\`python
print("Hi " + name + ", you are " + str(age) + " years old")
\`\`\`

Python has a much better tool: the **f-string**. Put an \`f\` right before the opening quote, then write any variable in curly braces \`{ }\` inside the text.

\`\`\`python
print(f"Hi {name}, you are {age} years old")
\`\`\`

Same result, far easier to read, and **no \`str()\` needed** — an f-string converts everything for you automatically.

## You can do maths inside the braces

Anything you put between \`{\` and \`}\` is evaluated, not just plain names: \`f"Next year: {age + 1}"\` works.

## Rounding numbers for display

\`{price:.2f}\` means "show this as a float with 2 decimal places" — exactly what you want for money.

> From here on, use f-strings. \`+\` for building messages is a habit worth skipping entirely.`,
      sample: {
        lang: 'python',
        caption: 'Names, expressions and number formatting inside one string',
        code: `name = "Sam"
age = 17
price = 4.5

print(f"Hi {name}, you are {age} years old")
print(f"Next year you will be {age + 1}")
print(f"Two coffees cost {price * 2}")
print(f"Two coffees cost £{price * 2:.2f}")`,
        output: `Hi Sam, you are 17 years old
Next year you will be 18
Two coffees cost 9.0
Two coffees cost £9.00`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Variables `item` and `count` already exist. Write one `print` that shows, for example: `You have 3 bananas.` — using an f-string.',
        starter: 'print(',
        mustInclude: ['print\\s*\\(\\s*f["\']', '\\{\\s*count\\s*\\}', '\\{\\s*item\\s*\\}'],
        solution: 'print(f"You have {count} {item}.")',
        explain:
          'The `f` before the quote switches on brace substitution, then `{count}` and `{item}` are replaced by their values. No `str()`, no `+`.',
        hint: 'Start with `print(f"` and put each variable name in curly braces.',
      },
    },

    {
      id: 'py-b-09',
      title: 'True, False and comparing things',
      read: `There is one more basic type: **bool** (short for *boolean*). It has exactly two possible values, \`True\` and \`False\` — capital first letter, no quotes.

You rarely type them yourself. Instead you produce them by **comparing**:

- \`==\` is equal to
- \`!=\` is not equal to
- \`>\` greater than, \`<\` less than
- \`>=\` greater than or equal to, \`<=\` less than or equal to

## One equals sign or two?

This trips up everyone once:

- \`=\` **assigns**: \`age = 18\` means "make age be 18"
- \`==\` **asks**: \`age == 18\` means "is age 18?" and gives back \`True\` or \`False\`

## Combining conditions

- \`and\` — True only if **both** sides are True
- \`or\` — True if **either** side is True
- \`not\` — flips it

Strings compare too: \`"cat" == "cat"\` is \`True\`, and comparisons are case-sensitive, so \`"Cat" == "cat"\` is \`False\`.`,
      sample: {
        lang: 'python',
        caption: 'Every comparison produces a bool',
        code: `age = 17

print(age == 17)
print(age != 17)
print(age >= 18)
print(age < 18)

is_student = True
print(age < 18 and is_student)
print(age >= 18 or is_student)
print(not is_student)

print("cat" == "Cat")`,
        output: `True
False
False
True
True
True
False
False`,
      },
      question: {
        kind: 'mcq',
        prompt: 'With `x = 5`, which of these is `True`?',
        options: ['`x > 5`', '`x != 5`', '`x >= 5 and x < 10`', '`x == "5"`'],
        answer: 2,
        explain:
          '`x >= 5` is True (5 is equal to 5) and `x < 10` is True, and `and` needs both — so the whole thing is True. The last option is False because the number `5` and the text `"5"` are different types, and different values.',
        hint: 'Check each half of the `and` separately.',
      },
    },

    {
      id: 'py-b-10',
      title: 'Making decisions: if / elif / else',
      read: `An \`if\` statement lets your program take different paths.

\`\`\`python
if age >= 18:
    print("You can vote")
\`\`\`

Two details that are not optional:

1. The **colon** \`:\` at the end of the \`if\` line.
2. The **indentation** — exactly 4 spaces — on the lines underneath. In Python, indentation is not decoration; it is how you say "these lines belong to the \`if\`". Un-indented lines run either way.

## else and elif

- \`else:\` runs when the \`if\` condition was False.
- \`elif condition:\` (short for "else if") lets you test another condition. You can have as many as you like.

Python checks them **top to bottom and stops at the first True one**. So order matters: put the most specific test first.

> Get into the habit of letting your editor indent for you — press Enter after the colon and VS Code indents automatically.`,
      sample: {
        lang: 'python',
        caption: 'Only one branch ever runs — the first one that matches',
        code: `score = 72

if score >= 90:
    print("Grade: A")
elif score >= 80:
    print("Grade: B")
elif score >= 70:
    print("Grade: C")
else:
    print("Grade: F")

print("Done")`,
        output: `Grade: C
Done`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'A variable `temp` holds a temperature. Write an if/else that prints `Hot` when `temp` is over 30, and `Not hot` otherwise.',
        starter: 'if ',
        mustInclude: ['if\\s+temp\\s*>\\s*30\\s*:', 'print\\s*\\(\\s*["\']Hot', 'else\\s*:', 'Not hot'],
        solution: `if temp > 30:
    print("Hot")
else:
    print("Not hot")`,
        explain:
          'The condition comes after `if`, the line ends in a colon, and the body is indented. `else:` needs no condition — it catches everything the `if` did not.',
        hint: 'Four lines. Do not forget the two colons and the indentation.',
      },
    },

    {
      id: 'py-b-11',
      title: 'Errors are messages, not disasters',
      read: `You will see errors constantly. Every programmer does, forever. The skill is not avoiding them — it is reading them.

When Python stops, it prints a **traceback**. Read it **from the bottom up**: the last line tells you the kind of problem, and the line above shows the exact code and line number.

## The four you will meet this week

- \`SyntaxError\` — you typed something Python cannot parse. Usually a missing \`:\`, a missing bracket, or mismatched quotes. **Check the line above the one it points at** — a missing bracket is often noticed one line late.
- \`NameError: name 'x' is not defined\` — you used a variable that does not exist yet. Usually a typo, or you used it before creating it.
- \`TypeError\` — you mixed types that do not combine, like \`"5" + 5\`.
- \`ValueError\` — the type was right but the value was not, e.g. \`int("hello")\`.
- \`IndentationError\` — your spacing is inconsistent. Never mix tabs and spaces.

## Comments

A \`#\` makes Python ignore the rest of the line. Use comments to explain *why* something is written the way it is — the code already says *what*.`,
      sample: {
        lang: 'python',
        caption: 'A real traceback, and how to read it',
        code: `# This program has a bug in it
age = "17"
next_year = age + 1
print(next_year)`,
        output: `Traceback (most recent call last):
  File "hello.py", line 3, in <module>
    next_year = age + 1
                ~~~~^~~
TypeError: can only concatenate str (not "int") to str`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Reading the traceback above, what is the actual fix?',
        options: [
          'Change line 3 to `next_year = int(age) + 1`',
          'Delete line 3',
          'Change `print(next_year)` to `print("next_year")`',
          'Add more indentation to line 3',
        ],
        answer: 0,
        explain:
          '`TypeError: can only concatenate str ... to str` means `age` is a string. Converting it with `int(age)` makes the `+ 1` a real addition. (Fixing line 2 to `age = 17` would work too — the point is that the error told you exactly which line and which types.)',
        hint: 'The last line names the problem; the middle lines name the place.',
      },
    },

    {
      id: 'py-b-12',
      title: 'Putting it together: a tip calculator',
      read: `Time to combine everything from this level into a real, useful program.

The plan — and writing the plan first, in plain English, is a genuine professional habit:

1. Ask for the bill total (a decimal number, so \`float\`).
2. Ask how many people are splitting it (a whole number, so \`int\`).
3. Ask whether the service was good, to decide the tip percentage.
4. Work out the tip, the total and the amount per person.
5. Print a tidy summary with 2 decimal places.

Notice how each of those lines becomes one or two lines of Python. That translation — plain English steps into code — *is* programming.

> Read the sample slowly and point at each line saying which plan step it is. If you can do that, you have understood this level.`,
      sample: {
        lang: 'python',
        caption: 'Input, conversion, decisions, maths and formatted output',
        code: `print("--- Tip Calculator ---")

bill = float(input("What was the total bill? "))
people = int(input("How many people are splitting it? "))
service = input("Was the service good? (yes/no) ")

if service == "yes":
    tip_percent = 20
else:
    tip_percent = 10

tip = bill * tip_percent / 100
total = bill + tip
each = total / people

print(f"Tip ({tip_percent}%): {tip:.2f}")
print(f"Total: {total:.2f}")
print(f"Each person pays: {each:.2f}")`,
        output: `--- Tip Calculator ---
What was the total bill? 84.50
How many people are splitting it? 3
Was the service good? (yes/no) yes
Tip (20%): 16.90
Total: 101.40
Each person pays: 33.80`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'Add a third option to the tip logic: if `service` is `"amazing"` the tip should be 25%. It must be checked **before** the `"yes"` case. Write the first two branches only (the `if` and the first `elif`).',
        starter: 'if ',
        mustInclude: [
          'if\\s+service\\s*==\\s*["\']amazing["\']\\s*:',
          'tip_percent\\s*=\\s*25',
          'elif\\s+service\\s*==\\s*["\']yes["\']\\s*:',
          'tip_percent\\s*=\\s*20',
        ],
        solution: `if service == "amazing":
    tip_percent = 25
elif service == "yes":
    tip_percent = 20`,
        explain:
          'Python stops at the first branch that is True, so the most specific test goes first. Put `"yes"` first and `"amazing"` could never be reached if the two ever overlapped — ordering your conditions is a real design decision.',
        hint: 'Remember `==` to compare, a colon on each branch line, and 4 spaces of indentation.',
      },
    },
  ],
}

export default level
