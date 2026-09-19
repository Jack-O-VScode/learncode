import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Collections and loops — doing things many times',
  summary:
    'You can write straight-line programs. Now learn to store many values at once and repeat work automatically: lists, for and while loops, string methods and dictionaries.',
  outcomes: [
    'Store many values in a list and get them back out',
    'Slice lists and strings with [start:stop]',
    'Repeat work with for loops and range()',
    'Use while loops, break and continue safely',
    'Manipulate text with the built-in string methods',
    'Store labelled data in a dictionary and loop over it',
  ],
  steps: [
    {
      id: 'py-a-01',
      title: 'Lists: many values under one name',
      read: `A variable holds one value. A **list** holds as many as you like, in order.

You make one with square brackets and commas:

\`\`\`python
scores = [88, 92, 79, 100]
names = ["Ada", "Alan", "Grace"]
mixed = [1, "two", 3.0, True]
empty = []
\`\`\`

A list keeps its **order**, allows **duplicates**, and can be **changed** after it is made. Those three properties are exactly why lists are the workhorse of Python.

## The basics

- \`len(scores)\` — how many items
- \`scores[0]\` — the **first** item (counting starts at zero!)
- \`in\` — asks whether a value is present: \`92 in scores\` gives \`True\`

## Counting from zero

This feels wrong for about a week and then feels natural forever. The index is *"how far from the start"*, so the first item is 0 steps from the start. A list of 4 items therefore has indexes 0, 1, 2 and 3 — and asking for \`scores[4]\` raises \`IndexError\`.`,
      sample: {
        lang: 'python',
        caption: 'Index 0 is the first item; index len-1 is the last',
        code: `scores = [88, 92, 79, 100]

print(scores)
print(len(scores))
print(scores[0])
print(scores[3])
print(92 in scores)
print(50 in scores)

# the last item, without knowing the length:
print(scores[-1])
print(scores[-2])`,
        output: `[88, 92, 79, 100]
4
88
100
True
False
100
79`,
      },
      question: {
        kind: 'fill',
        prompt: 'Given `colours = ["red", "green", "blue"]`, what does `colours[1]` give?',
        placeholder: 'One word',
        accept: ['green', '"green"', "'green'"],
        explain:
          'Index 0 is `"red"`, index 1 is `"green"`, index 2 is `"blue"`. Counting starts at zero, so index 1 is the *second* item.',
        hint: 'The first item is at index 0, not 1.',
      },
    },

    {
      id: 'py-a-02',
      title: 'Slicing: taking a piece out',
      read: `A **slice** pulls out a section of a list using \`[start:stop]\`.

The rule that matters: **start is included, stop is not.** \`items[1:4]\` gives you indexes 1, 2 and 3.

That looks odd until you notice two things it makes true:
- the length of the slice is always \`stop - start\`
- \`items[:n]\` and \`items[n:]\` fit together perfectly with no overlap and no gap

## Leaving parts out

- \`items[2:]\` — from index 2 to the end
- \`items[:3]\` — from the start up to (not including) index 3
- \`items[:]\` — the whole thing (a **copy**, which matters later)
- \`items[-2:]\` — the last two

## A third number: step

\`items[::2]\` takes every second item. \`items[::-1]\` walks backwards — the classic way to reverse something.

Slicing works exactly the same way on **strings**, because a string is a sequence of characters.`,
      sample: {
        lang: 'python',
        caption: 'Same slicing rules for lists and strings',
        code: `letters = ["a", "b", "c", "d", "e", "f"]

print(letters[1:4])
print(letters[:3])
print(letters[3:])
print(letters[-2:])
print(letters[::2])
print(letters[::-1])

word = "programming"
print(word[0:7])
print(word[-4:])
print(word[::-1])`,
        output: `['b', 'c', 'd']
['a', 'b', 'c']
['d', 'e', 'f']
['e', 'f']
['a', 'c', 'e']
['f', 'e', 'd', 'c', 'b', 'a']
program
ming
gnimmargorp`,
      },
      question: {
        kind: 'fill',
        prompt: 'Given `nums = [10, 20, 30, 40, 50]`, what does `nums[1:3]` give? Write it as a Python list.',
        placeholder: '[...]',
        accept: ['[20, 30]', '[20,30]'],
        explain:
          'Start at index 1 (the `20`), stop *before* index 3 — so you get indexes 1 and 2: `[20, 30]`. The stop index is always excluded.',
        hint: 'Include the start, exclude the stop.',
      },
    },

    {
      id: 'py-a-03',
      title: 'Changing a list',
      read: `Lists are **mutable** — you can change them in place after creating them.

## Adding

- \`items.append(x)\` — add \`x\` to the end. By far the most used.
- \`items.insert(i, x)\` — put \`x\` at index \`i\`, shuffling everything after it along.
- \`items.extend(other)\` — add every item from another list. (\`a + b\` makes a *new* list instead.)

## Removing

- \`items.remove(x)\` — delete the **first** item equal to \`x\` (errors if absent)
- \`items.pop()\` — remove and **return** the last item; \`items.pop(0)\` for the first
- \`items.clear()\` — empty it

## Reordering

- \`items.sort()\` — sorts **in place** and returns \`None\`
- \`sorted(items)\` — returns a **new** sorted list, leaves the original alone
- \`items.reverse()\` — flips in place

> The classic trap: \`scores = scores.sort()\` sets \`scores\` to \`None\`, because \`.sort()\` changes the list and hands back nothing. Either call \`scores.sort()\` on its own line, or use \`scores = sorted(scores)\`.`,
      sample: {
        lang: 'python',
        caption: 'Watch which operations change the list and which return a new one',
        code: `tasks = ["email", "code"]

tasks.append("test")
print(tasks)

tasks.insert(0, "coffee")
print(tasks)

tasks.remove("email")
print(tasks)

last = tasks.pop()
print(last)
print(tasks)

nums = [5, 2, 9, 1]
print(sorted(nums))
print(nums)
nums.sort()
print(nums)`,
        output: `['email', 'code', 'test']
['coffee', 'email', 'code', 'test']
['coffee', 'code', 'test']
test
['coffee', 'code']
[1, 2, 5, 9]
[5, 2, 9, 1]
[1, 2, 5, 9]`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is printed?\n\n```python\nnames = ["Bo", "Al"]\nresult = names.sort()\nprint(result)\n```',
        options: ['`["Al", "Bo"]`', '`None`', '`["Bo", "Al"]`', 'An error'],
        answer: 1,
        explain:
          '`.sort()` sorts the list in place and returns `None`. `names` is now `["Al", "Bo"]`, but `result` holds nothing. Use `result = sorted(names)` when you want a new list back.',
        hint: 'Does `.sort()` hand anything back?',
      },
    },

    {
      id: 'py-a-04',
      title: 'for loops: do this for every item',
      read: `A **for loop** runs the same block of code once for each item in a collection.

\`\`\`python
for score in scores:
    print(score)
\`\`\`

Read it as: *"for each score in scores, do the indented block."* On each pass, the variable \`score\` is set to the next item, then the body runs.

The parts, all required:
- \`for\` then a **name you choose** for the current item
- \`in\` then the thing to loop over
- a **colon**
- an **indented** body

## Naming the loop variable

Give it a singular name matching the collection: \`for task in tasks\`, \`for name in names\`. It makes loops read like sentences.

## The accumulator pattern

The single most useful loop shape you will ever learn: start a variable before the loop, update it inside, use it after.

\`\`\`python
total = 0
for score in scores:
    total = total + score
\`\`\`

\`total += score\` means exactly the same as \`total = total + score\`, and \`-=\`, \`*=\` work the same way.`,
      sample: {
        lang: 'python',
        caption: 'Looping, accumulating, and counting matches',
        code: `scores = [88, 92, 79, 100]

for score in scores:
    print(f"Score: {score}")

total = 0
for score in scores:
    total += score

print(f"Total: {total}")
print(f"Average: {total / len(scores)}")

passes = 0
for score in scores:
    if score >= 85:
        passes += 1
print(f"Scores of 85 or more: {passes}")`,
        output: `Score: 88
Score: 92
Score: 79
Score: 100
Total: 359
Average: 89.75
Scores of 85 or more: 3`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'A list `prices` exists. Write a loop that adds up every price into a variable `total` (which you should start at 0 first).',
        starter: 'total = 0\n',
        mustInclude: ['total\\s*=\\s*0', 'for\\s+\\w+\\s+in\\s+prices\\s*:', 'total\\s*(\\+=|=\\s*total\\s*\\+)'],
        solution: `total = 0
for price in prices:
    total += price`,
        explain:
          'This is the accumulator pattern: set up before the loop, update inside the loop, use afterwards. Starting `total` at 0 *outside* the loop is essential — put it inside and it resets on every pass.',
        hint: 'Three lines: the starting value, the `for` line, and the indented `total += ...`.',
      },
    },

    {
      id: 'py-a-05',
      title: 'range(): looping a set number of times',
      read: `Sometimes you want to repeat something N times, with no list involved. \`range()\` generates numbers for you.

- \`range(5)\` → 0, 1, 2, 3, 4 — **five numbers, starting at 0, stopping before 5**
- \`range(2, 6)\` → 2, 3, 4, 5
- \`range(0, 10, 2)\` → 0, 2, 4, 6, 8
- \`range(5, 0, -1)\` → 5, 4, 3, 2, 1

Same rule as slicing: the stop value is never included. \`range(1, 11)\` is how you count 1 to 10.

## Looping over indexes

\`for i in range(len(items))\` gives you each index, so you can use \`items[i]\`. Useful when you need to *change* items or need the position.

## enumerate: position and value together

Usually cleaner:

\`\`\`python
for i, name in enumerate(names):
    print(f"{i + 1}. {name}")
\`\`\`

\`enumerate\` hands you both the index and the item on every pass. Reach for it whenever you catch yourself writing \`range(len(...))\`.`,
      sample: {
        lang: 'python',
        caption: 'Counting, stepping, and pairing index with value',
        code: `for i in range(3):
    print(f"Pass {i}")

for n in range(1, 6):
    print(n * n)

for countdown in range(3, 0, -1):
    print(countdown)
print("Lift off!")

names = ["Ada", "Alan", "Grace"]
for i, name in enumerate(names):
    print(f"{i + 1}. {name}")`,
        output: `Pass 0
Pass 1
Pass 2
1
4
9
16
25
3
2
1
Lift off!
1. Ada
2. Alan
3. Grace`,
      },
      question: {
        kind: 'fill',
        prompt: 'How many times does the body of `for i in range(4, 9):` run?',
        placeholder: 'A number',
        accept: ['5', 'five'],
        explain:
          'It produces 4, 5, 6, 7, 8 — stopping before 9. The count is always `stop - start`, so 9 − 4 = **5** passes.',
        hint: 'Write the numbers out; remember the stop value is excluded.',
      },
    },

    {
      id: 'py-a-06',
      title: 'while loops: repeat until something changes',
      read: `A \`for\` loop runs a known number of times. A **while loop** runs *as long as a condition stays True* — which might be forever if you are not careful.

\`\`\`python
count = 3
while count > 0:
    print(count)
    count -= 1
\`\`\`

Every while loop needs three things, and missing any one of them is a bug:

1. Something set up **before** the loop (\`count = 3\`)
2. A condition that can eventually become False (\`count > 0\`)
3. Something **inside** the loop that moves towards that (\`count -= 1\`)

Forget number 3 and you get an **infinite loop** — the program hangs. Press \`Ctrl + C\` in the terminal to stop it.

## When to use which

- Looping over a collection, or a known number of times → \`for\`
- Waiting for a condition: valid input, a game that is still running, a number that is still too big → \`while\`

## The input-validation pattern

Keep asking until the answer is acceptable. You will use this constantly.`,
      sample: {
        lang: 'python',
        caption: 'A countdown, and the classic keep-asking-until-valid loop',
        code: `count = 3
while count > 0:
    print(count)
    count -= 1
print("Go!")

answer = ""
while answer != "yes" and answer != "no":
    answer = input("Continue? (yes/no) ")
print(f"You said {answer}")

total = 0
while total < 100:
    total += 30
    print(total)`,
        output: `3
2
1
Go!
Continue? (yes/no) maybe
Continue? (yes/no) yes
You said yes
30
60
90
120`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does this loop never end?\n\n```python\nn = 10\nwhile n > 0:\n    print(n)\n```',
        options: [
          '`while` loops always run forever',
          'Nothing inside the loop ever changes `n`, so `n > 0` stays True',
          '`print` cannot be used inside a while loop',
          'The condition should use `>=`',
        ],
        answer: 1,
        explain:
          'The condition only gets re-checked; it does not change anything by itself. Without an `n -= 1` (or similar) in the body, `n` stays at 10 and the condition is True forever.',
        hint: 'What in the body moves the condition towards False?',
      },
    },

    {
      id: 'py-a-07',
      title: 'break and continue',
      read: `Two keywords give you finer control inside any loop.

- **\`break\`** — leave the loop immediately. Nothing else in the body runs, and the loop does not continue.
- **\`continue\`** — skip the rest of *this* pass and jump straight to the next item.

\`\`\`python
for n in numbers:
    if n < 0:
        continue        # ignore negatives
    if n > 100:
        break           # stop entirely
    print(n)
\`\`\`

## while True + break

A very common shape: loop forever on purpose, and break out when you get what you need. It is often clearer than cramming the condition into the \`while\` line, especially when the check has to happen in the middle of the body.

\`\`\`python
while True:
    answer = input("Number: ")
    if answer.isdigit():
        break
    print("That was not a number.")
\`\`\`

> Use \`break\` deliberately, not to patch a loop you got wrong. If a loop has three \`break\`s in it, the condition is probably wrong.`,
      sample: {
        lang: 'python',
        caption: 'continue skips one pass; break ends the loop',
        code: `numbers = [4, -2, 7, 0, 9, 150, 3]

for n in numbers:
    if n < 0:
        continue
    if n > 100:
        print("Too big — stopping")
        break
    print(n)

print("Loop finished")

# searching with break
target = 7
for n in numbers:
    if n == target:
        print(f"Found {target}!")
        break`,
        output: `4
7
0
9
Too big — stopping
Loop finished
Found 7!`,
      },
      question: {
        kind: 'fill',
        prompt: `What does this print? Write the numbers separated by spaces.

\`\`\`python
for n in [1, 2, 3, 4, 5]:
    if n == 3:
        continue
    if n == 5:
        break
    print(n)
\`\`\``,
        placeholder: 'e.g. 1 2 3',
        accept: ['1 2 4', '1, 2, 4', '124'],
        explain:
          '1 and 2 print normally. At 3 the `continue` skips the `print`. 4 prints. At 5 the `break` ends the loop before printing. So: **1 2 4**.',
        hint: 'Walk through each value one at a time and ask which lines run.',
      },
    },

    {
      id: 'py-a-08',
      title: 'Loops inside loops',
      read: `A loop body can contain another loop. The **inner** loop runs completely, from start to finish, on every single pass of the **outer** loop.

\`\`\`python
for row in range(3):
    for col in range(4):
        print(row, col)
\`\`\`

That prints 12 lines: 3 outer passes × 4 inner passes. Nested loops are how you handle anything grid-shaped — tables, game boards, images, spreadsheets.

## Watch the cost

Two nested loops over 1,000 items each is 1,000,000 passes. Three is a billion. Nesting multiplies, so always ask how big the collections can get.

## Building strings in a loop

\`print(x, end="")\` prints without moving to a new line, which lets you draw a row piece by piece and then call a bare \`print()\` to end the line.`,
      sample: {
        lang: 'python',
        caption: 'The inner loop completes for every single outer pass',
        code: `for row in range(1, 4):
    for col in range(1, 4):
        print(f"{row}x{col}={row * col}", end="  ")
    print()

print()

board = [
    ["X", "O", "X"],
    ["O", "X", "O"],
]
for row in board:
    for cell in row:
        print(cell, end=" ")
    print()`,
        output: `1x1=1  1x2=2  1x3=3
2x1=2  2x2=4  2x3=6
3x1=3  3x2=6  3x3=9

X O X
O X O`,
      },
      question: {
        kind: 'fill',
        prompt:
          'How many times does `print` run in total?\n\n```python\nfor a in range(5):\n    for b in range(3):\n        print(a, b)\n```',
        placeholder: 'A number',
        accept: ['15', 'fifteen'],
        explain:
          'The outer loop runs 5 times, and each of those runs the inner loop 3 times: 5 × 3 = **15**. Nested loops multiply.',
        hint: 'Multiply the two counts.',
      },
    },

    {
      id: 'py-a-09',
      title: 'Working with text: string methods',
      read: `Strings come with a large toolbox of built-in **methods** — functions attached to the value, called with a dot.

## Cleaning up

- \`.strip()\` — remove whitespace from both ends. **Always** use this on \`input()\`.
- \`.lower()\` / \`.upper()\` — change case. Essential for comparing what a user typed.
- \`.replace(old, new)\` — swap every occurrence

## Asking questions

- \`.startswith(x)\` / \`.endswith(x)\`
- \`.isdigit()\` — is every character a digit?
- \`.count(x)\`, \`.find(x)\` (returns -1 when absent)
- \`in\` works on strings too: \`"cat" in "concatenate"\` is \`True\`

## Splitting and joining

- \`"a,b,c".split(",")\` → \`["a", "b", "c"]\`. With no argument it splits on whitespace.
- \`", ".join(["a", "b"])\` → \`"a, b"\`. The separator goes *before* \`.join\`.

## Strings never change

Every one of these returns a **new** string. \`name.upper()\` on its own does nothing lasting — you must store the result: \`name = name.upper()\`.`,
      sample: {
        lang: 'python',
        caption: 'The standard way to handle whatever a user types',
        code: `raw = "  Yes  "
answer = raw.strip().lower()
print(f"[{answer}]")
print(answer == "yes")

sentence = "the quick brown fox"
print(sentence.upper())
print(sentence.replace("quick", "slow"))
print(sentence.split())
print(len(sentence.split()))
print("-".join(["2024", "06", "01"]))
print(sentence.startswith("the"))
print("fox" in sentence)`,
        output: `[yes]
True
THE QUICK BROWN FOX
the slow brown fox
['the', 'quick', 'brown', 'fox']
4
2024-06-01
True
True`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'A variable `reply` holds whatever the user typed. Write one line that stores a tidied version back into `reply`: no surrounding whitespace, and all lower case.',
        starter: 'reply = ',
        mustInclude: ['reply\\s*=\\s*reply\\s*\\.\\s*(strip\\s*\\(\\s*\\)\\s*\\.\\s*lower|lower\\s*\\(\\s*\\)\\s*\\.\\s*strip)'],
        solution: 'reply = reply.strip().lower()',
        explain:
          'Methods chain left to right: `.strip()` gives a new string, and `.lower()` runs on that. Because strings are immutable you must assign the result back — calling `reply.strip()` alone throws the tidied version away.',
        hint: 'Chain two methods with dots, and remember to assign the result back to `reply`.',
      },
    },

    {
      id: 'py-a-10',
      title: 'Dictionaries: labelled data',
      read: `A list finds things by **position**. A **dictionary** finds them by **name** — which is what you actually want most of the time.

\`\`\`python
person = {"name": "Sam", "age": 17, "city": "Leeds"}
\`\`\`

Curly braces, and each entry is a \`key: value\` pair. Get a value with square brackets and the key: \`person["name"]\`.

## The rules

- Keys must be unique — assigning to an existing key overwrites it
- Keys are usually strings, but any *immutable* value works (numbers, tuples)
- Values can be anything, including lists and other dictionaries

## Getting values safely

\`person["email"]\` raises \`KeyError\` if the key is missing. \`person.get("email")\` returns \`None\` instead, and \`person.get("email", "none given")\` lets you supply a default. Use \`.get()\` whenever the key might legitimately be absent.

## Adding, changing, removing

- \`person["email"] = "s@x.com"\` — adds it if new, replaces it if not
- \`del person["age"]\` or \`person.pop("age")\`
- \`"age" in person\` checks the **keys**`,
      sample: {
        lang: 'python',
        caption: 'Look things up by name, not by position',
        code: `person = {"name": "Sam", "age": 17, "city": "Leeds"}

print(person["name"])
print(person.get("email"))
print(person.get("email", "not provided"))

person["email"] = "sam@example.com"
person["age"] = 18
del person["city"]

print(person)
print("age" in person)
print(len(person))

# values can be lists, too
student = {"name": "Ada", "grades": [90, 85, 92]}
print(student["grades"][0])`,
        output: `Sam
None
not provided
{'name': 'Sam', 'age': 18, 'email': 'sam@example.com'}
True
3
90`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'With `stock = {"apples": 5}`, which line safely gets the pear count as `0` when pears are not in the dictionary?',
        options: [
          '`stock["pears"]`',
          '`stock.get("pears", 0)`',
          '`stock.pears`',
          '`stock[0]`',
        ],
        answer: 1,
        explain:
          '`.get(key, default)` returns the default instead of raising `KeyError`. `stock["pears"]` would crash, `stock.pears` is not how dictionaries work in Python, and `stock[0]` looks for a key called `0`.',
        hint: 'Which one lets you supply a fallback value?',
      },
    },

    {
      id: 'py-a-11',
      title: 'Looping over a dictionary',
      read: `Three ways to loop, depending on what you need:

\`\`\`python
for key in scores:              # keys (the default)
for value in scores.values():   # values only
for key, value in scores.items():   # both — use this most
\`\`\`

\`.items()\` hands you a pair on each pass, which you unpack into two variables at once. That is the version you will write nine times out of ten.

## Counting things: the killer pattern

Dictionaries are the natural tool for counting. For each item, add 1 to its entry — creating the entry at 0 first if it does not exist:

\`\`\`python
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
\`\`\`

That \`counts.get(word, 0) + 1\` line does all the work: it means *"whatever this word's count is (or 0 if brand new), plus one"*. Learn it; you will use it forever.

## Dictionaries keep insertion order

Since Python 3.7, looping gives keys back in the order you added them.`,
      sample: {
        lang: 'python',
        caption: 'Looping three ways, then counting with .get()',
        code: `scores = {"Ada": 92, "Alan": 78, "Grace": 95}

for name in scores:
    print(name)

for score in scores.values():
    print(score)

for name, score in scores.items():
    print(f"{name} scored {score}")

print(f"Top score: {max(scores.values())}")

words = ["cat", "dog", "cat", "bird", "cat", "dog"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)`,
        output: `Ada
Alan
Grace
92
78
95
Ada scored 92
Alan scored 78
Grace scored 95
Top score: 95
{'cat': 3, 'dog': 2, 'bird': 1}`,
      },
      question: {
        kind: 'code',
        lang: 'python',
        prompt:
          'A dictionary `prices` maps item names to costs. Write a loop that prints one line per item, like `apple: 1.2`.',
        starter: 'for ',
        mustInclude: ['for\\s+\\w+\\s*,\\s*\\w+\\s+in\\s+prices\\s*\\.\\s*items\\s*\\(\\s*\\)\\s*:', 'print'],
        solution: `for item, price in prices.items():
    print(f"{item}: {price}")`,
        explain:
          '`.items()` yields a `(key, value)` pair each pass, and `for item, price in ...` unpacks it into two names. Looping over `prices` directly would give you only the keys.',
        hint: 'Two loop variables, and `.items()` on the dictionary.',
      },
    },

    {
      id: 'py-a-12',
      title: 'Putting it together: a shopping list manager',
      read: `A real program that uses everything from this level: a menu-driven shopping list.

The design:

1. A \`while True\` loop shows a menu and reads a choice — this is the *main loop*, the heart of most interactive programs.
2. \`if/elif\` dispatches to the right action.
3. A **list** holds the items; a **dictionary** holds the quantities.
4. \`break\` exits when the user picks quit.

Notice the shape: **state** (the list and dict) lives outside the loop so it survives between passes, and each pass of the loop does exactly one thing the user asked for.

> This menu-loop structure is the skeleton of nearly every small interactive program you will write. Learn the shape once and reuse it forever.`,
      sample: {
        lang: 'python',
        caption: 'The menu loop — state outside, one action per pass',
        code: `items = []
quantities = {}

while True:
    print("\\n1) Add  2) List  3) Remove  4) Quit")
    choice = input("Choose: ").strip()

    if choice == "1":
        name = input("Item: ").strip().lower()
        qty = int(input("How many? "))
        if name not in items:
            items.append(name)
        quantities[name] = quantities.get(name, 0) + qty
        print(f"Added {qty} x {name}")

    elif choice == "2":
        if not items:
            print("List is empty.")
        for i, name in enumerate(items, start=1):
            print(f"{i}. {name} x{quantities[name]}")

    elif choice == "3":
        name = input("Remove which item? ").strip().lower()
        if name in items:
            items.remove(name)
            del quantities[name]
            print(f"Removed {name}")
        else:
            print("Not on the list.")

    elif choice == "4":
        print("Bye!")
        break

    else:
        print("Pick 1, 2, 3 or 4.")`,
        output: `1) Add  2) List  3) Remove  4) Quit
Choose: 1
Item: Apples
How many? 6
Added 6 x apples

1) Add  2) List  3) Remove  4) Quit
Choose: 2
1. apples x6`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are `items = []` and `quantities = {}` written **before** the `while True:` loop rather than inside it?',
        options: [
          'Python does not allow assignment inside a while loop',
          'So they are created once and keep their contents between passes — inside the loop they would be wiped clean every time',
          'It makes the program run faster',
          'It has no effect either way',
        ],
        answer: 1,
        explain:
          'Anything created inside the loop body is recreated on every pass. The shopping list has to survive from one menu choice to the next, so it must be set up once, before the loop starts. This is the same reasoning as the accumulator pattern.',
        hint: 'What would happen to your items on the next trip round the loop?',
      },
    },
  ],
}

export default level
