import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Shapes, uniforms and a renderer that is not all in main()',
  summary:
    'Turn the triangle demo into a real program: functions and structs to tame the setup, index buffers for shapes, uniforms to drive shaders from C++, shaders loaded from files, and keyboard-driven movement.',
  outcomes: [
    'Refactor setup code into functions and structs',
    'Draw rectangles and meshes with an element buffer',
    'Send data into shaders every frame with uniforms',
    'Load shader source from files with std::string and ifstream',
    'Store multiple objects in a std::vector and draw them in a loop',
    'Move objects with the keyboard using delta time',
  ],
  steps: [
    {
      id: 'gl-a-01',
      title: 'Functions: getting the setup out of main()',
      read: `Your \`main\` is probably 120 lines by now, and most of it is boilerplate. Time to apply the most useful idea in programming: **give a block of work a name**.

\`\`\`cpp
GLFWwindow* createWindow(int width, int height, const char* title);
unsigned int createProgram(const char* vertexSrc, const char* fragmentSrc);
unsigned int createMesh(const float* vertices, int floatCount);
\`\`\`

Each does one job and returns what it produced. \`main\` becomes readable:

\`\`\`cpp
GLFWwindow* window = createWindow(800, 600, "Demo");
unsigned int program = createProgram(vertexSrc, fragmentSrc);
unsigned int mesh = createMesh(vertices, 18);
\`\`\`

## The C++ you are practising

- **Return types** — \`GLFWwindow*\` returns a pointer, \`unsigned int\` an OpenGL object name
- **Parameters** — \`const char* title\` passes text in without copying it
- **Prototypes** — declare above \`main\`, define below, and the file reads top-down
- **Early return** — check for failure and return immediately. The happy path stays un-indented.

## Why it pays off here specifically

Graphics setup is long, repetitive and order-sensitive. Once \`createProgram\` is written and tested, every future shader is one line. That is the difference between a demo and a program you can keep extending.

> A function you can describe in one sentence without saying "and" is the right size.`,
      sample: {
        lang: 'cpp',
        caption: 'The same program, restructured — note how short main() becomes',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

GLFWwindow* createWindow(int width, int height, const char* title);
unsigned int compileShader(unsigned int type, const char* source);
unsigned int createProgram(const char* vertexSrc, const char* fragmentSrc);

int main() {
    GLFWwindow* window = createWindow(800, 600, "Refactored");
    if (window == nullptr) return -1;

    unsigned int program = createProgram(vertexSource, fragmentSource);
    if (program == 0) return -1;

    while (!glfwWindowShouldClose(window)) {
        processInput(window);
        render(program);
        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}

GLFWwindow* createWindow(int width, int height, const char* title) {
    if (!glfwInit()) {
        std::cerr << "GLFW init failed\\n";
        return nullptr;                       // early return on failure
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(width, height, title, nullptr, nullptr);
    if (window == nullptr) {
        std::cerr << "Window creation failed\\n";
        glfwTerminate();
        return nullptr;
    }

    glfwMakeContextCurrent(window);
    glfwSetFramebufferSizeCallback(window,
        [](GLFWwindow*, int w, int h) { glViewport(0, 0, w, h); });

    if (!gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress))) {
        std::cerr << "GLAD failed\\n";
        glfwTerminate();
        return nullptr;
    }

    std::cout << "OpenGL " << glGetString(GL_VERSION) << "\\n";
    return window;                            // the happy path, un-indented
}`,
        output: `OpenGL 3.3.0 NVIDIA 550.107.02

main() is now 15 lines and says what the program does
rather than how each piece is built.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does `createWindow` return `nullptr` on failure instead of printing an error and carrying on?',
        options: [
          'Because printing is slow',
          'Returning a failure value lets the caller decide what to do, and stops the program continuing with an invalid window — which would crash later, somewhere confusing',
          '`nullptr` is required by GLFW',
          'To save memory',
        ],
        answer: 1,
        explain:
          'A function should report failure rather than assume how to handle it. If setup continued with a null window, the crash would happen inside some later OpenGL call with no obvious cause. Returning early and checking at the call site keeps the failure next to the reason.',
        hint: 'What would happen on the next line that uses the window?',
      },
    },

    {
      id: 'gl-a-02',
      title: 'Structs: bundling what belongs together',
      read: `A mesh is not one number — it is a VAO, a VBO, and a vertex count. Passing three loose values around is how arguments get swapped.

\`\`\`cpp
struct Mesh {
    unsigned int vao = 0;
    unsigned int vbo = 0;
    int vertexCount = 0;
};
\`\`\`

Now \`createMesh\` returns **one** thing, and \`drawMesh(mesh)\` cannot be called with the pieces in the wrong order.

## Default member initialisers

\`unsigned int vao = 0;\` guarantees a sensible value even if someone writes \`Mesh m;\`. Without it the members hold garbage, and passing a garbage VAO to OpenGL produces an invisible, silent failure. **Always give members defaults.**

## Structs with functions

A struct can have member functions, and \`mesh.draw()\` reads better than \`drawMesh(mesh)\`:

\`\`\`cpp
struct Mesh {
    unsigned int vao = 0;
    int vertexCount = 0;

    void draw() const {
        glBindVertexArray(vao);
        glDrawArrays(GL_TRIANGLES, 0, vertexCount);
    }
};
\`\`\`

The trailing \`const\` promises the function does not modify the struct.

## Returning a struct is free

Modern C++ constructs the return value directly in the caller's variable — no copy. Returning a struct by value is the normal, efficient thing to do.`,
      sample: {
        lang: 'cpp',
        caption: 'Mesh and Transform as structs, with behaviour attached',
        code: `#include <glad/glad.h>
#include <iostream>

struct Mesh {
    unsigned int vao = 0;
    unsigned int vbo = 0;
    int vertexCount = 0;

    void draw() const {
        glBindVertexArray(vao);
        glDrawArrays(GL_TRIANGLES, 0, vertexCount);
    }

    void destroy() {
        glDeleteVertexArrays(1, &vao);
        glDeleteBuffers(1, &vbo);
        vao = vbo = 0;
        vertexCount = 0;
    }
};

struct Transform {
    float x = 0.0f;
    float y = 0.0f;
    float scale = 1.0f;

    void move(float dx, float dy) { x += dx; y += dy; }
};

// floatsPerVertex tells us how to configure the attributes
Mesh createMesh(const float* data, int floatCount, int floatsPerVertex) {
    Mesh mesh;
    mesh.vertexCount = floatCount / floatsPerVertex;

    glGenVertexArrays(1, &mesh.vao);
    glGenBuffers(1, &mesh.vbo);

    glBindVertexArray(mesh.vao);
    glBindBuffer(GL_ARRAY_BUFFER, mesh.vbo);
    glBufferData(GL_ARRAY_BUFFER, floatCount * sizeof(float),
                 data, GL_STATIC_DRAW);

    const int stride = floatsPerVertex * sizeof(float);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride,
                          reinterpret_cast<void*>(0));
    glEnableVertexAttribArray(0);

    if (floatsPerVertex >= 6) {
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride,
                              reinterpret_cast<void*>(3 * sizeof(float)));
        glEnableVertexAttribArray(1);
    }

    glBindVertexArray(0);
    std::cout << "mesh: vao " << mesh.vao << ", "
              << mesh.vertexCount << " vertices\\n";
    return mesh;                      // returned by value, no copy made
}`,
        output: `mesh: vao 1, 3 vertices

At the call site:
    Mesh triangle = createMesh(vertices, 18, 6);
    triangle.draw();
    triangle.destroy();`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why give struct members default initialisers like `unsigned int vao = 0;`?',
        options: [
          'It is required by C++',
          'Without them, `Mesh m;` leaves the members holding garbage — and passing a garbage VAO id to OpenGL fails silently, giving you a black screen with no error',
          'It makes the struct smaller',
          'It allows the struct to be copied',
        ],
        answer: 1,
        explain:
          'Uninitialised members are undefined behaviour to read, and OpenGL reports nothing when handed a nonsense object name. A default of 0 makes such mistakes detectable (0 is never a valid object name, so you can check for it) instead of invisible.',
        hint: 'What does OpenGL do when you bind an id that was never created?',
      },
    },

    {
      id: 'gl-a-03',
      title: 'Element buffers: drawing a rectangle',
      read: `A rectangle is two triangles — six vertices. But the two triangles share an edge, so two of those vertices are duplicates.

## The EBO

An **Element Buffer Object** holds **indices** into your vertex array:

\`\`\`cpp
float vertices[] = {   // 4 unique corners
     0.5f,  0.5f, 0.0f,
     0.5f, -0.5f, 0.0f,
    -0.5f, -0.5f, 0.0f,
    -0.5f,  0.5f, 0.0f,
};

unsigned int indices[] = {
    0, 1, 3,   // first triangle
    1, 2, 3,   // second triangle
};
\`\`\`

Four vertices instead of six. On a real model with thousands of shared vertices, that saving is enormous — and the GPU caches transformed vertices, so reusing indices is faster as well as smaller.

## Drawing

\`\`\`cpp
glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);
\`\`\`

The count is now the number of **indices**, not vertices.

## The rule you must not break

The EBO binding is stored **in the VAO**. So:

1. Bind the VAO
2. Bind and fill the EBO
3. **Unbind the VAO first**, then the EBO — never the other way round

Unbinding \`GL_ELEMENT_ARRAY_BUFFER\` while the VAO is still bound removes the EBO from the VAO, and nothing draws. This trips up nearly everyone once.

## Winding order

Vertices listed counter-clockwise are "front facing" by default. It matters when you enable face culling later.`,
      sample: {
        lang: 'cpp',
        caption: 'Four vertices, six indices, and the unbind order that matters',
        code: `#include <glad/glad.h>
#include <iostream>

struct IndexedMesh {
    unsigned int vao = 0, vbo = 0, ebo = 0;
    int indexCount = 0;

    void draw() const {
        glBindVertexArray(vao);
        glDrawElements(GL_TRIANGLES, indexCount, GL_UNSIGNED_INT, nullptr);
    }
};

IndexedMesh createRectangle() {
    float vertices[] = {
        // position           // colour
         0.5f,  0.5f, 0.0f,   1.0f, 0.0f, 0.0f,   // 0 top right
         0.5f, -0.5f, 0.0f,   0.0f, 1.0f, 0.0f,   // 1 bottom right
        -0.5f, -0.5f, 0.0f,   0.0f, 0.0f, 1.0f,   // 2 bottom left
        -0.5f,  0.5f, 0.0f,   1.0f, 1.0f, 0.0f,   // 3 top left
    };

    unsigned int indices[] = {
        0, 1, 3,      // first triangle
        1, 2, 3,      // second triangle
    };

    IndexedMesh mesh;
    mesh.indexCount = 6;

    glGenVertexArrays(1, &mesh.vao);
    glGenBuffers(1, &mesh.vbo);
    glGenBuffers(1, &mesh.ebo);

    glBindVertexArray(mesh.vao);

    glBindBuffer(GL_ARRAY_BUFFER, mesh.vbo);
    glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, mesh.ebo);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

    const int stride = 6 * sizeof(float);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride,
                          reinterpret_cast<void*>(0));
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride,
                          reinterpret_cast<void*>(3 * sizeof(float)));
    glEnableVertexAttribArray(1);

    glBindVertexArray(0);                            // VAO first...
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0);        // ...EBO after

    std::cout << "rectangle: 4 vertices, 6 indices\\n";
    return mesh;
}`,
        output: `rectangle: 4 vertices, 6 indices

(a rectangle filling the middle of the window, with a different colour
 at each corner blended smoothly across it)

Without the EBO: 6 vertices x 6 floats = 144 bytes
With the EBO:    4 vertices x 6 floats + 6 indices = 120 bytes
On a 10,000-triangle model the saving is roughly half.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must you unbind the VAO *before* unbinding `GL_ELEMENT_ARRAY_BUFFER`?',
        options: [
          'It makes no difference',
          'The EBO binding is part of the VAO’s state, so unbinding the EBO while the VAO is bound records "no index buffer" in the VAO and nothing draws',
          'The EBO must be deleted first',
          'OpenGL requires alphabetical order',
        ],
        answer: 1,
        explain:
          'A VAO remembers which element buffer is bound. Setting `GL_ELEMENT_ARRAY_BUFFER` to 0 while the VAO is current is a real state change on that VAO. Unbind the VAO first and its recorded EBO is preserved. (`GL_ARRAY_BUFFER` is *not* stored in the VAO, which is why the order only matters for the EBO.)',
        hint: 'Which buffer binding does the VAO actually remember?',
      },
    },

    {
      id: 'gl-a-04',
      title: 'Uniforms: sending data into a shader',
      read: `Vertex attributes differ **per vertex**. A **uniform** is the same for every vertex and fragment in a draw call — and you can change it from C++ every frame.

## In the shader

\`\`\`glsl
uniform float uTime;
uniform vec3 uColour;
\`\`\`

## In C++

\`\`\`cpp
int location = glGetUniformLocation(program, "uColour");
glUseProgram(program);                      // MUST be active first
glUniform3f(location, 1.0f, 0.5f, 0.2f);
\`\`\`

## The rules that catch people

1. **\`glUseProgram\` before \`glUniform\`.** Uniforms are set on the *currently active* program. Forget this and the value goes somewhere else, silently.
2. **Unused uniforms are removed.** If a uniform does not affect the output, the compiler optimises it away and \`glGetUniformLocation\` returns **−1**. Setting a uniform at location −1 is silently ignored — so "my uniform does nothing" is often "my uniform was deleted because the shader ignores it".
3. **Look up locations once**, during setup. \`glGetUniformLocation\` is a string lookup and calling it per frame is wasteful.

## The function zoo

\`glUniform1f\`, \`2f\`, \`3f\`, \`4f\` for floats; \`1i\` for ints and texture units; \`Matrix4fv\` for matrices. The number is the component count, the letter is the type.

## What they are for

Time, colour tints, transformation matrices, light positions, camera position, texture units — anything that changes per frame or per object rather than per vertex.`,
      sample: {
        lang: 'cpp',
        caption: 'A pulsing tint and a moving offset, both driven from C++',
        code: `// ---------- fragment shader ----------
// #version 330 core
// in vec3 vColour;
// uniform float uTime;
// uniform vec3 uTint;
// out vec4 FragColor;
// void main() {
//     float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
//     FragColor = vec4(vColour * uTint * pulse, 1.0);
// }

#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

int main() {
    // ... window and program setup ...

    // look the locations up ONCE
    const int timeLocation   = glGetUniformLocation(program, "uTime");
    const int tintLocation   = glGetUniformLocation(program, "uTint");
    const int offsetLocation = glGetUniformLocation(program, "uOffset");

    if (timeLocation == -1) {
        std::cerr << "warning: uTime not found (unused and optimised out?)\\n";
    }

    float offsetX = 0.0f;
    float lastFrame = 0.0f;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (glfwGetKey(window, GLFW_KEY_LEFT)  == GLFW_PRESS) offsetX -= 1.0f * deltaTime;
        if (glfwGetKey(window, GLFW_KEY_RIGHT) == GLFW_PRESS) offsetX += 1.0f * deltaTime;

        glClearColor(0.15f, 0.18f, 0.28f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(program);                       // FIRST
        glUniform1f(timeLocation, now);              // then the uniforms
        glUniform3f(tintLocation, 1.0f, 0.8f, 0.4f);
        glUniform2f(offsetLocation, offsetX, 0.0f);

        mesh.draw();

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `(the rectangle pulses between bright and dark, tinted warm orange,
 and slides left and right with the arrow keys)

warning: uTime not found (unused and optimised out?)
  <- what you would see if the fragment shader never actually used uTime`,
      },
      question: {
        kind: 'mcq',
        prompt:
          '`glGetUniformLocation(program, "uColour")` returns −1 even though the uniform is declared in your shader. Why?',
        options: [
          'The program failed to link',
          'The uniform is declared but never affects the shader output, so the GLSL compiler removed it — and setting location −1 is silently ignored',
          'Uniform names cannot start with "u"',
          'You need to call it before linking',
        ],
        answer: 1,
        explain:
          'GLSL compilers aggressively strip anything that cannot influence the result. A uniform you declared but only used in dead code simply ceases to exist. It is a common source of "my uniform has no effect" — the fix is to actually use it in the output, not to change the C++.',
        hint: 'What does the shader compiler do with code that has no effect?',
      },
    },

    {
      id: 'gl-a-05',
      title: 'Loading shaders from files',
      read: `Hard-coded shader strings mean recompiling C++ to change a colour. Put them in \`.vert\` and \`.frag\` files instead and you can iterate in seconds.

\`\`\`cpp
std::string readFile(const std::string& path) {
    std::ifstream file(path);
    if (!file) throw std::runtime_error("cannot open " + path);
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}
\`\`\`

## The C++ you are meeting

- **\`std::string\`** — text that manages its own memory and grows as needed
- **\`std::ifstream\`** — an input file stream. Its **destructor closes the file**, so there is nothing to remember.
- **\`std::stringstream\`** — a string you can use \`<<\` with. \`buffer << file.rdbuf()\` reads the whole file in one go.
- **\`.c_str()\`** — \`glShaderSource\` wants a \`const char*\`, so convert at the boundary

## The lifetime trap

\`\`\`cpp
const char* source = readFile("shader.vert").c_str();   // DANGLING
\`\`\`

The temporary \`std::string\` is destroyed at the end of that statement, so the pointer points at freed memory. Keep the string in a named variable:

\`\`\`cpp
std::string text = readFile("shader.vert");
const char* source = text.c_str();     // safe for as long as text lives
\`\`\`

This is one of the most common C++ bugs there is, and it usually appears to work — until the memory is reused.

## Relative paths

\`\`\`cpp
std::ifstream file("shaders/basic.vert");
\`\`\`

is relative to the **working directory**, not the executable. Running from a different folder breaks it — a frequent "it works in the IDE but not from the terminal" puzzle.`,
      sample: {
        lang: 'cpp',
        caption: 'Reading, error handling, and hot-reloading on a keypress',
        code: `#include <glad/glad.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

std::string readFile(const std::string& path) {
    std::ifstream file(path);                 // closed by its destructor
    if (!file) {
        throw std::runtime_error("cannot open " + path);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();                   // whole file in one go
    return buffer.str();
}

unsigned int createProgramFromFiles(const std::string& vertexPath,
                                    const std::string& fragmentPath) {
    // keep the strings alive: c_str() on a temporary would dangle
    const std::string vertexText = readFile(vertexPath);
    const std::string fragmentText = readFile(fragmentPath);

    unsigned int vertex = compileShader(GL_VERTEX_SHADER, vertexText.c_str());
    unsigned int fragment = compileShader(GL_FRAGMENT_SHADER, fragmentText.c_str());
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
        std::cerr << "link failed:\\n" << log << "\\n";
        return 0;
    }

    glDeleteShader(vertex);
    glDeleteShader(fragment);
    return program;
}

int main() {
    // ... window setup ...

    unsigned int program = 0;
    try {
        program = createProgramFromFiles("shaders/basic.vert",
                                         "shaders/basic.frag");
    } catch (const std::exception& e) {
        std::cerr << e.what() << "\\n";
        return -1;
    }

    while (!glfwWindowShouldClose(window)) {
        // press F5 to reload the shaders without restarting
        static bool reloadHeld = false;
        const bool pressed = glfwGetKey(window, GLFW_KEY_F5) == GLFW_PRESS;
        if (pressed && !reloadHeld) {
            try {
                unsigned int fresh = createProgramFromFiles(
                    "shaders/basic.vert", "shaders/basic.frag");
                if (fresh != 0) {
                    glDeleteProgram(program);
                    program = fresh;
                    std::cout << "shaders reloaded\\n";
                }
            } catch (const std::exception& e) {
                std::cerr << "reload failed: " << e.what() << "\\n";
            }
        }
        reloadHeld = pressed;

        // ... render ...
    }
}`,
        output: `shaders reloaded
shaders reloaded
reload failed: cannot open shaders/basic.vert

(edit basic.frag in your editor, save, press F5, and the colours change
 without restarting the program)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `const char* src = readFile("shader.vert").c_str();` a bug?',
        options: [
          '`readFile` cannot return a string',
          'The temporary `std::string` is destroyed at the end of the statement, leaving `src` pointing at freed memory',
          '`c_str()` returns a copy that must be deleted',
          'It is too slow',
        ],
        answer: 1,
        explain:
          'The returned string is a temporary whose lifetime ends at the semicolon. `c_str()` points into its buffer, so `src` immediately dangles. It often appears to work because the memory has not been reused yet — which makes it worse, not better. Store the string in a named variable.',
        hint: 'How long does the temporary returned by `readFile` live?',
      },
    },

    {
      id: 'gl-a-06',
      title: 'std::vector: many objects',
      read: `One rectangle is a demo. A scene has many, and you do not know how many at compile time. That is what \`std::vector\` is for.

\`\`\`cpp
#include <vector>

std::vector<Transform> objects;
objects.push_back({0.5f, 0.0f, 0.3f});
objects.push_back({-0.5f, 0.2f, 0.5f});

for (const Transform& object : objects) {
    // set uniforms for this object, then draw
}
\`\`\`

## The C++

- \`std::vector<T>\` — a growable array. \`<T>\` is the element type.
- \`.push_back(x)\` adds; \`.size()\` counts; \`v[i]\` accesses
- \`.reserve(n)\` allocates once up front when you know roughly how many
- **range-for with \`const&\`** — \`for (const auto& obj : objects)\` avoids copying each element

## The rendering pattern

\`\`\`cpp
glUseProgram(program);
mesh.bind();                       // once
for (const auto& obj : objects) {
    setUniforms(obj);              // per object
    glDrawElements(...);
}
\`\`\`

Bind the shader and the mesh **once**, then loop setting only what changes. Every state change costs, so hoisting the constant parts out of the loop is real optimisation.

## Draw calls are the bottleneck

Each \`glDrawElements\` is a command to the GPU with meaningful CPU overhead. A few hundred per frame is fine; tens of thousands is not. Later levels cover **instancing**, which draws thousands of copies in a single call.`,
      sample: {
        lang: 'cpp',
        caption: 'A vector of objects, drawn in one loop with shared state hoisted',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <cmath>
#include <iostream>
#include <vector>

struct Transform {
    float x = 0.0f, y = 0.0f;
    float scale = 1.0f;
    float r = 1.0f, g = 1.0f, b = 1.0f;
    float speed = 1.0f;
};

int main() {
    // ... window, program and mesh setup ...

    std::vector<Transform> objects;
    objects.reserve(5);                          // one allocation
    objects.push_back({-0.6f,  0.4f, 0.25f, 1.0f, 0.3f, 0.3f, 1.4f});
    objects.push_back({ 0.0f,  0.0f, 0.35f, 0.3f, 1.0f, 0.4f, 0.9f});
    objects.push_back({ 0.6f, -0.4f, 0.25f, 0.4f, 0.5f, 1.0f, 2.1f});
    objects.push_back({-0.5f, -0.5f, 0.15f, 1.0f, 0.9f, 0.2f, 0.6f});

    std::cout << objects.size() << " objects\\n";

    const int offsetLoc = glGetUniformLocation(program, "uOffset");
    const int scaleLoc  = glGetUniformLocation(program, "uScale");
    const int tintLoc   = glGetUniformLocation(program, "uTint");

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());

        glClearColor(0.10f, 0.12f, 0.20f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(program);                   // once
        glBindVertexArray(mesh.vao);             // once

        for (const Transform& obj : objects) {   // const& : no copies
            const float bob = std::sin(now * obj.speed) * 0.1f;
            glUniform2f(offsetLoc, obj.x, obj.y + bob);
            glUniform1f(scaleLoc, obj.scale);
            glUniform3f(tintLoc, obj.r, obj.g, obj.b);
            glDrawElements(GL_TRIANGLES, mesh.indexCount, GL_UNSIGNED_INT, nullptr);
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `4 objects

(four coloured rectangles of different sizes scattered across the window,
 each bobbing up and down at its own speed)

Draw calls per frame: 4
State changes per frame: 1 program bind, 1 VAO bind, 12 uniform sets`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are `glUseProgram` and `glBindVertexArray` called before the loop rather than inside it?',
        options: [
          'They can only be called once per frame',
          'Every object uses the same shader and mesh, so re-binding them per object would be redundant state changes — and state changes have real cost',
          'It is required by OpenGL',
          'It makes the loop shorter',
        ],
        answer: 1,
        explain:
          'Binding state the GPU already has is wasted driver work. Hoisting invariant setup out of a loop is the same optimisation you would make in any language; in graphics it matters more because state changes are among the most expensive things you do. Real engines go further and *sort* draws to minimise binds.',
        hint: 'What changes between objects, and what does not?',
      },
    },

    {
      id: 'gl-a-07',
      title: 'Wireframe, viewport and the debugging toolkit',
      read: `Graphics bugs are visual, so the debugging tools are visual too.

## Wireframe mode

\`\`\`cpp
glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);   // outlines only
glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);   // back to normal
\`\`\`

Instantly shows you the triangles. Invaluable when geometry looks wrong: are the vertices where you think, is the winding right, are there triangles at all?

## Viewport

\`glViewport(x, y, width, height)\` maps NDC onto a region of the window. Set it in the framebuffer-size callback, or the image distorts when the window is resized.

## Checking for errors

\`\`\`cpp
GLenum error;
while ((error = glGetError()) != GL_NO_ERROR) {
    std::cerr << "GL error " << error << "\\n";
}
\`\`\`

OpenGL records errors in a queue and tells you nothing unless you ask. A \`checkError("after draw")\` helper sprinkled through setup is the fastest way to find which call failed.

Better, if available: \`glDebugMessageCallback\` gives you a function the driver calls with a **human-readable description** the moment anything goes wrong. Enable it in debug builds and never guess again.

## The other checks

- \`glGetString(GL_VERSION)\` — is the context what you asked for?
- **RenderDoc** (free) — capture a frame and inspect every draw call, buffer and texture. When you get stuck, this is the answer.`,
      sample: {
        lang: 'cpp',
        caption: 'A debug callback, an error helper, and a wireframe toggle',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

void APIENTRY debugCallback(GLenum source, GLenum type, unsigned int id,
                            GLenum severity, GLsizei,
                            const char* message, const void*) {
    if (severity == GL_DEBUG_SEVERITY_NOTIFICATION) return;
    std::cerr << "[GL " << id << "] " << message << "\\n";
}

void checkError(const char* where) {
    GLenum error;
    while ((error = glGetError()) != GL_NO_ERROR) {
        const char* name = "unknown";
        switch (error) {
            case GL_INVALID_ENUM:      name = "GL_INVALID_ENUM"; break;
            case GL_INVALID_VALUE:     name = "GL_INVALID_VALUE"; break;
            case GL_INVALID_OPERATION: name = "GL_INVALID_OPERATION"; break;
            case GL_OUT_OF_MEMORY:     name = "GL_OUT_OF_MEMORY"; break;
        }
        std::cerr << "GL error at " << where << ": " << name << "\\n";
    }
}

int main() {
    glfwWindowHint(GLFW_OPENGL_DEBUG_CONTEXT, GLFW_TRUE);   // before create
    // ... create window, load GLAD ...

    int flags = 0;
    glGetIntegerv(GL_CONTEXT_FLAGS, &flags);
    if (flags & GL_CONTEXT_FLAG_DEBUG_BIT) {
        glEnable(GL_DEBUG_OUTPUT);
        glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);    // report at the call site
        glDebugMessageCallback(debugCallback, nullptr);
        std::cout << "debug output enabled\\n";
    }

    bool wireframe = false;
    bool keyHeld = false;

    while (!glfwWindowShouldClose(window)) {
        const bool pressed = glfwGetKey(window, GLFW_KEY_TAB) == GLFW_PRESS;
        if (pressed && !keyHeld) {               // fires once per press
            wireframe = !wireframe;
            glPolygonMode(GL_FRONT_AND_BACK, wireframe ? GL_LINE : GL_FILL);
            std::cout << (wireframe ? "wireframe\\n" : "filled\\n");
        }
        keyHeld = pressed;

        glClear(GL_COLOR_BUFFER_BIT);
        glUseProgram(program);
        glBindVertexArray(mesh.vao);
        glDrawElements(GL_TRIANGLES, mesh.indexCount, GL_UNSIGNED_INT, nullptr);
        checkError("after draw");

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `debug output enabled
wireframe
filled

(with a deliberate mistake — binding a deleted buffer:)
[GL 1281] GL_INVALID_VALUE error generated. Buffer name does not
          refer to an existing buffer object.
GL error at after draw: GL_INVALID_VALUE`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Your rectangle renders as a solid black shape. How does wireframe mode help?',
        options: [
          'It makes the shape brighter',
          'It shows the triangle edges, so you can immediately tell whether the geometry is correct and the problem is in the fragment shader, or whether the vertices themselves are wrong',
          'It disables the fragment shader',
          'It resets the shader program',
        ],
        answer: 1,
        explain:
          'It splits one ambiguous symptom into two distinct cases. If the wireframe outline is the right shape in the right place, your geometry and vertex shader are fine and the bug is in the colour. If the outline is wrong or absent, the problem is in the vertex data, the indices or the transform.',
        hint: 'Which stage of the pipeline does the outline tell you about?',
      },
    },

    {
      id: 'gl-a-08',
      title: 'Event callbacks',
      read: `\`glfwGetKey\` polls — right for held keys. For **discrete events** (a key pressed once, a mouse click, the window resized) you want a **callback**: a function GLFW calls when the event happens.

\`\`\`cpp
void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods) {
    if (key == GLFW_KEY_SPACE && action == GLFW_PRESS) {
        std::cout << "jump\\n";
    }
}

glfwSetKeyCallback(window, keyCallback);
\`\`\`

\`action\` is \`GLFW_PRESS\`, \`GLFW_RELEASE\` or \`GLFW_REPEAT\`. That distinction is what polling cannot give you cleanly.

## The C++: function pointers

\`glfwSetKeyCallback\` takes a **function pointer** — the address of a function to call later. It is C-style, so it cannot be a member function or a capturing lambda.

## Getting to your data

The callback has no access to your variables. GLFW's answer is the **user pointer**:

\`\`\`cpp
glfwSetWindowUserPointer(window, &myState);

// inside the callback:
auto* state = static_cast<AppState*>(glfwGetWindowUserPointer(window));
\`\`\`

That is the standard bridge from a C callback back into your C++ objects, and you will meet the pattern in every C library you use.

## The callbacks worth knowing

\`glfwSetKeyCallback\`, \`glfwSetCursorPosCallback\`, \`glfwSetMouseButtonCallback\`, \`glfwSetScrollCallback\`, \`glfwSetFramebufferSizeCallback\`.

## Which to use

- **Poll** for continuous state: movement, holding a button
- **Callback** for discrete events: toggles, clicks, scroll, resize`,
      sample: {
        lang: 'cpp',
        caption: 'Callbacks reaching your state through the user pointer',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

struct AppState {
    bool wireframe = false;
    bool paused = false;
    float zoom = 1.0f;
    double mouseX = 0.0, mouseY = 0.0;
};

void keyCallback(GLFWwindow* window, int key, int, int action, int) {
    auto* state = static_cast<AppState*>(glfwGetWindowUserPointer(window));
    if (action != GLFW_PRESS) return;         // ignore release and repeat

    switch (key) {
        case GLFW_KEY_ESCAPE:
            glfwSetWindowShouldClose(window, true);
            break;
        case GLFW_KEY_TAB:
            state->wireframe = !state->wireframe;
            glPolygonMode(GL_FRONT_AND_BACK, state->wireframe ? GL_LINE : GL_FILL);
            break;
        case GLFW_KEY_SPACE:
            state->paused = !state->paused;
            std::cout << (state->paused ? "paused\\n" : "running\\n");
            break;
    }
}

void scrollCallback(GLFWwindow* window, double, double yOffset) {
    auto* state = static_cast<AppState*>(glfwGetWindowUserPointer(window));
    state->zoom += static_cast<float>(yOffset) * 0.1f;
    if (state->zoom < 0.2f) state->zoom = 0.2f;
    if (state->zoom > 3.0f) state->zoom = 3.0f;
}

void cursorCallback(GLFWwindow* window, double x, double y) {
    auto* state = static_cast<AppState*>(glfwGetWindowUserPointer(window));
    state->mouseX = x;
    state->mouseY = y;
}

int main() {
    // ... create window ...

    AppState state;
    glfwSetWindowUserPointer(window, &state);      // the bridge

    glfwSetKeyCallback(window, keyCallback);
    glfwSetScrollCallback(window, scrollCallback);
    glfwSetCursorPosCallback(window, cursorCallback);
    glfwSetFramebufferSizeCallback(window,
        [](GLFWwindow*, int w, int h) { glViewport(0, 0, w, h); });

    float simulationTime = 0.0f;
    float lastFrame = 0.0f;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (!state.paused) simulationTime += deltaTime;

        glUseProgram(program);
        glUniform1f(timeLoc, simulationTime);
        glUniform1f(zoomLoc, state.zoom);
        // ... draw ...

        glfwSwapBuffers(window);
        glfwPollEvents();                          // callbacks fire here
    }
}`,
        output: `running
paused
running

(Tab toggles wireframe once per press — not 60 times a second.
 The scroll wheel zooms. Space freezes the animation without
 stopping the render loop.)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does a Tab-to-toggle-wireframe feature work better as a key callback than as `glfwGetKey` polling?',
        options: [
          'Polling does not detect Tab',
          'Polling reports the key as down on every frame it is held, so a naive toggle flips 60 times a second; a callback fires once with `action == GLFW_PRESS`',
          'Callbacks are faster',
          'Polling only works for letters',
        ],
        answer: 1,
        explain:
          'Toggling is a discrete event. With polling you have to remember the previous frame\'s state yourself to detect the transition. The callback gives you the press edge directly, which is exactly the information a toggle needs.',
        hint: 'How many frames is a key "down" for during one human keypress?',
      },
    },

    {
      id: 'gl-a-09',
      title: 'A Shader class: your first real class',
      read: `Shader handling is now several functions plus an id plus uniform lookups. That is a class asking to exist.

\`\`\`cpp
class Shader {
public:
    Shader(const std::string& vertexPath, const std::string& fragmentPath);
    ~Shader();

    void use() const;
    void setFloat(const std::string& name, float value) const;
    void setVec3(const std::string& name, float x, float y, float z) const;

private:
    unsigned int id_ = 0;
    int location(const std::string& name) const;
};
\`\`\`

## What the class buys you

- **RAII.** The constructor compiles and links; the destructor calls \`glDeleteProgram\`. You cannot forget to clean up.
- **A cache.** \`location()\` looks a uniform up once and stores it in a \`std::unordered_map\`, so per-frame calls are cheap.
- **A real interface.** \`shader.setVec3("uTint", r, g, b)\` instead of \`glUniform3f(glGetUniformLocation(...), ...)\`.
- **The id is private**, so nothing outside can bind or delete it behind your back.

## The C++ you are meeting

- \`class\` — like \`struct\`, but members are **private** by default
- \`public:\` / \`private:\` — the interface, and how it is kept
- **Constructor** — runs on creation, establishes the invariant "this object holds a valid program"
- **Destructor** \`~Shader()\` — runs automatically at the closing brace
- \`mutable\` on the cache, so \`location()\` can stay \`const\` while still memoising

## Deleting the copy

Copying a \`Shader\` would give two objects the same program id, and the second destructor would delete an already-deleted program. \`= delete\` on the copy operations turns that into a compile error.`,
      sample: {
        lang: 'cpp',
        caption: 'shader.h — RAII, a uniform cache, and no accidental copies',
        code: `#pragma once

#include <glad/glad.h>
#include <string>
#include <unordered_map>

class Shader {
public:
    Shader(const std::string& vertexPath, const std::string& fragmentPath);
    ~Shader();

    // two Shaders must never share one program id
    Shader(const Shader&) = delete;
    Shader& operator=(const Shader&) = delete;

    Shader(Shader&& other) noexcept;              // moving IS fine
    Shader& operator=(Shader&& other) noexcept;

    void use() const { glUseProgram(id_); }
    bool valid() const { return id_ != 0; }
    unsigned int id() const { return id_; }

    void setBool(const std::string& name, bool v) const {
        glUniform1i(location(name), static_cast<int>(v));
    }
    void setInt(const std::string& name, int v) const {
        glUniform1i(location(name), v);
    }
    void setFloat(const std::string& name, float v) const {
        glUniform1f(location(name), v);
    }
    void setVec2(const std::string& name, float x, float y) const {
        glUniform2f(location(name), x, y);
    }
    void setVec3(const std::string& name, float x, float y, float z) const {
        glUniform3f(location(name), x, y, z);
    }

private:
    int location(const std::string& name) const {
        auto found = cache_.find(name);
        if (found != cache_.end()) return found->second;

        const int loc = glGetUniformLocation(id_, name.c_str());
        cache_[name] = loc;                       // remember it, even if -1
        return loc;
    }

    unsigned int id_ = 0;
    // mutable so the cache can be filled from a const method
    mutable std::unordered_map<std::string, int> cache_;
};

// ---------------- shader.cpp ----------------
Shader::~Shader() {
    if (id_ != 0) glDeleteProgram(id_);           // cannot be forgotten
}

Shader::Shader(Shader&& other) noexcept
    : id_(other.id_), cache_(std::move(other.cache_)) {
    other.id_ = 0;                                // leave it safe to destroy
}

// ---------------- using it ----------------
// Shader basic("shaders/basic.vert", "shaders/basic.frag");
// basic.use();
// basic.setFloat("uTime", now);
// basic.setVec3("uTint", 1.0f, 0.8f, 0.4f);
// // no glDeleteProgram anywhere: the destructor handles it`,
        output: `Using the class:

    Shader basic("shaders/basic.vert", "shaders/basic.frag");
    if (!basic.valid()) return -1;

    while (running) {
        basic.use();
        basic.setFloat("uTime", now);
        mesh.draw();
    }
    // program deleted automatically here

Uniform lookups: 2 on the first frame, 0 on every frame after
(the cache holds the locations).`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why are `Shader`’s copy constructor and copy assignment `= delete`?',
        options: [
          'Shaders are too large to copy',
          'A copy would duplicate the OpenGL program id, so both destructors would delete the same program — deleting an already-deleted object',
          'OpenGL forbids it',
          'Copying is always slow',
        ],
        answer: 1,
        explain:
          'The class owns a GPU resource identified by an integer. Copying the integer does not copy the resource, so two owners believe they must free it. Deleting the copy operations makes the mistake a compile error, while the move operations (which transfer the id and zero the source) stay available.',
        hint: 'What would happen when both objects go out of scope?',
      },
    },

    {
      id: 'gl-a-10',
      title: 'Moving things with the keyboard',
      read: `Real interaction: hold a key, something moves smoothly at a consistent speed.

## The pattern

\`\`\`cpp
const float speed = 1.5f;     // units per SECOND
if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) {
    position.y += speed * deltaTime;
}
\`\`\`

Multiplying by \`deltaTime\` makes \`speed\` mean "per second". Without it, movement is "per frame" and runs 2.4× faster on a 144 Hz monitor than on a 60 Hz one.

## Diagonal movement

Pressing W and D together moves you √2 ≈ 1.41× too fast, because the two movements add. Normalise the direction vector — divide by its length — so all directions move at the same speed. Every first-person game does this.

## Velocity and acceleration

Instead of setting position directly, accumulate a velocity:

\`\`\`cpp
velocity += acceleration * deltaTime;
velocity *= std::pow(damping, deltaTime);   // friction
position += velocity * deltaTime;
\`\`\`

That gives momentum and glide for free. Note the \`pow\` for damping — applying \`velocity *= 0.9f\` per frame would again be frame-rate dependent.

## Clamping

Keep things on screen with a limit function. NDC runs −1 to +1, so clamp to roughly ±(1 − halfSize).`,
      sample: {
        lang: 'cpp',
        caption: 'Normalised direction, velocity, damping and clamping — all in seconds',
        code: `#include <GLFW/glfw3.h>
#include <algorithm>
#include <cmath>

struct Vec2 {
    float x = 0.0f, y = 0.0f;

    Vec2 operator+(const Vec2& o) const { return {x + o.x, y + o.y}; }
    Vec2 operator*(float k) const { return {x * k, y * k}; }
    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
    Vec2& operator*=(float k) { x *= k; y *= k; return *this; }

    float length() const { return std::sqrt(x * x + y * y); }

    Vec2 normalised() const {
        const float len = length();
        if (len < 1e-6f) return {0.0f, 0.0f};    // never divide by zero
        return {x / len, y / len};
    }
};

struct Player {
    Vec2 position;
    Vec2 velocity;
    float acceleration = 6.0f;      // units per second squared
    float maxSpeed = 1.6f;          // units per second
    float damping = 0.02f;          // fraction of speed kept per second
    float halfSize = 0.12f;
};

void updatePlayer(Player& player, GLFWwindow* window, float deltaTime) {
    Vec2 input;
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) input.y += 1.0f;
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) input.y -= 1.0f;
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) input.x -= 1.0f;
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) input.x += 1.0f;

    // without this, W+D is 1.41x faster than W alone
    input = input.normalised();

    player.velocity += input * (player.acceleration * deltaTime);

    // frame-rate independent friction
    player.velocity *= std::pow(player.damping, deltaTime);

    const float speed = player.velocity.length();
    if (speed > player.maxSpeed) {
        player.velocity *= player.maxSpeed / speed;
    }

    player.position += player.velocity * deltaTime;

    const float limit = 1.0f - player.halfSize;
    if (player.position.x < -limit) { player.position.x = -limit; player.velocity.x = 0.0f; }
    if (player.position.x >  limit) { player.position.x =  limit; player.velocity.x = 0.0f; }
    if (player.position.y < -limit) { player.position.y = -limit; player.velocity.y = 0.0f; }
    if (player.position.y >  limit) { player.position.y =  limit; player.velocity.y = 0.0f; }
}`,
        output: `(a square you steer with WASD: it accelerates smoothly, glides to a stop
 when you let go, moves at the same speed diagonally as straight, and
 stops dead at the edges of the window)

At 60 fps and at 144 fps it crosses the screen in exactly the same time.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Holding W and D together moves the player 1.41× faster than W alone. What fixes it?',
        options: [
          'Halve the speed when two keys are held',
          'Normalise the input direction vector — divide it by its own length — so every direction has magnitude 1 before it is scaled by speed',
          'Use a smaller deltaTime',
          'Check the keys in a different order',
        ],
        answer: 1,
        explain:
          'W gives (0,1) and D gives (1,0); together that is (1,1) with length √2. Normalising scales it back to length 1, so speed is direction-independent. Guard against a zero-length vector first, or you divide by zero when no key is held.',
        hint: 'What is the length of the vector (1, 1)?',
      },
    },

    {
      id: 'gl-a-11',
      title: 'Organising the project',
      read: `Six hundred lines in \`main.cpp\` is the point to split up.

\`\`\`
project/
  include/glad/glad.h
  src/
    main.cpp
    shader.h  shader.cpp
    mesh.h    mesh.cpp
    window.h  window.cpp
  shaders/
    basic.vert  basic.frag
  CMakeLists.txt
\`\`\`

## Headers and sources

- **\`.h\`** — declarations: what exists
- **\`.cpp\`** — definitions: how it works

\`#pragma once\` at the top of every header stops double inclusion.

## CMake

\`\`\`cmake
cmake_minimum_required(VERSION 3.20)
project(GLDemo LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 20)

find_package(glfw3 REQUIRED)
add_executable(demo src/main.cpp src/shader.cpp src/mesh.cpp src/glad.c)
target_include_directories(demo PRIVATE include)
target_link_libraries(demo PRIVATE glfw)
\`\`\`

Note \`LANGUAGES C CXX\` — \`glad.c\` is C, not C++.

\`\`\`
cmake -B build && cmake --build build
\`\`\`

## The asset path problem

\`"shaders/basic.vert"\` is relative to the **working directory**. Run from \`build/\` and it fails. Either copy the assets next to the executable at build time, or resolve paths relative to the executable at runtime. Decide early — it bites everyone.`,
      sample: {
        lang: 'bash',
        caption: 'A CMakeLists that also solves the asset-path problem',
        code: `# CMakeLists.txt
# cmake_minimum_required(VERSION 3.20)
# project(GLDemo VERSION 0.1 LANGUAGES C CXX)
#
# set(CMAKE_CXX_STANDARD 20)
# set(CMAKE_CXX_STANDARD_REQUIRED ON)
# set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
#
# find_package(glfw3 REQUIRED)
#
# add_executable(demo
#     src/main.cpp
#     src/shader.cpp
#     src/mesh.cpp
#     src/window.cpp
#     src/glad.c)
#
# target_include_directories(demo PRIVATE include)
# target_link_libraries(demo PRIVATE glfw)
# target_compile_options(demo PRIVATE -Wall -Wextra)
#
# if(UNIX AND NOT APPLE)
#     target_link_libraries(demo PRIVATE dl)
# endif()
#
# # copy the shaders next to the executable after every build
# add_custom_command(TARGET demo POST_BUILD
#     COMMAND \${CMAKE_COMMAND} -E copy_directory
#             \${CMAKE_SOURCE_DIR}/shaders
#             \$<TARGET_FILE_DIR:demo>/shaders)

cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
cd build && ./demo`,
        output: `-- Found glfw3: /usr/lib/cmake/glfw3
-- Configuring done
-- Generating done
[ 20%] Building C object CMakeFiles/demo.dir/src/glad.c.o
[ 40%] Building CXX object CMakeFiles/demo.dir/src/main.cpp.o
[ 60%] Building CXX object CMakeFiles/demo.dir/src/shader.cpp.o
[100%] Linking CXX executable demo
[100%] Built target demo

OpenGL 3.3.0 NVIDIA 550.107.02
shaders loaded from ./shaders/`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your program works when run from the project root but fails with "cannot open shaders/basic.vert" when run from `build/`. Why?',
        options: [
          'The build directory is read-only',
          'Relative paths resolve against the current **working directory**, not the executable’s location — so the same path means different things depending on where you run from',
          'CMake deleted the shaders',
          'The shader files need to be compiled',
        ],
        answer: 1,
        explain:
          'The working directory is wherever the shell was when you launched the program, which is why it "works in the IDE" but not from a terminal. Copying assets next to the binary at build time (the `add_custom_command` above) or resolving paths from the executable location both fix it properly.',
        hint: 'What is a relative path relative to?',
      },
    },

    {
      id: 'gl-a-12',
      title: 'Project: a controllable, animated scene',
      read: `Everything from this level in one program: functions and structs, a Shader class, an indexed mesh, a vector of objects, uniforms, callbacks, and delta-time movement.

What it does:
- Draws a grid of coloured quads from **one** mesh and one shader
- Each quad pulses and rotates at its own speed
- WASD moves a player quad with acceleration and friction
- Tab toggles wireframe, Space pauses the animation, the scroll wheel zooms
- Shaders load from files and reload on F5

What to study:

1. **\`main\` is short.** It sets up, loops, and cleans up. Every detail is behind a named function or class.
2. **State lives in structs**, not scattered locals.
3. **Every time-based value is multiplied by \`deltaTime\`**, so the program behaves identically at 60 and 144 fps.
4. **The draw loop hoists everything invariant** out and sets only per-object uniforms.
5. **Nothing calls \`glDeleteProgram\`** — the \`Shader\` destructor does.

> Extend it: add a second shader and switch between them; make the player collect the quads; add a score to the window title with \`glfwSetWindowTitle\`.`,
      sample: {
        lang: 'cpp',
        caption: 'main.cpp — the whole scene, with the details behind abstractions',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <cmath>
#include <iostream>
#include <vector>

#include "shader.h"
#include "mesh.h"
#include "window.h"

struct Quad {
    float x = 0.0f, y = 0.0f;
    float size = 0.15f;
    float r = 1.0f, g = 1.0f, b = 1.0f;
    float spin = 1.0f;
    float pulse = 1.0f;
};

struct Scene {
    std::vector<Quad> quads;
    Quad player{0.0f, 0.0f, 0.18f, 1.0f, 1.0f, 1.0f, 0.0f, 0.0f};
    float velocityX = 0.0f, velocityY = 0.0f;
    bool paused = false;
    bool wireframe = false;
    float zoom = 1.0f;
    float simulationTime = 0.0f;
};

Scene buildScene() {
    Scene scene;
    scene.quads.reserve(25);
    for (int row = 0; row < 5; ++row) {
        for (int col = 0; col < 5; ++col) {
            Quad q;
            q.x = -0.7f + col * 0.35f;
            q.y = -0.7f + row * 0.35f;
            q.size = 0.10f;
            q.r = col / 4.0f;
            q.g = row / 4.0f;
            q.b = 1.0f - (col + row) / 8.0f;
            q.spin = 0.4f + (row * 5 + col) * 0.08f;
            q.pulse = 0.8f + col * 0.25f;
            scene.quads.push_back(q);
        }
    }
    return scene;
}

void updatePlayer(Scene& scene, GLFWwindow* window, float deltaTime) {
    float inputX = 0.0f, inputY = 0.0f;
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) inputY += 1.0f;
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) inputY -= 1.0f;
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) inputX -= 1.0f;
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) inputX += 1.0f;

    const float len = std::sqrt(inputX * inputX + inputY * inputY);
    if (len > 0.0001f) { inputX /= len; inputY /= len; }

    const float accel = 5.0f;
    scene.velocityX += inputX * accel * deltaTime;
    scene.velocityY += inputY * accel * deltaTime;

    const float keep = std::pow(0.02f, deltaTime);     // friction per second
    scene.velocityX *= keep;
    scene.velocityY *= keep;

    scene.player.x += scene.velocityX * deltaTime;
    scene.player.y += scene.velocityY * deltaTime;

    const float limit = 1.0f - scene.player.size;
    scene.player.x = std::max(-limit, std::min(limit, scene.player.x));
    scene.player.y = std::max(-limit, std::min(limit, scene.player.y));
}

int main() {
    GLFWwindow* window = createWindow(900, 700, "Scene — WASD, Tab, Space, scroll");
    if (window == nullptr) return -1;

    Scene scene = buildScene();
    glfwSetWindowUserPointer(window, &scene);

    glfwSetKeyCallback(window, [](GLFWwindow* w, int key, int, int action, int) {
        auto* s = static_cast<Scene*>(glfwGetWindowUserPointer(w));
        if (action != GLFW_PRESS) return;
        if (key == GLFW_KEY_ESCAPE) glfwSetWindowShouldClose(w, true);
        if (key == GLFW_KEY_SPACE)  s->paused = !s->paused;
        if (key == GLFW_KEY_TAB) {
            s->wireframe = !s->wireframe;
            glPolygonMode(GL_FRONT_AND_BACK, s->wireframe ? GL_LINE : GL_FILL);
        }
    });

    glfwSetScrollCallback(window, [](GLFWwindow* w, double, double dy) {
        auto* s = static_cast<Scene*>(glfwGetWindowUserPointer(w));
        s->zoom = std::max(0.3f, std::min(2.5f, s->zoom + float(dy) * 0.1f));
    });

    Shader shader("shaders/quad.vert", "shaders/quad.frag");
    if (!shader.valid()) { glfwTerminate(); return -1; }

    IndexedMesh quad = createUnitQuad();

    float lastFrame = 0.0f;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (!scene.paused) scene.simulationTime += deltaTime;
        updatePlayer(scene, window, deltaTime);

        glClearColor(0.08f, 0.09f, 0.16f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        shader.use();                                  // once
        shader.setFloat("uZoom", scene.zoom);          // once
        glBindVertexArray(quad.vao);                   // once

        for (const Quad& q : scene.quads) {            // per object
            const float pulse = 0.85f +
                std::sin(scene.simulationTime * q.pulse) * 0.15f;
            shader.setVec2("uOffset", q.x, q.y);
            shader.setFloat("uSize", q.size * pulse);
            shader.setFloat("uAngle", scene.simulationTime * q.spin);
            shader.setVec3("uTint", q.r, q.g, q.b);
            glDrawElements(GL_TRIANGLES, quad.indexCount, GL_UNSIGNED_INT, nullptr);
        }

        shader.setVec2("uOffset", scene.player.x, scene.player.y);
        shader.setFloat("uSize", scene.player.size);
        shader.setFloat("uAngle", 0.0f);
        shader.setVec3("uTint", 1.0f, 0.95f, 0.7f);
        glDrawElements(GL_TRIANGLES, quad.indexCount, GL_UNSIGNED_INT, nullptr);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    quad.destroy();
    glfwTerminate();          // shader deletes its program in its destructor
    return 0;
}`,
        output: `OpenGL 3.3.0
shaders loaded from ./shaders/

(a 5x5 grid of coloured squares, each spinning and pulsing at its own rate,
 with a pale square you steer around with WASD. Tab wireframes everything,
 Space freezes the animation but you can still move, the wheel zooms.)

26 draw calls per frame, 1 shader bind, 1 VAO bind.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Pressing Space pauses the animation but you can still move the player. How is that achieved?',
        options: [
          'The render loop stops when paused',
          'Only `scene.simulationTime` stops accumulating; `deltaTime` and `updatePlayer` keep running, so animation driven by simulationTime freezes while input-driven movement continues',
          'The player uses a separate thread',
          '`glfwPollEvents` is skipped when paused',
        ],
        answer: 1,
        explain:
          'Keeping wall-clock time and simulation time as separate values is the standard approach. The loop always runs (so the window stays responsive and input still works), and anything that should freeze reads the simulation clock — which is exactly how pause works in real games.',
        hint: 'Which clock does the spinning read, and which does the player read?',
      },
    },
  ],
}

export default level
