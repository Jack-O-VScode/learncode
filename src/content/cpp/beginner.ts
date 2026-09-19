import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'From nothing to your first C++ programs',
  summary:
    'Assumes you have never coded. Install a compiler, write and build your first program, understand types and variables, do maths, read input, and make your program decide things.',
  outcomes: [
    'Install a compiler and build a program from the command line',
    'Write a correct `main` function and print output',
    'Use the fundamental types, and know why C++ has so many',
    'Do arithmetic — including the integer-division trap',
    'Read input from the keyboard',
    'Branch with if / else if / else, and read compiler errors',
  ],
  steps: [
    {
      id: 'cpp-b-01',
      title: 'What C++ is, and why it is different',
      read: `C++ is a **compiled** language. That word explains almost everything that feels different about it.

- In Python, an *interpreter* reads your file and runs it line by line, right now.
- In C++, a **compiler** reads your whole file and translates it into machine code — the raw instructions your processor executes. You get a standalone \`.exe\` (or equivalent) that runs with no C++ installed at all.

## What that buys you

- **Speed.** Compiled code runs 10–100× faster than interpreted code. This is why games, browsers, databases and operating systems are written in C++.
- **Errors caught before it runs.** Misspell a variable and the compiler refuses to build. Python would only discover it when that line executes — possibly months later, in front of a customer.
- **Control.** You decide how memory is laid out and when it is freed. Nothing is hidden.

## What it costs you

- More typing, and stricter rules
- An edit → **compile** → run cycle instead of edit → run
- The freedom to make serious mistakes that the language will not stop you making

> C++ is worth learning precisely because nothing is hidden. Once you understand what a computer is really doing, every other language makes more sense.`,
      sample: {
        lang: 'bash',
        caption: 'The cycle: write, compile, run',
        code: `# 1. write hello.cpp in an editor

# 2. compile it into a program
g++ hello.cpp -o hello

# 3. run the program
./hello

# Windows (PowerShell):
#   g++ hello.cpp -o hello.exe
#   .\\hello.exe`,
        output: `Hello, world!`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the main difference between a compiled and an interpreted language?',
        options: [
          'Compiled languages are harder to read',
          'A compiler translates the whole program into machine code ahead of time, producing a standalone executable; an interpreter reads and runs the source as it goes',
          'Interpreted languages cannot use variables',
          'Compiled languages do not need a computer to run',
        ],
        answer: 1,
        explain:
          'Translating ahead of time is what gives compiled code its speed and its compile-time error checking — and it is why you must rebuild after every edit, and why the result runs without the language installed.',
        hint: 'When does the translation happen?',
      },
    },

    {
      id: 'cpp-b-02',
      title: 'Installing a compiler',
      read: `You need two things: a **compiler** and an **editor**.

## Windows

The simplest route is **MSYS2**:
1. Install from *msys2.org*.
2. Open the "MSYS2 UCRT64" terminal and run \`pacman -S mingw-w64-ucrt-x86_64-gcc\`.
3. Add \`C:\\msys64\\ucrt64\\bin\` to your PATH.

Alternative: **Visual Studio Community** (free) with the "Desktop development with C++" workload — a full IDE, and the standard choice for Windows game development.

## Mac

\`\`\`
xcode-select --install
\`\`\`

That installs Apple's toolchain. The \`g++\` command then works (it is really \`clang++\`, which is fine).

## Linux

\`\`\`
sudo apt install build-essential     # Debian/Ubuntu
\`\`\`

## Editor

**VS Code** plus the "C/C++" extension from Microsoft.

## Check it worked

\`g++ --version\` should print a version number. "command not found" means the PATH step was missed.

## Compile with warnings on — always

\`\`\`
g++ -std=c++20 -Wall -Wextra -g hello.cpp -o hello
\`\`\`

\`-Wall -Wextra\` turn on warnings, which catch real bugs the language would otherwise let through. Never switch them off.`,
      sample: {
        lang: 'bash',
        caption: 'Verify the install, then build properly',
        code: `g++ --version
# g++ (GCC) 14.2.0

# the flags worth typing every single time:
#   -std=c++20   use a modern standard
#   -Wall -Wextra  turn on the warnings that catch real bugs
#   -g           include debug information
g++ -std=c++20 -Wall -Wextra -g hello.cpp -o hello

./hello`,
        output: `g++ (GCC) 14.2.0
Hello, world!`,
      },
      question: {
        kind: 'fill',
        prompt:
          'Which two flags turn on the extra compiler warnings you should always build with? (Write them separated by a space.)',
        placeholder: 'e.g. -foo -bar',
        accept: ['-Wall -Wextra', '-Wextra -Wall'],
        caseSensitive: true,
        explain:
          '`-Wall -Wextra` make the compiler point out suspicious code — an unused variable, a comparison that is always true, a value used before it is set. Those warnings are free bug reports, so leave them on permanently.',
        hint: 'Both start with `-W`.',
      },
    },

    {
      id: 'cpp-b-03',
      title: 'Your first program, line by line',
      read: `\`\`\`cpp
#include <iostream>

int main() {
    std::cout << "Hello, world!\\n";
    return 0;
}
\`\`\`

Every piece matters:

- **\`#include <iostream>\`** — a *preprocessor directive*. It pastes in the declarations for input/output before compiling. Without it the compiler has never heard of \`std::cout\`.
- **\`int main()\`** — the **entry point**. Every C++ program starts here. \`int\` says it returns a whole number to the operating system.
- **\`{ }\`** — braces mark the start and end of a block of code. Python uses indentation; C++ uses braces, and indentation is purely for humans.
- **\`std::cout\`** — "character output", the console. \`std::\` means it lives in the standard library's namespace.
- **\`<<\`** — the *stream insertion* operator. Read it as an arrow pointing at where the data goes.
- **\`\\n\`** — a newline character. Without it, the next output continues on the same line.
- **\`;\`** — ends every statement. A missing semicolon is the single most common beginner error.
- **\`return 0;\`** — tells the OS "finished successfully". Non-zero means an error. (In \`main\` alone you may omit it, and 0 is assumed.)`,
      sample: {
        lang: 'cpp',
        caption: 'Printing several things, and chaining <<',
        code: `#include <iostream>

int main() {
    std::cout << "Hello, world!\\n";
    std::cout << "I am learning C++.\\n";

    // chain as many as you like
    std::cout << "The answer is " << 42 << ".\\n";

    // std::endl also ends the line, but flushes the buffer too
    std::cout << "Slower, but flushed" << std::endl;

    // no newline: these end up on one line
    std::cout << "A";
    std::cout << "B";
    std::cout << "C\\n";

    return 0;
}`,
        output: `Hello, world!
I am learning C++.
The answer is 42.
Slower, but flushed
ABC`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `#include <iostream>` actually do?',
        options: [
          'Imports the whole standard library',
          'Tells the preprocessor to paste in the declarations for input/output, so the compiler knows what `std::cout` is',
          'Runs the iostream program',
          'Links a file called iostream.cpp into your program',
        ],
        answer: 1,
        explain:
          '`#include` is textual: before compiling, the preprocessor replaces that line with the contents of the header. Without it the compiler reaches `std::cout` having never seen a declaration for it, and reports an error.',
        hint: 'The `#` makes it a preprocessor directive, which runs before the compiler proper.',
      },
    },

    {
      id: 'cpp-b-04',
      title: 'Variables and the fundamental types',
      read: `In C++ you must state the **type** of every variable, and it never changes.

\`\`\`cpp
int age = 17;
double price = 4.99;
char grade = 'A';
bool passed = true;
std::string name = "Sam";
\`\`\`

## The core types

- **\`int\`** — a whole number, usually 32 bits, roughly ±2.1 billion
- **\`double\`** — a decimal number, 64-bit. **Use this, not \`float\`**, unless you have a reason.
- **\`char\`** — one character, in **single** quotes: \`'A'\`. Double quotes make a string.
- **\`bool\`** — \`true\` or \`false\` (lower case, unlike Python)
- **\`std::string\`** — text. Needs \`#include <string>\`.

## Why so many number types?

Because C++ lets you choose how much memory to spend and how fast the arithmetic is. An \`int\` is 4 bytes; a \`double\` is 8. In a program handling millions of values that difference is real.

## Rules

- **Always initialise.** \`int x;\` leaves *garbage* in \`x\` — whatever was in that memory. Reading it is undefined behaviour, and the bug will be baffling.
- Names: letters, digits, underscores; no digit first; case-sensitive.
- \`const\` marks a value that must never change: \`const double kPi = 3.14159;\`. Use it liberally — the compiler then enforces your intent.`,
      sample: {
        lang: 'cpp',
        caption: 'Declaring, initialising, and inspecting sizes',
        code: `#include <iostream>
#include <string>

int main() {
    int age = 17;
    double price = 4.99;
    char grade = 'A';
    bool passed = true;
    std::string name = "Sam";

    const double kVatRate = 0.20;   // cannot be changed

    std::cout << name << " is " << age << ", grade " << grade << "\\n";
    std::cout << "Price: " << price << "\\n";
    std::cout << "Passed: " << passed << "\\n";      // prints 1, not "true"
    std::cout << std::boolalpha << passed << "\\n";  // now prints true

    age = 18;           // fine
    // kVatRate = 0.25; // ERROR: assignment of read-only variable

    std::cout << "int:    " << sizeof(int) << " bytes\\n";
    std::cout << "double: " << sizeof(double) << " bytes\\n";
    std::cout << "char:   " << sizeof(char) << " bytes\\n";

    return 0;
}`,
        output: `Sam is 17, grade A
Price: 4.99
Passed: 1
true
int:    4 bytes
double: 8 bytes
char:   1 bytes`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is wrong with `int count;` followed immediately by `std::cout << count;`?',
        options: [
          'Nothing — it prints 0',
          '`count` is uninitialised, so it holds whatever was already in that memory; reading it is undefined behaviour',
          'You cannot print an int',
          'It needs to be `const`',
        ],
        answer: 1,
        explain:
          'C++ does not zero local variables — that would cost time you did not ask to spend. The value is garbage, and undefined behaviour means the program may print anything, or behave differently in a debug build than a release build. Always write `int count = 0;`.',
        hint: 'What is in that memory before you put something there?',
      },
    },

    {
      id: 'cpp-b-05',
      title: 'Arithmetic, and the integer division trap',
      read: `The operators: \`+\`, \`-\`, \`*\`, \`/\`, \`%\`.

## The trap that catches every beginner

\`\`\`cpp
int a = 7, b = 2;
std::cout << a / b;     // prints 3, NOT 3.5
\`\`\`

**Dividing two integers gives an integer.** The fractional part is thrown away — not rounded, chopped. C++ does this because integer division is a different, faster CPU instruction, and the types you chose said "integers".

Three ways to get 3.5:

\`\`\`cpp
double result = static_cast<double>(a) / b;   // clearest
double result = a / static_cast<double>(b);
double result = a / 2.0;                       // a literal double
\`\`\`

One side being a \`double\` is enough — the other is promoted automatically.

## Modulo

\`%\` gives the remainder, and works on **integers only**. \`7 % 2\` is 1. \`n % 2 == 0\` tests for even.

## Increment

\`i++\` and \`++i\` both add 1. As a whole statement they are identical; in an expression, \`++i\` increments then yields the new value, \`i++\` yields the old one. Prefer \`++i\` — it is never slower and never surprising.

## Compound assignment

\`x += 5\`, \`x -= 5\`, \`x *= 2\`, \`x /= 2\`, \`x %= 3\`.`,
      sample: {
        lang: 'cpp',
        caption: 'Integer vs floating-point division, side by side',
        code: `#include <iostream>

int main() {
    int a = 7;
    int b = 2;

    std::cout << a / b << "\\n";                          // 3
    std::cout << a % b << "\\n";                          // 1
    std::cout << static_cast<double>(a) / b << "\\n";     // 3.5
    std::cout << a / 2.0 << "\\n";                        // 3.5

    // the classic average bug
    int total = 7;
    int count = 2;
    double wrong = total / count;                        // 3, then stored as 3.0
    double right = static_cast<double>(total) / count;   // 3.5
    std::cout << wrong << " vs " << right << "\\n";

    int x = 10;
    x += 5;   std::cout << x << "\\n";    // 15
    x *= 2;   std::cout << x << "\\n";    // 30
    ++x;      std::cout << x << "\\n";    // 31

    std::cout << 17 % 5 << "\\n";                         // 2
    std::cout << (10 % 2 == 0 ? "even" : "odd") << "\\n";

    return 0;
}`,
        output: `3
1
3.5
3.5
3 vs 3.5
15
30
31
2
even`,
      },
      question: {
        kind: 'fill',
        prompt: 'What does this print?\n\n```cpp\nint x = 9;\nint y = 4;\nstd::cout << x / y;\n```',
        placeholder: 'A number',
        accept: ['2'],
        explain:
          'Both operands are `int`, so C++ performs integer division: 9 ÷ 4 is 2.25, and the .25 is discarded — giving **2**. Note it truncates towards zero rather than rounding, so it is 2, not 2.25 rounded up.',
        hint: 'Both sides are integers. What happens to the fraction?',
      },
    },

    {
      id: 'cpp-b-06',
      title: 'auto, and where types come from',
      read: `Writing the type every time gets tedious, especially with long standard-library types. \`auto\` asks the compiler to work it out from the initialiser:

\`\`\`cpp
auto age = 17;         // int
auto price = 4.99;     // double
auto name = "Sam";     // const char* — careful!
auto text = std::string("Sam");   // std::string
\`\`\`

This is **not** dynamic typing. The type is fixed at compile time exactly as if you had written it — \`auto\` just saves you typing it.

## When to use it

- Long types: \`auto it = numbers.begin();\` instead of \`std::vector<int>::iterator it = ...\`
- When the exact type does not matter to the reader
- In range-for loops: \`for (auto value : numbers)\`

## When not to

When the type is short and the reader benefits from seeing it. \`auto x = getCount();\` hides whether that is an \`int\`, a \`size_t\` or something else.

## One gotcha

\`auto name = "Sam";\` gives a \`const char*\` (a pointer to characters), not a \`std::string\`. Use \`std::string name = "Sam";\` or the \`"Sam"s\` literal with \`using namespace std::string_literals;\`.

## Type conversion

\`static_cast<double>(x)\` is the explicit, greppable way to convert. C++ will also convert silently in many cases — which is convenient and occasionally the source of a bug, so being explicit is a good habit.`,
      sample: {
        lang: 'cpp',
        caption: 'auto in the places it genuinely helps',
        code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    auto count = 42;                  // int
    auto ratio = 0.5;                 // double
    auto letter = 'x';                // char
    auto flag = true;                 // bool
    std::string name = "Sam";         // NOT auto: we want a real string

    std::vector<int> numbers = {3, 1, 4, 1, 5};

    // auto shines here — the real type is verbose and uninteresting
    for (auto value : numbers) {
        std::cout << value << " ";
    }
    std::cout << "\\n";

    auto first = numbers.begin();
    std::cout << *first << "\\n";

    // conversions, made explicit
    double exact = 7.0 / 2.0;
    int chopped = static_cast<int>(exact);       // 3 — truncates
    std::cout << exact << " -> " << chopped << "\\n";

    char c = 'A';
    std::cout << static_cast<int>(c) << "\\n";    // 65, its character code

    return 0;
}`,
        output: `3 1 4 1 5
3
3.5 -> 3
65`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Does `auto` make C++ dynamically typed like Python?',
        options: [
          'Yes — the variable can hold any type',
          'No — the compiler deduces one fixed type at compile time, exactly as if you had written it out',
          'Only inside functions',
          'Only for numeric types',
        ],
        answer: 1,
        explain:
          '`auto` is deduction, not dynamism. After `auto x = 5;`, `x` is an `int` permanently, and `x = "hello";` is a compile error. All the compile-time checking is still there — you just typed less.',
        hint: 'When is the type decided?',
      },
    },

    {
      id: 'cpp-b-07',
      title: 'Reading input with std::cin',
      read: `\`std::cin\` reads from the keyboard, using \`>>\` — an arrow pointing *out of* the stream and into your variable.

\`\`\`cpp
int age;
std::cout << "Age: ";
std::cin >> age;
\`\`\`

Unlike Python's \`input()\`, \`>>\` reads **into the type of the variable**, converting as it goes. Reading into an \`int\` gives you a real number, with no conversion step.

## The whitespace rule

\`>>\` stops at the first whitespace. So for \`Sam Ellis\`, \`std::cin >> name\` gets only \`"Sam"\`, and \`"Ellis"\` waits in the buffer for the next read.

To read a whole line, including spaces:

\`\`\`cpp
std::getline(std::cin, fullName);
\`\`\`

## The trap: mixing >> and getline

\`>>\` leaves the newline you pressed in the buffer, so a following \`getline\` reads an empty line immediately. Clear it first:

\`\`\`cpp
std::cin >> age;
std::cin.ignore(10000, '\\n');
std::getline(std::cin, name);
\`\`\`

## When input fails

Type "hello" into an \`int\` and the stream enters a **fail state**: the variable is set to 0 and every later read is skipped. Check with \`if (!(std::cin >> age))\`, then \`std::cin.clear()\` and \`ignore\` to recover.`,
      sample: {
        lang: 'cpp',
        caption: 'Numbers, words, whole lines — and recovering from bad input',
        code: `#include <iostream>
#include <limits>
#include <string>

int main() {
    int age = 0;
    std::cout << "How old are you? ";

    while (!(std::cin >> age)) {
        std::cin.clear();                     // drop the fail state
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');
        std::cout << "Whole numbers only. Try again: ";
    }

    // >> left the newline behind; getline would read it as an empty line
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');

    std::string fullName;
    std::cout << "What is your full name? ";
    std::getline(std::cin, fullName);

    std::cout << "Hello, " << fullName << "!\\n";
    std::cout << "Next year you will be " << age + 1 << ".\\n";

    return 0;
}`,
        output: `How old are you? seventeen
Whole numbers only. Try again: 17
What is your full name? Sam Ellis
Hello, Sam Ellis!
Next year you will be 18.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After `std::cin >> age;`, a `std::getline(std::cin, name);` immediately returns an empty string. Why?',
        options: [
          '`getline` does not work after `>>`',
          '`>>` left the newline from the Enter key in the buffer, and `getline` reads up to the next newline — finding it straight away',
          '`name` must be initialised first',
          'The input stream is closed',
        ],
        answer: 1,
        explain:
          '`>>` consumes the number but stops at the newline, leaving it unread. `getline` then reads everything up to that newline — which is nothing. `std::cin.ignore(...)` discards the leftover and fixes it.',
        hint: 'What does the Enter key put into the buffer, and who consumes it?',
      },
    },

    {
      id: 'cpp-b-08',
      title: 'Comparison and boolean logic',
      read: `## Comparison operators

\`==\` equal, \`!=\` not equal, \`<\`, \`>\`, \`<=\`, \`>=\`. Each produces a \`bool\`.

## One equals or two

\`=\` **assigns**. \`==\` **compares**. In C++ this is worse than a typo, because \`if (x = 5)\` compiles: it assigns 5 to \`x\`, then treats 5 as true. The condition is always true and nothing warns you — unless you compiled with \`-Wall\`, which is one more reason to.

## Logical operators

- \`&&\` — and
- \`||\` — or
- \`!\` — not

## Short-circuit evaluation

\`&&\` stops as soon as something is false; \`||\` stops as soon as something is true. The right-hand side may never run at all — which is not just an optimisation, it is how you write safe guards:

\`\`\`cpp
if (index < size && data[index] == target)
\`\`\`

If \`index\` is out of range, the second half is never evaluated, so you never read out of bounds. Swap the order and the program can crash.

## Any number is a condition

C++ treats **0 as false and anything else as true**. So \`if (count)\` means "if count is not zero". Legal, common, and clearer written as \`if (count != 0)\`.

## Floating-point equality

Never compare \`double\`s with \`==\`. \`0.1 + 0.2 == 0.3\` is **false**, because binary cannot represent those values exactly. Compare the difference against a small tolerance instead.`,
      sample: {
        lang: 'cpp',
        caption: 'Short-circuiting, and why == is wrong for doubles',
        code: `#include <cmath>
#include <iostream>

int main() {
    int age = 17;
    bool isStudent = true;

    std::cout << std::boolalpha;
    std::cout << (age >= 18) << "\\n";
    std::cout << (age < 18 && isStudent) << "\\n";
    std::cout << (age >= 18 || isStudent) << "\\n";
    std::cout << !isStudent << "\\n";

    // short-circuit: the divide never happens when count is 0
    int count = 0;
    int total = 50;
    if (count != 0 && total / count > 10) {
        std::cout << "high average\\n";
    } else {
        std::cout << "guarded safely\\n";
    }

    // floating point
    double sum = 0.1 + 0.2;
    std::cout << (sum == 0.3) << "\\n";                    // false!
    std::cout << (std::abs(sum - 0.3) < 1e-9) << "\\n";    // true
    std::cout.precision(17);
    std::cout << sum << "\\n";

    return 0;
}`,
        output: `false
true
true
false
guarded safely
false
true
0.30000000000000004`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `if (count != 0 && total / count > 10)` safe, while swapping the two halves is not?',
        options: [
          'Order never matters in C++',
          '`&&` short-circuits: when the left side is false the right side is never evaluated, so the division by zero cannot happen',
          'Division by zero is safe for integers',
          'The compiler reorders it automatically',
        ],
        answer: 1,
        explain:
          'Short-circuit evaluation is a guarantee, not an optimisation, so you can rely on it for guards. With the halves swapped, `total / count` is evaluated first and integer division by zero is undefined behaviour — usually a crash.',
        hint: 'Which side of `&&` is evaluated first, and when is the other one skipped?',
      },
    },

    {
      id: 'cpp-b-09',
      title: 'if, else if, else',
      read: `\`\`\`cpp
if (score >= 90) {
    std::cout << "A\\n";
} else if (score >= 80) {
    std::cout << "B\\n";
} else {
    std::cout << "F\\n";
}
\`\`\`

- The condition goes in **round brackets** — required.
- The body goes in **braces**. Technically optional for a single statement, but **always use them**: the "goto fail" bug, a real security hole in Apple's TLS code, was caused by an unbraced \`if\`.
- No colon, and indentation is only for humans.
- Checked top to bottom; the **first** true branch runs and the rest are skipped.

## The ternary operator

\`\`\`cpp
std::string result = (score >= 50) ? "pass" : "fail";
\`\`\`

Read as: *condition ? value-if-true : value-if-false*. Good for choosing between two values; bad for anything longer.

## switch

For comparing one integer or character against many fixed values:

\`\`\`cpp
switch (choice) {
    case 1: ...; break;
    case 2: ...; break;
    default: ...;
}
\`\`\`

**\`break\` is essential.** Without it execution "falls through" into the next case — occasionally useful, usually a bug. \`switch\` does not work with \`std::string\`.

## Scope

A variable declared inside \`{ }\` exists only inside those braces.`,
      sample: {
        lang: 'cpp',
        caption: 'Chained conditions, the ternary, and a switch menu',
        code: `#include <iostream>
#include <string>

int main() {
    int score = 72;

    if (score >= 90) {
        std::cout << "Grade: A\\n";
    } else if (score >= 80) {
        std::cout << "Grade: B\\n";
    } else if (score >= 70) {
        std::cout << "Grade: C\\n";
    } else {
        std::cout << "Grade: F\\n";
    }

    std::string outcome = (score >= 50) ? "Pass" : "Fail";
    std::cout << outcome << "\\n";

    int choice = 2;
    switch (choice) {
        case 1:
            std::cout << "New game\\n";
            break;
        case 2:
            std::cout << "Load game\\n";
            break;
        case 3:
        case 4:                          // deliberate fall-through: same action
            std::cout << "Settings\\n";
            break;
        default:
            std::cout << "Unknown option\\n";
    }

    if (score > 0) {
        int bonus = 5;                   // exists only inside these braces
        std::cout << score + bonus << "\\n";
    }
    // std::cout << bonus;  // ERROR: 'bonus' was not declared in this scope

    return 0;
}`,
        output: `Grade: C
Pass
Load game
77`,
      },
      question: {
        kind: 'code',
        lang: 'cpp',
        prompt:
          'A variable `temp` holds a temperature. Write an if/else that prints `Hot` when `temp` is above 30 and `Not hot` otherwise. Use braces.',
        starter: 'if (',
        mustInclude: [
          'if\\s*\\(\\s*temp\\s*>\\s*30\\s*\\)',
          '\\{',
          'Hot',
          'else',
          'Not hot',
        ],
        solution: `if (temp > 30) {
    std::cout << "Hot\\n";
} else {
    std::cout << "Not hot\\n";
}`,
        explain:
          'Condition in round brackets, body in braces, no colon. `else` takes no condition of its own. Braces on every branch, even one-liners — it costs nothing and prevents a whole family of bugs.',
        hint: 'Round brackets for the condition, curly braces for each body.',
      },
    },

    {
      id: 'cpp-b-10',
      title: 'Reading compiler errors',
      read: `The compiler is strict, and it tells you exactly what is wrong — once you learn to read it.

## Read from the TOP

A single mistake often produces a cascade of errors. **Fix the first one and rebuild.** The rest usually vanish.

## The ones you will meet this week

- **\`expected ';' before ...\`** — a missing semicolon, usually at the end of the **previous** line. The compiler notices one line late.
- **\`'x' was not declared in this scope\`** — a typo, a missing \`#include\`, or the variable is declared in a different block.
- **\`'cout' is not a member of 'std'\`** — missing \`#include <iostream>\`.
- **\`undefined reference to 'main'\`** — a **linker** error, not a compiler one. You compiled successfully but there is no \`main\`, or you forgot to link a file.
- **\`invalid operands to binary expression\`** — mixing types that do not combine.

## Compiler vs linker

Two separate stages. The **compiler** checks each file's syntax and types. The **linker** then joins the compiled pieces and resolves every name to a definition. "undefined reference" is always the linker saying: *you promised this exists, and I cannot find it*.

## Warnings are errors in waiting

\`-Wall -Wextra\` warnings are the compiler telling you about code that is legal but probably wrong. Fix them all.`,
      sample: {
        lang: 'cpp',
        caption: 'Four ordinary mistakes and the exact messages they produce',
        code: `#include <iostream>

int main() {
    int x = 5        // 1. missing semicolon
    std::cout << y;  // 2. y was never declared
    std::cout << "hi" << std:endl;   // 3. one colon, not two
    return 0
}                    // 4. missing semicolon on return`,
        output: `main.cpp:4:14: error: expected ',' or ';' before 'std'
    4 |     int x = 5
      |              ^
    5 |     std::cout << y;
      |     ~~~

main.cpp:5:18: error: 'y' was not declared in this scope
    5 |     std::cout << y;
      |                  ^

main.cpp:6:29: error: 'std' has not been declared
    6 |     std::cout << "hi" << std:endl;
      |                             ^~~~

main.cpp:7:13: error: expected ';' before '}' token`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The compiler reports "expected \';\' before \'std\'" on line 5, but line 5 looks perfectly fine. Where is the mistake?',
        options: [
          'On line 5, but the compiler cannot show it',
          'At the end of line 4 — the compiler only notices the missing semicolon when it reaches the next token',
          'In a header file',
          'The error is spurious and can be ignored',
        ],
        answer: 1,
        explain:
          'A statement ends at its semicolon, so the compiler keeps reading until it finds something that cannot possibly continue the statement — which is on the *next* line. Whenever a semicolon error points at a line that looks correct, check the line above.',
        hint: 'When does the compiler realise the statement never ended?',
      },
    },

    {
      id: 'cpp-b-11',
      title: 'Formatting output',
      read: `Numbers rarely print the way you want by default.

## iomanip

\`#include <iomanip>\` gives you manipulators you insert into the stream:

- \`std::fixed\` — decimal notation, not scientific
- \`std::setprecision(2)\` — with \`fixed\`, this means 2 decimal places
- \`std::setw(10)\` — pad the **next** item to 10 characters wide
- \`std::left\` / \`std::right\` — alignment
- \`std::setfill('.')\` — the padding character

Most manipulators are **sticky** — they stay in effect. \`setw\` is the exception: it applies to the next item only.

## std::format (C++20)

Much nicer, if your compiler supports it:

\`\`\`cpp
#include <format>
std::cout << std::format("{:.2f} and {:>8}\\n", price, name);
\`\`\`

Same idea as Python's f-strings: \`{:.2f}\` for two decimals, \`{:>8}\` for right-aligned in 8 columns.

## Escape sequences

\`\\n\` newline · \`\\t\` tab · \`\\\\\` backslash · \`\\"\` quote · \`\\'\` apostrophe`,
      sample: {
        lang: 'cpp',
        caption: 'A neatly aligned table with iomanip',
        code: `#include <iomanip>
#include <iostream>
#include <string>

int main() {
    double price = 4.5;

    std::cout << price << "\\n";                                   // 4.5
    std::cout << std::fixed << std::setprecision(2);
    std::cout << price << "\\n";                                   // 4.50

    std::cout << "\\n";
    std::cout << std::left  << std::setw(12) << "Item"
              << std::right << std::setw(8)  << "Price" << "\\n";
    std::cout << std::setfill('-') << std::setw(20) << "" << "\\n";
    std::cout << std::setfill(' ');

    std::cout << std::left  << std::setw(12) << "Coffee"
              << std::right << std::setw(8)  << 2.50 << "\\n";
    std::cout << std::left  << std::setw(12) << "Sandwich"
              << std::right << std::setw(8)  << 4.95 << "\\n";

    std::cout << "\\nCol1\\tCol2\\tCol3\\n";
    std::cout << "She said \\"hello\\"\\n";

    return 0;
}`,
        output: `4.5
4.50

Item            Price
--------------------
Coffee           2.50
Sandwich         4.95

Col1	Col2	Col3
She said "hello"`,
      },
      question: {
        kind: 'code',
        lang: 'cpp',
        prompt:
          'Write the two stream manipulators (as one `std::cout <<` statement) that make all following doubles print with exactly 2 decimal places.',
        starter: 'std::cout << ',
        mustInclude: ['std::fixed', 'std::setprecision\\s*\\(\\s*2\\s*\\)'],
        solution: 'std::cout << std::fixed << std::setprecision(2);',
        explain:
          'You need both: `setprecision` alone counts *significant figures*, so 1234.5 would print as 1.2e+03. Adding `std::fixed` switches to decimal notation and makes precision mean "digits after the point". Both are sticky, so one statement covers everything after it.',
        hint: 'Two manipulators, and remember `#include <iomanip>`.',
      },
    },

    {
      id: 'cpp-b-12',
      title: 'Project: a unit converter',
      read: `Everything from this level in one program.

The plan:

1. Show a menu of conversions.
2. Read the choice with \`std::cin\`, checking it is valid.
3. Read the value to convert.
4. \`switch\` (or \`if/else if\`) to pick the formula.
5. Print the result to two decimal places.

Things to notice in the sample:

- \`const\` for the conversion factors — they are facts, not variables
- \`double\` throughout, because these are measurements
- The input validation loop from step 7, reused
- Output formatting from step 11
- Braces on every branch, and named constants instead of mystery numbers

> Type it in, compile it with \`-Wall -Wextra\`, and then extend it: add Celsius→Fahrenheit, or a loop that lets the user convert again without restarting.`,
      sample: {
        lang: 'cpp',
        caption: 'Input, validation, branching, maths, formatted output',
        code: `#include <iomanip>
#include <iostream>
#include <limits>

int main() {
    const double kKmPerMile = 1.609344;
    const double kKgPerPound = 0.45359237;

    std::cout << "=== Unit Converter ===\\n";
    std::cout << "1) Miles      -> Kilometres\\n";
    std::cout << "2) Kilometres -> Miles\\n";
    std::cout << "3) Pounds     -> Kilograms\\n";
    std::cout << "4) Celsius    -> Fahrenheit\\n";

    int choice = 0;
    std::cout << "Choose 1-4: ";
    while (!(std::cin >> choice) || choice < 1 || choice > 4) {
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');
        std::cout << "Please enter a number from 1 to 4: ";
    }

    double value = 0.0;
    std::cout << "Enter the value: ";
    while (!(std::cin >> value)) {
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');
        std::cout << "That is not a number. Try again: ";
    }

    double result = 0.0;
    std::string fromUnit;
    std::string toUnit;

    switch (choice) {
        case 1:
            result = value * kKmPerMile;
            fromUnit = "miles";
            toUnit = "km";
            break;
        case 2:
            result = value / kKmPerMile;
            fromUnit = "km";
            toUnit = "miles";
            break;
        case 3:
            result = value * kKgPerPound;
            fromUnit = "lb";
            toUnit = "kg";
            break;
        case 4:
            result = value * 9.0 / 5.0 + 32.0;
            fromUnit = "C";
            toUnit = "F";
            break;
        default:
            std::cout << "Unreachable.\\n";
            return 1;
    }

    std::cout << std::fixed << std::setprecision(2);
    std::cout << value << " " << fromUnit
              << " = " << result << " " << toUnit << "\\n";

    return 0;
}`,
        output: `=== Unit Converter ===
1) Miles      -> Kilometres
2) Kilometres -> Miles
3) Pounds     -> Kilograms
4) Celsius    -> Fahrenheit
Choose 1-4: 9
Please enter a number from 1 to 4: 1
Enter the value: 26.2
26.20 miles = 42.16 km`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Case 4 uses `value * 9.0 / 5.0 + 32.0` rather than `value * 9 / 5 + 32`. With `value` being a `double`, does it matter here — and why write it that way?',
        options: [
          'It makes no difference at all, and the `.0` is pointless',
          'Here `value` is a double so it promotes anyway — but writing `9.0 / 5.0` makes the intent explicit and survives someone later changing `value` to an int',
          'Integer literals are not allowed in arithmetic',
          '`9 / 5` would be a compile error',
        ],
        answer: 1,
        explain:
          'Because `value` is a `double`, `value * 9` is already floating point, so this particular expression works either way. The habit still matters: the day someone changes `value` to an `int`, `9 / 5` becomes integer division giving 1, and the formula silently breaks. Writing floating-point literals makes the intent explicit and the code robust to that change.',
        hint: 'Think about what happens if `value` later becomes an `int`.',
      },
    },
  ],
}

export default level
