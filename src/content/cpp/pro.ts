import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end',
  summary:
    'Value categories and perfect forwarding, concepts, the memory model and cache, undefined behaviour, custom allocators, concurrency and atomics, type erasure, ranges, compile-time programming and real optimisation.',
  outcomes: [
    'Reason about lvalues, xvalues and prvalues, and forward perfectly',
    'Constrain templates with concepts and understand overload resolution',
    'Design data structures around the cache, not the textbook',
    'Recognise undefined behaviour and catch it with tooling',
    'Write correct concurrent code and choose memory orderings',
    'Profile and optimise from evidence rather than instinct',
  ],
  steps: [
    {
      id: 'cpp-p-01',
      title: 'Value categories and perfect forwarding',
      read: `Every expression in C++ has a **type** and a **value category**.

- **lvalue** — has identity, cannot be moved from: \`x\`, \`v[0]\`, \`*p\`
- **prvalue** — pure value, no identity: \`42\`, \`f()\` returning by value
- **xvalue** — has identity and *can* be moved from: \`std::move(x)\`, \`f()\` returning \`T&&\`

"glvalue" = lvalue + xvalue (has identity). "rvalue" = prvalue + xvalue (movable).

## Forwarding references

\`\`\`cpp
template <typename T>
void wrapper(T&& arg) {         // NOT an rvalue reference
    inner(std::forward<T>(arg));
}
\`\`\`

\`T&&\` where \`T\` is a **deduced template parameter** is a *forwarding reference*, not an rvalue reference. Reference collapsing means: pass an lvalue and \`T\` deduces to \`U&\`, making the parameter \`U&\`; pass an rvalue and \`T\` deduces to \`U\`, making it \`U&&\`.

## Why std::forward, not std::move

Inside the function, \`arg\` is a **named variable**, therefore an lvalue — even if it was initialised from an rvalue. \`std::move(arg)\` would move unconditionally, stealing from a caller's lvalue. \`std::forward<T>(arg)\` casts back to the original category: move only if the caller passed a temporary.

This is how \`emplace_back\`, \`make_unique\` and every wrapper in the standard library pass arguments through without copies.

## The rule

\`std::move\` for a genuine rvalue reference parameter (\`T&&\` with a concrete \`T\`). \`std::forward\` for a forwarding reference. Never mix them up.`,
      sample: {
        lang: 'cpp',
        caption: 'The same call chain, with and without forwarding',
        code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

void inner(std::string& s)       { std::cout << "  lvalue: " << s << "\\n"; }
void inner(std::string&& s)      { std::cout << "  rvalue: " << s << "\\n"; }

template <typename T>
void broken(T&& arg) { inner(arg); }                     // always lvalue

template <typename T>
void forwarding(T&& arg) { inner(std::forward<T>(arg)); }  // preserves category

// building an object in place: no temporary, no move
struct Widget {
    std::string name;
    int size;
    Widget(std::string n, int s) : name(std::move(n)), size(s) {
        std::cout << "  Widget(" << name << ") constructed\\n";
    }
    Widget(const Widget&) { std::cout << "  Widget COPIED\\n"; }
    Widget(Widget&&) noexcept { std::cout << "  Widget MOVED\\n"; }
};

int main() {
    std::string named = "named";

    std::cout << "broken:\\n";
    broken(named);
    broken(std::string("temporary"));     // still calls the lvalue overload

    std::cout << "forwarding:\\n";
    forwarding(named);
    forwarding(std::string("temporary")); // correctly calls the rvalue overload

    std::cout << "push_back vs emplace_back:\\n";
    std::vector<Widget> widgets;
    widgets.reserve(2);
    widgets.push_back(Widget("pushed", 1));     // construct, then move
    widgets.emplace_back("emplaced", 2);        // construct in place

    return 0;
}`,
        output: `broken:
  lvalue: named
  lvalue: temporary
forwarding:
  lvalue: named
  rvalue: temporary
push_back vs emplace_back:
  Widget(pushed) constructed
  Widget MOVED
  Widget(emplaced) constructed`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Inside `template <typename T> void f(T&& arg)`, why is `arg` itself an lvalue even when the caller passed a temporary?',
        options: [
          'Because `T&&` is always an lvalue reference',
          'Because `arg` is a named variable, and anything with a name is an lvalue — its value category is independent of what initialised it',
          'Because the compiler copies the argument',
          'It is not; `arg` is an rvalue',
        ],
        answer: 1,
        explain:
          'Value category is a property of the *expression*, and a named variable is always an lvalue. That is deliberate: it stops you accidentally moving from something twice. `std::forward<T>` restores the original category using the deduced `T`, which is the only record of how it was called.',
        hint: 'Could you safely use `arg` twice if it were an rvalue?',
      },
    },

    {
      id: 'cpp-p-02',
      title: 'Concepts and overload resolution',
      read: `Before C++20, constraining a template meant **SFINAE**: "Substitution Failure Is Not An Error". You wrote \`std::enable_if_t<...>\` in a return type so that ill-formed substitutions removed the overload from consideration instead of erroring. It worked, and it was unreadable.

## Concepts

\`\`\`cpp
template <typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template <Numeric T>
T half(T value) { return value / 2; }
\`\`\`

Three benefits:
1. **Readable** — the constraint is named and appears in the signature
2. **Error messages at the call site** — "constraint not satisfied", not forty lines from inside a header
3. **They participate in overload resolution** — a more constrained overload wins, giving clean specialisation

## requires

\`\`\`cpp
template <typename T>
concept Drawable = requires(const T& t) {
    { t.draw() } -> std::same_as<void>;
    { t.bounds() } -> std::convertible_to<Rect>;
};
\`\`\`

A requires-expression checks that expressions **compile**, not that they run. It is a compile-time interface check with no runtime cost and no inheritance.

## Overload resolution order

The compiler builds a candidate set, discards those whose constraints fail, then ranks by conversion quality — exact match beats promotion beats standard conversion beats user-defined conversion. Ambiguity is an error, not a coin flip.

> Concepts give you interfaces without virtual functions: duck typing, checked at compile time.`,
      sample: {
        lang: 'cpp',
        caption: 'A concept hierarchy, and more-constrained overloads winning',
        code: `#include <concepts>
#include <iostream>
#include <list>
#include <string>
#include <vector>

template <typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template <typename T>
concept HasSize = requires(const T& t) {
    { t.size() } -> std::convertible_to<std::size_t>;
};

template <typename T>
concept RandomAccess = HasSize<T> && requires(T& t, std::size_t i) {
    { t[i] };
};

template <Numeric T>
void describe(T value) { std::cout << "number: " << value << "\\n"; }

template <HasSize T>
void describe(const T& container) {
    std::cout << "sized container of " << container.size() << "\\n";
}

// more constrained: wins over HasSize when both match
template <RandomAccess T>
void describe(const T& container) {
    std::cout << "random-access container of " << container.size();
    if (container.size() > 0) std::cout << ", first = " << container[0];
    std::cout << "\\n";
}

template <typename T>
    requires std::is_pointer_v<T>
void describe(T pointer) {
    std::cout << "pointer -> " << (pointer ? "valid" : "null") << "\\n";
}

int main() {
    describe(42);
    describe(3.14);
    describe(std::vector<int>{1, 2, 3});      // RandomAccess wins
    describe(std::list<int>{1, 2, 3});        // only HasSize matches
    describe(std::string("hello"));

    int x = 1;
    describe(&x);

    // describe(nullptr);   // no matching overload: a clear, short error
    return 0;
}`,
        output: `number: 42
number: 3.14
random-access container of 3, first = 1
sized container of 3
random-access container of 5, first = h
pointer -> valid`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Both the `HasSize` and `RandomAccess` overloads match a `std::vector<int>`. Why is there no ambiguity error?',
        options: [
          'The compiler picks the one declared last',
          '`RandomAccess` subsumes `HasSize` — it is strictly more constrained, and partial ordering by constraints prefers the more constrained overload',
          'Vectors only satisfy one of them',
          'Concepts cannot overlap',
        ],
        answer: 1,
        explain:
          'Because `RandomAccess` is defined as `HasSize && ...`, the compiler can prove its constraint set includes the other\'s. Subsumption then makes it strictly better, so it wins without ambiguity. This is how concepts give you clean specialisation — something SFINAE could only emulate with tag-dispatch tricks.',
        hint: 'How is `RandomAccess` defined in terms of `HasSize`?',
      },
    },

    {
      id: 'cpp-p-03',
      title: 'Memory layout and the cache',
      read: `Modern CPUs are roughly 100× faster than main memory. Almost all performance work is about **keeping the CPU fed**.

## The hierarchy

- L1 cache: ~1 ns, 32–64 KB
- L2: ~4 ns, a few hundred KB
- L3: ~12 ns, tens of MB
- RAM: **~80 ns**

A cache miss costs hundreds of instructions' worth of time.

## Cache lines

Memory moves in **64-byte lines**. Touch one byte and you pay for 64 — so data used together should sit together.

## Array of Structs vs Struct of Arrays

\`\`\`cpp
struct Particle { float x, y, z; float r, g, b; float mass; };
std::vector<Particle> particles;              // AoS
\`\`\`

Updating only positions still drags colour and mass through the cache — over half of every line wasted. **SoA** stores each field in its own vector, so a position pass reads only positions. For hot loops this is often a 2–5× difference.

## Struct padding

Members are aligned, so field order changes \`sizeof\`. Order members **largest to smallest** and padding usually disappears.

## What this means in practice

- \`std::vector\` beats \`std::list\` almost always. A linked list is a pointer chase: every node is a likely cache miss.
- Linear search through a small contiguous array beats a "better" tree or hash map more often than you would believe.
- Predictable access patterns let the hardware prefetcher stay ahead of you.

> The textbook complexity is about operation counts. Real performance is about memory locality. When they disagree, measure.`,
      sample: {
        lang: 'cpp',
        caption: 'Padding, AoS vs SoA, and vector vs list — measured',
        code: `#include <chrono>
#include <cstdint>
#include <iostream>
#include <list>
#include <numeric>
#include <vector>

struct Padded   { char a; double b; char c; };          // 24 bytes
struct Packed   { double b; char a; char c; };          // 16 bytes

struct Particle { float x, y, z, r, g, b, mass; };      // AoS

struct ParticlesSoA {                                   // SoA
    std::vector<float> x, y, z, r, g, b, mass;
};

template <typename F>
double timeIt(F&& fn) {
    auto start = std::chrono::steady_clock::now();
    fn();
    auto end = std::chrono::steady_clock::now();
    return std::chrono::duration<double, std::milli>(end - start).count();
}

int main() {
    std::cout << "Padded " << sizeof(Padded)
              << ", Packed " << sizeof(Packed) << "\\n";

    constexpr std::size_t N = 4'000'000;

    std::vector<Particle> aos(N);
    ParticlesSoA soa;
    soa.x.resize(N); soa.y.resize(N); soa.z.resize(N);

    std::cout << "AoS position pass: "
              << timeIt([&] { for (auto& p : aos) p.x += 1.0f; }) << " ms\\n";
    std::cout << "SoA position pass: "
              << timeIt([&] { for (auto& x : soa.x) x += 1.0f; }) << " ms\\n";

    std::vector<int> vec(10'000'000);
    std::iota(vec.begin(), vec.end(), 0);
    std::list<int> lst(vec.begin(), vec.end());

    long long sum = 0;
    std::cout << "vector sum: "
              << timeIt([&] { for (int v : vec) sum += v; }) << " ms\\n";
    sum = 0;
    std::cout << "list sum:   "
              << timeIt([&] { for (int v : lst) sum += v; }) << " ms\\n";

    return 0;
}`,
        output: `Padded 24, Packed 16
AoS position pass: 11.8 ms
SoA position pass: 3.2 ms
vector sum: 6.1 ms
list sum:   68.4 ms`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Summing a `std::list<int>` is roughly ten times slower than summing a `std::vector<int>` with the same values, even though both are O(n). Why?',
        options: [
          '`std::list` uses a slower addition',
          'List nodes are scattered across the heap, so each step is a pointer chase and a likely cache miss; a vector is contiguous, so each 64-byte line delivers 16 ints and the prefetcher can run ahead',
          'The iterator is virtual',
          'Lists store extra copies of the data',
        ],
        answer: 1,
        explain:
          'Complexity counts operations; hardware charges for memory locality. Both do n additions, but the vector gets 16 values per cache line with hardware prefetching, while the list pays a potential ~80ns miss per element. This is why `std::vector` is the right default far more often than data-structure theory suggests.',
        hint: 'Where do the elements physically live in memory?',
      },
    },

    {
      id: 'cpp-p-04',
      title: 'Undefined behaviour',
      read: `**Undefined behaviour** means the standard imposes no requirements at all. The compiler may assume UB never happens — and it optimises on that assumption, which is why UB rarely just "does something odd locally".

## The common sources

- Reading an uninitialised variable
- Out-of-bounds access (array, vector \`[]\`, \`std::string\`)
- Dereferencing null or a dangling pointer
- Signed integer overflow (**unsigned wraps and is well-defined; signed is UB**)
- Data race: two threads, one write, no synchronisation
- Use after move (reading the value), use after free
- Returning a reference to a local
- Violating strict aliasing (reading an object through an unrelated pointer type)
- Infinite loop with no side effects

## Why it is worse than a crash

\`\`\`cpp
int f(int x) {
    if (x + 1 < x) return -1;   // only true on overflow, which is UB
    return x;
}
\`\`\`

Since signed overflow is UB, the compiler proves \`x + 1 < x\` can never be true and **deletes the check**. Your safety test vanishes. That is not a compiler bug; it is the contract.

## Catching it

- \`-fsanitize=undefined,address\` — catches most of it at the moment it happens
- \`-Wall -Wextra -Wpedantic\` — catches some at compile time
- \`-fsanitize=thread\` — data races
- Valgrind, static analysers (clang-tidy), and unit tests run under all of the above

## The habits

Initialise everything. Prefer \`.at()\` while developing. Use containers instead of raw arrays. Never test for overflow *after* it happens — check before.`,
      sample: {
        lang: 'cpp',
        caption: 'UB that the optimiser removes, and how to write it safely',
        code: `#include <cstdint>
#include <iostream>
#include <limits>
#include <vector>

// UB: the check is optimised away because signed overflow "cannot happen"
bool unsafeWouldOverflow(int x) { return x + 1 < x; }

// correct: test before doing the arithmetic
bool safeWouldOverflow(int x) { return x == std::numeric_limits<int>::max(); }

int main() {
    const int big = std::numeric_limits<int>::max();

    std::cout << std::boolalpha;
    std::cout << "unsafe: " << unsafeWouldOverflow(big) << "\\n";  // false at -O2!
    std::cout << "safe:   " << safeWouldOverflow(big) << "\\n";

    // unsigned wraps, and that is well-defined
    unsigned int u = 0;
    std::cout << "0u - 1 = " << u - 1 << "\\n";

    // the classic size_t underflow
    std::vector<int> empty;
    std::cout << "empty.size() - 1 = " << empty.size() - 1 << "\\n";
    for (std::size_t i = 0; i + 1 < empty.size(); ++i) { /* safe form */ }

    // use after move: valid but unspecified — never read it
    std::vector<int> a = {1, 2, 3};
    std::vector<int> b = std::move(a);
    a.clear();                       // fine: putting it back in a known state
    a.push_back(9);                  // fine
    std::cout << a.size() << "\\n";

    std::vector<int> v = {1, 2, 3};
    // std::cout << v[10];           // UB, silent
    try {
        std::cout << v.at(10) << "\\n";   // checked: throws
    } catch (const std::out_of_range& e) {
        std::cout << "caught: " << e.what() << "\\n";
    }

    return 0;
}`,
        output: `unsafe: false
safe:   true
0u - 1 = 4294967295
empty.size() - 1 = 18446744073709551615
1
caught: vector::_M_range_check: __n (which is 10) >= this->size() (which is 3)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why does the compiler delete the `if (x + 1 < x)` overflow check at -O2?',
        options: [
          'It is a compiler bug',
          'Signed overflow is undefined, so the compiler may assume it never occurs — which makes the condition provably false, and provably-false branches are removed',
          'The comparison is always true',
          '`-O2` disables all if statements on integers',
        ],
        answer: 1,
        explain:
          'UB is a promise from you to the compiler that the situation never arises. Given that promise, `x + 1` is always greater than `x`, so the branch is dead code. This is why UB is dangerous in a way ordinary bugs are not: the code you wrote is not the code that runs.',
        hint: 'What is the compiler entitled to assume about undefined behaviour?',
      },
    },

    {
      id: 'cpp-p-05',
      title: 'Allocators and arena allocation',
      read: `\`new\` and \`malloc\` are general-purpose: thread-safe, any size, any lifetime. That generality costs 20–100 ns per call, plus fragmentation and cache-unfriendly scattering.

## Arena / bump allocation

Allocate one big block. To allocate, advance a pointer. To free, **reset the pointer** — freeing everything at once, in constant time.

Perfect where many objects share a lifetime: one frame of a game, one request in a server, one parse of a document. It is often 10–50× faster than individual \`new\`s, and the objects are contiguous, so iterating them is cache-friendly too.

## Pool allocation

Fixed-size blocks with a free list. Constant time, no fragmentation, good for many same-sized objects (particles, nodes, entities).

## Custom allocators in the standard library

\`std::vector<T, MyAlloc<T>>\` — the interface is notoriously awkward. C++17's **polymorphic memory resources** are far more usable:

\`\`\`cpp
std::pmr::monotonic_buffer_resource arena(buffer, sizeof(buffer));
std::pmr::vector<int> v(&arena);
\`\`\`

Now the vector allocates from your stack buffer. Same type regardless of the resource, so it can cross API boundaries.

## When to bother

Only after profiling shows allocation in the hot path. Most code should use \`std::vector\` and \`std::string\` and stop thinking about it. But when allocation *is* the bottleneck — and in games and servers it often is — an arena is the single biggest win available.`,
      sample: {
        lang: 'cpp',
        caption: 'A minimal arena, and the same idea via std::pmr',
        code: `#include <chrono>
#include <cstddef>
#include <iostream>
#include <memory_resource>
#include <string>
#include <vector>

class Arena {
    std::byte* buffer_;
    std::size_t capacity_;
    std::size_t used_ = 0;

public:
    Arena(std::byte* buffer, std::size_t capacity)
        : buffer_(buffer), capacity_(capacity) {}

    void* allocate(std::size_t bytes, std::size_t alignment) {
        const std::size_t aligned = (used_ + alignment - 1) & ~(alignment - 1);
        if (aligned + bytes > capacity_) throw std::bad_alloc{};
        used_ = aligned + bytes;
        return buffer_ + aligned;
    }

    void reset() { used_ = 0; }      // frees everything, in O(1)
    std::size_t used() const { return used_; }
};

template <typename F>
double timeIt(F&& fn) {
    auto start = std::chrono::steady_clock::now();
    fn();
    return std::chrono::duration<double, std::milli>(
        std::chrono::steady_clock::now() - start).count();
}

int main() {
    alignas(std::max_align_t) static std::byte storage[1 << 20];

    Arena arena(storage, sizeof(storage));
    for (int i = 0; i < 100; ++i) arena.allocate(64, alignof(std::max_align_t));
    std::cout << "arena used " << arena.used() << " bytes\\n";
    arena.reset();
    std::cout << "after reset " << arena.used() << " bytes\\n";

    constexpr int N = 200'000;

    double heapTime = timeIt([&] {
        std::vector<std::string> v;
        for (int i = 0; i < N; ++i) v.emplace_back("a reasonably long string here");
    });

    double pmrTime = timeIt([&] {
        std::pmr::monotonic_buffer_resource resource(storage, sizeof(storage));
        std::pmr::vector<std::pmr::string> v(&resource);
        for (int i = 0; i < N; ++i) v.emplace_back("a reasonably long string here");
    });

    std::cout << "heap " << heapTime << " ms\\n";
    std::cout << "pmr  " << pmrTime  << " ms\\n";

    return 0;
}`,
        output: `arena used 6400 bytes
after reset 0 bytes
heap 24.6 ms
pmr  6.9 ms`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the fundamental trade-off of an arena allocator?',
        options: [
          'It uses more memory per object',
          'Allocation becomes a pointer bump and freeing is O(1) for everything at once — but individual objects cannot be freed, so all of them must share a lifetime',
          'It is not thread-safe',
          'Objects cannot have destructors',
        ],
        answer: 1,
        explain:
          'The speed comes precisely from giving up individual deallocation. That makes an arena ideal where lifetimes are naturally grouped — a frame, a request, a parse — and useless where objects die at unrelated times. (Non-trivial destructors also have to be run explicitly, which is why arenas suit trivially-destructible data best.)',
        hint: 'What can an arena not do that `delete` can?',
      },
    },

    {
      id: 'cpp-p-06',
      title: 'Concurrency: threads, mutexes and atomics',
      read: `## The threads

\`std::jthread\` (C++20) joins automatically in its destructor and supports cooperative cancellation via \`std::stop_token\`. Prefer it to \`std::thread\`, which **terminates the program** if destroyed while joinable.

## Data races

Two threads accessing the same memory, at least one writing, with no synchronisation, is **undefined behaviour** — not "a wrong number sometimes". \`++counter\` is read-modify-write and is not atomic.

## Mutexes

\`\`\`cpp
std::mutex m;
{
    std::lock_guard lock(m);     // RAII: unlocks on any exit path
    shared += 1;
}
\`\`\`

Never lock and unlock by hand. Use \`std::lock_guard\`, \`std::unique_lock\` (when you need to unlock early or use a condition variable), or \`std::scoped_lock\` (locks several without deadlocking).

**Deadlock** comes from locking two mutexes in different orders in different threads. Fix it by fixing a global lock order, or by locking both at once with \`std::scoped_lock\`.

## Atomics

\`std::atomic<int>\` makes read-modify-write indivisible, with no mutex. Good for counters and flags.

**Memory ordering:** \`seq_cst\` (the default) is the easiest to reason about and usually fast enough. \`acquire\`/\`release\` is the pairing you want for handing data between two threads. \`relaxed\` guarantees only atomicity, not ordering — correct for a statistics counter, dangerous almost anywhere else.

## The best advice

Share nothing. Give each thread its own data and combine the results at the end. \`std::async\`, futures and message queues are easier to get right than shared mutable state.`,
      sample: {
        lang: 'cpp',
        caption: 'A race, the mutex fix, the atomic fix, and sharing nothing',
        code: `#include <atomic>
#include <future>
#include <iostream>
#include <mutex>
#include <numeric>
#include <thread>
#include <vector>

int main() {
    constexpr int kThreads = 8;
    constexpr int kPerThread = 100'000;

    // 1. broken: a data race
    int racy = 0;
    {
        std::vector<std::jthread> threads;
        for (int t = 0; t < kThreads; ++t) {
            threads.emplace_back([&racy] {
                for (int i = 0; i < kPerThread; ++i) ++racy;   // UB
            });
        }
    }
    std::cout << "racy   " << racy << " (expected " << kThreads * kPerThread << ")\\n";

    // 2. correct: mutex
    int guarded = 0;
    std::mutex mutex;
    {
        std::vector<std::jthread> threads;
        for (int t = 0; t < kThreads; ++t) {
            threads.emplace_back([&] {
                for (int i = 0; i < kPerThread; ++i) {
                    std::lock_guard lock(mutex);
                    ++guarded;
                }
            });
        }
    }
    std::cout << "mutex  " << guarded << "\\n";

    // 3. correct and faster: atomic, relaxed is fine for a pure counter
    std::atomic<int> counter{0};
    {
        std::vector<std::jthread> threads;
        for (int t = 0; t < kThreads; ++t) {
            threads.emplace_back([&counter] {
                for (int i = 0; i < kPerThread; ++i) {
                    counter.fetch_add(1, std::memory_order_relaxed);
                }
            });
        }
    }
    std::cout << "atomic " << counter.load() << "\\n";

    // 4. best: share nothing, combine at the end
    std::vector<std::future<long long>> parts;
    for (int t = 0; t < kThreads; ++t) {
        parts.push_back(std::async(std::launch::async, [] {
            long long local = 0;
            for (int i = 0; i < kPerThread; ++i) local += i;
            return local;
        }));
    }
    long long total = 0;
    for (auto& part : parts) total += part.get();
    std::cout << "futures " << total << "\\n";

    return 0;
}`,
        output: `racy   613842 (expected 800000)
mutex  800000
atomic 800000
futures 3999600000`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Two threads both run `++counter` on a plain `int`. What is wrong with this?',
        options: [
          'Nothing — increment is a single instruction',
          'It is a data race and therefore undefined behaviour: `++` is load-modify-store, and the two threads can interleave and lose updates',
          'It is slow but correct',
          'It only breaks on single-core machines',
        ],
        answer: 1,
        explain:
          '`++counter` compiles to a load, an add and a store. Two threads can both load the same value and both store the same result, losing one increment. The standard classifies this as a data race with undefined behaviour — so the compiler may also cache the value in a register and make it far worse than "occasionally off by one".',
        hint: 'How many machine operations is `++` really?',
      },
    },

    {
      id: 'cpp-p-07',
      title: 'Type erasure',
      read: `Sometimes you need runtime polymorphism without forcing everyone into your inheritance hierarchy. **Type erasure** wraps any type satisfying an interface in a common type — that is how \`std::function\`, \`std::any\` and \`std::shared_ptr\`'s deleter all work.

## The mechanism

\`\`\`cpp
class Drawable {
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };

    template <typename T>
    struct Model : Concept {
        T value;
        void draw() const override { value.draw(); }   // calls T's own draw
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
    };

    std::unique_ptr<Concept> self_;
public:
    template <typename T>
    Drawable(T value) : self_(std::make_unique<Model<T>>(std::move(value))) {}
    void draw() const { self_->draw(); }
};
\`\`\`

The virtual dispatch is still there — it is just hidden inside \`Model<T>\`, which the *wrapper* defines rather than the user's type.

## Why it is worth the machinery

- Any type with a \`draw()\` fits, with **no base class and no source changes** — including types from libraries you cannot modify
- The wrapper has **value semantics**: copy it, put it in a vector, pass it by value
- The interface lives with the wrapper, not scattered across every implementation

## The cost

A heap allocation per object (unless you add small-buffer optimisation) and an indirect call. Use it where the flexibility pays: plugin systems, callbacks, heterogeneous collections.

## The alternative

\`std::variant\` with \`std::visit\` gives a **closed** set of types with no allocation and no virtual call. Closed set → variant. Open set → type erasure.`,
      sample: {
        lang: 'cpp',
        caption: 'Unrelated types in one container, with value semantics',
        code: `#include <iostream>
#include <memory>
#include <string>
#include <utility>
#include <variant>
#include <vector>

class Shape {
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
        virtual double area() const = 0;
        virtual std::unique_ptr<Concept> clone() const = 0;
    };

    template <typename T>
    struct Model final : Concept {
        T value;
        explicit Model(T v) : value(std::move(v)) {}
        void draw() const override { value.draw(); }
        double area() const override { return value.area(); }
        std::unique_ptr<Concept> clone() const override {
            return std::make_unique<Model>(*this);
        }
    };

    std::unique_ptr<Concept> self_;

public:
    template <typename T>
    Shape(T value) : self_(std::make_unique<Model<T>>(std::move(value))) {}

    Shape(const Shape& other) : self_(other.self_->clone()) {}
    Shape(Shape&&) noexcept = default;
    Shape& operator=(Shape other) noexcept { self_.swap(other.self_); return *this; }

    void draw() const { self_->draw(); }
    double area() const { return self_->area(); }
};

// Neither of these inherits from anything.
struct Circle {
    double r;
    void draw() const { std::cout << "circle r=" << r << "\\n"; }
    double area() const { return 3.14159 * r * r; }
};

struct Square {
    double side;
    void draw() const { std::cout << "square " << side << "\\n"; }
    double area() const { return side * side; }
};

int main() {
    std::vector<Shape> shapes;
    shapes.emplace_back(Circle{1.0});
    shapes.emplace_back(Square{2.0});

    double total = 0.0;
    for (const auto& shape : shapes) { shape.draw(); total += shape.area(); }
    std::cout << "total " << total << "\\n";

    auto copies = shapes;                 // real value semantics
    copies[0] = Square{3.0};
    shapes[0].draw();                     // unchanged
    copies[0].draw();

    // the closed-set alternative: no allocation, no virtual call
    using AnyShape = std::variant<Circle, Square>;
    std::vector<AnyShape> fixed = {Circle{1.0}, Square{2.0}};
    for (const auto& s : fixed) {
        std::visit([](const auto& shape) { shape.draw(); }, s);
    }

    return 0;
}`,
        output: `circle r=1
square 2
total 7.14159
circle r=1
square 3
circle r=1
square 2`,
      },
      question: {
        kind: 'mcq',
        prompt: 'When is `std::variant` the better choice over type erasure?',
        options: [
          'Always — variants are simpler',
          'When the set of types is closed and known at compile time: no heap allocation, no virtual dispatch, and exhaustiveness can be checked',
          'When you need value semantics',
          'When the types share a base class',
        ],
        answer: 1,
        explain:
          'A variant stores the value inline and `std::visit` resolves statically, so it is faster — but every possible type must be listed in the declaration. Type erasure accepts types nobody has written yet, at the cost of an allocation and an indirect call. Closed set → variant; open set → type erasure.',
        hint: 'Can a variant accept a type from a plugin loaded at runtime?',
      },
    },

    {
      id: 'cpp-p-08',
      title: 'Compile-time programming',
      read: `C++ can run substantial computation during compilation, producing zero-cost results and catching errors before the program exists.

## constexpr, consteval, constinit

- **\`constexpr\`** — *may* run at compile time; falls back to runtime
- **\`consteval\`** — *must* run at compile time (an immediate function)
- **\`constinit\`** — guarantees compile-time *initialisation*, without implying const. It solves the static initialisation order problem.

Since C++20, \`constexpr\` functions may use loops, local variables, \`if\`, and even allocate — provided the allocation is freed within the same constant evaluation. C++23 allows \`constexpr\` \`std::vector\` and \`std::string\`.

## static_assert

\`\`\`cpp
static_assert(sizeof(Header) == 16, "Header must stay 16 bytes for the wire format");
\`\`\`

A test that runs at compile time and costs nothing. Excellent for invariants about layout, sizes and template parameters.

## if constexpr

\`\`\`cpp
if constexpr (std::is_integral_v<T>) { ... } else { ... }
\`\`\`

The rejected branch is **discarded**, not merely skipped, so it need not even compile for that \`T\`. This replaced a great deal of tag dispatch and SFINAE.

## Where it pays

Lookup tables computed at build time, unit systems checked at compile time, parsers for format strings, protocol layout assertions, and dimensional analysis that makes "metres plus seconds" a build error.

## The cost

Compile time. Heavy compile-time work can dominate your build, and the errors are harder to read. Spend it where it buys safety or removes real runtime work.`,
      sample: {
        lang: 'cpp',
        caption: 'A table built at compile time, if constexpr, and layout assertions',
        code: `#include <array>
#include <cstdint>
#include <iostream>
#include <string_view>
#include <type_traits>

// a lookup table computed during compilation
constexpr std::array<std::uint32_t, 256> makeCrcTable() {
    std::array<std::uint32_t, 256> table{};
    for (std::uint32_t i = 0; i < 256; ++i) {
        std::uint32_t c = i;
        for (int k = 0; k < 8; ++k) {
            c = (c & 1) ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
        }
        table[i] = c;
    }
    return table;
}

constexpr auto kCrcTable = makeCrcTable();     // exists in the binary, not built at runtime

constexpr std::uint32_t crc32(std::string_view text) {
    std::uint32_t c = 0xFFFFFFFFu;
    for (char ch : text) {
        c = kCrcTable[(c ^ static_cast<std::uint8_t>(ch)) & 0xFF] ^ (c >> 8);
    }
    return c ^ 0xFFFFFFFFu;
}

// must be evaluated at compile time
consteval int alwaysCompileTime(int n) { return n * n; }

template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return "integer " + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "float " + std::to_string(value);
    } else {
        return "something else";          // never compiled for numeric T
    }
}

struct PacketHeader {
    std::uint32_t magic;
    std::uint16_t version;
    std::uint16_t flags;
    std::uint64_t length;
};

static_assert(sizeof(PacketHeader) == 16, "wire format must stay 16 bytes");
static_assert(alignof(PacketHeader) == 8);
static_assert(crc32("hello") == 0x3610A686, "CRC implementation changed");

int main() {
    constexpr std::uint32_t hash = crc32("hello");
    std::cout << std::hex << hash << std::dec << "\\n";

    constexpr int squared = alwaysCompileTime(12);
    std::array<int, squared> buffer{};
    std::cout << buffer.size() << "\\n";

    std::cout << describe(42) << "\\n";
    std::cout << describe(3.5) << "\\n";
    std::cout << describe(std::string_view("x")) << "\\n";

    return 0;
}`,
        output: `3610a686
144
integer 42
float 3.500000
something else`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `if constexpr` do that a normal `if` does not?',
        options: [
          'It runs faster at runtime',
          'The branch not taken is discarded and never instantiated, so it does not even need to compile for that template argument',
          'It only works with boolean literals',
          'It evaluates both branches at compile time',
        ],
        answer: 1,
        explain:
          'A normal `if` requires both branches to be valid code for every instantiation, even when one can never run. `if constexpr` discards the untaken branch during instantiation, so `value.size()` in the else-branch is fine even when `T` is `int`. That is what replaced most tag dispatch and SFINAE.',
        hint: 'What must be true of both branches of a normal `if` in a template?',
      },
    },

    {
      id: 'cpp-p-09',
      title: 'Profiling and optimisation',
      read: `## Measure first, always

Intuition about C++ performance is wrong more often than it is right. The bottleneck is almost never where you expect.

- **perf** (Linux) — \`perf record ./app && perf report\`. Sampling, cheap, shows you the hot functions and lines.
- **Instruments** (macOS), **VTune** / **Visual Studio Profiler** (Windows)
- **Google Benchmark** — microbenchmarks done properly, with statistics
- **Compiler Explorer** (godbolt.org) — see the actual assembly for a snippet

## The order of attack

1. **Better algorithm and data structure.** O(n²) → O(n log n) beats every micro-optimisation ever written.
2. **Better memory layout.** Contiguous data, SoA in hot loops, fewer allocations. Usually the biggest remaining win.
3. **Let the compiler help.** \`-O2\` or \`-O3\`, \`-march=native\` (if you control the target hardware), link-time optimisation \`-flto\`, and profile-guided optimisation for the last few percent.
4. **Only then** hand-tune: avoid copies, hoist invariants, help vectorisation, consider intrinsics.

## Benchmarking traps

- Benchmarking a **Debug** build. Numbers from \`-O0\` are meaningless.
- The optimiser deleting your benchmark because the result is unused — use \`benchmark::DoNotOptimize\`.
- Cold cache on the first iteration; warm up first.
- Measuring one run instead of a distribution.

## Knowing when to stop

Set a target from the requirement, not from ambition. Every optimisation costs readability, and unreadable code is where the next bug lives.`,
      sample: {
        lang: 'cpp',
        caption: 'Four versions of one task — note which change mattered',
        code: `#include <algorithm>
#include <chrono>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

template <typename F>
double timeIt(F&& fn) {
    auto start = std::chrono::steady_clock::now();
    fn();
    return std::chrono::duration<double, std::milli>(
        std::chrono::steady_clock::now() - start).count();
}

int main() {
    std::vector<std::string> words;
    words.reserve(50'000);
    for (int i = 0; i < 50'000; ++i) words.push_back("word" + std::to_string(i % 20'000));

    std::size_t found = 0;

    // 1. O(n^2): linear scan for each word
    double v1 = timeIt([&] {
        std::vector<std::string> seen;
        for (const auto& w : words) {
            if (std::find(seen.begin(), seen.end(), w) == seen.end()) seen.push_back(w);
        }
        found = seen.size();
    });

    // 2. better algorithm: hash set
    double v2 = timeIt([&] {
        std::unordered_set<std::string> seen;
        for (const auto& w : words) seen.insert(w);
        found = seen.size();
    });

    // 3. same algorithm, fewer rehashes
    double v3 = timeIt([&] {
        std::unordered_set<std::string> seen;
        seen.reserve(words.size());
        for (const auto& w : words) seen.insert(w);
        found = seen.size();
    });

    // 4. sort + unique: contiguous memory, cache friendly
    double v4 = timeIt([&] {
        std::vector<std::string> copy = words;
        std::sort(copy.begin(), copy.end());
        copy.erase(std::unique(copy.begin(), copy.end()), copy.end());
        found = copy.size();
    });

    std::cout << "unique words: " << found << "\\n";
    std::cout << "1 linear scan   " << v1 << " ms\\n";
    std::cout << "2 hash set      " << v2 << " ms\\n";
    std::cout << "3 + reserve     " << v3 << " ms\\n";
    std::cout << "4 sort + unique " << v4 << " ms\\n";

    return 0;
}`,
        output: `unique words: 20000
1 linear scan   4821.30 ms
2 hash set      18.40 ms
3 + reserve     12.10 ms
4 sort + unique 26.70 ms

$ perf record ./app && perf report
  94.1%  app  [.] std::__find_if<...>
   2.8%  app  [.] operator==(basic_string const&, ...)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Version 1 takes 4.8 seconds and version 2 takes 18 ms. Which change is responsible, and what does that tell you about optimisation priorities?',
        options: [
          'The `reserve` call — always reserve first',
          'The algorithm: O(n²) linear scans became O(n) hash lookups. Algorithmic complexity dominates every micro-optimisation, which is why it is the first thing to fix',
          'Compiler flags',
          'Cache locality',
        ],
        answer: 1,
        explain:
          'A 260× win came from the data structure. `reserve` then bought a further 1.5× — worth having, and trivial next to the first change. This is the whole argument for profiling before optimising: the hot line was `std::find`, and no amount of tuning the loop body would have mattered.',
        hint: 'Compare the size of each improvement.',
      },
    },

    {
      id: 'cpp-p-10',
      title: 'Modules, build times and the modern toolchain',
      read: `## The problem with headers

\`#include\` is textual. A file including \`<vector>\`, \`<string>\` and \`<iostream>\` may pull in **hundreds of thousands of lines**, re-parsed for every \`.cpp\`. That is why C++ builds are slow.

## Modules (C++20)

\`\`\`cpp
export module geometry;
export double area(double r);
\`\`\`
\`\`\`cpp
import geometry;
\`\`\`

A module is compiled **once** into a binary interface. No re-parsing, no macro leakage, no include-order dependence, and no need for include guards. Build-time improvements of 2–10× are realistic.

Tooling support arrived late (GCC 14+, Clang 17+, MSVC, CMake 3.28+) so adoption is still early — but this is the direction.

## What you can do today

- **Include less.** Forward-declare (\`class Widget;\`) when a pointer or reference is enough.
- **Precompiled headers** for the stable third-party headers.
- **ccache** — caches object files; a rebuild of unchanged code becomes instant.
- **Ninja** instead of Make — better parallelism, faster dependency checking.
- **Unity builds** — concatenate translation units. Fast, but hides missing includes.
- **Split large headers.** One giant \`common.h\` means every change rebuilds everything.

## Measure it

\`clang -ftime-trace\` produces a build profile you can open in Chrome's tracing viewer and see exactly which header costs what.

## Package management

**vcpkg** and **Conan** handle dependencies; CMake's \`FetchContent\` is often enough for a small project.`,
      sample: {
        lang: 'cpp',
        caption: 'A module, and the forward-declaration habit that helps today',
        code: `// ===== geometry.cppm (module interface) =====
export module geometry;

import <cmath>;

export namespace geometry {
    constexpr double pi = 3.14159265358979;

    double circleArea(double radius) { return pi * radius * radius; }

    export class Circle {
        double r_;
    public:
        explicit Circle(double r) : r_(r) {}
        double area() const { return circleArea(r_); }
    };
}

// helper NOT exported: invisible to importers, no header-guard games
namespace geometry {
    double internalHelper() { return 0.0; }
}

// ===== main.cpp =====
// import geometry;
// int main() { return static_cast<int>(geometry::Circle(1.0).area()); }

// ===== the forward-declaration habit, usable today =====
// widget.h
#pragma once
#include <memory>
#include <string>

class Renderer;        // forward declaration: no #include "renderer.h" needed

class Widget {
public:
    explicit Widget(std::string name);
    ~Widget();                              // must be out of line for pimpl
    void draw(Renderer& renderer) const;    // a reference needs no definition

private:
    struct Impl;                            // pimpl: hides everything else
    std::unique_ptr<Impl> impl_;
};`,
        output: `$ cmake --build build          # header-based, 120 files
[100%] Built target app        47.3s

$ cmake --build build-modules  # module-based
[100%] Built target app        11.8s

$ clang++ -ftime-trace -c main.cpp
  <iostream>  412 ms
  <vector>    108 ms
  <string>     96 ms
  main.cpp     31 ms   <- your actual code`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can forward-declaring `class Renderer;` in a header speed up builds compared with including `renderer.h`?',
        options: [
          'Forward declarations produce faster code',
          'A pointer or reference to a type needs only its name, so you avoid pasting that whole header — and everything it includes — into every file that includes yours',
          'It reduces the size of the binary',
          'It avoids needing include guards',
        ],
        answer: 1,
        explain:
          'Includes are transitive and textual: including `renderer.h` pulls in whatever *it* includes, for every file downstream. When you only store a pointer or take a reference, the compiler needs the name and nothing more. It also means editing `renderer.h` no longer rebuilds everyone who merely mentions the type.',
        hint: 'What does the compiler actually need to know to declare a reference parameter?',
      },
    },

    {
      id: 'cpp-p-11',
      title: 'Designing an API people can use',
      read: `At this level the code is the easy part. The judgement is in the interface.

## Make wrong code hard to write

- **Types over comments.** \`Rectangle(Width w, Height h)\` cannot be called with the arguments swapped; \`Rectangle(double, double)\` can.
- **Enum class over bool.** \`resize(Keep::Contents)\` beats \`resize(true)\`.
- **Constructors establish invariants.** If an object exists, it is valid.
- **\`[[nodiscard]]\`** on anything whose return value must not be ignored.
- **\`explicit\`** on single-argument constructors.

## Say who owns what, in the type

- \`T&\` / \`const T&\` / \`T*\` — "I am only borrowing this"
- \`std::unique_ptr<T>\` — "I am taking ownership"
- \`std::shared_ptr<T>\` — "we share ownership"
- \`std::span<T>\` / \`std::string_view\` — "a view of your data; it must outlive this call"

A signature that states ownership needs no documentation about it.

## Errors

Pick a strategy per failure kind and be consistent: exceptions for broken invariants, \`std::optional\` for "might be nothing", \`std::expected\` for "failed, and here is why", error codes at API boundaries where exceptions cannot cross.

## Stability

Anything public is a promise. Hide implementation behind pimpl or modules, keep ABI in mind for shared libraries, and deprecate with \`[[deprecated]]\` before removing.

> The best API is one where the obvious code is also the correct code, and the incorrect code does not compile.`,
      sample: {
        lang: 'cpp',
        caption: 'The same API, before and after',
        code: `#include <chrono>
#include <expected>
#include <filesystem>
#include <memory>
#include <span>
#include <string>
#include <string_view>
#include <vector>

// ---------------------------------------------------------------- BEFORE
class BadImage {
public:
    BadImage(int a, int b, bool c, int d);        // what are any of these?
    void resize(int w, int h, bool smooth);
    char* getData();                              // who owns this?
    int save(const char* path);                   // what does the int mean?
};

// ---------------------------------------------------------------- AFTER
namespace img {

enum class Filter { Nearest, Bilinear };
enum class Format { Rgb8, Rgba8, Gray8 };

// strong types: swapping the arguments no longer compiles
struct Width  { int value; };
struct Height { int value; };

enum class SaveError { PermissionDenied, DiskFull, UnsupportedFormat };

class Image {
public:
    // an Image that exists is always valid
    Image(Width width, Height height, Format format);

    // the caller cannot accidentally ignore the result
    [[nodiscard]] static std::expected<Image, std::string>
        load(const std::filesystem::path& path);

    [[nodiscard]] std::expected<void, SaveError>
        save(const std::filesystem::path& path) const;

    void resize(Width width, Height height, Filter filter = Filter::Bilinear);

    // a borrowed view: clearly not owned, and bounds-aware
    [[nodiscard]] std::span<const std::byte> pixels() const;

    [[nodiscard]] int width() const;
    [[nodiscard]] int height() const;
    [[nodiscard]] Format format() const;

private:
    struct Impl;                                  // pimpl: ABI stays stable
    std::unique_ptr<Impl> impl_;
};

}  // namespace img

// at the call site:
//   img::Image thumb(img::Width{128}, img::Height{128}, img::Format::Rgba8);
//   thumb.resize(img::Width{64}, img::Height{64}, img::Filter::Nearest);
//
//   if (auto loaded = img::Image::load("photo.png")) {
//       use(*loaded);
//   } else {
//       report(loaded.error());
//   }
//
//   img::Image(img::Height{128}, img::Width{128}, ...);   // does not compile`,
        output: `The "after" API makes these mistakes impossible rather than documented:

  Image(128, 256, ...)          -> which is width?      FIXED by strong types
  resize(w, h, true)            -> true means what?     FIXED by enum class
  img.save("x")                 -> result ignored       FIXED by [[nodiscard]]
  delete img.getData()          -> who owns it?         FIXED by span
  if (img.save(p) == 0)         -> 0 = success? error?  FIXED by expected`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why replace `Image(int width, int height)` with `Image(Width w, Height h)` using single-field structs?',
        options: [
          'It is faster',
          'The compiler rejects `Image(Height{128}, Width{256})`, so the arguments cannot be silently swapped — a mistake the `int` version accepts happily',
          'It uses less memory',
          'It allows negative values',
        ],
        answer: 1,
        explain:
          'Two parameters of the same primitive type are interchangeable to the compiler and easy to transpose, producing a bug that looks correct at the call site. Strong types cost nothing at runtime (they compile away entirely) and turn that bug into a build error — the single best trade in API design.',
        hint: 'What does the compiler know about two `int` parameters?',
      },
    },

    {
      id: 'cpp-p-12',
      title: 'Capstone: a lock-free ring buffer',
      read: `One component that exercises almost everything in this level: a single-producer, single-consumer queue used in audio engines, game loops and network servers.

The requirements are demanding:
- Never allocate after construction
- Never block or lock
- Correct across two threads on any architecture

What to study in the implementation:

1. **Memory ordering.** The producer's \`store(release)\` on \`head_\` publishes everything it wrote before it. The consumer's \`load(acquire)\` sees all of that. That pair is the whole synchronisation, and it is cheaper than a mutex by an order of magnitude.
2. **False sharing.** \`head_\` and \`tail_\` are padded to separate cache lines. Without that, the two threads' writes invalidate each other's cache line on every operation — often a 5–10× slowdown for variables that are never even read by the other side.
3. **Power-of-two capacity.** \`& mask_\` replaces \`% capacity_\`; a bitwise AND instead of a division.
4. **Relaxed loads of your own index.** Each thread owns one index, so reading it needs no ordering at all.
5. **Placement new and explicit destructors.** Raw storage means constructing and destroying elements by hand — one of the few places that is still the right answer.
6. **\`static_assert\`** enforcing the power-of-two invariant at compile time.

> This is what C++ is for. Nothing else gives you this much control while still being readable — and nothing else makes it this easy to get subtly wrong, which is why every claim here needs a test under ThreadSanitizer.`,
      sample: {
        lang: 'cpp',
        caption: 'spsc_queue.h — wait-free, allocation-free, cache-aware',
        code: `#pragma once

#include <atomic>
#include <cstddef>
#include <memory>
#include <new>
#include <optional>
#include <type_traits>
#include <utility>

namespace lockfree {

#ifdef __cpp_lib_hardware_interference_size
inline constexpr std::size_t kCacheLine = std::hardware_destructive_interference_size;
#else
inline constexpr std::size_t kCacheLine = 64;
#endif

/// Single-producer, single-consumer queue. One thread may push, one may pop.
/// Wait-free: no locks, no allocation after construction.
template <typename T, std::size_t Capacity>
class SpscQueue {
    static_assert(Capacity >= 2, "capacity must be at least 2");
    static_assert((Capacity & (Capacity - 1)) == 0,
                  "capacity must be a power of two so we can mask instead of divide");

public:
    SpscQueue() = default;

    ~SpscQueue() {
        while (pop()) { }                       // destroy anything left behind
    }

    SpscQueue(const SpscQueue&) = delete;
    SpscQueue& operator=(const SpscQueue&) = delete;

    /// Producer thread only.
    template <typename... Args>
    [[nodiscard]] bool emplace(Args&&... args) {
        const std::size_t head = head_.load(std::memory_order_relaxed);   // ours
        const std::size_t next = (head + 1) & kMask;

        // acquire: see the consumer's most recent release
        if (next == tail_.load(std::memory_order_acquire)) return false;  // full

        std::construct_at(slot(head), std::forward<Args>(args)...);

        // release: everything written above is visible before head_ moves
        head_.store(next, std::memory_order_release);
        return true;
    }

    [[nodiscard]] bool push(const T& value) { return emplace(value); }
    [[nodiscard]] bool push(T&& value) { return emplace(std::move(value)); }

    /// Consumer thread only.
    [[nodiscard]] std::optional<T> pop() {
        const std::size_t tail = tail_.load(std::memory_order_relaxed);   // ours

        // acquire: pairs with the producer's release
        if (tail == head_.load(std::memory_order_acquire)) return std::nullopt;

        T* cell = slot(tail);
        std::optional<T> value(std::move(*cell));
        std::destroy_at(cell);

        tail_.store((tail + 1) & kMask, std::memory_order_release);
        return value;
    }

    [[nodiscard]] bool empty() const {
        return head_.load(std::memory_order_acquire) ==
               tail_.load(std::memory_order_acquire);
    }

    [[nodiscard]] std::size_t size_approx() const {
        const std::size_t head = head_.load(std::memory_order_acquire);
        const std::size_t tail = tail_.load(std::memory_order_acquire);
        return (head - tail) & kMask;
    }

    static constexpr std::size_t capacity() { return Capacity - 1; }

private:
    static constexpr std::size_t kMask = Capacity - 1;

    T* slot(std::size_t index) {
        return std::launder(reinterpret_cast<T*>(&storage_[index]));
    }

    using Storage = std::aligned_storage_t<sizeof(T), alignof(T)>;
    std::array<Storage, Capacity> storage_{};

    // padded to separate cache lines: without this the two threads'
    // writes ping-pong one cache line between cores on every operation
    alignas(kCacheLine) std::atomic<std::size_t> head_{0};   // producer writes
    alignas(kCacheLine) std::atomic<std::size_t> tail_{0};   // consumer writes
    char padding_[kCacheLine - sizeof(std::atomic<std::size_t>)]{};
};

}  // namespace lockfree`,
        output: `// producer thread                    // consumer thread
lockfree::SpscQueue<Sample, 1024> q;

while (recording) {                    while (playing) {
    if (!q.push(nextSample()))             if (auto s = q.pop())
        ++dropped;                             output(*s);
}                                      }

$ g++ -std=c++20 -O2 -fsanitize=thread bench.cpp && ./a.out
throughput      41.2 M items/sec
mutex queue      3.8 M items/sec
without padding  6.1 M items/sec   <- false sharing costs 6.7x
ThreadSanitizer: no data races detected`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are `head_` and `tail_` each given their own cache line with `alignas`, when neither thread writes to the other\'s variable?',
        options: [
          'To make the struct a round size',
          'False sharing: on the same 64-byte line, one thread\'s write invalidates the line in the other core\'s cache, forcing a coherency transfer on every operation even though the data is logically independent',
          'Atomics require 64-byte alignment',
          'It prevents the compiler reordering them',
        ],
        answer: 1,
        explain:
          'Cache coherency works per line, not per variable. Two independent atomics sharing a line make every producer write bounce the line away from the consumer\'s core and back. The benchmark shows 6.7×, and it is invisible in the source — which is exactly why knowing about the hardware matters at this level.',
        hint: 'What granularity does the cache coherency protocol work at?',
      },
    },
  ],
}

export default level
