import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Loops, functions and containers',
  summary:
    'Repeat work automatically, break programs into functions, and store collections of data with arrays, vectors and strings — the tools that turn scripts into programs.',
  outcomes: [
    'Write while, for and do-while loops correctly',
    'Break programs into functions with parameters and return values',
    'Understand scope, lifetime and why globals are avoided',
    'Use std::vector as your default container',
    'Work with std::string properly',
    'Combine them into a real interactive program',
  ],
  steps: [
    {
      id: 'cpp-a-01',
      title: 'while loops',
      read: `A \`while\` loop repeats as long as its condition is true.

\`\`\`cpp
int count = 3;
while (count > 0) {
    std::cout << count << "\\n";
    --count;
}
\`\`\`

Three things are always needed, and missing any one is a bug:

1. **Setup before** the loop — \`int count = 3;\`
2. **A condition** that can become false — \`count > 0\`
3. **Progress inside** the body — \`--count;\`

Forget the third and you have an **infinite loop**. \`Ctrl + C\` stops it.

## The subtle one

\`while (count > 0);\` — note the stray semicolon. That is a complete, empty loop body, so it spins forever doing nothing while the braces below run once. \`-Wall\` warns about it.

## do-while

Checks the condition **after** the body, so the body always runs at least once. Exactly right for menus:

\`\`\`cpp
do {
    showMenu();
    std::cin >> choice;
} while (choice != 0);
\`\`\`

Note the semicolon after \`while (...)\` — required here, unlike a normal while loop.`,
      sample: {
        lang: 'cpp',
        caption: 'Countdown, accumulate, validate, and a do-while menu',
        code: `#include <iostream>

int main() {
    int count = 3;
    while (count > 0) {
        std::cout << count << " ";
        --count;
    }
    std::cout << "Go!\\n";

    // sum the digits of a number
    int number = 4821;
    int sum = 0;
    while (number > 0) {
        sum += number % 10;    // last digit
        number /= 10;          // drop it
    }
    std::cout << "Digit sum: " << sum << "\\n";

    // do-while: always runs at least once
    int choice = 0;
    do {
        std::cout << "1) Play  2) Help  0) Quit\\n> ";
        std::cin >> choice;
        if (choice == 1) std::cout << "Playing...\\n";
        if (choice == 2) std::cout << "No help available.\\n";
    } while (choice != 0);

    std::cout << "Bye\\n";
    return 0;
}`,
        output: `3 2 1 Go!
Digit sum: 15
1) Play  2) Help  0) Quit
> 1
Playing...
1) Play  2) Help  0) Quit
> 0
Bye`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does `while (n > 0);` followed by a braced block on the next lines loop forever?',
        options: [
          'The condition is written wrongly',
          'The semicolon *is* the loop body — an empty statement — so the loop spins doing nothing and the braces below are a separate block',
          'Semicolons are not allowed after `while`',
          'It does not; it runs once',
        ],
        answer: 1,
        explain:
          'A lone `;` is a valid empty statement, so the compiler reads it as the entire body. Nothing inside changes `n`, so the condition stays true forever. `-Wall` warns about this, which is one more reason to keep warnings on.',
        hint: 'What counts as the loop body when there are no braces?',
      },
    },

    {
      id: 'cpp-a-02',
      title: 'for loops',
      read: `A \`for\` loop packs the three parts of a counting loop into one line:

\`\`\`cpp
for (int i = 0; i < 5; ++i) {
    std::cout << i << "\\n";
}
\`\`\`

Read the three parts, separated by semicolons:
1. **init** — \`int i = 0\`, runs once at the start
2. **condition** — \`i < 5\`, checked before every pass
3. **update** — \`++i\`, runs after every pass

That prints 0, 1, 2, 3, 4 — **five** passes.

## Counting from 0

\`for (int i = 0; i < n; ++i)\` runs exactly \`n\` times, and \`i\` matches array indexes directly. Learn this shape; you will write it thousands of times.

Note \`<\` not \`<=\`. \`i <= n\` runs n+1 times and, with an array, reads one past the end — the classic **off-by-one** bug.

## Scope

\`i\` declared in the init part exists only inside the loop. That is what you want.

## Range-based for

For anything you can iterate, this is cleaner and cannot go out of bounds:

\`\`\`cpp
for (int value : numbers) { ... }
for (const auto& item : items) { ... }   // no copying
\`\`\`

**Use range-for by default.** Reach for the indexed form only when you actually need the index.`,
      sample: {
        lang: 'cpp',
        caption: 'Counting, stepping, counting down, and range-for',
        code: `#include <iostream>
#include <string>
#include <vector>

int main() {
    for (int i = 0; i < 5; ++i) {
        std::cout << i << " ";
    }
    std::cout << "\\n";

    for (int i = 1; i <= 10; i += 2) {
        std::cout << i << " ";
    }
    std::cout << "\\n";

    for (int i = 5; i > 0; --i) {
        std::cout << i << " ";
    }
    std::cout << "\\n";

    std::vector<int> scores = {88, 92, 79};

    for (std::size_t i = 0; i < scores.size(); ++i) {
        std::cout << "Score " << i << ": " << scores[i] << "\\n";
    }

    // cleaner, and cannot run off the end
    int total = 0;
    for (int score : scores) {
        total += score;
    }
    std::cout << "Total: " << total << "\\n";

    std::string word = "hello";
    for (char c : word) {
        std::cout << c << "-";
    }
    std::cout << "\\n";

    return 0;
}`,
        output: `0 1 2 3 4
1 3 5 7 9
5 4 3 2 1
Score 0: 88
Score 1: 92
Score 2: 79
Total: 259
h-e-l-l-o-`,
      },
      question: {
        kind: 'fill',
        prompt: 'How many times does the body of `for (int i = 0; i < 8; ++i)` run?',
        placeholder: 'A number',
        accept: ['8', 'eight'],
        explain:
          'i takes the values 0 through 7 — eight passes. Starting at 0 with `<` means the count is exactly the limit, which is why this shape lines up perfectly with array indexes 0..n-1.',
        hint: 'Count the values i actually takes.',
      },
    },

    {
      id: 'cpp-a-03',
      title: 'break, continue and nested loops',
      read: `## break and continue

- **\`break\`** — leave the loop immediately
- **\`continue\`** — skip the rest of this pass and go to the next one

In a \`for\` loop, \`continue\` still runs the **update** part, so \`++i\` happens. In a \`while\` loop it does not — if your update is at the bottom of the body, a \`continue\` skips it and you get an infinite loop. This is a genuinely common bug.

## Nested loops

A loop inside a loop. The inner one runs completely on every pass of the outer one, so the total is the product.

\`\`\`cpp
for (int row = 0; row < 3; ++row) {
    for (int col = 0; col < 4; ++col) { ... }   // 12 passes
}
\`\`\`

## break only leaves one loop

\`break\` in the inner loop exits the inner loop only. To leave both, either set a flag, or put the loops in a function and \`return\`. (C++ has \`goto\`, and this is the one case where people defend it — but a function is almost always clearer.)

## Watch the cost

Two nested loops over 10,000 items each is 100,000,000 passes. Nesting multiplies, so always ask how large the inputs can get.`,
      sample: {
        lang: 'cpp',
        caption: 'A times table, a prime check, and escaping two loops cleanly',
        code: `#include <iostream>
#include <vector>

// return from a function: the clean way to exit nested loops
bool containsPair(const std::vector<std::vector<int>>& grid, int target) {
    for (const auto& row : grid) {
        for (int value : row) {
            if (value == target) return true;   // leaves BOTH loops
        }
    }
    return false;
}

int main() {
    for (int row = 1; row <= 3; ++row) {
        for (int col = 1; col <= 4; ++col) {
            std::cout << row * col << "\\t";
        }
        std::cout << "\\n";
    }

    // skip odd numbers, stop at 12
    for (int n = 1; n <= 20; ++n) {
        if (n % 2 != 0) continue;
        if (n > 12) break;
        std::cout << n << " ";
    }
    std::cout << "\\n";

    int candidate = 91;
    bool isPrime = candidate > 1;
    for (int d = 2; d * d <= candidate; ++d) {
        if (candidate % d == 0) {
            isPrime = false;
            break;                    // no point checking further
        }
    }
    std::cout << candidate << (isPrime ? " is prime\\n" : " is not prime\\n");

    std::vector<std::vector<int>> grid = {{1, 2}, {3, 4}};
    std::cout << std::boolalpha << containsPair(grid, 4) << "\\n";

    return 0;
}`,
        output: `1	2	3	4
2	4	6	8
3	6	9	12
2 4 6 8 10 12
91 is not prime
true`,
      },
      question: {
        kind: 'mcq',
        prompt: 'A `break` inside the inner of two nested loops exits which loops?',
        options: [
          'Both loops',
          'Only the inner loop; the outer loop continues with its next pass',
          'Only the outer loop',
          'Neither — `break` only works in `switch`',
        ],
        answer: 1,
        explain:
          '`break` leaves the innermost enclosing loop or switch. To leave both, move the loops into a function and `return`, or set a flag the outer condition checks. The function version is usually clearer and testable too.',
        hint: 'How far out does break reach?',
      },
    },

    {
      id: 'cpp-a-04',
      title: 'Functions',
      read: `A function is a named, reusable block that takes inputs and returns a result.

\`\`\`cpp
int add(int a, int b) {
    return a + b;
}
\`\`\`

- **\`int\`** at the front is the **return type** — what it gives back
- **\`add\`** is the name
- **\`(int a, int b)\`** are the **parameters**, each with its own type
- **\`return\`** sends a value back and exits immediately

## void

A function that returns nothing has return type \`void\`. A bare \`return;\` exits it early.

## Declare before you use

C++ reads top to bottom, so a function must be **declared** before it is called. Either define it above \`main\`, or write a **prototype** (a declaration with no body) near the top and the definition below:

\`\`\`cpp
double average(int total, int count);   // prototype — note the semicolon
\`\`\`

This is exactly what header files contain, which is why this habit matters later.

## Overloading

Several functions may share a name if their parameter lists differ. The compiler picks by the argument types.

## What makes a good function

One job. A name that says what it returns. Short enough to read at once. Prefer returning a value over modifying something on the side — such functions are trivially testable.`,
      sample: {
        lang: 'cpp',
        caption: 'Prototypes, overloading, void, and early return',
        code: `#include <iostream>
#include <string>

// prototypes: promises that these exist further down
double average(int total, int count);
void printBanner(const std::string& title);
int maxOf(int a, int b);
double maxOf(double a, double b);   // overload

int main() {
    printBanner("Results");

    std::cout << average(259, 3) << "\\n";
    std::cout << average(10, 0) << "\\n";

    std::cout << maxOf(3, 7) << "\\n";
    std::cout << maxOf(2.5, 1.5) << "\\n";

    return 0;
}

double average(int total, int count) {
    if (count == 0) return 0.0;      // guard clause: handle the bad case first
    return static_cast<double>(total) / count;
}

void printBanner(const std::string& title) {
    std::cout << "=== " << title << " ===\\n";
}

int maxOf(int a, int b) { return (a > b) ? a : b; }
double maxOf(double a, double b) { return (a > b) ? a : b; }`,
        output: `=== Results ===
86.3333
0
7
2.5`,
      },
      question: {
        kind: 'code',
        lang: 'cpp',
        prompt:
          'Write a function `square` that takes one `int` and returns its square as an `int`.',
        starter: 'int square(',
        mustInclude: ['int\\s+square\\s*\\(\\s*int\\s+\\w+\\s*\\)', 'return\\s+'],
        solution: `int square(int n) {
    return n * n;
}`,
        explain:
          'Return type first, then the name, then typed parameters in brackets. Every path through a non-void function must `return` a value — the compiler warns if one does not.',
        hint: 'Return type, name, one typed parameter, braces, return.',
      },
    },

    {
      id: 'cpp-a-05',
      title: 'Passing arguments: by value and by reference',
      read: `## By value (the default)

\`\`\`cpp
void addOne(int n) { n += 1; }
\`\`\`

The function gets a **copy**. Changing it has no effect on the caller's variable. Safe, and for small types (int, double, char, bool) free.

## By reference

\`\`\`cpp
void addOne(int& n) { n += 1; }
\`\`\`

The \`&\` means \`n\` is an **alias** for the caller's variable. Changes are visible outside.

## By const reference — the important one

\`\`\`cpp
void print(const std::string& text);
\`\`\`

No copy is made (fast), and \`const\` promises not to modify it (safe). For any large object — string, vector, class — **this is the default way to pass a parameter**.

Passing a \`std::string\` by value copies the whole text on every call. In a loop, that is real cost for no benefit.

## The rule of thumb

- Small and cheap (int, double, char, bool, pointers) → **by value**
- Large, and you only read it → **by const reference**
- You need to modify the caller's object → **by reference**

## Returning

Return by value. Modern C++ elides the copy (RVO / move semantics), so returning a vector from a function is efficient. **Never return a reference to a local variable** — it is destroyed when the function ends, and the reference dangles.`,
      sample: {
        lang: 'cpp',
        caption: 'The same function three ways, and why const& matters',
        code: `#include <iostream>
#include <string>
#include <vector>

void byValue(int n)        { n += 100; }
void byReference(int& n)   { n += 100; }

// no copy, and cannot modify — the default for big types
std::size_t countVowels(const std::string& text) {
    std::size_t count = 0;
    for (char c : text) {
        if (c=='a'||c=='e'||c=='i'||c=='o'||c=='u') ++count;
    }
    return count;
}

// modifies the caller's vector in place
void doubleAll(std::vector<int>& values) {
    for (int& v : values) v *= 2;      // note int& — without it, v is a copy
}

int main() {
    int x = 5;
    byValue(x);      std::cout << x << "\\n";   // 5 — unchanged
    byReference(x);  std::cout << x << "\\n";   // 105

    std::string sentence = "the quick brown fox";
    std::cout << countVowels(sentence) << "\\n";

    std::vector<int> nums = {1, 2, 3};
    doubleAll(nums);
    for (int n : nums) std::cout << n << " ";
    std::cout << "\\n";

    return 0;
}`,
        output: `5
105
5
2 4 6 `,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why pass a `std::string` parameter as `const std::string&` rather than `std::string`?',
        options: [
          'It is shorter to write',
          'By value copies the entire string on every call; a const reference avoids the copy while promising not to modify it',
          'Strings cannot be passed by value',
          'It allows the string to be changed',
        ],
        answer: 1,
        explain:
          'Copying a string means allocating memory and copying every character — pointless when the function only reads it. `const&` binds directly to the caller\'s object, and the `const` is what makes it safe as well as fast.',
        hint: 'What has to happen to make a copy of a long string?',
      },
    },

    {
      id: 'cpp-a-06',
      title: 'Scope, lifetime and globals',
      read: `## Scope

A variable exists from its declaration to the closing brace of its block. Outside that, the name does not exist.

\`\`\`cpp
if (x > 0) {
    int bonus = 5;
}
// bonus is gone here
\`\`\`

Declare variables in the **smallest scope that works** — as late as possible, as close to their use as possible. Then a reader never has to scroll to find out what something is, and the compiler catches accidental reuse.

## Lifetime

- **Automatic** (local variables) — created on entry, destroyed at the closing brace. This automatic destruction is what makes RAII (a later level) work.
- **Static** — \`static int counter = 0;\` inside a function keeps its value between calls and is initialised once.
- **Dynamic** — \`new\`/\`delete\`, which you will meet later and should mostly avoid.

## Shadowing

An inner variable with the same name hides the outer one. Legal, confusing, and \`-Wshadow\` warns about it.

## Globals

A variable outside every function is visible to everything. Avoid them: any code can change one, so tracking down "who set this to -1?" becomes a search of the whole program. \`const\` globals (true constants) are fine.

The alternative is always the same: pass what a function needs as parameters, and return what it produces.`,
      sample: {
        lang: 'cpp',
        caption: 'Scope, static, shadowing and the global to avoid',
        code: `#include <iostream>

const double kTaxRate = 0.20;    // a constant global is fine
int g_callCount = 0;             // a mutable global is a smell

void tracked() {
    ++g_callCount;                // anyone, anywhere, can change this
    static int localCount = 0;    // better: private to this function
    ++localCount;
    std::cout << "global " << g_callCount << ", static " << localCount << "\\n";
}

int main() {
    int value = 10;

    if (value > 5) {
        int bonus = 5;                    // exists only in this block
        std::cout << value + bonus << "\\n";
    }
    // std::cout << bonus;   // ERROR: not declared in this scope

    for (int i = 0; i < 3; ++i) {
        int square = i * i;               // fresh every pass
        std::cout << square << " ";
    }
    std::cout << "\\n";
    // i and square are both gone here

    {
        int value = 99;                   // shadows the outer 'value'
        std::cout << "inner: " << value << "\\n";
    }
    std::cout << "outer: " << value << "\\n";

    tracked();
    tracked();

    return 0;
}`,
        output: `15
0 1 4
inner: 99
outer: 10
global 1, static 1
global 2, static 2`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why are mutable global variables discouraged?',
        options: [
          'They use too much memory',
          'Any code anywhere can change them, so understanding or debugging a value means reading the whole program instead of one function',
          'They are slower to access',
          'The compiler does not support them',
        ],
        answer: 1,
        explain:
          'A local variable has a small, readable set of possible writers. A global has the entire program, which makes reasoning, testing and multithreading all much harder. Passing parameters and returning values keeps every dependency visible in the signature.',
        hint: 'Who is allowed to modify it?',
      },
    },

    {
      id: 'cpp-a-07',
      title: 'Arrays and std::array',
      read: `## C-style arrays

\`\`\`cpp
int scores[5] = {88, 92, 79, 100, 65};
\`\`\`

Fixed size, chosen at compile time, laid out contiguously in memory. Indexes run \`0\` to \`size - 1\`.

## The danger

\`\`\`cpp
scores[5] = 10;    // one past the end
\`\`\`

C++ **does not check**. There is no error, no exception. You have written over whatever happened to be next in memory — perhaps another variable, perhaps the return address. The program may crash now, crash much later, or silently corrupt data. This is **undefined behaviour**, and buffer overruns like this are behind a large share of all security vulnerabilities.

Also: a raw array **forgets its own size** the moment it is passed to a function (it "decays" to a pointer), so \`sizeof\` no longer works there.

## std::array — use this instead

\`\`\`cpp
#include <array>
std::array<int, 5> scores = {88, 92, 79, 100, 65};
\`\`\`

Identical performance, but it knows its \`.size()\`, works with range-for and algorithms, can be copied and returned, and offers \`.at(i)\` which **throws** instead of corrupting memory.

> Rule: fixed size known at compile time → \`std::array\`. Size varies → \`std::vector\` (next step). Raw arrays only when interfacing with C.`,
      sample: {
        lang: 'cpp',
        caption: 'Raw array versus std::array — same speed, far safer',
        code: `#include <array>
#include <iostream>

int main() {
    int raw[5] = {88, 92, 79, 100, 65};
    std::cout << raw[0] << " " << raw[4] << "\\n";
    // raw[5] = 1;   // undefined behaviour — no warning, no error

    std::array<int, 5> scores = {88, 92, 79, 100, 65};

    std::cout << scores.size() << "\\n";
    std::cout << scores.front() << " " << scores.back() << "\\n";

    int total = 0;
    for (int score : scores) total += score;
    std::cout << "Average: " << total / static_cast<double>(scores.size()) << "\\n";

    int highest = scores[0];
    for (std::size_t i = 1; i < scores.size(); ++i) {
        if (scores[i] > highest) highest = scores[i];
    }
    std::cout << "Highest: " << highest << "\\n";

    try {
        std::cout << scores.at(10) << "\\n";   // checked: throws
    } catch (const std::out_of_range& e) {
        std::cout << "Caught: " << e.what() << "\\n";
    }

    std::array<std::array<int, 3>, 2> grid = {{{1, 2, 3}, {4, 5, 6}}};
    for (const auto& row : grid) {
        for (int cell : row) std::cout << cell << " ";
        std::cout << "\\n";
    }

    return 0;
}`,
        output: `88 65
5
88 65
Average: 84.8
Highest: 100
Caught: array::at: __n (which is 10) >= _Nm (which is 5)
1 2 3
4 5 6 `,
      },
      question: {
        kind: 'mcq',
        prompt: 'What happens when you write `scores[10]` on a 5-element C-style array?',
        options: [
          'The program throws an exception',
          'The compiler refuses to build it',
          'Undefined behaviour — it reads or writes unrelated memory, and may crash, corrupt data or appear to work',
          'It wraps around to index 0',
        ],
        answer: 2,
        explain:
          'Raw arrays perform no bounds checking; `scores[10]` is just an address calculation. The result is undefined behaviour, and the worst outcome is that it *seems* to work while quietly corrupting something — which is why `std::array::at()` and `std::vector::at()` exist.',
        hint: 'Does C++ check the index for you?',
      },
    },

    {
      id: 'cpp-a-08',
      title: 'std::vector — your default container',
      read: `A \`std::vector\` is an array that **grows**. It is the container you should reach for unless you have a specific reason not to.

\`\`\`cpp
#include <vector>
std::vector<int> scores;           // empty
std::vector<int> primes = {2, 3, 5, 7};
std::vector<int> zeros(10, 0);     // ten zeros
\`\`\`

The \`<int>\` is a **template argument** — the type of the elements.

## The interface

- \`.push_back(x)\` — add to the end
- \`.pop_back()\` — remove the last
- \`.size()\`, \`.empty()\`, \`.clear()\`
- \`v[i]\` — unchecked, fast · \`v.at(i)\` — checked, throws
- \`.front()\`, \`.back()\`
- \`.begin()\`, \`.end()\` — for algorithms

## How it grows

A vector keeps a contiguous block of memory. When it fills up it allocates a bigger block (typically double) and moves everything across. Amortised, \`push_back\` is O(1).

If you know roughly how many items are coming, \`.reserve(n)\` allocates once and avoids all the reallocation.

## The reference-invalidation trap

Adding elements can move the whole buffer, so any pointer, reference or iterator into the vector may become **dangling**. Never hold a reference to an element across a \`push_back\`.

## size() is unsigned

\`.size()\` returns \`std::size_t\`, an unsigned type. \`for (int i = 0; i < v.size(); ++i)\` produces a signed/unsigned warning, and \`v.size() - 1\` on an empty vector wraps round to a gigantic number. Use \`std::size_t\` or range-for.`,
      sample: {
        lang: 'cpp',
        caption: 'Growing, reserving, iterating and removing',
        code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> scores;
    scores.reserve(4);               // one allocation instead of several

    scores.push_back(88);
    scores.push_back(92);
    scores.push_back(79);

    std::cout << "size " << scores.size()
              << ", capacity " << scores.capacity() << "\\n";

    for (int s : scores) std::cout << s << " ";
    std::cout << "\\n";

    scores.pop_back();
    std::cout << "after pop_back: " << scores.size() << "\\n";

    // algorithms work on any vector
    std::sort(scores.begin(), scores.end());
    std::cout << "lowest " << scores.front()
              << ", highest " << scores.back() << "\\n";

    int total = 0;
    for (int s : scores) total += s;
    std::cout << "average " << total / static_cast<double>(scores.size()) << "\\n";

    // vectors of anything, including other vectors
    std::vector<std::vector<int>> grid(3, std::vector<int>(4, 0));
    grid[1][2] = 7;
    for (const auto& row : grid) {
        for (int cell : row) std::cout << cell << " ";
        std::cout << "\\n";
    }

    if (!scores.empty()) scores.clear();
    std::cout << std::boolalpha << scores.empty() << "\\n";

    return 0;
}`,
        output: `size 3, capacity 4
88 92 79
after pop_back: 2
lowest 88, highest 92
average 90
0 0 0 0
0 0 7 0
0 0 0 0
true`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You take `int& first = v[0];`, then call `v.push_back(42)`, then use `first`. What is the danger?',
        options: [
          'None — references always stay valid',
          '`push_back` may reallocate the vector\'s buffer, leaving `first` pointing at freed memory',
          '`first` will silently refer to the new element',
          'The vector becomes read-only',
        ],
        answer: 1,
        explain:
          'A vector holds one contiguous block. When it outgrows it, it allocates a larger block, moves the elements and frees the old one — invalidating every pointer, reference and iterator into it. Using `first` afterwards is undefined behaviour, and it often appears to work until the day the capacity happens to be exceeded.',
        hint: 'What has to happen when the vector runs out of capacity?',
      },
    },

    {
      id: 'cpp-a-09',
      title: 'std::string in depth',
      read: `\`std::string\` is a vector of characters with text-specific operations. \`#include <string>\`.

## The essentials

- \`.size()\` / \`.length()\` — identical
- \`.empty()\`, \`.clear()\`
- \`s[i]\` / \`s.at(i)\` — one \`char\`
- \`+\` and \`+=\` — concatenate
- \`.substr(pos, count)\` — a piece
- \`.find("x")\` — position, or \`std::string::npos\` if absent
- \`.replace()\`, \`.insert()\`, \`.erase()\`
- \`==\`, \`<\` — compare (lexicographic, case-sensitive)

## The npos check

\`.find\` returns \`std::string::npos\` when there is no match — a huge unsigned value, **not** -1 in any useful sense. Always compare against \`npos\`:

\`\`\`cpp
if (text.find("cat") != std::string::npos)
\`\`\`

## Conversions

\`std::stoi(s)\`, \`std::stod(s)\` — text to number, throwing \`std::invalid_argument\` on failure. \`std::to_string(n)\` — number to text.

## Characters

\`<cctype>\` gives \`std::isdigit\`, \`std::isalpha\`, \`std::toupper\`, \`std::tolower\`.

## string_view

\`std::string_view\` is a non-owning view of existing characters. Taking a \`std::string_view\` parameter instead of \`const std::string&\` avoids a copy when the caller passes a string literal. Never keep one alive longer than the string it points into.`,
      sample: {
        lang: 'cpp',
        caption: 'Searching, slicing, converting and transforming',
        code: `#include <algorithm>
#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string text = "the quick brown fox";

    std::cout << text.size() << "\\n";
    std::cout << text.substr(4, 5) << "\\n";

    std::size_t where = text.find("brown");
    if (where != std::string::npos) {
        std::cout << "found at " << where << "\\n";
    }

    if (text.find("cat") == std::string::npos) {
        std::cout << "no cat here\\n";
    }

    std::string upper = text;
    std::transform(upper.begin(), upper.end(), upper.begin(),
                   [](unsigned char c) { return std::toupper(c); });
    std::cout << upper << "\\n";

    std::string greeting = "Hello";
    greeting += ", world";
    greeting += '!';
    std::cout << greeting << "\\n";

    int count = 0;
    for (char c : text) if (c == ' ') ++count;
    std::cout << "words: " << count + 1 << "\\n";

    std::string numberText = "42";
    int n = std::stoi(numberText);
    std::cout << n * 2 << "\\n";
    std::cout << "n is " + std::to_string(n) << "\\n";

    std::string padded = "   trim me   ";
    padded.erase(0, padded.find_first_not_of(" \\t"));
    padded.erase(padded.find_last_not_of(" \\t") + 1);
    std::cout << "[" << padded << "]\\n";

    return 0;
}`,
        output: `19
quick
found at 10
no cat here
THE QUICK BROWN FOX
Hello, world!
words: 4
84
n is 42
[trim me]`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `text.find("cat")` return when "cat" is not present?',
        options: [
          '`-1`',
          '`0`',
          '`std::string::npos`, a very large unsigned value you must compare against explicitly',
          'It throws an exception',
        ],
        answer: 2,
        explain:
          '`npos` is the largest value of `std::size_t`. Because the return type is unsigned, testing `if (pos >= 0)` is always true and `if (pos == -1)` only works by accident of conversion. Always write `!= std::string::npos`.',
        hint: 'The return type is unsigned, so it cannot be negative.',
      },
    },

    {
      id: 'cpp-a-10',
      title: 'A first look at algorithms',
      read: `\`<algorithm>\` contains ready-made, well-tested implementations of the loops you would otherwise write by hand.

\`\`\`cpp
std::sort(v.begin(), v.end());
\`\`\`

They take a **range** — a beginning and an end — rather than a container, which is why the same function works on vectors, arrays and strings.

## The ones worth knowing now

- \`std::sort\` — sorts in place
- \`std::find(b, e, value)\` — returns an iterator, or \`end()\` if absent
- \`std::count(b, e, value)\`
- \`std::max_element\` / \`std::min_element\` — return iterators, so dereference with \`*\`
- \`std::reverse\`, \`std::accumulate\` (in \`<numeric>\`)
- \`std::any_of\`, \`std::all_of\`, \`std::none_of\`

## Lambdas

Many algorithms take a small function. A **lambda** defines one inline:

\`\`\`cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
\`\`\`

\`[]\` is the capture list (empty here), then parameters, then the body. It is an ordinary function object, just written where it is used.

## Why prefer them

They say *what* you are doing rather than *how*, they cannot have off-by-one errors, and they are often faster than a hand-written loop because the implementation is specialised and heavily optimised.

> C++20 adds \`std::ranges::sort(v)\` — same thing, no \`.begin()\`/\`.end()\`.`,
      sample: {
        lang: 'cpp',
        caption: 'Hand-written loop versus the algorithm, then lambdas',
        code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

int main() {
    std::vector<int> scores = {88, 92, 79, 100, 65};

    std::sort(scores.begin(), scores.end());
    for (int s : scores) std::cout << s << " ";
    std::cout << "\\n";

    std::sort(scores.begin(), scores.end(),
              [](int a, int b) { return a > b; });      // descending
    for (int s : scores) std::cout << s << " ";
    std::cout << "\\n";

    auto found = std::find(scores.begin(), scores.end(), 79);
    if (found != scores.end()) {
        std::cout << "found 79 at index "
                  << std::distance(scores.begin(), found) << "\\n";
    }

    std::cout << "max " << *std::max_element(scores.begin(), scores.end()) << "\\n";
    std::cout << "sum " << std::accumulate(scores.begin(), scores.end(), 0) << "\\n";

    int passes = std::count_if(scores.begin(), scores.end(),
                               [](int s) { return s >= 80; });
    std::cout << "passes " << passes << "\\n";

    bool anyPerfect = std::any_of(scores.begin(), scores.end(),
                                  [](int s) { return s == 100; });
    std::cout << std::boolalpha << anyPerfect << "\\n";

    std::vector<std::string> names = {"charlie", "alice", "bob"};
    std::sort(names.begin(), names.end());
    for (const auto& n : names) std::cout << n << " ";
    std::cout << "\\n";

    return 0;
}`,
        output: `65 79 88 92 100
100 92 88 79 65
found 79 at index 3
max 100
sum 424
passes 3
true
alice bob charlie `,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `std::find` return when the value is not in the range?',
        options: [
          '`nullptr`',
          '`-1`',
          'The end iterator — which you must compare against before dereferencing',
          'It throws',
        ],
        answer: 2,
        explain:
          '`end()` is one past the last element and is not dereferenceable. That is why every `find` is followed by `if (it != v.end())`. Dereferencing the end iterator is undefined behaviour.',
        hint: 'It has to return an iterator either way.',
      },
    },

    {
      id: 'cpp-a-11',
      title: 'Random numbers and the standard library',
      read: `## Do not use rand()

\`rand() % 6\` is the classic approach and it has real problems: poor statistical quality, and the modulo skews the distribution unless the range divides evenly.

## The modern way

\`\`\`cpp
#include <random>

std::random_device seed;
std::mt19937 engine(seed());
std::uniform_int_distribution<int> die(1, 6);

int roll = die(engine);
\`\`\`

- \`random_device\` provides a non-deterministic seed
- \`mt19937\` is the Mersenne Twister generator
- the **distribution** shapes the output into the range you asked for, evenly

Create the engine **once** (often \`static\` in a function) and reuse it. Creating one per call is slow and can produce repeats.

For reproducible results — tests, procedural generation — use a fixed seed: \`std::mt19937 engine(12345);\`.

## Other headers worth knowing

- \`<cmath>\` — \`sqrt\`, \`pow\`, \`abs\`, \`floor\`, \`ceil\`, \`round\`, trig
- \`<numeric>\` — \`accumulate\`, \`iota\`
- \`<chrono>\` — time and durations
- \`<fstream>\` — file input/output
- \`<optional>\` — a value that might not be there

> Before writing a utility, check whether the standard library already has it. It usually does, and it is better tested than yours.`,
      sample: {
        lang: 'cpp',
        caption: 'Proper randomness, plus a few standard-library staples',
        code: `#include <algorithm>
#include <chrono>
#include <cmath>
#include <iostream>
#include <random>
#include <vector>

int rollDie() {
    static std::mt19937 engine(std::random_device{}());   // created once
    static std::uniform_int_distribution<int> die(1, 6);
    return die(engine);
}

int main() {
    std::vector<int> counts(7, 0);
    for (int i = 0; i < 6000; ++i) {
        ++counts[rollDie()];
    }
    for (int face = 1; face <= 6; ++face) {
        std::cout << face << ": " << counts[face] << "\\n";
    }

    std::vector<int> deck(10);
    std::iota(deck.begin(), deck.end(), 1);        // fill 1..10
    std::mt19937 engine(42);                       // fixed seed: reproducible
    std::shuffle(deck.begin(), deck.end(), engine);
    for (int card : deck) std::cout << card << " ";
    std::cout << "\\n";

    std::cout << std::sqrt(144.0) << " "
              << std::pow(2.0, 10.0) << " "
              << std::round(4.6) << "\\n";

    auto start = std::chrono::steady_clock::now();
    long long sum = 0;
    for (int i = 0; i < 10000000; ++i) sum += i;
    auto elapsed = std::chrono::steady_clock::now() - start;
    std::cout << "took "
              << std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count()
              << " ms\\n";

    return 0;
}`,
        output: `1: 1012
2: 981
3: 1024
4: 993
5: 1007
6: 983
4 8 1 10 6 3 9 2 7 5
12 1024 5
took 8 ms`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why make the `std::mt19937` engine `static` inside `rollDie()`?',
        options: [
          'It makes the numbers more random',
          'So it is created and seeded once and then advances across calls — creating a new engine each time is slow and can return the same value repeatedly',
          '`static` is required for random engines',
          'To make it thread-safe',
        ],
        answer: 1,
        explain:
          'A generator produces a *sequence*; the engine holds the position in it. Constructing and seeding a fresh one per call is expensive, and if two calls land in the same clock tick they can seed identically and return identical values — the classic "my dice keep rolling the same number" bug.',
        hint: 'What does the engine hold between calls?',
      },
    },

    {
      id: 'cpp-a-12',
      title: 'Project: a number-guessing game with statistics',
      read: `Everything from this level: loops, functions, a vector, string handling, random numbers and algorithms.

The design:

1. \`randomTarget()\` — one job, uses a static engine
2. \`playRound()\` — plays one game and **returns** the number of guesses. It does not print statistics; that is not its job.
3. \`readGuess()\` — handles input validation, reused for every guess
4. \`main()\` — runs rounds, collects the results in a \`std::vector<int>\`, and reports at the end

Notice the separation: each function does one thing and returns a value. That is what makes the statistics at the end trivial to add — \`playRound\` already hands back exactly the number the summary needs.

> Extend it: add difficulty levels that change the range, cap the number of guesses, or save the best score to a file (you will learn files in the next level).`,
      sample: {
        lang: 'cpp',
        caption: 'Small functions that return values, composed in main',
        code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <limits>
#include <numeric>
#include <random>
#include <string>
#include <vector>

int randomTarget(int low, int high) {
    static std::mt19937 engine(std::random_device{}());
    std::uniform_int_distribution<int> range(low, high);
    return range(engine);
}

int readGuess(int low, int high) {
    int guess = 0;
    while (true) {
        std::cout << "Your guess (" << low << "-" << high << "): ";
        if (std::cin >> guess && guess >= low && guess <= high) {
            return guess;
        }
        std::cin.clear();
        std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\\n');
        std::cout << "Numbers between " << low << " and " << high << " only.\\n";
    }
}

// plays one round and returns how many guesses it took
int playRound(int low, int high) {
    const int target = randomTarget(low, high);
    int attempts = 0;

    while (true) {
        const int guess = readGuess(low, high);
        ++attempts;

        if (guess < target) {
            std::cout << "Too low.\\n";
        } else if (guess > target) {
            std::cout << "Too high.\\n";
        } else {
            std::cout << "Correct in " << attempts << " guesses!\\n";
            return attempts;
        }
    }
}

int main() {
    const int kLow = 1;
    const int kHigh = 100;
    std::vector<int> results;

    std::string again = "y";
    while (again == "y" || again == "Y") {
        std::cout << "\\n--- New round ---\\n";
        results.push_back(playRound(kLow, kHigh));

        std::cout << "Play again? (y/n) ";
        std::cin >> again;
    }

    if (results.empty()) {
        std::cout << "No rounds played.\\n";
        return 0;
    }

    const int total = std::accumulate(results.begin(), results.end(), 0);
    const int best = *std::min_element(results.begin(), results.end());
    const int worst = *std::max_element(results.begin(), results.end());

    std::cout << std::fixed << std::setprecision(1);
    std::cout << "\\nRounds played: " << results.size() << "\\n";
    std::cout << "Best:          " << best << " guesses\\n";
    std::cout << "Worst:         " << worst << " guesses\\n";
    std::cout << "Average:       "
              << total / static_cast<double>(results.size()) << " guesses\\n";

    return 0;
}`,
        output: `--- New round ---
Your guess (1-100): 50
Too high.
Your guess (1-100): 25
Too low.
Your guess (1-100): 37
Correct in 3 guesses!
Play again? (y/n) n

Rounds played: 1
Best:          3 guesses
Worst:         3 guesses
Average:       3.0 guesses`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does `playRound` **return** the number of guesses rather than printing the statistics itself?',
        options: [
          'Returning is faster than printing',
          'It keeps one job per function: `playRound` plays, `main` decides what to do with the result — which is what makes adding the summary (and testing the function) easy',
          'Functions cannot print',
          '`main` cannot call a void function',
        ],
        answer: 1,
        explain:
          'Because the number comes back as a value, `main` can collect a vector of them and compute best, worst and average with three standard algorithms. Had `playRound` printed its own summary, aggregating across rounds would have meant restructuring it — and it could not be tested without capturing console output.',
        hint: 'How would you compute the average if the function only printed?',
      },
    },
  ],
}

export default level
