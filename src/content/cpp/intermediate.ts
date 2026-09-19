import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Memory, structs and classes',
  summary:
    'The heart of C++: references and pointers, the stack and the heap, your own types with structs and classes, constructors and destructors, multi-file projects and the associative containers.',
  outcomes: [
    'Use references and pointers correctly, and know when to use which',
    'Explain the stack, the heap and object lifetime',
    'Design structs and classes with constructors and destructors',
    'Split a program across headers and source files',
    'Use std::map, std::set and the algorithms with them',
    'Handle errors with exceptions and std::optional',
  ],
  steps: [
    {
      id: 'cpp-i-01',
      title: 'The stack and the heap',
      read: `Every program gets two kinds of memory, and understanding the difference explains most of C++.

## The stack

Local variables live here. It works like a stack of plates: entering a function pushes a frame, leaving pops it.

- **Very fast** — allocating is just moving a pointer
- **Automatic** — destroyed at the closing brace, guaranteed, in reverse order of creation
- **Small** — typically 1–8 MB total
- Size must be known at compile time

## The heap

A large pool you request memory from explicitly, with \`new\` (or, better, through containers).

- **Big** — limited by available RAM
- **Flexible** — size decided at runtime, lifetime under your control
- **Slower** to allocate
- **Yours to free.** Forget and you leak; free twice and you corrupt the heap.

## Where your data actually lives

\`\`\`cpp
std::vector<int> v;      // the vector OBJECT is on the stack
v.push_back(1);          // its ELEMENTS are on the heap
\`\`\`

That is the pattern for every standard container: a small stack object managing a heap buffer, and its destructor frees that buffer automatically. This is **RAII**, and it is why well-written modern C++ contains almost no \`new\` or \`delete\`.

## Why it matters

A 10-million-element array cannot go on the stack — it overflows. A \`std::vector\` handles it without you thinking about it.`,
      sample: {
        lang: 'cpp',
        caption: 'Watch where each thing lives, and when it dies',
        code: `#include <iostream>
#include <string>
#include <vector>

struct Noisy {
    std::string name;
    Noisy(std::string n) : name(std::move(n)) {
        std::cout << "  + " << name << " created\\n";
    }
    ~Noisy() {
        std::cout << "  - " << name << " destroyed\\n";
    }
};

void demo() {
    std::cout << "entering demo()\\n";
    Noisy a("a");                 // stack
    {
        Noisy b("b");             // stack, inner scope
        std::cout << "  inner block ending\\n";
    }                             // b destroyed here
    std::cout << "leaving demo()\\n";
}                                 // a destroyed here

int main() {
    demo();

    std::vector<int> big;         // object on the stack...
    big.resize(10'000'000);       // ...ten million ints on the heap
    std::cout << "vector holds " << big.size() << " ints\\n";

    // int huge[10'000'000];      // would very likely overflow the stack

    return 0;                     // big's destructor frees the heap buffer
}`,
        output: `entering demo()
  + a created
  + b created
  inner block ending
  - b destroyed
leaving demo()
  - a destroyed
vector holds 10000000 ints`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'For a `std::vector<int>` holding a million values, where does the vector object live and where do the elements live?',
        options: [
          'Both on the stack',
          'Both on the heap',
          'The small vector object is on the stack; its million elements are in a heap buffer it owns',
          'It depends on the compiler',
        ],
        answer: 2,
        explain:
          'The vector object itself is three pointers — tiny, and it sits wherever you declared it. The data goes on the heap, and the vector\'s destructor frees it automatically when the object goes out of scope. That split is what lets you have huge containers as ordinary local variables.',
        hint: 'How big is a vector object itself, regardless of how much it holds?',
      },
    },

    {
      id: 'cpp-i-02',
      title: 'References',
      read: `A **reference** is another name for an existing object.

\`\`\`cpp
int score = 10;
int& alias = score;
alias = 20;
std::cout << score;    // 20
\`\`\`

There is only one integer here. \`alias\` is not a copy and not a pointer — it *is* \`score\`, under a second name.

## The rules

- A reference **must** be initialised when declared — there is no null reference
- It can never be rebound to refer to something else
- Using it needs no special syntax: it behaves exactly like the original

## What they are for

**1. Modifying a caller's variable**

\`\`\`cpp
void addOne(int& n) { ++n; }
\`\`\`

**2. Avoiding copies** — the important one

\`\`\`cpp
void print(const std::string& text);
\`\`\`

**3. In range-for loops**

\`\`\`cpp
for (auto& item : items)          // can modify
for (const auto& item : items)    // no copy, read only
for (auto item : items)           // COPIES each element
\`\`\`

That last one silently copies every element. On a \`vector<std::string>\` that is a heap allocation per iteration. **\`const auto&\` should be your default.**

## The one real danger

Never return a reference to a local variable. It is destroyed when the function returns, and the reference dangles.`,
      sample: {
        lang: 'cpp',
        caption: 'References that modify, and the copy you did not mean to make',
        code: `#include <iostream>
#include <string>
#include <vector>

void addBonus(int& score, int bonus) { score += bonus; }
void swapValues(int& a, int& b) { int tmp = a; a = b; b = tmp; }

int main() {
    int score = 90;
    addBonus(score, 5);
    std::cout << score << "\\n";

    int x = 1, y = 2;
    swapValues(x, y);
    std::cout << x << " " << y << "\\n";

    std::vector<std::string> words = {"alpha", "beta", "gamma"};

    for (auto word : words) {          // COPIES every string
        word += "!";                   // modifies the copy
    }
    for (const auto& w : words) std::cout << w << " ";
    std::cout << "\\n";

    for (auto& word : words) {         // reference: modifies the real thing
        word += "!";
    }
    for (const auto& w : words) std::cout << w << " ";
    std::cout << "\\n";

    const std::string& first = words.front();   // no copy, read-only
    std::cout << first << "\\n";

    return 0;
}`,
        output: `95
2 1
alpha beta gamma
alpha! beta! gamma!
alpha! `,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In `for (auto word : words)` over a `std::vector<std::string>`, what happens on each pass?',
        options: [
          '`word` refers to the element directly',
          'The element is copied into `word`, so modifying `word` leaves the vector unchanged — and each copy allocates',
          'The vector is emptied as you go',
          'It is a compile error',
        ],
        answer: 1,
        explain:
          '`auto` deduces `std::string` (a value), so each element is copied. Modifications are lost and every pass may allocate memory. Use `const auto&` to read and `auto&` to modify — a one-character habit that eliminates a whole class of waste.',
        hint: 'Is there an `&` in the loop variable?',
      },
    },

    {
      id: 'cpp-i-03',
      title: 'Pointers',
      read: `A **pointer** holds a memory **address**.

\`\`\`cpp
int score = 10;
int* p = &score;      // p holds the address of score
std::cout << *p;      // 10 — dereference to read the value
*p = 20;              // writes through the pointer
\`\`\`

Two operators:
- \`&x\` — **address-of**: where does x live?
- \`*p\` — **dereference**: what is at that address?

(Confusingly, \`&\` in a *declaration* means reference, and in an *expression* means address-of. Context decides.)

## Pointer vs reference

- A reference must be initialised; a pointer can be \`nullptr\`
- A reference cannot be rebound; a pointer can point somewhere else
- A reference needs no \`*\`; a pointer must be dereferenced
- A reference is always valid (if used correctly); a pointer must be checked

**Use a reference unless you need "might be absent" or "can change target".**

## nullptr

\`nullptr\` means "points at nothing". Dereferencing it is undefined behaviour — usually a crash. Always check before dereferencing a pointer that could be null.

## Pointers and arrays

An array name converts to a pointer to its first element, and \`p + 1\` moves forward by one **element**, not one byte. That is pointer arithmetic, and it is how C-style arrays work underneath.

## The modern position

Raw pointers are still correct for *observing* something you do not own. For *owning* memory, use containers and smart pointers (next level) — never raw \`new\`/\`delete\` in ordinary code.`,
      sample: {
        lang: 'cpp',
        caption: 'Addresses, dereferencing, null checks and arithmetic',
        code: `#include <iostream>
#include <vector>

// nullptr means "no result" — a valid use for a raw pointer
int* findFirstNegative(std::vector<int>& values) {
    for (int& v : values) {
        if (v < 0) return &v;
    }
    return nullptr;
}

int main() {
    int score = 10;
    int* p = &score;

    std::cout << "value:   " << score << "\\n";
    std::cout << "via ptr: " << *p << "\\n";
    std::cout << "address: " << p << "\\n";

    *p = 20;
    std::cout << "score is now " << score << "\\n";

    int* nothing = nullptr;
    if (nothing == nullptr) std::cout << "points at nothing\\n";
    // std::cout << *nothing;   // undefined behaviour: crash

    std::vector<int> data = {5, -3, 8};
    if (int* found = findFirstNegative(data)) {
        std::cout << "first negative: " << *found << "\\n";
        *found = 0;                       // writes back into the vector
    }
    for (int v : data) std::cout << v << " ";
    std::cout << "\\n";

    int numbers[4] = {10, 20, 30, 40};
    int* start = numbers;
    std::cout << *start << " " << *(start + 2) << "\\n";   // 10 30
    std::cout << sizeof(int) << " bytes per step\\n";

    return 0;
}`,
        output: `value:   10
via ptr: 10
address: 0x7ffd3c2a4b3c
score is now 20
points at nothing
first negative: -3
5 0 8
10 30
4 bytes per step`,
      },
      question: {
        kind: 'mcq',
        prompt: 'When should you prefer a pointer over a reference?',
        options: [
          'Always — pointers are more powerful',
          'When the thing may legitimately be absent (`nullptr`), or when you need to change what it refers to later',
          'When passing large objects',
          'Never; references can do everything',
        ],
        answer: 1,
        explain:
          'A reference cannot be null and cannot be rebound — which are guarantees, not limitations. A pointer buys back those two abilities at the cost of every user having to check for null. Use a reference by default and a pointer when you genuinely need optionality or reseating.',
        hint: 'What can a pointer express that a reference cannot?',
      },
    },

    {
      id: 'cpp-i-04',
      title: 'new, delete, and why you should avoid them',
      read: `\`new\` allocates on the heap and returns a pointer; \`delete\` frees it.

\`\`\`cpp
int* p = new int(42);
delete p;
p = nullptr;
\`\`\`

For arrays it is \`new[]\` and \`delete[]\` — and mixing them up is undefined behaviour.

## What goes wrong

1. **Memory leak** — you forget \`delete\`. The memory is never returned. A long-running program slowly eats the machine.
2. **Double free** — \`delete\` twice. Heap corruption.
3. **Dangling pointer** — using a pointer after deleting it.
4. **Leak on an early return or exception** — the \`delete\` at the bottom of the function is simply skipped. This is the killer: even careful code leaks when something throws.

## RAII: the answer

*Resource Acquisition Is Initialisation.* Wrap the resource in an object whose **destructor** releases it. Because destructors run automatically — including while an exception unwinds the stack — the resource cannot leak.

Every standard container already does this. So do \`std::unique_ptr\` and \`std::shared_ptr\` (next level), and \`std::fstream\` for files.

## The modern rule

> In application code you should almost never write \`new\` or \`delete\`. Use \`std::vector\`, \`std::string\` and smart pointers, and the problem disappears rather than being managed.

Learn the manual version anyway — you will read older code, and understanding what RAII replaces is what makes it obvious why it is better.`,
      sample: {
        lang: 'cpp',
        caption: 'The manual version leaks; RAII cannot',
        code: `#include <iostream>
#include <memory>
#include <stdexcept>
#include <vector>

void manual(bool fail) {
    int* buffer = new int[1000];
    buffer[0] = 42;

    if (fail) {
        throw std::runtime_error("something went wrong");
        // delete[] never runs — 4000 bytes leaked
    }

    std::cout << "manual ok: " << buffer[0] << "\\n";
    delete[] buffer;
}

void raii(bool fail) {
    std::vector<int> buffer(1000);     // owns its memory
    buffer[0] = 42;

    if (fail) {
        throw std::runtime_error("something went wrong");
        // buffer's destructor still runs as the stack unwinds
    }

    std::cout << "raii ok: " << buffer[0] << "\\n";
}

int main() {
    manual(false);
    raii(false);

    try { manual(true); } catch (const std::exception& e) {
        std::cout << "leaked: " << e.what() << "\\n";
    }
    try { raii(true); } catch (const std::exception& e) {
        std::cout << "clean:  " << e.what() << "\\n";
    }

    auto owned = std::make_unique<int>(7);    // deleted automatically
    std::cout << *owned << "\\n";

    return 0;
}`,
        output: `manual ok: 42
raii ok: 42
leaked: something went wrong
clean:  something went wrong
7`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A function calls `new`, then throws an exception before reaching its `delete`. What happens to the memory?',
        options: [
          'The compiler inserts the delete automatically',
          'It is leaked — the `delete` statement is skipped as the stack unwinds, and nothing else knows about that allocation',
          'The exception handler frees it',
          'The operating system frees it immediately',
        ],
        answer: 1,
        explain:
          'Stack unwinding runs *destructors*, not arbitrary statements. A raw pointer has no destructor, so the allocation is orphaned. An object that owns the memory — a vector, a `unique_ptr` — does have one, and it runs during unwinding. That is the entire argument for RAII.',
        hint: 'What does stack unwinding actually run?',
      },
    },

    {
      id: 'cpp-i-05',
      title: 'structs: grouping related data',
      read: `A \`struct\` bundles related values into one type.

\`\`\`cpp
struct Point {
    double x = 0.0;
    double y = 0.0;
};

Point p{3.0, 4.0};
std::cout << p.x;
\`\`\`

## Why bother

Compare:

\`\`\`cpp
void draw(double x1, double y1, double x2, double y2, double r, double g, double b);
draw(rectangle);
\`\`\`

The first can be called with the arguments in the wrong order and still compile. The second cannot. Grouping data that belongs together removes whole categories of bug, and the code reads like the problem domain.

## Default member initialisers

\`double x = 0.0;\` inside the struct guarantees a sensible value even if the caller forgets. **Always give members defaults** — it makes the uninitialised-garbage problem impossible.

## Structs can have functions

\`\`\`cpp
struct Rectangle {
    double width = 0, height = 0;
    double area() const { return width * height; }
};
\`\`\`

The trailing \`const\` promises the function does not modify the object, so it can be called on a \`const Rectangle\`. **Mark every read-only member function \`const\`.**

## struct or class?

Technically identical except for the default access level: \`struct\` members are public, \`class\` members are private. By convention: \`struct\` for plain data bundles, \`class\` when there are invariants to protect.`,
      sample: {
        lang: 'cpp',
        caption: 'Grouped data, member functions, and structs inside structs',
        code: `#include <cmath>
#include <iostream>
#include <string>
#include <vector>

struct Point {
    double x = 0.0;
    double y = 0.0;

    double distanceTo(const Point& other) const {
        const double dx = x - other.x;
        const double dy = y - other.y;
        return std::sqrt(dx * dx + dy * dy);
    }
};

struct Rectangle {
    Point topLeft;
    double width = 0.0;
    double height = 0.0;

    double area() const { return width * height; }
    bool contains(const Point& p) const {
        return p.x >= topLeft.x && p.x <= topLeft.x + width &&
               p.y >= topLeft.y && p.y <= topLeft.y + height;
    }
};

struct Student {
    std::string name;
    int age = 0;
    std::vector<int> grades;

    double average() const {
        if (grades.empty()) return 0.0;
        int total = 0;
        for (int g : grades) total += g;
        return static_cast<double>(total) / grades.size();
    }
};

int main() {
    Point a{0.0, 0.0};
    Point b{3.0, 4.0};
    std::cout << a.distanceTo(b) << "\\n";

    Rectangle box{{0.0, 0.0}, 10.0, 5.0};
    std::cout << box.area() << "\\n";
    std::cout << std::boolalpha << box.contains(b) << "\\n";

    std::vector<Student> students = {
        {"Ada", 36, {90, 95, 100}},
        {"Alan", 41, {80, 85}},
    };
    for (const auto& s : students) {
        std::cout << s.name << ": " << s.average() << "\\n";
    }

    return 0;
}`,
        output: `5
50
true
Ada: 95
Alan: 82.5`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does the trailing `const` in `double area() const;` promise?',
        options: [
          'The return value cannot be changed',
          'The function does not modify the object it is called on — so it can be called on a `const Rectangle`',
          'The function can only be called once',
          'The parameters are constant',
        ],
        answer: 1,
        explain:
          'It applies to the implicit `this`. The compiler enforces it, so the promise cannot silently break. Without it, the function cannot be called on a const object or through a const reference — which is exactly how you pass things around, so forgetting it causes errors far from the class.',
        hint: 'What is being marked const — the return value, or the object?',
      },
    },

    {
      id: 'cpp-i-06',
      title: 'Classes: data with rules',
      read: `A \`class\` is a struct with a different default: members are **private** unless you say otherwise.

\`\`\`cpp
class BankAccount {
private:
    double balance_ = 0.0;

public:
    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("must be positive");
        balance_ += amount;
    }
    double balance() const { return balance_; }
};
\`\`\`

## Why hide the data

Because now \`balance_\` can **only** change through \`deposit\` and \`withdraw\`, which enforce the rules. Make it public and any line in the program can set it to −5000.

That rule — *"a balance is never negative"* — is an **invariant**: something true of every valid object. The point of a class is to make invariants impossible to break.

## Interface vs implementation

Public members are the promise you make to users. Private members are how you keep it, and you are free to change them later without breaking anyone. That freedom is the whole value of encapsulation.

## Conventions

- Private members with a trailing underscore (\`balance_\`) or leading \`m_\`
- Getters named for the thing (\`balance()\`, not \`getBalance()\`) and marked \`const\`
- Do not write a getter and setter for every field — that is a public field with extra steps. Expose **operations**, not fields.`,
      sample: {
        lang: 'cpp',
        caption: 'An invariant the type makes impossible to break',
        code: `#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

class BankAccount {
private:
    std::string owner_;
    double balance_ = 0.0;
    std::vector<std::string> history_;

public:
    BankAccount(std::string owner, double opening = 0.0)
        : owner_(std::move(owner)), balance_(opening) {
        if (opening < 0) throw std::invalid_argument("opening balance < 0");
        history_.push_back("opened with " + std::to_string(opening));
    }

    void deposit(double amount) {
        if (amount <= 0) throw std::invalid_argument("deposit must be positive");
        balance_ += amount;
        history_.push_back("deposit " + std::to_string(amount));
    }

    bool withdraw(double amount) {
        if (amount <= 0) throw std::invalid_argument("withdrawal must be positive");
        if (amount > balance_) return false;       // invariant protected
        balance_ -= amount;
        history_.push_back("withdraw " + std::to_string(amount));
        return true;
    }

    double balance() const { return balance_; }
    const std::string& owner() const { return owner_; }
    const std::vector<std::string>& history() const { return history_; }
};

int main() {
    BankAccount account("Sam", 100.0);
    account.deposit(50.0);

    std::cout << account.owner() << ": " << account.balance() << "\\n";
    std::cout << std::boolalpha << account.withdraw(500.0) << "\\n";
    std::cout << account.balance() << "\\n";

    // account.balance_ = -1000;   // ERROR: 'balance_' is private

    try {
        account.deposit(-10.0);
    } catch (const std::invalid_argument& e) {
        std::cout << "rejected: " << e.what() << "\\n";
    }

    for (const auto& entry : account.history()) std::cout << "  " << entry << "\\n";

    return 0;
}`,
        output: `Sam: 150
false
150
rejected: deposit must be positive
  opened with 100.000000
  deposit 50.000000`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the real benefit of making `balance_` private?',
        options: [
          'It uses less memory',
          'The balance can only change through methods that enforce the rules, so an invalid state is impossible to reach from outside',
          'Private members are faster to access',
          'It is required by the compiler',
        ],
        answer: 1,
        explain:
          'Encapsulation narrows the set of code that can break an invariant from "the whole program" to "this class". When a balance is wrong, there are three functions to inspect, not three hundred lines. It also frees you to change the representation later.',
        hint: 'How many places in the program could set a public field to a nonsense value?',
      },
    },

    {
      id: 'cpp-i-07',
      title: 'Constructors and destructors',
      read: `## Constructors

Run automatically when an object is created. Their job is to establish the invariants.

\`\`\`cpp
class Timer {
public:
    Timer() : start_(now()) {}                    // default
    explicit Timer(std::string label) : label_(std::move(label)) {}
};
\`\`\`

## Member initialiser lists

\`\`\`cpp
Point(double x, double y) : x_(x), y_(y) {}
\`\`\`

The part after \`:\` **initialises** members directly. Assigning inside the body instead means default-constructing and then overwriting — wasteful, and impossible for \`const\` members and references. **Prefer the initialiser list.**

Members initialise in **declaration order**, not the order you write them in the list. \`-Wall\` warns when those differ.

## explicit

A single-argument constructor without \`explicit\` allows silent conversions: \`void f(Timer);\` could then be called as \`f("hello")\`. Mark single-argument constructors \`explicit\` unless you want that.

## Destructors

\`~ClassName()\` runs automatically when the object dies — at the closing brace, when a container holding it is destroyed, or during exception unwinding. That guarantee is what makes RAII work.

You only need to write one if your class directly owns a raw resource. If it holds vectors, strings and smart pointers, the compiler-generated destructor is already correct — this is the **Rule of Zero**, and it is the goal.`,
      sample: {
        lang: 'cpp',
        caption: 'Initialiser lists, explicit, and a destructor doing real work',
        code: `#include <chrono>
#include <iostream>
#include <string>
#include <utility>

class ScopedTimer {
private:
    std::string label_;
    std::chrono::steady_clock::time_point start_;

public:
    explicit ScopedTimer(std::string label)
        : label_(std::move(label)),
          start_(std::chrono::steady_clock::now()) {
        std::cout << "[" << label_ << "] started\\n";
    }

    ~ScopedTimer() {
        const auto elapsed = std::chrono::steady_clock::now() - start_;
        std::cout << "[" << label_ << "] took "
                  << std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count()
                  << " ms\\n";
    }
};

class Temperature {
private:
    double celsius_;              // no default: the constructor must set it

public:
    explicit Temperature(double c) : celsius_(c) {
        if (c < -273.15) throw std::invalid_argument("below absolute zero");
    }
    double celsius() const { return celsius_; }
    double fahrenheit() const { return celsius_ * 9.0 / 5.0 + 32.0; }
};

int main() {
    {
        ScopedTimer timer("loop");        // destructor reports on the way out
        long long sum = 0;
        for (int i = 0; i < 20'000'000; ++i) sum += i;
        std::cout << "sum = " << sum << "\\n";
    }

    Temperature t(21.5);
    std::cout << t.celsius() << "C = " << t.fahrenheit() << "F\\n";

    // Temperature bad = 21.5;   // ERROR: explicit blocks the silent conversion
    return 0;
}`,
        output: `[loop] started
sum = 199999990000000
[loop] took 17 ms
21.5C = 70.7F`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why prefer `Point(double x) : x_(x) {}` over `Point(double x) { x_ = x; }`?',
        options: [
          'It is shorter',
          'The initialiser list constructs the member directly, while the body version default-constructs then assigns — and `const` members and references cannot be assigned at all',
          'The body version does not compile',
          'There is no difference',
        ],
        answer: 1,
        explain:
          'Members are always initialised before the constructor body runs. Assigning in the body therefore means doing the work twice, which is wasted effort for a string or vector — and outright impossible for a `const` member or a reference, which can only ever be initialised.',
        hint: 'What has already happened to the members by the time the body starts?',
      },
    },

    {
      id: 'cpp-i-08',
      title: 'Splitting code across files',
      read: `One file stops working quickly. A C++ project splits into **headers** (\`.h\`) and **source files** (\`.cpp\`).

## The split

- **Header** — *declarations*: what exists. Class definitions, function prototypes, constants, templates.
- **Source** — *definitions*: how it works. The function bodies.

\`\`\`cpp
// point.h
class Point {
public:
    Point(double x, double y);
    double magnitude() const;
private:
    double x_, y_;
};

// point.cpp
#include "point.h"
Point::Point(double x, double y) : x_(x), y_(y) {}
double Point::magnitude() const { return std::sqrt(x_*x_ + y_*y_); }
\`\`\`

\`Point::\` says "this is the Point class's version".

## Include guards

Every header needs protection from being included twice:

\`\`\`cpp
#pragma once
\`\`\`

One line, supported by every real compiler. The traditional alternative is \`#ifndef POINT_H / #define POINT_H / #endif\`.

## Rules for headers

- \`#include "mine.h"\` for your files (quotes), \`<vector>\` for the library (angle brackets)
- **Never** put \`using namespace std;\` in a header — you force it on every file that includes it
- Include as little as possible; forward-declare (\`class Foo;\`) when you only need a pointer or reference

## Building

\`\`\`
g++ -std=c++20 main.cpp point.cpp -o app
\`\`\`

Each \`.cpp\` compiles separately into an object file, then the **linker** joins them. "Undefined reference" almost always means you forgot to list a \`.cpp\` on that line.`,
      sample: {
        lang: 'cpp',
        caption: 'Three files, and the command that builds them',
        code: `// ============ point.h ============
#pragma once
#include <string>

class Point {
public:
    Point(double x, double y);

    double x() const { return x_; }     // small: fine to define inline
    double y() const { return y_; }
    double magnitude() const;           // bigger: defined in the .cpp
    std::string toString() const;

private:
    double x_;
    double y_;
};

// ============ point.cpp ============
#include "point.h"
#include <cmath>
#include <sstream>

Point::Point(double x, double y) : x_(x), y_(y) {}

double Point::magnitude() const {
    return std::sqrt(x_ * x_ + y_ * y_);
}

std::string Point::toString() const {
    std::ostringstream out;
    out << "(" << x_ << ", " << y_ << ")";
    return out.str();
}

// ============ main.cpp ============
#include "point.h"
#include <iostream>

int main() {
    Point p(3.0, 4.0);
    std::cout << p.toString() << " has magnitude " << p.magnitude() << "\\n";
    return 0;
}`,
        output: `$ g++ -std=c++20 -Wall -Wextra main.cpp point.cpp -o app
$ ./app
(3, 4) has magnitude 5

$ g++ main.cpp -o app          # forgot point.cpp
/usr/bin/ld: undefined reference to \`Point::Point(double, double)'
collect2: error: ld returned 1 exit status`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `#pragma once` at the top of a header prevent?',
        options: [
          'The header being edited',
          'The header contents being pasted in more than once per translation unit, which would cause "redefinition" errors',
          'The header being compiled',
          'Circular dependencies between classes',
        ],
        answer: 1,
        explain:
          '`#include` is literal text substitution. Without a guard, a header included via two different paths is pasted twice, and the second copy is a redefinition error. `#pragma once` makes the preprocessor skip it after the first time.',
        hint: 'What does `#include` actually do to the file?',
      },
    },

    {
      id: 'cpp-i-09',
      title: 'Namespaces',
      read: `A **namespace** groups names so they cannot collide.

\`\`\`cpp
namespace physics {
    double gravity() { return 9.81; }
}

physics::gravity();
\`\`\`

The standard library lives in \`std\`, which is why everything is \`std::something\`.

## Why "using namespace std;" is discouraged

You will see it in tutorials. At file scope in a real project it causes real problems:

- \`std::count\`, \`std::distance\`, \`std::size\`, \`std::data\`, \`std::begin\` are all common words. Your own \`count\` variable can silently become ambiguous.
- Which names \`std\` contains changes between standards, so code that compiled last year can break.
- In a header it is forced on everyone who includes it.

Better options:

- Write \`std::\` — it is five characters and it tells the reader where a name comes from
- \`using std::cout;\` for one specific name, in a \`.cpp\` file
- \`using namespace std;\` inside a small function, if you must

## Your own namespaces

Wrap a library in one to avoid clashing with other code. Nest them: \`namespace myapp::net { ... }\`.

## Anonymous namespaces

\`\`\`cpp
namespace { void helper() { ... } }
\`\`\`

Makes a name visible only within that \`.cpp\`. It is the modern replacement for file-scope \`static\`, and it keeps your internal helpers out of the linker's sight.`,
      sample: {
        lang: 'cpp',
        caption: 'Grouping, aliasing, and hiding internal helpers',
        code: `#include <iostream>
#include <string>
#include <vector>

namespace geometry {
    const double kPi = 3.14159265358979;

    double circleArea(double radius) { return kPi * radius * radius; }

    namespace shapes3d {
        double sphereVolume(double radius) {
            return 4.0 / 3.0 * kPi * radius * radius * radius;
        }
    }
}

namespace banking {
    double interest(double amount) { return amount * 0.03; }
}

// visible only inside this .cpp file
namespace {
    std::string internalHelper() { return "not visible to other files"; }
}

// a shorter alias for a deeply nested namespace
namespace s3 = geometry::shapes3d;

int main() {
    std::cout << geometry::circleArea(2.0) << "\\n";
    std::cout << s3::sphereVolume(2.0) << "\\n";
    std::cout << banking::interest(1000.0) << "\\n";
    std::cout << internalHelper() << "\\n";

    using std::cout;          // one specific name, not the whole namespace
    cout << "explicit and safe\\n";

    // a name that would clash with std::count if 'using namespace std' were active
    int count = 5;
    std::vector<int> v = {1, 2, 2, 3};
    cout << count << " " << std::count(v.begin(), v.end(), 2) << "\\n";

    return 0;
}`,
        output: `12.5664
33.5103
30
not visible to other files
explicit and safe
5 2`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `using namespace std;` particularly bad in a header file?',
        options: [
          'It slows compilation',
          'Every file that includes the header inherits it, so you impose the name collisions on all of them with no way to opt out',
          'Headers cannot contain `using`',
          'It prevents include guards from working',
        ],
        answer: 1,
        explain:
          'A header is pasted into every file that includes it, so the `using` leaks throughout the project. A collision then appears in someone else\'s file, far from the cause. In a `.cpp` it is at least confined to that one file.',
        hint: 'What does including a header actually do?',
      },
    },

    {
      id: 'cpp-i-10',
      title: 'Maps, sets and the right container',
      read: `## std::map — key/value pairs

\`\`\`cpp
std::map<std::string, int> ages;
ages["Ada"] = 36;
\`\`\`

Sorted by key, O(log n) lookup, iterates in key order.

**The \`[]\` trap:** \`ages["nobody"]\` **inserts** a default-constructed entry if the key is missing. Merely *checking* with \`[]\` grows the map, and on a \`const map\` it will not compile. Use:
- \`.at(key)\` — throws if absent
- \`.contains(key)\` (C++20) or \`.count(key)\`
- \`.find(key)\` — returns an iterator, \`end()\` if absent

## std::unordered_map

Hash table. O(1) average lookup, **no ordering**. Prefer it when you do not need sorted iteration and the key is hashable.

## std::set / unordered_set

Unique values, no associated data. For membership tests and deduplication.

## Choosing

- Sequence, index access, iterate in order → **vector** (the default)
- Look up by key → **unordered_map**, or **map** if you need sorted order
- "Have I seen this?" → **unordered_set**
- Frequent insert/remove in the middle → **list** or **deque** (rarely)

> Prefer \`vector\` more than feels right. Contiguous memory is so much friendlier to the CPU cache that a linear scan of a small vector often beats a "better" data structure.`,
      sample: {
        lang: 'cpp',
        caption: 'Word counting, safe lookup, and set operations',
        code: `#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::string text = "the cat sat on the mat the end";

    std::unordered_map<std::string, int> counts;
    std::istringstream stream(text);
    std::string word;
    while (stream >> word) {
        ++counts[word];           // [] default-constructs to 0 first: handy here
    }

    std::map<std::string, int> sorted(counts.begin(), counts.end());
    for (const auto& [w, n] : sorted) {        // structured bindings
        std::cout << w << ": " << n << "\\n";
    }

    // safe lookups
    std::cout << sorted.at("cat") << "\\n";
    if (sorted.contains("dog")) {
        std::cout << "dog found\\n";
    } else {
        std::cout << "no dog\\n";
    }

    if (auto it = sorted.find("mat"); it != sorted.end()) {
        std::cout << "mat appears " << it->second << " time(s)\\n";
    }

    std::cout << "size before stray lookup: " << sorted.size() << "\\n";
    sorted["zebra"];                            // oops: inserts zebra = 0
    std::cout << "size after: " << sorted.size() << "\\n";

    std::vector<int> values = {3, 1, 4, 1, 5, 9, 2, 6, 5};
    std::set<int> unique(values.begin(), values.end());
    for (int v : unique) std::cout << v << " ";
    std::cout << "\\n" << unique.size() << " unique of " << values.size() << "\\n";

    return 0;
}`,
        output: `cat: 1
end: 1
mat: 1
on: 1
sat: 1
the: 3
1
no dog
mat appears 1 time(s)
size before stray lookup: 6
size after: 7
1 2 3 4 5 6 9
7 unique of 9`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `myMap["missing"]` do when the key does not exist?',
        options: [
          'Throws `std::out_of_range`',
          'Returns a default value without changing the map',
          'Inserts a new entry with a value-initialised value, growing the map',
          'Returns `nullptr`',
        ],
        answer: 2,
        explain:
          '`operator[]` is defined to insert when absent — convenient for counting (`++counts[word]` starts from 0) and a bug when you only meant to look. Use `.at()`, `.contains()` or `.find()` for read-only access, and note `[]` is not available on a const map at all.',
        hint: 'Why does `++counts[word]` work on a brand-new word?',
      },
    },

    {
      id: 'cpp-i-11',
      title: 'Errors: exceptions and std::optional',
      read: `## Exceptions

\`\`\`cpp
throw std::invalid_argument("age must be positive");

try {
    risky();
} catch (const std::invalid_argument& e) {
    std::cerr << e.what() << "\\n";
} catch (const std::exception& e) {
    std::cerr << "other: " << e.what() << "\\n";
}
\`\`\`

- **Catch by const reference** — catching by value slices derived exceptions
- Order handlers **most specific first**
- \`std::exception\` is the base of the standard hierarchy
- Never let an exception escape a destructor — it terminates the program

## Where exceptions fit

They are for **exceptional** conditions: a file that should exist does not, memory ran out, an invariant was violated. They are not for ordinary control flow — a user typing "abc" into a number prompt is expected, not exceptional.

## std::optional — "maybe a value"

\`\`\`cpp
std::optional<int> parseInt(const std::string& text);

if (auto n = parseInt(input)) {
    use(*n);
}
\`\`\`

This expresses "this might not produce an answer" in the **type**, so the caller cannot forget to check. Far better than returning -1 or setting a global error flag.

\`.value_or(0)\` supplies a default; \`.value()\` throws if empty.

## Choosing

- Cannot possibly continue → **throw**
- "Might legitimately have no answer" → **\`std::optional\`**
- Need a reason for the failure → **\`std::expected\`** (C++23), or an error enum`,
      sample: {
        lang: 'cpp',
        caption: 'Exceptions for the exceptional, optional for the ordinary',
        code: `#include <charconv>
#include <iostream>
#include <optional>
#include <stdexcept>
#include <string>
#include <vector>

// expected to fail sometimes -> optional
std::optional<int> parseInt(const std::string& text) {
    int value = 0;
    const char* begin = text.data();
    const char* end = begin + text.size();
    auto [ptr, ec] = std::from_chars(begin, end, value);
    if (ec != std::errc{} || ptr != end) return std::nullopt;
    return value;
}

// a broken invariant -> exception
double averageOf(const std::vector<int>& values) {
    if (values.empty()) throw std::invalid_argument("cannot average nothing");
    int total = 0;
    for (int v : values) total += v;
    return static_cast<double>(total) / values.size();
}

int main() {
    for (const std::string& input : {"42", "abc", "7x", "-15"}) {
        if (auto parsed = parseInt(input)) {
            std::cout << input << " -> " << *parsed << "\\n";
        } else {
            std::cout << input << " -> not a number\\n";
        }
    }

    std::cout << parseInt("nope").value_or(0) << "\\n";

    try {
        std::cout << averageOf({1, 2, 3}) << "\\n";
        std::cout << averageOf({}) << "\\n";
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << "\\n";
    } catch (const std::exception& e) {
        std::cout << "unexpected: " << e.what() << "\\n";
    }

    return 0;
}`,
        output: `42 -> 42
abc -> not a number
7x -> not a number
-15 -> -15
0
2
error: cannot average nothing`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why return `std::optional<int>` from a parsing function rather than returning -1 on failure?',
        options: [
          'It is faster',
          '-1 is a valid parse result, and a sentinel is easy to forget to check — optional makes "no value" a distinct state the type system forces you to handle',
          'Optionals cannot be ignored',
          'It avoids using exceptions',
        ],
        answer: 1,
        explain:
          'Sentinel values collide with real data (`parseInt("-1")` is legitimately -1), and nothing stops a caller using the result unchecked. `std::optional` makes the empty case a separate state, and reaching the value requires acknowledging it.',
        hint: 'What should `parseInt("-1")` return?',
      },
    },

    {
      id: 'cpp-i-12',
      title: 'Project: an inventory system',
      read: `A multi-file program pulling this level together: classes with invariants, a container of objects, maps for lookup, optional for "might not be there", exceptions for genuine errors, and file I/O for persistence.

The shape:

- **\`Item\`** — a small value type. Validates in its constructor, so an invalid \`Item\` cannot exist.
- **\`Inventory\`** — owns a \`std::map\` keyed by SKU. All mutation goes through methods that maintain the invariants.
- **\`find\`** returns \`std::optional\`, because "no such item" is ordinary.
- **\`removeStock\`** returns \`bool\`, because "not enough stock" is a normal outcome.
- The constructor **throws**, because an invalid item is a programming error.
- \`save\`/\`load\` use \`std::ofstream\`/\`ifstream\`, whose destructors close the file — RAII again.

Notice: no \`new\`, no \`delete\`, no raw owning pointers, and every read-only method marked \`const\`. That is what ordinary modern C++ looks like.`,
      sample: {
        lang: 'cpp',
        caption: 'inventory.h / inventory.cpp — classes, containers, optional, RAII',
        code: `// ================= inventory.h =================
#pragma once
#include <map>
#include <optional>
#include <string>
#include <vector>

class Item {
public:
    Item() = default;
    Item(std::string sku, std::string name, int quantity, double price);

    const std::string& sku() const { return sku_; }
    const std::string& name() const { return name_; }
    int quantity() const { return quantity_; }
    double price() const { return price_; }
    double totalValue() const { return quantity_ * price_; }

    void addStock(int amount);
    bool removeStock(int amount);

private:
    std::string sku_;
    std::string name_;
    int quantity_ = 0;
    double price_ = 0.0;
};

class Inventory {
public:
    void add(const Item& item);
    bool remove(const std::string& sku);

    std::optional<Item> find(const std::string& sku) const;
    std::vector<Item> lowStock(int threshold) const;
    double totalValue() const;
    std::size_t size() const { return items_.size(); }

    void save(const std::string& path) const;
    void load(const std::string& path);

private:
    std::map<std::string, Item> items_;
};

// ================= inventory.cpp =================
#include "inventory.h"
#include <fstream>
#include <sstream>
#include <stdexcept>

Item::Item(std::string sku, std::string name, int quantity, double price)
    : sku_(std::move(sku)), name_(std::move(name)),
      quantity_(quantity), price_(price) {
    if (sku_.empty())   throw std::invalid_argument("SKU cannot be empty");
    if (quantity_ < 0)  throw std::invalid_argument("quantity cannot be negative");
    if (price_ < 0.0)   throw std::invalid_argument("price cannot be negative");
}

void Item::addStock(int amount) {
    if (amount <= 0) throw std::invalid_argument("amount must be positive");
    quantity_ += amount;
}

bool Item::removeStock(int amount) {
    if (amount <= 0) throw std::invalid_argument("amount must be positive");
    if (amount > quantity_) return false;      // ordinary, not exceptional
    quantity_ -= amount;
    return true;
}

void Inventory::add(const Item& item) {
    auto [it, inserted] = items_.try_emplace(item.sku(), item);
    if (!inserted) it->second.addStock(item.quantity());
}

bool Inventory::remove(const std::string& sku) {
    return items_.erase(sku) > 0;
}

std::optional<Item> Inventory::find(const std::string& sku) const {
    auto it = items_.find(sku);
    if (it == items_.end()) return std::nullopt;
    return it->second;
}

std::vector<Item> Inventory::lowStock(int threshold) const {
    std::vector<Item> result;
    for (const auto& [sku, item] : items_) {
        if (item.quantity() < threshold) result.push_back(item);
    }
    return result;
}

double Inventory::totalValue() const {
    double total = 0.0;
    for (const auto& [sku, item] : items_) total += item.totalValue();
    return total;
}

void Inventory::save(const std::string& path) const {
    std::ofstream out(path);                     // closed by its destructor
    if (!out) throw std::runtime_error("cannot write " + path);
    for (const auto& [sku, item] : items_) {
        out << item.sku() << '\\t' << item.name() << '\\t'
            << item.quantity() << '\\t' << item.price() << '\\n';
    }
}

void Inventory::load(const std::string& path) {
    std::ifstream in(path);
    if (!in) throw std::runtime_error("cannot read " + path);

    items_.clear();
    std::string line;
    int lineNumber = 0;
    while (std::getline(in, line)) {
        ++lineNumber;
        if (line.empty()) continue;

        std::istringstream fields(line);
        std::string sku, name, quantity, price;
        if (!std::getline(fields, sku, '\\t') ||
            !std::getline(fields, name, '\\t') ||
            !std::getline(fields, quantity, '\\t') ||
            !std::getline(fields, price)) {
            throw std::runtime_error("bad record on line " +
                                     std::to_string(lineNumber));
        }
        add(Item(sku, name, std::stoi(quantity), std::stod(price)));
    }
}`,
        output: `Inventory inv;
inv.add(Item("A1", "Widget", 10, 2.50));
inv.add(Item("B2", "Gadget",  3, 9.99));

inv.totalValue()        -> 54.97
inv.find("A1")->name()  -> "Widget"
inv.find("ZZ")          -> nullopt
inv.lowStock(5)         -> [Gadget x3]
inv.save("stock.tsv")   -> file written, closed automatically

Item("", "Broken", 1, 1.0)  -> throws: SKU cannot be empty`,
      },
      question: {
        kind: 'mcq',
        prompt:
          '`Item::removeStock` returns `bool` when there is not enough stock, but `throws` when the amount is zero or negative. Why the difference?',
        options: [
          'Exceptions cannot return values',
          '"Not enough stock" is an ordinary outcome the caller should handle; a negative amount is a programming error that should never happen and must not pass silently',
          '`bool` is faster than an exception',
          'It is an inconsistency that should be fixed',
        ],
        answer: 1,
        explain:
          'Insufficient stock is a normal business outcome — a shop hits it every day — so it belongs in the return value. A negative quantity means the calling code is wrong; returning `false` would let the bug continue quietly, while an exception stops it at the point of the mistake. Matching the mechanism to the kind of failure is a real design skill.',
        hint: 'Which of the two can happen during normal, correct use?',
      },
    },
  ],
}

export default level
