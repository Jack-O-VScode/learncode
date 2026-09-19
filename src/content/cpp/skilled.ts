import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Ownership, polymorphism and templates',
  summary:
    'The ideas that make C++ what it is: RAII and smart pointers, copy and move semantics, operator overloading, virtual functions, templates, lambdas and a real build system.',
  outcomes: [
    'Express ownership with unique_ptr and shared_ptr',
    'Apply the Rule of Zero, Three and Five',
    'Understand move semantics and when copies disappear',
    'Use inheritance and virtual functions correctly',
    'Write function and class templates',
    'Build a multi-file project with CMake',
  ],
  steps: [
    {
      id: 'cpp-s-01',
      title: 'RAII and smart pointers',
      read: `**RAII** — *Resource Acquisition Is Initialisation* — is the central idea of C++: tie a resource's lifetime to an object's lifetime. Acquire in the constructor, release in the destructor, and the language guarantees the release happens.

## unique_ptr — exclusive ownership

\`\`\`cpp
auto widget = std::make_unique<Widget>(args);
\`\`\`

- Exactly one owner. Cannot be copied, only **moved**.
- Deletes automatically when it goes out of scope.
- **Zero overhead** — the same size as a raw pointer, and the compiler generates the same code.

This is your default for heap ownership.

## shared_ptr — shared ownership

\`\`\`cpp
auto config = std::make_shared<Config>();
\`\`\`

Reference counted; the object dies when the last owner does. It costs memory (a control block) and time (atomic increments), so **use it only when ownership genuinely is shared**. Reaching for it because you are unsure who owns what is a sign the design needs thinking about.

## weak_ptr

A non-owning observer of a \`shared_ptr\`. Its real job is breaking **reference cycles**: two objects holding \`shared_ptr\`s to each other never reach zero and leak.

## Prefer make_unique / make_shared

They are exception-safe and, for \`make_shared\`, allocate the object and control block together.

## And mostly: do not allocate at all

A member by value, or a \`std::vector\`, is simpler and faster than a pointer. Use smart pointers when you need polymorphism or genuinely dynamic lifetime.`,
      sample: {
        lang: 'cpp',
        caption: 'Exclusive ownership, transfer, sharing, and a broken cycle',
        code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Resource {
    std::string name;
    explicit Resource(std::string n) : name(std::move(n)) {
        std::cout << "  + " << name << "\\n";
    }
    ~Resource() { std::cout << "  - " << name << "\\n"; }
};

std::unique_ptr<Resource> makeResource(std::string name) {
    return std::make_unique<Resource>(std::move(name));   // moved out
}

int main() {
    {
        auto a = std::make_unique<Resource>("unique-a");
        // auto copy = a;                 // ERROR: cannot copy
        auto moved = std::move(a);        // ownership transferred
        std::cout << "  a is now " << (a ? "valid" : "empty") << "\\n";
        std::cout << "  moved holds " << moved->name << "\\n";
    }   // destroyed here

    {
        auto shared1 = std::make_shared<Resource>("shared");
        std::cout << "  use_count " << shared1.use_count() << "\\n";
        {
            auto shared2 = shared1;
            std::cout << "  use_count " << shared1.use_count() << "\\n";
        }
        std::cout << "  use_count " << shared1.use_count() << "\\n";
    }   // destroyed when the last owner goes

    // a container of polymorphic, owned objects
    std::vector<std::unique_ptr<Resource>> pool;
    pool.push_back(makeResource("pooled-1"));
    pool.push_back(makeResource("pooled-2"));
    std::cout << "  pool holds " << pool.size() << "\\n";

    std::weak_ptr<Resource> observer;
    {
        auto owner = std::make_shared<Resource>("observed");
        observer = owner;
        std::cout << "  alive? " << (observer.lock() != nullptr) << "\\n";
    }
    std::cout << "  alive? " << (observer.lock() != nullptr) << "\\n";

    return 0;
}`,
        output: `  + unique-a
  a is now empty
  moved holds unique-a
  - unique-a
  + shared
  use_count 1
  use_count 2
  use_count 1
  - shared
  + pooled-1
  + pooled-2
  pool holds 2
  + observed
  alive? 1
  - observed
  alive? 0
  - pooled-1
  - pooled-2`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `std::unique_ptr` preferred over `std::shared_ptr` by default?',
        options: [
          'It can hold more types',
          'It has zero overhead and states clearly that there is exactly one owner; shared_ptr costs an atomic reference count and usually signals that the ownership design is unclear',
          'shared_ptr does not delete the object',
          'unique_ptr is thread-safe and shared_ptr is not',
        ],
        answer: 1,
        explain:
          '`unique_ptr` compiles to the same code as a raw pointer plus an automatic delete. `shared_ptr` needs a heap-allocated control block and atomic increments on every copy. Beyond the cost, "exactly one owner" is a far stronger statement about your design — reach for sharing only when it is genuinely true.',
        hint: 'Think about both cost and what each one communicates.',
      },
    },

    {
      id: 'cpp-s-02',
      title: 'Copy semantics and the Rule of Three',
      read: `When you write \`Widget b = a;\`, the **copy constructor** runs. \`b = a;\` on an existing object runs the **copy assignment operator**.

The compiler generates both, and they copy each member. For a class holding vectors, strings and smart pointers, that is exactly right.

## When it is not right

If your class owns a raw resource — a \`new\`ed pointer, a file handle, a socket — the default copy duplicates the **pointer**, not the resource. Now two objects think they own it, both destructors run, and you get a **double free**.

## The Rule of Three

> If you need to write any one of the **destructor**, **copy constructor** or **copy assignment operator**, you almost certainly need all three.

Because needing one means you are managing a resource manually, and the other two are wrong by default.

## Shallow vs deep

- **Shallow copy** — copies the pointer. Two owners, one buffer.
- **Deep copy** — allocates a new buffer and copies the contents. Two independent objects.

## The Rule of Zero — what you should actually aim for

> Design classes so you need **none** of them.

Hold resources in types that already manage themselves (\`vector\`, \`string\`, \`unique_ptr\`) and the compiler-generated everything is correct. The best special member function is the one you did not have to write.

## Disabling copies

\`\`\`cpp
Widget(const Widget&) = delete;
\`\`\`

Better a compile error than a silently wrong copy.`,
      sample: {
        lang: 'cpp',
        caption: 'The manual version done correctly, and the version you should write',
        code: `#include <algorithm>
#include <iostream>
#include <vector>

// Rule of Three, done by hand (educational — do not write this)
class Buffer {
    int* data_;
    std::size_t size_;

public:
    explicit Buffer(std::size_t size)
        : data_(new int[size]()), size_(size) {}

    ~Buffer() { delete[] data_; }                            // 1. destructor

    Buffer(const Buffer& other)                              // 2. copy ctor
        : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);   // DEEP copy
    }

    Buffer& operator=(const Buffer& other) {                 // 3. copy assign
        if (this == &other) return *this;                    // self-assignment!
        int* fresh = new int[other.size_];                   // allocate first
        std::copy(other.data_, other.data_ + other.size_, fresh);
        delete[] data_;                                      // then release
        data_ = fresh;
        size_ = other.size_;
        return *this;
    }

    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return size_; }
};

// Rule of Zero: the same thing, correct, with nothing to write
class BetterBuffer {
    std::vector<int> data_;
public:
    explicit BetterBuffer(std::size_t size) : data_(size, 0) {}
    int& operator[](std::size_t i) { return data_[i]; }
    std::size_t size() const { return data_.size(); }
};

int main() {
    Buffer a(3);
    a[0] = 42;
    Buffer b = a;              // deep copy
    b[0] = 99;
    std::cout << a[0] << " " << b[0] << "\\n";   // 42 99 — independent

    BetterBuffer c(3);
    c[0] = 7;
    BetterBuffer d = c;        // correct, and nobody wrote any code for it
    d[0] = 8;
    std::cout << c[0] << " " << d[0] << "\\n";

    return 0;
}`,
        output: `42 99
7 8`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A class holds a `new[]`-allocated pointer and has a destructor that deletes it, but no copy constructor. What happens when an object of that class is copied?',
        options: [
          'The copy is empty',
          'Both objects hold the same pointer, so both destructors delete it — a double free and heap corruption',
          'The compiler refuses to compile the copy',
          'A deep copy is made automatically',
        ],
        answer: 1,
        explain:
          'The generated copy constructor copies each member — including the pointer value. Two objects now believe they own one buffer, and the second `delete[]` corrupts the heap. That is precisely the Rule of Three: writing the destructor obliged you to write the other two.',
        hint: 'What exactly does the default copy constructor copy?',
      },
    },

    {
      id: 'cpp-s-03',
      title: 'Move semantics',
      read: `Copying a 10-million-element vector to return it from a function is pure waste — the original is about to be destroyed anyway. **Moving** steals its internals instead.

\`\`\`cpp
std::vector<int> a = makeBigVector();    // moved, not copied
std::vector<int> b = std::move(a);       // a is now valid but unspecified
\`\`\`

## lvalues and rvalues

- **lvalue** — has a name, persists: \`a\`, \`v[0]\`
- **rvalue** — a temporary, about to disappear: \`makeVector()\`, \`42\`, \`std::move(a)\`

\`T&&\` is an **rvalue reference** — it binds to things that are about to die, which is exactly when stealing is safe.

## What std::move actually does

**Nothing at runtime.** It is a cast that says "treat this as an rvalue — I am done with it". The *move constructor* then does the actual stealing.

After moving from an object it is in a **valid but unspecified** state. You may destroy it or assign to it; do not read its value.

## The Rule of Five

Destructor, copy constructor, copy assignment, **move constructor**, **move assignment**. If you write one, consider all five.

Better: the **Rule of Zero** — hold members that already move correctly, and you get all five for free.

## Where moves come from for free

Returning a local by value, \`push_back\` of a temporary, and growing a vector all use moves automatically. Do **not** write \`return std::move(local);\` — it prevents copy elision and makes things slower.`,
      sample: {
        lang: 'cpp',
        caption: 'Copy versus move, measured',
        code: `#include <chrono>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

class Tracked {
    std::vector<int> data_;
    std::string name_;
public:
    Tracked(std::string name, std::size_t size)
        : data_(size, 1), name_(std::move(name)) {}

    Tracked(const Tracked& other)
        : data_(other.data_), name_(other.name_ + "-copy") {
        std::cout << "  COPY of " << other.name_ << "\\n";
    }

    Tracked(Tracked&& other) noexcept
        : data_(std::move(other.data_)), name_(std::move(other.name_)) {
        std::cout << "  MOVE\\n";
    }

    std::size_t size() const { return data_.size(); }
};

Tracked makeTracked() { return Tracked("made", 1'000'000); }

int main() {
    Tracked original("original", 1'000'000);

    Tracked copied = original;              // copy: allocates 4 MB
    Tracked moved = std::move(original);    // move: steals the pointer

    std::cout << "moved.size() = " << moved.size() << "\\n";

    Tracked fromFunction = makeTracked();   // usually elided entirely

    // where moves happen automatically
    std::vector<std::string> words;
    std::string text = "hello";
    words.push_back(text);              // copy: text is still needed
    words.push_back(std::move(text));   // move: we are done with text
    words.push_back("literal");         // move from a temporary

    auto start = std::chrono::steady_clock::now();
    std::vector<int> big(10'000'000, 7);
    std::vector<int> byCopy = big;
    auto mid = std::chrono::steady_clock::now();
    std::vector<int> byMove = std::move(big);
    auto end = std::chrono::steady_clock::now();

    using ms = std::chrono::microseconds;
    std::cout << "copy " << std::chrono::duration_cast<ms>(mid - start).count() << " us\\n";
    std::cout << "move " << std::chrono::duration_cast<ms>(end - mid).count() << " us\\n";

    return 0;
}`,
        output: `  COPY of original
  MOVE
moved.size() = 1000000
copy 8423 us
move 0 us`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `std::move(x)` do at runtime?',
        options: [
          'Copies x to a new location',
          'Nothing — it is a compile-time cast to an rvalue reference, which allows a move constructor or move assignment to be chosen',
          'Frees x’s memory',
          'Sets x to null',
        ],
        answer: 1,
        explain:
          '`std::move` generates no instructions. It only changes which overload the compiler picks: a move constructor rather than a copy constructor. The actual stealing of the pointers happens inside that constructor.',
        hint: 'How could a cast move anything by itself?',
      },
    },

    {
      id: 'cpp-s-04',
      title: 'Operator overloading',
      read: `C++ lets your types use the built-in operators, so they read like the values they represent:

\`\`\`cpp
Vector2 c = a + b;
if (a == b) { ... }
std::cout << a;
\`\`\`

## The common ones

- Arithmetic: \`+\`, \`-\`, \`*\`, \`/\` — usually **free functions** taking \`const&\`
- Compound: \`+=\`, \`-=\` — **members**, returning \`*this\` by reference
- Comparison: define \`operator<=>\` (C++20) and \`operator==\`, and the compiler generates \`<\`, \`>\`, \`<=\`, \`>=\`
- Stream: \`operator<<\` — a free function taking \`std::ostream&\`, returning it so calls chain
- Subscript: \`operator[]\` — provide const and non-const versions
- Call: \`operator()\` — makes a function object

## The idiomatic pattern

Implement \`+=\` as a member, then define \`+\` in terms of it. One place holds the logic.

\`\`\`cpp
Vector2& operator+=(const Vector2& rhs) { x_ += rhs.x_; y_ += rhs.y_; return *this; }
friend Vector2 operator+(Vector2 lhs, const Vector2& rhs) { return lhs += rhs; }
\`\`\`

Note \`lhs\` is taken **by value** — it becomes the working copy, which is both idiomatic and efficient.

## The rule that matters

**Only overload when the meaning is obvious.** \`+\` on two vectors is clear. \`+\` meaning "send over the network" is a crime. The test: could a reader predict what it does without opening the header?`,
      sample: {
        lang: 'cpp',
        caption: 'A small value type that behaves like a built-in',
        code: `#include <cmath>
#include <compare>
#include <iostream>

class Vector2 {
    double x_ = 0.0;
    double y_ = 0.0;

public:
    Vector2() = default;
    Vector2(double x, double y) : x_(x), y_(y) {}

    double x() const { return x_; }
    double y() const { return y_; }
    double length() const { return std::sqrt(x_ * x_ + y_ * y_); }

    Vector2& operator+=(const Vector2& rhs) {
        x_ += rhs.x_; y_ += rhs.y_; return *this;
    }
    Vector2& operator-=(const Vector2& rhs) {
        x_ -= rhs.x_; y_ -= rhs.y_; return *this;
    }
    Vector2& operator*=(double k) { x_ *= k; y_ *= k; return *this; }

    Vector2 operator-() const { return {-x_, -y_}; }

    bool operator==(const Vector2&) const = default;   // compiler writes it

    // taking lhs by value gives us the working copy for free
    friend Vector2 operator+(Vector2 lhs, const Vector2& rhs) { return lhs += rhs; }
    friend Vector2 operator-(Vector2 lhs, const Vector2& rhs) { return lhs -= rhs; }
    friend Vector2 operator*(Vector2 v, double k) { return v *= k; }
    friend Vector2 operator*(double k, Vector2 v) { return v *= k; }

    friend std::ostream& operator<<(std::ostream& out, const Vector2& v) {
        return out << "(" << v.x_ << ", " << v.y_ << ")";
    }
};

int main() {
    Vector2 a(3.0, 4.0);
    Vector2 b(1.0, 2.0);

    std::cout << a << " + " << b << " = " << a + b << "\\n";
    std::cout << a << " - " << b << " = " << a - b << "\\n";
    std::cout << "2 * " << a << " = " << 2.0 * a << "\\n";
    std::cout << "-" << a << " = " << -a << "\\n";
    std::cout << "|a| = " << a.length() << "\\n";
    std::cout << std::boolalpha << (a == Vector2(3.0, 4.0)) << "\\n";

    Vector2 total;
    for (const auto& v : {a, b, Vector2(0.5, 0.5)}) total += v;
    std::cout << "total " << total << "\\n";

    return 0;
}`,
        output: `(3, 4) + (1, 2) = (4, 6)
(3, 4) - (1, 2) = (2, 2)
2 * (3, 4) = (6, 8)
-(3, 4) = (-3, -4)
|a| = 5
true
total (4.5, 6.5)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `operator+` implemented as `friend Vector2 operator+(Vector2 lhs, const Vector2& rhs) { return lhs += rhs; }`?',
        options: [
          'Free functions are faster',
          'Taking `lhs` by value gives a working copy to modify and return, and delegating to `+=` keeps the arithmetic in exactly one place',
          '`operator+` cannot be a member function',
          'It avoids needing a copy constructor',
        ],
        answer: 1,
        explain:
          'The by-value parameter is the copy you would otherwise have made by hand, and it can be moved from at the call site. Defining `+` in terms of `+=` means a bug in the addition logic exists in one function, not two. Being a free function also lets `2.0 * v` work, which a member could not.',
        hint: 'Where does the copy come from, and how many places hold the logic?',
      },
    },

    {
      id: 'cpp-s-05',
      title: 'Inheritance and virtual functions',
      read: `\`\`\`cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {
public:
    double area() const override { return 3.14159 * r_ * r_; }
};
\`\`\`

## virtual

Without \`virtual\`, the function called is decided by the **static type** (the pointer's type). With \`virtual\`, it is decided by the **dynamic type** (what the object actually is). That is **runtime polymorphism**, and it lets one loop over \`Shape*\` call the right \`area()\` for each.

## = 0 makes it pure virtual

A class with a pure virtual function is **abstract** — it cannot be instantiated. With only pure virtuals and no data, it is an **interface**.

## The rule people forget

> **A base class with virtual functions needs a virtual destructor.**

\`delete shapePtr\` on a non-virtual destructor destroys only the base part. Members of the derived class leak. Always \`virtual ~Shape() = default;\`.

## override

Always write it. If your signature does not match a base virtual — a missing \`const\`, a different parameter type — you have silently created a *new* function that is never called. \`override\` makes that a compile error.

## Slicing

\`\`\`cpp
Shape s = circle;    // the Circle part is sliced off
\`\`\`

Polymorphism requires a pointer or a reference. Store \`std::vector<std::unique_ptr<Shape>>\`, never \`std::vector<Shape>\`.

## Prefer composition

Inheritance is the tightest coupling in the language. Use it for a genuine "is-a" with a stable interface; otherwise hold a member.`,
      sample: {
        lang: 'cpp',
        caption: 'An interface, three implementations, one polymorphic loop',
        code: `#include <iomanip>
#include <iostream>
#include <memory>
#include <numbers>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;              // essential
    virtual double area() const = 0;
    virtual std::string name() const = 0;

    // non-virtual: shared behaviour built on the virtual parts
    void describe() const {
        std::cout << std::setw(10) << std::left << name()
                  << " area " << area() << "\\n";
    }
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return std::numbers::pi * r_ * r_; }
    std::string name() const override { return "Circle"; }
};

class Rectangle : public Shape {
    double w_, h_;
public:
    Rectangle(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
    std::string name() const override { return "Rectangle"; }
};

class Square : public Rectangle {
public:
    explicit Square(double side) : Rectangle(side, side) {}
    std::string name() const override { return "Square"; }
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(1.0));
    shapes.push_back(std::make_unique<Rectangle>(3.0, 4.0));
    shapes.push_back(std::make_unique<Square>(2.0));

    std::cout << std::fixed << std::setprecision(2);

    double total = 0.0;
    for (const auto& shape : shapes) {
        shape->describe();            // the right override, every time
        total += shape->area();
    }
    std::cout << "total " << total << "\\n";

    // Shape base = *shapes[0];   // ERROR: abstract — which also prevents slicing
    return 0;
}`,
        output: `Circle     area 3.14
Rectangle  area 12.00
Square     area 4.00
total 19.14`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A base class has virtual functions but a non-virtual destructor. You `delete` a derived object through a base pointer. What happens?',
        options: [
          'Both destructors run correctly',
          'Only the base destructor runs — the derived part is never destroyed, leaking whatever it owned; formally it is undefined behaviour',
          'The compiler rejects the delete',
          'The object is not deleted at all',
        ],
        answer: 1,
        explain:
          'Without `virtual`, the destructor call is resolved from the static type, so the derived destructor is skipped and its members never release their resources. The standard calls it undefined behaviour. The fix is one line: `virtual ~Base() = default;`.',
        hint: 'How does the compiler decide which destructor to call?',
      },
    },

    {
      id: 'cpp-s-06',
      title: 'Templates',
      read: `A template is a recipe the compiler uses to generate code for whatever type you use it with.

\`\`\`cpp
template <typename T>
T maxOf(const T& a, const T& b) {
    return (a > b) ? a : b;
}

maxOf(3, 7);           // generates the int version
maxOf(2.5, 1.5);       // generates the double version
\`\`\`

This is **compile-time** polymorphism: no virtual calls, no runtime cost, full inlining. The trade-off is longer compile times and famously verbose error messages.

## Class templates

\`\`\`cpp
template <typename T>
class Stack {
    std::vector<T> items_;
public:
    void push(T item) { items_.push_back(std::move(item)); }
};
\`\`\`

\`std::vector\`, \`std::map\` and \`std::unique_ptr\` are all class templates.

## Headers

Template definitions must be visible where they are instantiated, so templates live **entirely in headers**.

## Concepts (C++20)

Constrain what a template accepts, and get comprehensible errors:

\`\`\`cpp
template <std::integral T>
T half(T value) { return value / 2; }
\`\`\`

Pass a \`std::string\` and the message is *"constraint not satisfied"* at the call site, rather than forty lines from deep inside your function.

## auto parameters

\`auto add(auto a, auto b) { return a + b; }\` is shorthand for a template. Fine for short helpers.`,
      sample: {
        lang: 'cpp',
        caption: 'Function template, class template, and a concept for good errors',
        code: `#include <concepts>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

template <typename T>
T maxOf(const T& a, const T& b) { return (a > b) ? a : b; }

template <std::integral T>          // constrained: ints only
T half(T value) { return value / 2; }

template <typename T>
class Stack {
    std::vector<T> items_;
public:
    void push(T item) { items_.push_back(std::move(item)); }

    T pop() {
        if (items_.empty()) throw std::out_of_range("stack is empty");
        T top = std::move(items_.back());
        items_.pop_back();
        return top;
    }

    const T& peek() const {
        if (items_.empty()) throw std::out_of_range("stack is empty");
        return items_.back();
    }

    bool empty() const { return items_.empty(); }
    std::size_t size() const { return items_.size(); }
};

template <typename Container>
auto sum(const Container& items) {
    typename Container::value_type total{};
    for (const auto& item : items) total += item;
    return total;
}

int main() {
    std::cout << maxOf(3, 7) << "\\n";
    std::cout << maxOf(2.5, 1.5) << "\\n";
    std::cout << maxOf(std::string("apple"), std::string("banana")) << "\\n";

    std::cout << half(9) << "\\n";
    // std::cout << half(std::string("x"));   // clear error: constraint not satisfied

    Stack<std::string> words;
    words.push("first");
    words.push("second");
    std::cout << words.peek() << " (" << words.size() << ")\\n";
    std::cout << words.pop() << "\\n";

    std::cout << sum(std::vector<int>{1, 2, 3}) << "\\n";
    std::cout << sum(std::vector<double>{0.5, 0.25}) << "\\n";

    return 0;
}`,
        output: `7
2.5
banana
4
second (2)
second
6
0.75`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must template definitions live in header files rather than .cpp files?',
        options: [
          'Templates cannot be compiled separately',
          'The compiler generates the code for each type at the point of use, so it needs the full definition visible in that translation unit',
          'Headers compile faster',
          'It is only a convention',
        ],
        answer: 1,
        explain:
          'A template is not code until a type is supplied. When `main.cpp` writes `Stack<std::string>`, the compiler must have the body available right there to instantiate it. If the definition were in another `.cpp`, nothing would ever generate that version and the linker would report an undefined reference.',
        hint: 'When is the actual code for `Stack<std::string>` created?',
      },
    },

    {
      id: 'cpp-s-07',
      title: 'Lambdas and function objects',
      read: `A lambda is an anonymous function you write where you need it.

\`\`\`cpp
auto isEven = [](int n) { return n % 2 == 0; };
\`\`\`

The full form: \`[captures](params) -> ReturnType { body }\`. The return type is usually deduced.

## Captures — the important part

- \`[]\` — capture nothing
- \`[x]\` — copy \`x\`
- \`[&x]\` — reference \`x\`
- \`[=]\` — copy everything used
- \`[&]\` — reference everything used
- \`[x = expr]\` — init capture, which is also how you move into a lambda

## The danger

\`[&]\` captures by reference. If the lambda outlives what it captured — stored in a member, passed to a thread, returned from a function — those references dangle. **Prefer explicit captures**, and prefer by value for anything stored.

## What a lambda really is

The compiler generates an unnamed class with an \`operator()\`, with the captures as members. That is why it has zero overhead when passed to an algorithm: the call is inlined.

## std::function

\`std::function<int(int)>\` stores *any* callable with that signature. Flexible, but it type-erases, which usually means a heap allocation and an indirect call. Use it for stored callbacks; use \`auto\` or a template parameter for things passed straight through.

## mutable

A lambda's \`operator()\` is \`const\` by default, so copies cannot be modified. \`mutable\` lifts that.`,
      sample: {
        lang: 'cpp',
        caption: 'Captures, sorting by custom keys, and a stateful counter',
        code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <string>
#include <vector>

struct Employee {
    std::string name;
    int age;
    double salary;
};

int main() {
    std::vector<Employee> staff = {
        {"Ada", 36, 95000}, {"Alan", 41, 88000}, {"Grace", 45, 102000},
    };

    std::sort(staff.begin(), staff.end(),
              [](const Employee& a, const Employee& b) { return a.age < b.age; });
    for (const auto& e : staff) std::cout << e.name << "(" << e.age << ") ";
    std::cout << "\\n";

    const double threshold = 90000;
    auto wellPaid = [threshold](const Employee& e) { return e.salary > threshold; };
    std::cout << std::count_if(staff.begin(), staff.end(), wellPaid) << " above threshold\\n";

    double total = 0.0;
    std::for_each(staff.begin(), staff.end(),
                  [&total](const Employee& e) { total += e.salary; });   // by reference
    std::cout << "payroll " << total << "\\n";

    // mutable: keeps state between calls
    auto counter = [count = 0]() mutable { return ++count; };
    std::cout << counter() << counter() << counter() << "\\n";

    // stored callbacks need std::function (or a template)
    std::vector<std::function<int(int)>> pipeline = {
        [](int n) { return n + 1; },
        [](int n) { return n * 2; },
        [](int n) { return n - 3; },
    };
    int value = 5;
    for (const auto& step : pipeline) value = step(value);
    std::cout << "result " << value << "\\n";

    // move into a lambda with an init capture
    std::string message = "owned by the lambda";
    auto printer = [msg = std::move(message)]() { std::cout << msg << "\\n"; };
    printer();

    return 0;
}`,
        output: `Ada(36) Alan(41) Grace(45)
2 above threshold
payroll 285000
123
result 9
owned by the lambda`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the risk of a lambda that captures with `[&]` and is stored for later use?',
        options: [
          'It cannot be copied',
          'The references may outlive the variables they refer to, so calling the lambda later reads destroyed objects',
          'It is slower than capturing by value',
          '`[&]` does not compile in stored lambdas',
        ],
        answer: 1,
        explain:
          'A reference capture is only valid while the referenced object lives. Storing such a lambda in a member, a container or a thread and calling it after the enclosing function returns is undefined behaviour. Capture by value — or by explicit init capture — for anything that outlives the current scope.',
        hint: 'When do the captured local variables get destroyed?',
      },
    },

    {
      id: 'cpp-s-08',
      title: 'const correctness and constexpr',
      read: `## const is a promise the compiler enforces

- \`const int x = 5;\` — the value never changes
- \`const std::string& s\` — this function will not modify it
- \`double area() const\` — this method does not modify the object
- \`const std::vector<int>& v\` — read-only view, no copy

## Read declarations right to left

- \`const int* p\` — pointer to const int (cannot change the value)
- \`int* const p\` — const pointer to int (cannot change where it points)
- \`const int* const p\` — neither

## Why bother

1. **The compiler catches mistakes.** Accidentally modifying something is a build error, not a bug report.
2. **It documents intent** in the signature, where readers look.
3. **It is infectious in the right direction.** A const object can only call const methods, so forgetting one \`const\` deep in a class causes errors all the way out. Add them from the start.

## constexpr

\`constexpr\` means "can be evaluated at compile time".

\`\`\`cpp
constexpr int factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }
constexpr int f5 = factorial(5);   // computed during compilation
\`\`\`

The work costs nothing at runtime, and the value can be used where a compile-time constant is required (array sizes, template arguments).

\`consteval\` forces compile-time evaluation. \`constinit\` guarantees compile-time *initialisation* without implying const.`,
      sample: {
        lang: 'cpp',
        caption: 'const on parameters, methods and pointers — plus compile-time computation',
        code: `#include <array>
#include <iostream>
#include <string>
#include <vector>

constexpr int factorial(int n) { return n <= 1 ? 1 : n * factorial(n - 1); }

constexpr double kGravity = 9.81;

class Config {
    std::string name_;
    std::vector<int> values_;

public:
    explicit Config(std::string name) : name_(std::move(name)) {}

    const std::string& name() const { return name_; }          // read-only
    std::size_t size() const { return values_.size(); }

    // two overloads: const for reading, non-const for writing
    const std::vector<int>& values() const { return values_; }
    std::vector<int>& values() { return values_; }

    void add(int value) { values_.push_back(value); }
};

// takes const& : no copy, and provably does not modify
double averageOf(const std::vector<int>& values) {
    if (values.empty()) return 0.0;
    int total = 0;
    for (int v : values) total += v;
    return static_cast<double>(total) / values.size();
}

int main() {
    constexpr int f5 = factorial(5);
    std::array<int, factorial(4)> fixed{};       // size known at compile time
    std::cout << f5 << " " << fixed.size() << "\\n";
    std::cout << kGravity << "\\n";

    Config config("render");
    config.add(1);
    config.add(2);
    config.values().push_back(3);                // non-const overload

    const Config& readOnly = config;
    std::cout << readOnly.name() << " " << readOnly.size() << "\\n";
    std::cout << averageOf(readOnly.values()) << "\\n";
    // readOnly.add(4);                 // ERROR: add() is not const

    int a = 1, b = 2;
    const int* toConst = &a;
    toConst = &b;                       // ok: repoint
    // *toConst = 9;                    // ERROR: cannot write through it

    int* const constPtr = &a;
    *constPtr = 9;                      // ok: write
    // constPtr = &b;                   // ERROR: cannot repoint
    std::cout << a << "\\n";

    return 0;
}`,
        output: `120 24
9.81
render 3
2
9`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the difference between `const int* p` and `int* const p`?',
        options: [
          'They are identical',
          '`const int* p` cannot change the pointed-to value but can be repointed; `int* const p` can change the value but can never point elsewhere',
          '`const int* p` cannot be repointed',
          'The second is invalid syntax',
        ],
        answer: 1,
        explain:
          'Read right to left: `const int* p` is "p is a pointer to a const int"; `int* const p` is "p is a const pointer to an int". The `const` applies to whatever is to its left (or to the right if it is leftmost).',
        hint: 'Read the declaration from right to left.',
      },
    },

    {
      id: 'cpp-s-09',
      title: 'Algorithms, ranges and iterators',
      read: `## Iterators

An iterator is a generalised pointer: \`*it\` reads, \`++it\` advances, \`it != end\` tests. Every standard algorithm is written against iterators, which is why the same \`std::sort\` works on vectors, arrays and deques.

Categories matter: a \`vector\` iterator is **random access** (\`it + 5\` is O(1)), a \`list\` iterator is only **bidirectional**. \`std::sort\` requires random access, which is why you cannot sort a \`std::list\` with it (it has its own \`.sort()\`).

## Ranges (C++20)

\`\`\`cpp
std::ranges::sort(v);                      // no .begin()/.end()
auto evens = v | std::views::filter(isEven) | std::views::transform(square);
\`\`\`

**Views are lazy** — nothing is computed until you iterate, and no intermediate container is created. They compose left to right, which reads much better than nested algorithm calls.

## The algorithms worth knowing

- **Search**: \`find\`, \`find_if\`, \`binary_search\` (sorted only), \`any_of\`, \`all_of\`
- **Modify**: \`transform\`, \`copy_if\`, \`remove_if\`, \`fill\`, \`replace\`
- **Sort**: \`sort\`, \`stable_sort\`, \`partial_sort\`, \`nth_element\`
- **Numeric**: \`accumulate\`, \`reduce\`, \`inner_product\`, \`iota\`

## The erase-remove idiom

\`std::remove_if\` cannot actually shrink a container — it only moves the survivors forward and returns the new logical end. You must then erase the tail:

\`\`\`cpp
v.erase(std::remove_if(v.begin(), v.end(), pred), v.end());
\`\`\`

C++20 finally gives you \`std::erase_if(v, pred)\`. Use that.`,
      sample: {
        lang: 'cpp',
        caption: 'Classic algorithms, the erase-remove trap, and lazy views',
        code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v = {5, 2, 8, 1, 9, 3, 7, 4};

    std::ranges::sort(v);
    for (int n : v) std::cout << n << " ";
    std::cout << "\\n";

    std::cout << std::ranges::binary_search(v, 7) << "\\n";
    std::cout << std::accumulate(v.begin(), v.end(), 0) << "\\n";

    // the trap: remove_if alone changes nothing about size()
    std::vector<int> a = v;
    std::remove_if(a.begin(), a.end(), [](int n) { return n % 2 == 0; });
    std::cout << "size after remove_if alone: " << a.size() << "\\n";

    std::vector<int> b = v;
    std::erase_if(b, [](int n) { return n % 2 == 0; });    // C++20: does both
    std::cout << "size after erase_if: " << b.size() << "  ";
    for (int n : b) std::cout << n << " ";
    std::cout << "\\n";

    // lazy pipeline: no intermediate vectors are built
    auto pipeline = v
        | std::views::filter([](int n) { return n % 2 == 0; })
        | std::views::transform([](int n) { return n * n; })
        | std::views::take(3);

    for (int n : pipeline) std::cout << n << " ";
    std::cout << "\\n";

    std::vector<int> squares;
    std::ranges::transform(v, std::back_inserter(squares),
                           [](int n) { return n * n; });
    std::cout << squares.size() << " squares, largest "
              << *std::ranges::max_element(squares) << "\\n";

    return 0;
}`,
        output: `1 2 3 4 5 6 7 8
1
36
size after remove_if alone: 8
size after erase_if: 4  1 3 5 7
4 16 36
8 squares, largest 64`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why does calling `std::remove_if` alone leave the container the same size?',
        options: [
          'It is a bug in the standard library',
          'Algorithms work on iterators and have no access to the container, so `remove_if` can only shuffle the survivors forward and return the new logical end — the caller must erase the tail',
          'It only removes the first match',
          'It needs a sorted container',
        ],
        answer: 1,
        explain:
          'An algorithm receives two iterators, not the container, so it physically cannot change `size()`. That separation is what lets one algorithm serve every container, and the cost is the erase-remove idiom. `std::erase_if` (C++20) knows the container and does both steps.',
        hint: 'What exactly does an algorithm receive as arguments?',
      },
    },

    {
      id: 'cpp-s-10',
      title: 'Building with CMake',
      read: `Typing \`g++ a.cpp b.cpp c.cpp\` stops scaling immediately. **CMake** generates the real build files for whatever toolchain you are on.

\`\`\`cmake
cmake_minimum_required(VERSION 3.20)
project(MyApp VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(myapp src/main.cpp src/engine.cpp)
target_include_directories(myapp PRIVATE include)
\`\`\`

## Building

\`\`\`
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
\`\`\`

Out-of-source: everything generated lands in \`build/\`, which you \`.gitignore\`. \`-j\` builds in parallel.

## Build types

- **Debug** — \`-O0 -g\`: no optimisation, full debug info, assertions on
- **Release** — \`-O3 -DNDEBUG\`: optimised, no debug info

A Debug build can be 10× slower. Always benchmark Release builds.

## Libraries

\`add_library(engine STATIC ...)\` then \`target_link_libraries(myapp PRIVATE engine)\`. \`PUBLIC\` propagates the dependency to anything linking you; \`PRIVATE\` keeps it internal. Getting that distinction right is most of "modern CMake".

## The sanitizers

\`\`\`
-fsanitize=address,undefined -g
\`\`\`

AddressSanitizer catches buffer overruns, use-after-free and leaks **at the moment they happen**, with a stack trace. UBSan catches undefined behaviour. They cost about 2× runtime and will find bugs that have been silently lurking in your code for months. Run your tests under them.`,
      sample: {
        lang: 'bash',
        caption: 'A real CMakeLists.txt and the commands that use it',
        code: `# CMakeLists.txt
# cmake_minimum_required(VERSION 3.20)
# project(Renderer VERSION 0.1 LANGUAGES CXX)
#
# set(CMAKE_CXX_STANDARD 20)
# set(CMAKE_CXX_STANDARD_REQUIRED ON)
# set(CMAKE_EXPORT_COMPILE_COMMANDS ON)   # for clangd / VS Code
#
# add_library(core STATIC src/vector2.cpp src/inventory.cpp)
# target_include_directories(core PUBLIC include)
# target_compile_options(core PRIVATE -Wall -Wextra -Wpedantic)
#
# add_executable(app src/main.cpp)
# target_link_libraries(app PRIVATE core)
#
# enable_testing()
# add_executable(tests tests/test_vector2.cpp)
# target_link_libraries(tests PRIVATE core)
# add_test(NAME unit COMMAND tests)

cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
./build/app

# debug build with sanitizers — run your tests like this
cmake -B build-asan -DCMAKE_BUILD_TYPE=Debug \\
      -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined -g"
cmake --build build-asan -j
./build-asan/tests

ctest --test-dir build --output-on-failure`,
        output: `[100%] Built target app

=================================================================
==84213==ERROR: AddressSanitizer: heap-buffer-overflow
WRITE of size 4 at 0x602000000058 thread T0
    #0 0x55a1 in Grid::set(int, int, int) src/grid.cpp:24
    #1 0x55b3 in main src/main.cpp:11
0x602000000058 is located 0 bytes to the right of 24-byte region

Test project /home/sam/renderer/build
    Start 1: unit
1/1 Test #1: unit .............................   Passed    0.01 sec
100% tests passed`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why run your test suite with `-fsanitize=address` at least sometimes?',
        options: [
          'It makes tests run faster',
          'It detects buffer overruns, use-after-free and leaks at the exact moment they occur, with a stack trace — bugs that otherwise cause corruption far from the cause',
          'It is required for C++20',
          'It replaces the need for tests',
        ],
        answer: 1,
        explain:
          'Memory bugs in C++ are dangerous precisely because they usually do *not* crash immediately — they corrupt something that fails much later somewhere unrelated. ASan makes the failure happen at the offending instruction and prints where the memory came from. It costs about 2× runtime, which is nothing compared to the time it saves.',
        hint: 'When does an ordinary build notice a buffer overrun?',
      },
    },

    {
      id: 'cpp-s-11',
      title: 'Testing C++ code',
      read: `## The frameworks

**Catch2** and **GoogleTest** are the two standards. Catch2 is header-only and pleasant; GoogleTest is ubiquitous in industry.

\`\`\`cpp
TEST_CASE("Vector2 addition") {
    Vector2 a(1, 2);
    Vector2 b(3, 4);
    REQUIRE(a + b == Vector2(4, 6));
}
\`\`\`

CMake's \`FetchContent\` pulls either in with no manual installation.

## What C++ tests must cover

Beyond the usual correctness checks, C++ has failure modes other languages do not:

- **Copy and move semantics** — copy an object, modify the copy, assert the original is untouched. Move from it and assert it is still destructible.
- **Self-assignment** — \`a = a;\` must not corrupt anything. A classic bug in hand-written assignment operators.
- **Exception safety** — if a constructor throws halfway through, does anything leak?
- **Boundaries** — empty containers, one element, maximum size.
- **Const correctness** — a test that uses a \`const\` reference will not compile unless your methods are marked correctly, so the test proves it.

## Design for testability

Pure functions taking values and returning values are trivial to test. A function that reads a global, prints to \`std::cout\` and mutates a member is not. Separate computation from I/O, exactly as in the other tracks.

## Run under sanitizers in CI

A test that passes normally but fails under ASan has found a real bug that was silently corrupting memory.`,
      sample: {
        lang: 'cpp',
        caption: 'Catch2 tests covering the C++-specific failure modes',
        code: `#include <catch2/catch_test_macros.hpp>
#include "vector2.h"
#include "inventory.h"

TEST_CASE("Vector2 arithmetic", "[vector2]") {
    Vector2 a(3.0, 4.0);
    Vector2 b(1.0, 2.0);

    SECTION("addition") { REQUIRE(a + b == Vector2(4.0, 6.0)); }
    SECTION("scaling")  { REQUIRE(2.0 * a == Vector2(6.0, 8.0)); }
    SECTION("length")   { REQUIRE(a.length() == Catch::Approx(5.0)); }
    SECTION("negation") { REQUIRE(-a == Vector2(-3.0, -4.0)); }
}

TEST_CASE("copies are independent", "[value-semantics]") {
    Inventory original;
    original.add(Item("A1", "Widget", 10, 2.5));

    Inventory copy = original;
    copy.add(Item("B2", "Gadget", 5, 1.0));

    REQUIRE(original.size() == 1);        // the copy did not touch it
    REQUIRE(copy.size() == 2);
}

TEST_CASE("self-assignment is safe", "[value-semantics]") {
    Inventory inv;
    inv.add(Item("A1", "Widget", 10, 2.5));

    inv = inv;                            // must not corrupt or leak
    REQUIRE(inv.size() == 1);
    REQUIRE(inv.find("A1").has_value());
}

TEST_CASE("invalid items are rejected at construction", "[invariants]") {
    REQUIRE_THROWS_AS(Item("", "No SKU", 1, 1.0), std::invalid_argument);
    REQUIRE_THROWS_AS(Item("A1", "Negative", -1, 1.0), std::invalid_argument);
    REQUIRE_NOTHROW(Item("A1", "Fine", 0, 0.0));
}

TEST_CASE("edge cases", "[boundaries]") {
    Inventory empty;
    REQUIRE(empty.size() == 0);
    REQUIRE(empty.totalValue() == 0.0);
    REQUIRE_FALSE(empty.find("anything").has_value());
    REQUIRE(empty.lowStock(5).empty());
}

TEST_CASE("read-only methods are const", "[const]") {
    Inventory inv;
    inv.add(Item("A1", "Widget", 10, 2.5));
    const Inventory& ref = inv;           // will not compile unless const-correct
    REQUIRE(ref.totalValue() == 25.0);
    REQUIRE(ref.find("A1")->name() == "Widget");
}`,
        output: `$ ctest --output-on-failure
Randomness seeded to: 2847193
===============================================================================
All tests passed (18 assertions in 6 test cases)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `inv = inv;` (self-assignment) worth an explicit test?',
        options: [
          'It is a common thing for users to type',
          'A hand-written assignment operator that frees its resources before copying will destroy its own data when both sides are the same object',
          'It tests the copy constructor',
          'It is required by the standard',
        ],
        answer: 1,
        explain:
          'The naive implementation — `delete[] data_; data_ = new T[other.size]; copy from other` — reads from memory it just freed when `other` *is* `*this`. Self-assignment arises indirectly (`v[i] = v[j]` in a loop, or through references), so the guard is real, and a test is the only thing that keeps it there.',
        hint: 'What does the naive assignment operator do first?',
      },
    },

    {
      id: 'cpp-s-12',
      title: 'Project: a small maths library',
      read: `A properly built, reusable library applying everything from this level.

What to notice:

- **Rule of Zero** — \`Matrix\` holds a \`std::vector\`, so all five special members are correct without writing any of them.
- **Operators where the meaning is obvious** — \`+\`, \`*\`, \`==\`, \`<<\`, and \`operator()\` for element access (because \`m(row, col)\` reads better than \`m[row][col]\` and needs only one bounds check).
- **const overloads** of \`operator()\` so const matrices can be read.
- **\`constexpr\`** on the small vector type, so compile-time maths is possible.
- **Templates** so it works with \`float\` or \`double\`.
- **Exceptions for programming errors** (dimension mismatch) — it means the caller made a mistake, not that data was bad.
- **Move semantics for free** — returning a Matrix by value costs nothing because the vector moves.

Build it with CMake, test it with Catch2, run the tests under AddressSanitizer. That is a complete, professional workflow — and this library is small enough to hold in your head while you learn it.`,
      sample: {
        lang: 'cpp',
        caption: 'matrix.h — templated, Rule of Zero, operators that read naturally',
        code: `#pragma once

#include <cstddef>
#include <initializer_list>
#include <iostream>
#include <stdexcept>
#include <vector>

template <typename T = double>
class Matrix {
public:
    Matrix() = default;

    Matrix(std::size_t rows, std::size_t cols, T fill = T{})
        : rows_(rows), cols_(cols), data_(rows * cols, fill) {
        if (rows == 0 || cols == 0) {
            throw std::invalid_argument("matrix dimensions must be positive");
        }
    }

    Matrix(std::initializer_list<std::initializer_list<T>> rows) {
        rows_ = rows.size();
        cols_ = rows.begin()->size();
        data_.reserve(rows_ * cols_);
        for (const auto& row : rows) {
            if (row.size() != cols_) {
                throw std::invalid_argument("ragged initialiser list");
            }
            data_.insert(data_.end(), row.begin(), row.end());
        }
    }

    // Rule of Zero: copy, move, assignment and destruction are all correct
    // because std::vector already does the right thing.

    std::size_t rows() const { return rows_; }
    std::size_t cols() const { return cols_; }

    T& operator()(std::size_t r, std::size_t c) {
        checkBounds(r, c);
        return data_[r * cols_ + c];
    }
    const T& operator()(std::size_t r, std::size_t c) const {
        checkBounds(r, c);
        return data_[r * cols_ + c];
    }

    Matrix& operator+=(const Matrix& rhs) {
        requireSameShape(rhs);
        for (std::size_t i = 0; i < data_.size(); ++i) data_[i] += rhs.data_[i];
        return *this;
    }

    Matrix transposed() const {
        Matrix result(cols_, rows_);
        for (std::size_t r = 0; r < rows_; ++r) {
            for (std::size_t c = 0; c < cols_; ++c) result(c, r) = (*this)(r, c);
        }
        return result;                      // moved out, not copied
    }

    bool operator==(const Matrix&) const = default;

    friend Matrix operator+(Matrix lhs, const Matrix& rhs) { return lhs += rhs; }

    friend Matrix operator*(const Matrix& a, const Matrix& b) {
        if (a.cols_ != b.rows_) {
            throw std::invalid_argument("inner dimensions do not match");
        }
        Matrix result(a.rows_, b.cols_);
        for (std::size_t r = 0; r < a.rows_; ++r) {
            for (std::size_t k = 0; k < a.cols_; ++k) {
                const T factor = a(r, k);          // hoisted: cache friendly
                for (std::size_t c = 0; c < b.cols_; ++c) {
                    result(r, c) += factor * b(k, c);
                }
            }
        }
        return result;
    }

    friend std::ostream& operator<<(std::ostream& out, const Matrix& m) {
        for (std::size_t r = 0; r < m.rows_; ++r) {
            out << "[ ";
            for (std::size_t c = 0; c < m.cols_; ++c) out << m(r, c) << ' ';
            out << "]\\n";
        }
        return out;
    }

private:
    void checkBounds(std::size_t r, std::size_t c) const {
        if (r >= rows_ || c >= cols_) throw std::out_of_range("matrix index");
    }
    void requireSameShape(const Matrix& other) const {
        if (rows_ != other.rows_ || cols_ != other.cols_) {
            throw std::invalid_argument("matrix shapes differ");
        }
    }

    std::size_t rows_ = 0;
    std::size_t cols_ = 0;
    std::vector<T> data_;
};`,
        output: `Matrix<double> a{{1, 2}, {3, 4}};
Matrix<double> b{{5, 6}, {7, 8}};

std::cout << a + b;
[ 6 8 ]
[ 10 12 ]

std::cout << a * b;
[ 19 22 ]
[ 43 50 ]

std::cout << a.transposed();
[ 1 3 ]
[ 2 4 ]

a(5, 5)            -> throws std::out_of_range
a * Matrix<>(3,3)  -> throws std::invalid_argument: inner dimensions do not match`,
      },
      question: {
        kind: 'mcq',
        prompt:
          '`Matrix` defines no destructor, copy constructor, or assignment operator, yet copying one works correctly and nothing leaks. Why?',
        options: [
          'The compiler special-cases template classes',
          'Its only resource-holding member is a `std::vector`, which already copies, moves and frees correctly — so the compiler-generated special members are right (the Rule of Zero)',
          'Matrices cannot be copied',
          'Because `operator=` is defaulted explicitly',
        ],
        answer: 1,
        explain:
          'The generated copy constructor copies each member, and copying a `std::vector` deep-copies its buffer. The generated move constructor moves each member, so the vector transfers its pointer. The generated destructor destroys each member, freeing the buffer. Choosing self-managing members means there is no special-member code to get wrong — which is the goal.',
        hint: 'What does the compiler-generated copy constructor do to a `std::vector` member?',
      },
    },
  ],
}

export default level
