import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Your first window and your first triangle',
  summary:
    'C++ from zero, taught entirely through graphics. Set up a compiler and OpenGL, open a window, clear it to a colour, animate it, and get a real triangle onto the screen using variables, types and loops.',
  outcomes: [
    'Build a C++ + OpenGL project from the command line',
    'Open a window and run a render loop',
    'Use variables, types and arithmetic to control what you see',
    'Understand the GPU pipeline and normalised device coordinates',
    'Create buffers, write shaders and draw a triangle',
    'Respond to keyboard input',
  ],
  steps: [
    {
      id: 'gl-b-01',
      title: 'What OpenGL is, and what you are about to do',
      read: `Your computer has two processors. The **CPU** runs your C++ and is very fast at complicated, sequential work. The **GPU** has thousands of small cores and is astonishingly fast at doing the *same simple thing* to millions of pieces of data — which is exactly what drawing pixels is.

**OpenGL** is the interface your C++ uses to give the GPU work.

## The shape of every graphics program

1. Open a window
2. Send some geometry to the GPU once
3. Loop, forever: clear the screen, draw, show the result, handle input

That loop runs 60+ times a second. Everything you see on screen is redrawn from scratch each time.

## Why learn C++ this way

You will learn exactly the same language as the normal C++ track — variables, loops, functions, classes, memory — but every concept produces something you can *see*. A bug is not a wrong number in a terminal; it is a triangle in the wrong place. That feedback makes the ideas stick.

## What you need

- **GLFW** — creates the window and reads the keyboard/mouse
- **GLAD** — loads the OpenGL functions your driver provides
- A C++ compiler

This first level gets all of that working and puts a coloured triangle on screen. That is a genuinely significant milestone — most of the difficulty in graphics is the first triangle.`,
      sample: {
        lang: 'cpp',
        caption: 'The skeleton of every graphics program you will ever write',
        code: `#include <iostream>

int main() {
    // 1. set up: window, OpenGL, geometry
    std::cout << "Setting up...\\n";

    // 2. the render loop — runs ~60 times a second
    int frame = 0;
    while (frame < 3) {
        std::cout << "Frame " << frame << ": clear, draw, present\\n";
        ++frame;
    }

    // 3. clean up
    std::cout << "Done.\\n";
    return 0;
}`,
        output: `Setting up...
Frame 0: clear, draw, present
Frame 1: clear, draw, present
Frame 2: clear, draw, present
Done.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is the GPU better suited than the CPU to drawing graphics?',
        options: [
          'It runs at a higher clock speed',
          'It has thousands of simple cores that apply the same operation to millions of vertices and pixels in parallel',
          'It has more memory',
          'It is closer to the screen',
        ],
        answer: 1,
        explain:
          'A 4K screen is over 8 million pixels, each needing roughly the same calculation. A CPU with 8 fast cores would do them one after another; a GPU with thousands of small cores does them concurrently. Graphics is the ideal parallel problem.',
        hint: 'How many pixels need the same calculation each frame?',
      },
    },

    {
      id: 'gl-b-02',
      title: 'Setting up the project',
      read: `## Install a compiler

- **Windows** — MSYS2 (msys2.org), then \`pacman -S mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-glfw\`
- **Mac** — \`xcode-select --install\`, then \`brew install glfw\`
- **Linux** — \`sudo apt install build-essential libglfw3-dev\`

## Get GLAD

OpenGL functions are provided by your graphics driver and must be looked up at runtime. GLAD generates the code that does it.

Go to *glad.dav1d.de*: Language **C/C++**, Specification **OpenGL**, API gl **Version 3.3**, Profile **Core**, tick **Generate a loader**. Download, and you get \`glad.c\` plus \`include/glad/glad.h\` and \`include/KHR/khrplatform.h\`.

## The layout

\`\`\`
project/
  include/glad/glad.h
  include/KHR/khrplatform.h
  src/glad.c
  src/main.cpp
\`\`\`

## Building

\`\`\`
g++ -std=c++20 -Iinclude src/main.cpp src/glad.c -o app -lglfw -ldl
\`\`\`

- \`-Iinclude\` — where to find headers
- \`-lglfw\` — link the GLFW library
- \`-ldl\` — needed on Linux for dynamic loading (omit on Mac; on Mac add \`-framework OpenGL\`)

## Include order matters

\`glad.h\` **must** come before \`glfw3.h\`. GLAD defines the OpenGL types, and GLFW will include a conflicting system header if it gets there first. This causes hundreds of confusing errors, and it is always this.`,
      sample: {
        lang: 'bash',
        caption: 'Build commands per platform',
        code: `# Linux
g++ -std=c++20 -Wall -Wextra -Iinclude src/main.cpp src/glad.c -o app -lglfw -ldl
./app

# macOS
g++ -std=c++20 -Wall -Wextra -Iinclude src/main.cpp src/glad.c -o app \\
    -lglfw -framework OpenGL
./app

# Windows (MSYS2 UCRT64)
g++ -std=c++20 -Wall -Wextra -Iinclude src/main.cpp src/glad.c -o app.exe -lglfw3
./app.exe`,
        output: `(a black window appears)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must `#include <glad/glad.h>` come before `#include <GLFW/glfw3.h>`?',
        options: [
          'Alphabetical order is required',
          'GLAD defines the OpenGL types and function declarations; if GLFW is first it includes a conflicting system OpenGL header, producing a wall of redefinition errors',
          'GLFW depends on GLAD being initialised',
          'It does not matter',
        ],
        answer: 1,
        explain:
          'GLFW includes a system `<GL/gl.h>` unless something has already provided the definitions. GLAD sets a guard macro that prevents that — but only if it is included first. This is by far the most common setup error in OpenGL.',
        hint: '`#include` is textual and order-sensitive.',
      },
    },

    {
      id: 'gl-b-03',
      title: 'Opening a window',
      read: `Here is your first real program. Every line does something, and several of them introduce C++ ideas you will use constantly.

## The C++ you are meeting

- \`int main()\` — where execution starts
- \`if (condition) { ... }\` — a decision
- \`while (condition) { ... }\` — a loop
- \`return 0;\` / \`return -1;\` — the exit code: 0 means success
- \`nullptr\` — "no object"
- \`GLFWwindow*\` — a **pointer**: a variable holding the address of something. GLFW creates the window and hands you its address.

## The OpenGL/GLFW calls

- \`glfwInit()\` — start GLFW
- \`glfwWindowHint(...)\` — ask for OpenGL 3.3 Core **before** creating the window
- \`glfwCreateWindow(w, h, title, ...)\` — returns a pointer, or \`nullptr\` on failure. **Always check.**
- \`glfwMakeContextCurrent(window)\` — "OpenGL calls now apply to this window"
- \`gladLoadGLLoader(...)\` — find all the OpenGL functions. Must come after the context is current.
- \`glfwWindowShouldClose(window)\` — becomes true when the user clicks the X
- \`glfwSwapBuffers(window)\` — show the frame you just drew
- \`glfwPollEvents()\` — process keyboard, mouse and window events

## Double buffering

You draw into a hidden **back buffer** and then swap it to the screen. If you drew directly to the visible buffer, you would see the image being built — a flickering, torn mess.`,
      sample: {
        lang: 'cpp',
        caption: 'A complete program: a real window with a working render loop',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

int main() {
    if (!glfwInit()) {
        std::cerr << "Failed to initialise GLFW\\n";
        return -1;
    }

    // ask for OpenGL 3.3 Core BEFORE creating the window
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(800, 600, "My First Window",
                                          nullptr, nullptr);
    if (window == nullptr) {
        std::cerr << "Failed to create the window\\n";
        glfwTerminate();
        return -1;
    }

    glfwMakeContextCurrent(window);

    if (!gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress))) {
        std::cerr << "Failed to load OpenGL functions\\n";
        glfwTerminate();
        return -1;
    }

    std::cout << "OpenGL " << glGetString(GL_VERSION) << "\\n";
    std::cout << "GPU:    " << glGetString(GL_RENDERER) << "\\n";

    // the render loop
    while (!glfwWindowShouldClose(window)) {
        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}`,
        output: `OpenGL 3.3.0 NVIDIA 550.107.02
GPU:    NVIDIA GeForce RTX 3060/PCIe/SSE2

(an 800x600 window appears, black or full of garbage, and stays open
 until you close it)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the purpose of `glfwSwapBuffers(window)` at the end of each loop pass?',
        options: [
          'It clears the screen',
          'It swaps the hidden back buffer you drew into with the visible front buffer, so a complete frame appears at once instead of being drawn in view',
          'It waits for the next frame',
          'It sends the geometry to the GPU',
        ],
        answer: 1,
        explain:
          'Double buffering means the viewer only ever sees finished frames. Drawing straight to the visible buffer would show the image being assembled — flickering and tearing. The swap is what makes animation look solid.',
        hint: 'Why are there two buffers at all?',
      },
    },

    {
      id: 'gl-b-04',
      title: 'Clearing the screen — variables and floats',
      read: `The window is currently full of whatever was in GPU memory. Every frame starts by clearing it.

\`\`\`cpp
glClearColor(0.2f, 0.3f, 0.4f, 1.0f);
glClear(GL_COLOR_BUFFER_BIT);
\`\`\`

- \`glClearColor\` **sets** the colour to clear to. It does not clear anything.
- \`glClear\` actually does the clearing.

That split is typical of OpenGL: it is a **state machine**. You set state, then issue commands that use it.

## Colour in OpenGL

Four channels: red, green, blue, alpha (opacity). Each is a **float from 0.0 to 1.0**, not 0–255.

- \`(1.0f, 0.0f, 0.0f, 1.0f)\` — pure red
- \`(0.0f, 0.0f, 0.0f, 1.0f)\` — black
- \`(1.0f, 1.0f, 1.0f, 1.0f)\` — white
- \`(0.5f, 0.5f, 0.5f, 1.0f)\` — mid grey

## The C++: float vs double

- **\`float\`** — 32-bit decimal. The \`f\` suffix (\`0.2f\`) makes a literal a float. **Graphics uses floats everywhere** because GPUs are built for 32-bit maths.
- **\`double\`** — 64-bit, more precise, what ordinary C++ prefers.

Leave the \`f\` off and you write a \`double\` which is then converted — harmless here, but \`-Wall\` will mention it, and in a large array of vertex data the difference is real.

Group related values in a \`struct\` so a colour is one thing rather than four loose numbers.`,
      sample: {
        lang: 'cpp',
        caption: 'A struct for colour, and the clear happening every frame',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

struct Colour {
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;
    float a = 1.0f;
};

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "Clear Colour",
                                          nullptr, nullptr);
    glfwMakeContextCurrent(window);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));

    const Colour background{0.15f, 0.18f, 0.28f, 1.0f};
    std::cout << "Clearing to (" << background.r << ", "
              << background.g << ", " << background.b << ")\\n";

    while (!glfwWindowShouldClose(window)) {
        glClearColor(background.r, background.g, background.b, background.a);
        glClear(GL_COLOR_BUFFER_BIT);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}`,
        output: `Clearing to (0.15, 0.18, 0.28)

(the window is now a solid dark blue-grey, every frame)`,
      },
      question: {
        kind: 'code',
        lang: 'cpp',
        prompt:
          'Write the `glClearColor` call that would make the window pure red and fully opaque. Use float literals.',
        starter: 'glClearColor(',
        mustInclude: [
          'glClearColor\\s*\\(\\s*1(\\.0)?f?\\s*,\\s*0(\\.0)?f?\\s*,\\s*0(\\.0)?f?\\s*,\\s*1(\\.0)?f?\\s*\\)',
        ],
        solution: 'glClearColor(1.0f, 0.0f, 0.0f, 1.0f);',
        explain:
          'The four arguments are red, green, blue and alpha, each from 0.0 to 1.0 — not 0 to 255. Full red, no green, no blue, and alpha 1.0 for fully opaque. The `f` suffix makes each literal a `float` rather than a `double`.',
        hint: 'Red at maximum, green and blue at zero, alpha at maximum.',
      },
    },

    {
      id: 'gl-b-05',
      title: 'Handling input — if statements and functions',
      read: `Right now the only way to close the window is the X button. Let us handle the Escape key.

\`\`\`cpp
void processInput(GLFWwindow* window) {
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
        glfwSetWindowShouldClose(window, true);
    }
}
\`\`\`

## The C++ you are meeting

**Functions.** \`void\` means "returns nothing". \`GLFWwindow* window\` is a parameter — a pointer to the window. Calling \`processInput(window)\` runs the body with that argument.

Why bother? Because the render loop stays readable: \`processInput(window)\` says what happens without 30 lines of key checks in the middle of your drawing code. One job per function.

**if statements.** Condition in round brackets, body in braces. \`==\` compares (\`=\` would assign — a real bug the compiler may not catch).

## Polling vs events

\`glfwGetKey\` **polls**: it asks "is this key down right now?", every frame. That is right for movement — hold W and you keep moving.

For "did this key just get pressed once?" you either track the previous state yourself or use a **callback** (a function GLFW calls when an event happens). You will meet callbacks in the next level.

## Bool

\`bool\` holds \`true\` or \`false\`. \`glfwSetWindowShouldClose(window, true)\` sets the flag that ends your loop.`,
      sample: {
        lang: 'cpp',
        caption: 'Input in its own function, changing state the loop reads',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

struct Colour { float r, g, b, a; };

// pick a background colour from the keys held down
Colour readColour(GLFWwindow* window) {
    if (glfwGetKey(window, GLFW_KEY_R) == GLFW_PRESS) return {0.6f, 0.1f, 0.1f, 1.0f};
    if (glfwGetKey(window, GLFW_KEY_G) == GLFW_PRESS) return {0.1f, 0.6f, 0.1f, 1.0f};
    if (glfwGetKey(window, GLFW_KEY_B) == GLFW_PRESS) return {0.1f, 0.1f, 0.6f, 1.0f};
    return {0.15f, 0.18f, 0.28f, 1.0f};
}

void processInput(GLFWwindow* window) {
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
        glfwSetWindowShouldClose(window, true);
    }
}

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "Press R/G/B",
                                          nullptr, nullptr);
    glfwMakeContextCurrent(window);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));

    std::cout << "Hold R, G or B. Escape quits.\\n";

    while (!glfwWindowShouldClose(window)) {
        processInput(window);

        const Colour c = readColour(window);
        glClearColor(c.r, c.g, c.b, c.a);
        glClear(GL_COLOR_BUFFER_BIT);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}`,
        output: `Hold R, G or B. Escape quits.

(the window turns red, green or blue while you hold the key,
 and returns to dark blue-grey when you let go)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does `glfwGetKey` need to be called every frame rather than once at the start?',
        options: [
          'Because GLFW forgets the key state',
          'It reports whether the key is down *right now*, so checking it each frame is what lets the program react continuously while a key is held',
          'Because the window is redrawn',
          'It only works inside a loop',
        ],
        answer: 1,
        explain:
          'Polling reads the current state. Asking once would tell you about a single instant at startup. Per-frame polling is exactly what you want for held keys — movement, acceleration, holding a colour — which is most game input.',
        hint: 'What does "poll" mean compared with "get notified"?',
      },
    },

    {
      id: 'gl-b-06',
      title: 'Animation — time, maths and the float type',
      read: `A static colour is dull. Let us make it change over time.

\`\`\`cpp
float time = static_cast<float>(glfwGetTime());
float green = std::sin(time) * 0.5f + 0.5f;
\`\`\`

- \`glfwGetTime()\` returns seconds since \`glfwInit\`, as a \`double\`
- \`std::sin\` (from \`<cmath>\`) oscillates smoothly between −1 and +1
- \`* 0.5f + 0.5f\` remaps that into 0 to 1 — the range OpenGL colours need

That remap is worth understanding, because you will do it constantly: multiply to change the *size* of the range, add to move its *centre*.

## The C++: casting

\`static_cast<float>(x)\` converts explicitly. C++ would convert a \`double\` to a \`float\` silently, but writing it out says "I know this loses precision and I meant to".

## Delta time — the idea that matters

Different computers render at different speeds. If you move something "0.01 units per frame", it travels twice as fast on a 120 Hz machine as on a 60 Hz one.

The fix is to measure how long the last frame took and multiply by that:

\`\`\`cpp
float deltaTime = currentFrame - lastFrame;
position += speed * deltaTime;
\`\`\`

Now \`speed\` means "units **per second**" and the motion is identical everywhere. Every real game does this. Learn it now and you will never write frame-rate-dependent movement.`,
      sample: {
        lang: 'cpp',
        caption: 'A pulsing colour, plus a frame counter using delta time',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <cmath>
#include <iostream>

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "Pulsing", nullptr, nullptr);
    glfwMakeContextCurrent(window);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));

    float lastFrame = 0.0f;
    float reportTimer = 0.0f;
    int framesThisSecond = 0;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
            glfwSetWindowShouldClose(window, true);
        }

        // sin gives -1..1; remap to 0..1
        const float green = std::sin(now) * 0.5f + 0.5f;
        const float blue  = std::cos(now * 0.7f) * 0.5f + 0.5f;

        glClearColor(0.1f, green, blue, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        ++framesThisSecond;
        reportTimer += deltaTime;
        if (reportTimer >= 1.0f) {
            std::cout << framesThisSecond << " fps, deltaTime "
                      << deltaTime * 1000.0f << " ms\\n";
            framesThisSecond = 0;
            reportTimer = 0.0f;
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}`,
        output: `60 fps, deltaTime 16.6512 ms
60 fps, deltaTime 16.6408 ms
60 fps, deltaTime 16.6673 ms

(the window slowly cycles through greens and blues)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A cube rotates by `angle += 0.02f` each frame. What goes wrong, and what fixes it?',
        options: [
          'Nothing goes wrong',
          'It spins at different speeds on different machines because the frame rate varies; multiplying by `deltaTime` makes the speed per *second* instead of per *frame*',
          'The angle overflows',
          'It needs to be a double',
        ],
        answer: 1,
        explain:
          'Per-frame movement ties your simulation to the refresh rate: on a 144 Hz monitor everything runs 2.4× faster than on a 60 Hz one. `angle += speed * deltaTime` makes `speed` mean degrees per second, which is identical everywhere.',
        hint: 'How many frames per second does a 144 Hz monitor draw?',
      },
    },

    {
      id: 'gl-b-07',
      title: 'Vertices and normalised device coordinates',
      read: `To draw anything you need **vertices** — points in space.

## Normalised device coordinates

OpenGL works in a fixed coordinate space, whatever the window size:

- x runs from **−1.0 (left)** to **+1.0 (right)**
- y runs from **−1.0 (bottom)** to **+1.0 (top)**
- z runs from −1.0 to +1.0 (depth; ignore it for now)

**(0, 0) is the centre of the screen**, and y points **up** — unlike most 2D graphics APIs where y points down. Anything outside −1..1 is clipped away.

The great thing about this: it is resolution-independent. The same triangle fills the same proportion of an 800×600 window and a 4K one.

## A triangle as an array

\`\`\`cpp
float vertices[] = {
    -0.5f, -0.5f, 0.0f,   // bottom left
     0.5f, -0.5f, 0.0f,   // bottom right
     0.0f,  0.5f, 0.0f,   // top
};
\`\`\`

## The C++: arrays

An **array** is a fixed-size block of values of one type, stored contiguously. \`vertices[0]\` is the first, and counting starts at **zero**.

This is just nine floats in a row. The GPU has no idea they represent three 3D points until you tell it — which is what the next two steps are about.

\`sizeof(vertices)\` gives the total bytes (9 × 4 = 36), which is exactly what OpenGL needs.`,
      sample: {
        lang: 'cpp',
        caption: 'Vertex data, and what the numbers mean',
        code: `#include <iostream>

int main() {
    float vertices[] = {
        // x      y     z
        -0.5f, -0.5f, 0.0f,    // 0: bottom left
         0.5f, -0.5f, 0.0f,    // 1: bottom right
         0.0f,  0.5f, 0.0f,    // 2: top centre
    };

    std::cout << "total bytes: " << sizeof(vertices) << "\\n";
    std::cout << "floats:      " << sizeof(vertices) / sizeof(float) << "\\n";
    std::cout << "vertices:    " << sizeof(vertices) / sizeof(float) / 3 << "\\n\\n";

    for (int v = 0; v < 3; ++v) {
        std::cout << "vertex " << v << ": ("
                  << vertices[v * 3 + 0] << ", "
                  << vertices[v * 3 + 1] << ", "
                  << vertices[v * 3 + 2] << ")\\n";
    }

    return 0;
}`,
        output: `total bytes: 36
floats:      9
vertices:    3

vertex 0: (-0.5, -0.5, 0)
vertex 1: (0.5, -0.5, 0)
vertex 2: (0, 0.5, 0)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'In normalised device coordinates, where is the point (0.0, 1.0)?',
        options: [
          'The bottom-left corner',
          'The centre of the screen',
          'The middle of the top edge',
          'One pixel to the right of centre',
        ],
        answer: 2,
        explain:
          'x = 0 is horizontally centred and y = +1 is the top edge, because y points **up** in OpenGL. (0,0) is the middle of the screen and (−1,−1) is the bottom left.',
        hint: 'Which way does y point, and what is the range?',
      },
    },

    {
      id: 'gl-b-08',
      title: 'Sending data to the GPU: VBO and VAO',
      read: `Your vertices are in CPU memory. The GPU cannot see them. You need to copy them into GPU memory and describe their layout.

## VBO — Vertex Buffer Object

A block of GPU memory holding your vertex data.

\`\`\`cpp
unsigned int VBO;
glGenBuffers(1, &VBO);
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
\`\`\`

## VAO — Vertex Array Object

Records **how to interpret** the buffer: how many numbers per vertex, what type, how far apart. Bind a VAO before drawing and all that configuration comes back.

\`\`\`cpp
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);
\`\`\`

Argument by argument: attribute **0**, **3** components, of type **float**, don't normalise, **stride** 12 bytes to the next vertex, starting at **offset 0**.

## Object names and binding

OpenGL identifies objects by an \`unsigned int\` "name" — really just an ID. You make it current with \`glBind...\`, then subsequent calls affect it. This state-machine style is old-fashioned and easy to get wrong: **a huge share of "nothing appears" bugs are a forgotten bind.**

## The C++: & and casts

\`&VBO\` is the **address** of your variable — \`glGenBuffers\` writes the ID into it. \`(void*)0\` is a historical quirk: the offset is passed as a pointer for backwards compatibility.`,
      sample: {
        lang: 'cpp',
        caption: 'Generate, bind, upload, describe — the setup you do once',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    GLFWwindow* window = glfwCreateWindow(800, 600, "Buffers", nullptr, nullptr);
    glfwMakeContextCurrent(window);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));

    float vertices[] = {
        -0.5f, -0.5f, 0.0f,
         0.5f, -0.5f, 0.0f,
         0.0f,  0.5f, 0.0f,
    };

    unsigned int VAO = 0;
    unsigned int VBO = 0;

    glGenVertexArrays(1, &VAO);     // create the VAO
    glGenBuffers(1, &VBO);          // create the VBO

    glBindVertexArray(VAO);         // start recording into the VAO

    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    // attribute 0: 3 floats, stride 3 floats, offset 0
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE,
                          3 * sizeof(float), static_cast<void*>(0));
    glEnableVertexAttribArray(0);

    glBindVertexArray(0);           // stop recording

    std::cout << "VAO id " << VAO << ", VBO id " << VBO << "\\n";
    std::cout << "uploaded " << sizeof(vertices) << " bytes to the GPU\\n";

    while (!glfwWindowShouldClose(window)) {
        glClearColor(0.15f, 0.18f, 0.28f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
        // nothing drawn yet: we still need shaders
        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glDeleteVertexArrays(1, &VAO);
    glDeleteBuffers(1, &VBO);
    glfwTerminate();
    return 0;
}`,
        output: `VAO id 1, VBO id 1
uploaded 36 bytes to the GPU

(still just a dark window — shaders come next)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the difference between a VBO and a VAO?',
        options: [
          'They are two names for the same thing',
          'The VBO holds the raw vertex data in GPU memory; the VAO records how to interpret that data, so binding it restores the whole layout configuration',
          'The VBO is for 2D and the VAO for 3D',
          'The VAO stores colours and the VBO stores positions',
        ],
        answer: 1,
        explain:
          'The buffer is bytes; the array object is the description of those bytes. Without a VAO you would have to repeat every `glVertexAttribPointer` call before each draw. Binding one VAO restores all of it in a single call.',
        hint: 'One holds data, the other holds a description.',
      },
    },

    {
      id: 'gl-b-09',
      title: 'Shaders: small programs that run on the GPU',
      read: `The GPU will not draw anything until you supply two tiny programs, written in **GLSL**.

## The vertex shader

Runs **once per vertex**. Its job: decide where that vertex ends up.

\`\`\`glsl
#version 330 core
layout (location = 0) in vec3 aPos;

void main() {
    gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}
\`\`\`

- \`#version 330 core\` — matches the OpenGL version you requested
- \`layout (location = 0) in vec3 aPos\` — attribute 0, the one you configured in the VAO
- \`gl_Position\` — a built-in output. Whatever you assign is where the vertex goes.
- \`vec4\` — four floats. The fourth (\`w\`) is 1.0 for a position; it matters when you get to matrices.

## The fragment shader

Runs **once per pixel** the triangle covers. Its job: decide that pixel's colour.

\`\`\`glsl
#version 330 core
out vec4 FragColor;

void main() {
    FragColor = vec4(1.0, 0.5, 0.2, 1.0);
}
\`\`\`

## Why "fragment" and not "pixel"

A fragment is a *candidate* pixel — it may still be discarded by a depth test or blended with what is behind it.

## The scale of it

A triangle filling an 800×600 window generates roughly 480,000 fragments, and the fragment shader runs for every one, every frame. That is why they must be small — and why the GPU has thousands of cores.

GLSL looks like C++ deliberately: same \`if\`, \`for\`, functions and \`float\`. The extra types (\`vec2\`, \`vec3\`, \`vec4\`, \`mat4\`) are built in because graphics uses them constantly.`,
      sample: {
        lang: 'glsl',
        caption: 'The two shaders, and the interpolation that happens between them',
        code: `// ---------- vertex shader ----------
#version 330 core

layout (location = 0) in vec3 aPos;      // from the VBO, attribute 0

out vec3 vertexColour;                    // passed on to the fragment shader

void main() {
    gl_Position = vec4(aPos, 1.0);        // where this vertex goes

    // turn the -1..1 position into a 0..1 colour
    vertexColour = aPos * 0.5 + 0.5;
}

// ---------- fragment shader ----------
#version 330 core

in vec3 vertexColour;                     // interpolated across the triangle
out vec4 FragColor;                       // the final pixel colour

void main() {
    FragColor = vec4(vertexColour, 1.0);
}`,
        output: `The vertex shader runs 3 times (once per vertex).
The fragment shader runs ~480,000 times (once per covered pixel).

Between them the GPU INTERPOLATES: a pixel halfway between two vertices
receives the average of their vertexColour values. That is why the
triangle comes out as a smooth gradient rather than three flat colours.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'For one triangle covering 480,000 pixels, how many times does each shader run?',
        options: [
          'Both run 3 times',
          'Both run 480,000 times',
          'The vertex shader runs 3 times (once per vertex); the fragment shader runs about 480,000 times (once per covered pixel)',
          'The vertex shader runs 480,000 times and the fragment shader 3 times',
        ],
        answer: 2,
        explain:
          'That ratio is the key to graphics performance: work done per vertex is cheap, work done per fragment is enormously more expensive. Moving a calculation from the fragment shader to the vertex shader can be a hundred-thousand-fold saving.',
        hint: 'What does each shader stage process one of?',
      },
    },

    {
      id: 'gl-b-10',
      title: 'Compiling and linking shaders',
      read: `Shaders are **source code as strings** in your program, compiled at runtime by the graphics driver — because only your driver knows your GPU.

The sequence for each shader:

\`\`\`cpp
unsigned int shader = glCreateShader(GL_VERTEX_SHADER);
glShaderSource(shader, 1, &source, nullptr);
glCompileShader(shader);
\`\`\`

Then link both into a **shader program**:

\`\`\`cpp
unsigned int program = glCreateProgram();
glAttachShader(program, vertexShader);
glAttachShader(program, fragmentShader);
glLinkProgram(program);
glUseProgram(program);
\`\`\`

## Check for errors. Always.

If a shader fails to compile, OpenGL says **nothing**. Your screen is simply black and you have no idea why. The check is a dozen lines and it will save you hours:

\`\`\`cpp
int success = 0;
glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
if (!success) {
    char log[512];
    glGetShaderInfoLog(shader, 512, nullptr, log);
    std::cerr << log;
}
\`\`\`

## The C++: raw string literals

\`\`\`cpp
const char* source = R"(
#version 330 core
...
)";
\`\`\`

\`R"( ... )"\` is a **raw string literal**: newlines and quotes are kept exactly as written, with no \`\\n\` escaping. Perfect for embedded shader source.

Delete the individual shaders after linking — the program has its own copy.`,
      sample: {
        lang: 'cpp',
        caption: 'A reusable compile helper with the error checking you must not skip',
        code: `#include <glad/glad.h>
#include <iostream>
#include <string>

const char* vertexSource = R"(
#version 330 core
layout (location = 0) in vec3 aPos;
void main() {
    gl_Position = vec4(aPos, 1.0);
}
)";

const char* fragmentSource = R"(
#version 330 core
out vec4 FragColor;
void main() {
    FragColor = vec4(1.0, 0.5, 0.2, 1.0);
}
)";

unsigned int compileShader(unsigned int type, const char* source) {
    unsigned int shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);

    int success = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (!success) {
        char log[512];
        glGetShaderInfoLog(shader, 512, nullptr, log);
        std::cerr << (type == GL_VERTEX_SHADER ? "VERTEX" : "FRAGMENT")
                  << " shader failed:\\n" << log << "\\n";
        return 0;
    }
    return shader;
}

unsigned int createProgram(const char* vertexSrc, const char* fragmentSrc) {
    unsigned int vertex = compileShader(GL_VERTEX_SHADER, vertexSrc);
    unsigned int fragment = compileShader(GL_FRAGMENT_SHADER, fragmentSrc);
    if (vertex == 0 || fragment == 0) return 0;

    unsigned int program = glCreateProgram();
    glAttachShader(program, vertex);
    glAttachShader(program, fragment);
    glLinkProgram(program);

    int success = 0;
    glGetProgramiv(program, GL_LINK_STATUS, &success);
    if (!success) {
        char log[512];
        glGetProgramInfoLog(program, 512, nullptr, log);
        std::cerr << "Link failed:\\n" << log << "\\n";
        return 0;
    }

    glDeleteShader(vertex);       // the program has its own copy now
    glDeleteShader(fragment);
    return program;
}`,
        output: `(with a deliberate typo, "vec4(aPos, 1.0" missing its bracket:)

VERTEX shader failed:
0:5(28): error: syntax error, unexpected ';', expecting ')'

(without the check, you would simply get a black window and no clue)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What happens if a shader fails to compile and you do not check `GL_COMPILE_STATUS`?',
        options: [
          'The program crashes with a clear message',
          'OpenGL prints an error to the console automatically',
          'Nothing is reported — the program runs, draws nothing, and you get a black window with no explanation',
          'The previous shader is used instead',
        ],
        answer: 2,
        explain:
          'OpenGL is silent by design; errors are only retrieved when you ask. A shader typo therefore looks identical to a wrong camera, a bad buffer or a missing bind. The compile-status check turns a silent mystery into a one-line error message with a line number.',
        hint: 'Does OpenGL report anything you did not ask for?',
      },
    },

    {
      id: 'gl-b-11',
      title: 'Drawing the triangle',
      read: `Everything is in place. The draw call itself is two lines:

\`\`\`cpp
glUseProgram(shaderProgram);
glBindVertexArray(VAO);
glDrawArrays(GL_TRIANGLES, 0, 3);
\`\`\`

\`glDrawArrays(mode, first, count)\`:
- \`GL_TRIANGLES\` — take vertices three at a time and make a triangle from each group
- \`0\` — start at vertex 0
- \`3\` — draw 3 vertices

Other modes: \`GL_LINES\`, \`GL_LINE_STRIP\`, \`GL_TRIANGLE_STRIP\`, \`GL_POINTS\`.

## The full frame

\`\`\`
clear → use program → bind VAO → draw → swap buffers → poll events
\`\`\`

## When nothing appears — the checklist

This is the single most common experience in graphics. Work down the list:

1. Did the shaders compile **and link**? (Check the status.)
2. Did you call \`glUseProgram\` before drawing?
3. Did you bind the VAO before drawing?
4. Did you call \`glEnableVertexAttribArray(0)\`?
5. Are the vertices within −1..1?
6. Is the fragment colour's alpha 1.0? (0.0 is invisible.)
7. Is the triangle the same colour as the background?
8. Is the stride in \`glVertexAttribPointer\` correct?

Nine times out of ten it is 1, 2 or 3.

## Resizing

Add a framebuffer-size callback calling \`glViewport(0, 0, width, height)\`, or the image stretches oddly when the window is resized.`,
      sample: {
        lang: 'cpp',
        caption: 'The complete program — your first triangle',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

const char* vertexSource = R"(
#version 330 core
layout (location = 0) in vec3 aPos;
void main() { gl_Position = vec4(aPos, 1.0); }
)";

const char* fragmentSource = R"(
#version 330 core
out vec4 FragColor;
void main() { FragColor = vec4(1.0, 0.5, 0.2, 1.0); }
)";

unsigned int compileShader(unsigned int type, const char* source);
unsigned int createProgram(const char* v, const char* f);   // from the last step

void onResize(GLFWwindow*, int width, int height) {
    glViewport(0, 0, width, height);
}

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "My First Triangle",
                                          nullptr, nullptr);
    if (!window) { glfwTerminate(); return -1; }

    glfwMakeContextCurrent(window);
    glfwSetFramebufferSizeCallback(window, onResize);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));

    unsigned int program = createProgram(vertexSource, fragmentSource);
    if (program == 0) { glfwTerminate(); return -1; }

    float vertices[] = {
        -0.5f, -0.5f, 0.0f,
         0.5f, -0.5f, 0.0f,
         0.0f,  0.5f, 0.0f,
    };

    unsigned int VAO = 0, VBO = 0;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float),
                          static_cast<void*>(0));
    glEnableVertexAttribArray(0);
    glBindVertexArray(0);

    while (!glfwWindowShouldClose(window)) {
        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
            glfwSetWindowShouldClose(window, true);
        }

        glClearColor(0.15f, 0.18f, 0.28f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(program);
        glBindVertexArray(VAO);
        glDrawArrays(GL_TRIANGLES, 0, 3);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glDeleteVertexArrays(1, &VAO);
    glDeleteBuffers(1, &VBO);
    glDeleteProgram(program);
    glfwTerminate();
    return 0;
}`,
        output: `(an orange triangle, point up, centred on a dark blue-grey background)

        /\\
       /  \\
      /    \\
     /______\\`,
      },
      question: {
        kind: 'fill',
        prompt:
          'You want to draw 2 triangles from a 6-vertex buffer. Write the complete `glDrawArrays` call.',
        placeholder: 'glDrawArrays(...);',
        accept: ['glDrawArrays(GL_TRIANGLES, 0, 6);', 'glDrawArrays(GL_TRIANGLES, 0, 6)'],
        caseSensitive: true,
        explain:
          'The count is the number of **vertices**, not triangles. `GL_TRIANGLES` consumes them three at a time, so 6 vertices produce 2 separate triangles, starting at index 0.',
        hint: 'The third argument counts vertices, not shapes.',
      },
    },

    {
      id: 'gl-b-12',
      title: 'Project: an interactive coloured triangle',
      read: `Everything from this level, plus one new idea that opens up the rest of the course: **per-vertex attributes**.

So far your VBO held only positions. Now each vertex carries a position **and** a colour — six floats instead of three:

\`\`\`cpp
float vertices[] = {
    // position          // colour
    -0.5f, -0.5f, 0.0f,  1.0f, 0.0f, 0.0f,
     0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f,
     0.0f,  0.5f, 0.0f,  0.0f, 0.0f, 1.0f,
};
\`\`\`

Two attributes are configured from the same buffer:

- **stride** becomes \`6 * sizeof(float)\` — the distance from one vertex to the next
- attribute 0 (position) starts at **offset 0**
- attribute 1 (colour) starts at **offset 3 floats**

The GPU then **interpolates** the colours across the triangle, giving a smooth gradient for free.

The program also lets you resize the triangle with the arrow keys, using delta time so the speed is the same on any machine.

> When it works, change the vertex colours, try \`GL_LINE_LOOP\` instead of \`GL_TRIANGLES\`, add a fourth vertex. Breaking things deliberately is the fastest way to learn what each line does.`,
      sample: {
        lang: 'cpp',
        caption: 'Two attributes in one buffer, interpolation, and delta-time input',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

const char* vertexSource = R"(
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aColour;

uniform float uScale;

out vec3 vColour;

void main() {
    gl_Position = vec4(aPos * uScale, 1.0);
    vColour = aColour;
}
)";

const char* fragmentSource = R"(
#version 330 core
in vec3 vColour;
out vec4 FragColor;
void main() { FragColor = vec4(vColour, 1.0); }
)";

unsigned int createProgram(const char* v, const char* f);   // as before

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "Arrow keys resize it",
                                          nullptr, nullptr);
    glfwMakeContextCurrent(window);
    gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));
    glfwSetFramebufferSizeCallback(window,
        [](GLFWwindow*, int w, int h) { glViewport(0, 0, w, h); });

    unsigned int program = createProgram(vertexSource, fragmentSource);
    if (program == 0) { glfwTerminate(); return -1; }

    float vertices[] = {
        // position            // colour
        -0.5f, -0.5f, 0.0f,    1.0f, 0.0f, 0.0f,
         0.5f, -0.5f, 0.0f,    0.0f, 1.0f, 0.0f,
         0.0f,  0.5f, 0.0f,    0.0f, 0.0f, 1.0f,
    };

    unsigned int VAO = 0, VBO = 0;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    const int stride = 6 * sizeof(float);

    // attribute 0: position, 3 floats, offset 0
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride,
                          reinterpret_cast<void*>(0));
    glEnableVertexAttribArray(0);

    // attribute 1: colour, 3 floats, offset 3 floats in
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride,
                          reinterpret_cast<void*>(3 * sizeof(float)));
    glEnableVertexAttribArray(1);

    glBindVertexArray(0);

    const int scaleLocation = glGetUniformLocation(program, "uScale");
    float scale = 1.0f;
    float lastFrame = 0.0f;

    std::cout << "Up/Down arrows resize. Escape quits.\\n";

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
            glfwSetWindowShouldClose(window, true);
        }
        if (glfwGetKey(window, GLFW_KEY_UP) == GLFW_PRESS) {
            scale += 0.8f * deltaTime;          // per second, not per frame
        }
        if (glfwGetKey(window, GLFW_KEY_DOWN) == GLFW_PRESS) {
            scale -= 0.8f * deltaTime;
        }
        if (scale < 0.1f) scale = 0.1f;
        if (scale > 1.9f) scale = 1.9f;

        glClearColor(0.15f, 0.18f, 0.28f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(program);
        glUniform1f(scaleLocation, scale);
        glBindVertexArray(VAO);
        glDrawArrays(GL_TRIANGLES, 0, 3);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glDeleteVertexArrays(1, &VAO);
    glDeleteBuffers(1, &VBO);
    glDeleteProgram(program);
    glfwTerminate();
    return 0;
}`,
        output: `Up/Down arrows resize. Escape quits.

(a triangle with a red corner, a green corner and a blue corner,
 smoothly blended in between, that grows and shrinks with the arrow keys)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'With position and colour interleaved in one buffer, why is the stride `6 * sizeof(float)` for **both** attributes?',
        options: [
          'Because there are 6 vertices',
          'Stride is the distance from one vertex to the next, and each vertex now occupies 6 floats — the attributes differ only in their starting offset',
          'Because colours use 6 components',
          'It should be 3 for position and 3 for colour',
        ],
        answer: 1,
        explain:
          'Stride answers "how far to jump to reach the same attribute of the next vertex?". Both attributes live in vertices that are 24 bytes apart, so both use the same stride; what distinguishes them is the offset — 0 for position, 12 bytes for colour.',
        hint: 'How many bytes from one vertex’s position to the next vertex’s position?',
      },
    },
  ],
}

export default level
