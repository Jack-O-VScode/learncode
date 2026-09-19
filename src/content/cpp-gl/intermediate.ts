import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Textures, matrices and going 3D',
  summary:
    'The level where flat shapes become a world: images on surfaces, the vector and matrix maths behind every transformation, depth testing, a spinning cube, and a camera you fly with mouse and keyboard.',
  outcomes: [
    'Load images and apply them as textures',
    'Understand vectors, matrices and why order matters',
    'Translate, rotate and scale objects with a model matrix',
    'Build the model-view-projection pipeline and draw in 3D',
    'Enable depth testing and render a cube correctly',
    'Write a camera class driven by mouse and keyboard',
  ],
  steps: [
    {
      id: 'gl-i-01',
      title: 'Textures: putting an image on a triangle',
      read: `A **texture** is an image the GPU can sample. Instead of a flat colour, each fragment looks up a pixel from the image.

## Texture coordinates

Each vertex gets a coordinate in **UV space**: (0,0) is one corner of the image, (1,1) the opposite. The GPU interpolates them across the triangle, and the fragment shader uses the result to sample.

Note that in OpenGL the texture origin is **bottom-left**, but image files store rows top-down. That is why images appear upside down until you flip them — \`stbi_set_flip_vertically_on_load(true)\` handles it.

## The steps

\`\`\`cpp
unsigned int texture;
glGenTextures(1, &texture);
glBindTexture(GL_TEXTURE_2D, texture);
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, w, h, 0, GL_RGB, GL_UNSIGNED_BYTE, data);
glGenerateMipmap(GL_TEXTURE_2D);
\`\`\`

## Wrapping and filtering

- \`GL_REPEAT\` (tile), \`GL_CLAMP_TO_EDGE\`, \`GL_MIRRORED_REPEAT\`
- \`GL_NEAREST\` — blocky, correct for pixel art
- \`GL_LINEAR\` — smooth, the usual choice

## Mipmaps

Smaller pre-made copies of the texture. When a surface is far away, sampling a full-resolution image produces horrible shimmering as the camera moves. Mipmaps fix it and are *faster* too, because the smaller image fits in cache. Use \`GL_LINEAR_MIPMAP_LINEAR\` for minification — and note mipmaps only apply to minification, never magnification.

## stb_image

A single-header library that loads PNG, JPG and more. One \`.h\` file, no build system changes.`,
      sample: {
        lang: 'cpp',
        caption: 'Loading an image and sampling it in the fragment shader',
        code: `#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <glad/glad.h>
#include <iostream>

unsigned int loadTexture(const char* path) {
    stbi_set_flip_vertically_on_load(true);   // OpenGL's origin is bottom-left

    int width = 0, height = 0, channels = 0;
    unsigned char* data = stbi_load(path, &width, &height, &channels, 0);
    if (data == nullptr) {
        std::cerr << "failed to load " << path << ": "
                  << stbi_failure_reason() << "\\n";
        return 0;
    }

    const GLenum format = (channels == 4) ? GL_RGBA
                        : (channels == 3) ? GL_RGB
                                          : GL_RED;

    unsigned int texture = 0;
    glGenTextures(1, &texture);
    glBindTexture(GL_TEXTURE_2D, texture);

    glTexImage2D(GL_TEXTURE_2D, 0, static_cast<GLint>(format),
                 width, height, 0, format, GL_UNSIGNED_BYTE, data);
    glGenerateMipmap(GL_TEXTURE_2D);

    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
                    GL_LINEAR_MIPMAP_LINEAR);     // mipmaps for minification
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

    stbi_image_free(data);                        // GPU has its own copy now

    std::cout << path << ": " << width << "x" << height
              << ", " << channels << " channels\\n";
    return texture;
}

// vertex data now carries a UV per vertex:
//    position (3)      colour (3)        uv (2)
float vertices[] = {
     0.5f,  0.5f, 0.0f,  1,0,0,   1.0f, 1.0f,
     0.5f, -0.5f, 0.0f,  0,1,0,   1.0f, 0.0f,
    -0.5f, -0.5f, 0.0f,  0,0,1,   0.0f, 0.0f,
    -0.5f,  0.5f, 0.0f,  1,1,0,   0.0f, 1.0f,
};

// ---------- fragment shader ----------
// #version 330 core
// in vec3 vColour;
// in vec2 vUV;
// uniform sampler2D uTexture;
// out vec4 FragColor;
// void main() {
//     FragColor = texture(uTexture, vUV) * vec4(vColour, 1.0);
// }`,
        output: `container.jpg: 512x512, 3 channels

(the rectangle now shows the image, tinted by the per-vertex colours)

Without stbi_set_flip_vertically_on_load(true), the image appears upside down.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why use `GL_LINEAR_MIPMAP_LINEAR` for the minification filter?',
        options: [
          'It makes textures sharper up close',
          'When a textured surface is small on screen, sampling the full-resolution image causes shimmering; mipmaps select an appropriately sized copy, which looks better and is faster because it fits in cache',
          'It is required for transparency',
          'It halves memory use',
        ],
        answer: 1,
        explain:
          'Minification means many texels map to one pixel, so a single sample picks an essentially random one and the result crawls as the camera moves. Mipmaps pre-average the texture at several sizes; trilinear filtering blends between two levels for a stable image. The extra memory (about 33%) buys both quality and speed.',
        hint: 'What happens when a detailed texture is drawn very small?',
      },
    },

    {
      id: 'gl-i-02',
      title: 'Texture units and multiple textures',
      read: `A shader can sample several textures at once — a base colour and an overlay, a diffuse map and a normal map. OpenGL provides **texture units**, 16 or more, each holding one bound texture.

\`\`\`cpp
glActiveTexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_2D, containerTexture);

glActiveTexture(GL_TEXTURE1);
glBindTexture(GL_TEXTURE_2D, faceTexture);
\`\`\`

Then tell the shader which unit each sampler reads from:

\`\`\`cpp
shader.use();
shader.setInt("uTexture1", 0);    // the UNIT number, not the texture id
shader.setInt("uTexture2", 1);
\`\`\`

This catches people out: a \`sampler2D\` uniform is set to the **unit index** (0, 1, 2), never to the texture object id.

## In the shader

\`\`\`glsl
uniform sampler2D uTexture1;
uniform sampler2D uTexture2;

void main() {
    FragColor = mix(texture(uTexture1, vUV), texture(uTexture2, vUV), 0.2);
}
\`\`\`

\`mix(a, b, t)\` is linear interpolation — \`t = 0\` gives all \`a\`, \`t = 1\` all \`b\`. It is one of the most useful functions in all of GLSL.

## Sampler uniforms are set once

They rarely change, so set them right after linking rather than every frame.

## Texture atlases

Many small images packed into one texture, addressed by UV sub-ranges. One bind instead of hundreds — a major optimisation for 2D games and UI.`,
      sample: {
        lang: 'cpp',
        caption: 'Two textures blended, with the mix amount on a key',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <algorithm>

int main() {
    // ... window, shader, mesh setup ...

    const unsigned int containerTex = loadTexture("assets/container.jpg");
    const unsigned int faceTex      = loadTexture("assets/awesomeface.png");
    if (containerTex == 0 || faceTex == 0) return -1;

    // sampler uniforms hold the UNIT index; set once
    shader.use();
    shader.setInt("uTexture1", 0);
    shader.setInt("uTexture2", 1);

    float blend = 0.2f;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        if (glfwGetKey(window, GLFW_KEY_UP) == GLFW_PRESS) {
            blend = std::min(1.0f, blend + 0.6f * deltaTime);
        }
        if (glfwGetKey(window, GLFW_KEY_DOWN) == GLFW_PRESS) {
            blend = std::max(0.0f, blend - 0.6f * deltaTime);
        }

        glClearColor(0.1f, 0.1f, 0.15f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glActiveTexture(GL_TEXTURE0);
        glBindTexture(GL_TEXTURE_2D, containerTex);
        glActiveTexture(GL_TEXTURE1);
        glBindTexture(GL_TEXTURE_2D, faceTex);

        shader.use();
        shader.setFloat("uBlend", blend);
        glBindVertexArray(mesh.vao);
        glDrawElements(GL_TRIANGLES, mesh.indexCount, GL_UNSIGNED_INT, nullptr);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glDeleteTextures(1, &containerTex);
    glDeleteTextures(1, &faceTex);
}

// ---------- fragment shader ----------
// #version 330 core
// in vec2 vUV;
// uniform sampler2D uTexture1;
// uniform sampler2D uTexture2;
// uniform float uBlend;
// out vec4 FragColor;
// void main() {
//     FragColor = mix(texture(uTexture1, vUV),
//                     texture(uTexture2, vUV), uBlend);
// }`,
        output: `assets/container.jpg: 512x512, 3 channels
assets/awesomeface.png: 476x476, 4 channels

(a wooden crate with a smiley face fading in and out over it
 as you hold the up and down arrows)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What value should `shader.setInt("uTexture2", ...)` be given?',
        options: [
          'The OpenGL texture object id returned by glGenTextures',
          'The texture **unit** index — 1, matching `glActiveTexture(GL_TEXTURE1)`',
          'The number of channels in the image',
          'The size of the texture in pixels',
        ],
        answer: 1,
        explain:
          'A `sampler2D` uniform selects a texture *unit*, not a texture. You bind a texture into a unit with `glActiveTexture` + `glBindTexture`, then point the sampler at that unit number. Passing the texture id happens to work when the id is small and coincidentally matches a unit, which makes the bug maddening to find.',
        hint: 'Which number appears in both `GL_TEXTURE1` and the uniform?',
      },
    },

    {
      id: 'gl-i-03',
      title: 'Vectors and matrices — the maths you actually need',
      read: `Every transformation in graphics is a matrix multiplication. You do not need to love linear algebra, but you do need these ideas.

## Vectors

A \`vec3\` is three numbers. It can mean a **position**, a **direction**, or a **colour** — the type is the same, the meaning is yours.

- **Length** — \`length(v)\`, the magnitude
- **Normalise** — \`normalize(v)\`, scale to length 1. Directions should almost always be normalised.
- **Dot product** — \`dot(a, b)\`. For unit vectors it is the cosine of the angle between them: 1 = same direction, 0 = perpendicular, −1 = opposite. **This is the basis of all lighting.**
- **Cross product** — \`cross(a, b)\`, a vector perpendicular to both. Used to build camera axes and surface normals.

## Matrices

A \`mat4\` is a 4×4 grid that encodes a transformation. Multiply a position by it and you get the transformed position.

Why 4×4 for 3D? Because a 3×3 cannot express **translation**. Adding a fourth component (\`w\`) makes translation a multiplication like everything else, so any chain of moves, rotations and scales collapses into one matrix. These are **homogeneous coordinates**: \`w = 1\` for a position, \`w = 0\` for a direction (so translation does not affect it).

## Order matters

Matrix multiplication is **not commutative**. \`A * B\` ≠ \`B * A\`.

\`\`\`cpp
model = translate * rotate;    // rotate in place, then move
model = rotate * translate;    // move, then swing around the origin
\`\`\`

They are completely different, and reading them **right to left** is how to keep it straight: the rightmost matrix is applied to the vertex first.

## GLM

\`glm\` is a header-only library whose types and functions mirror GLSL, so the C++ and the shader look the same.`,
      sample: {
        lang: 'cpp',
        caption: 'The operations you will use constantly, and why order matters',
        code: `#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <iostream>

int main() {
    glm::vec3 a(1.0f, 0.0f, 0.0f);
    glm::vec3 b(0.0f, 1.0f, 0.0f);

    std::cout << "length      " << glm::length(glm::vec3(3, 4, 0)) << "\\n";
    std::cout << "dot(a,b)    " << glm::dot(a, b) << "\\n";     // 0: perpendicular
    std::cout << "dot(a,a)    " << glm::dot(a, a) << "\\n";     // 1: same direction

    glm::vec3 c = glm::cross(a, b);
    std::cout << "cross(a,b)  (" << c.x << ", " << c.y << ", " << c.z << ")\\n";

    glm::vec3 notUnit(3.0f, 4.0f, 0.0f);
    glm::vec3 unit = glm::normalize(notUnit);
    std::cout << "normalised  (" << unit.x << ", " << unit.y << ") len "
              << glm::length(unit) << "\\n";

    // transformations
    glm::mat4 identity(1.0f);            // the "do nothing" matrix
    glm::mat4 move  = glm::translate(identity, glm::vec3(1.0f, 0.0f, 0.0f));
    glm::mat4 spin  = glm::rotate(identity, glm::radians(90.0f),
                                  glm::vec3(0.0f, 0.0f, 1.0f));

    glm::vec4 point(1.0f, 0.0f, 0.0f, 1.0f);   // w = 1: a position

    glm::vec4 p1 = move * spin * point;   // rotate FIRST, then move
    glm::vec4 p2 = spin * move * point;   // move first, then rotate around origin

    std::cout << "move*spin   (" << p1.x << ", " << p1.y << ")\\n";
    std::cout << "spin*move   (" << p2.x << ", " << p2.y << ")\\n";

    glm::vec4 direction(1.0f, 0.0f, 0.0f, 0.0f);   // w = 0: a direction
    glm::vec4 d = move * direction;                 // translation has no effect
    std::cout << "moved dir   (" << d.x << ", " << d.y << ")\\n";

    return 0;
}`,
        output: `length      5
dot(a,b)    0
dot(a,a)    1
cross(a,b)  (0, 0, 1)
normalised  (0.6, 0.8) len 1
move*spin   (1, 1)
spin*move   (0, 2)
moved dir   (1, 0)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why does 3D graphics use 4×4 matrices rather than 3×3?',
        options: [
          'To support four colour channels',
          'A 3×3 matrix cannot express translation; the fourth row and column make translation a multiplication too, so any chain of transforms collapses into one matrix',
          'For better precision',
          'Because GPUs require it',
        ],
        answer: 1,
        explain:
          'Rotation and scale are linear and fit in 3×3, but translation is an addition. Homogeneous coordinates with a `w` component turn it into multiplication, which means a whole hierarchy of transforms can be pre-multiplied into a single matrix. Setting `w = 0` also neatly makes directions immune to translation.',
        hint: 'Which of the three basic transforms does not fit in a 3×3 matrix?',
      },
    },

    {
      id: 'gl-i-04',
      title: 'Transformations: the model matrix',
      read: `A **model matrix** puts an object into the world: where it is, how it is turned, how big it is.

\`\`\`cpp
glm::mat4 model(1.0f);
model = glm::translate(model, position);
model = glm::rotate(model, glm::radians(angle), axis);
model = glm::scale(model, size);
\`\`\`

## The order that is almost always right

**Scale → Rotate → Translate.**

Written as GLM calls above, each one *right-multiplies*, so the final matrix is \`T * R * S\` and the vertex is scaled first, then rotated, then moved. That is what you want:

- Scale first, so the object is sized before it is turned
- Rotate second, so it spins **around its own centre**
- Translate last, so the rotation does not swing it around the world origin

Get this wrong and objects orbit the origin instead of spinning in place — the single most common transformation bug there is.

## Sending it to the shader

\`\`\`cpp
glUniformMatrix4fv(location, 1, GL_FALSE, glm::value_ptr(model));
\`\`\`

\`GL_FALSE\` means "do not transpose" — GLM already uses the column-major layout OpenGL expects.

## In the shader

\`\`\`glsl
uniform mat4 uModel;
gl_Position = uModel * vec4(aPos, 1.0);
\`\`\`

## Radians, not degrees

Every GLM rotation takes radians. \`glm::radians(45.0f)\` converts. Passing degrees produces a shape that spins absurdly fast, which is at least an obvious symptom.`,
      sample: {
        lang: 'cpp',
        caption: 'Scale, rotate, translate — and the wrong order for comparison',
        code: `#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

struct Object {
    glm::vec3 position{0.0f};
    glm::vec3 rotationAxis{0.0f, 0.0f, 1.0f};
    float angleDegrees = 0.0f;
    glm::vec3 scale{1.0f};

    glm::mat4 modelMatrix() const {
        glm::mat4 model(1.0f);
        model = glm::translate(model, position);                       // 3rd
        model = glm::rotate(model, glm::radians(angleDegrees),
                            rotationAxis);                             // 2nd
        model = glm::scale(model, scale);                              // 1st
        return model;
    }

    // the classic bug: the object orbits the origin instead of spinning
    glm::mat4 wrongOrder() const {
        glm::mat4 model(1.0f);
        model = glm::rotate(model, glm::radians(angleDegrees), rotationAxis);
        model = glm::translate(model, position);
        model = glm::scale(model, scale);
        return model;
    }
};

int main() {
    // ... setup ...

    std::vector<Object> objects;
    for (int i = 0; i < 5; ++i) {
        Object o;
        o.position = glm::vec3(-0.7f + i * 0.35f, 0.0f, 0.0f);
        o.scale = glm::vec3(0.12f);
        objects.push_back(o);
    }

    const int modelLoc = glGetUniformLocation(program, "uModel");

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());

        glClear(GL_COLOR_BUFFER_BIT);
        glUseProgram(program);
        glBindVertexArray(mesh.vao);

        for (std::size_t i = 0; i < objects.size(); ++i) {
            objects[i].angleDegrees = now * (20.0f + i * 25.0f);

            const glm::mat4 model = objects[i].modelMatrix();
            glUniformMatrix4fv(modelLoc, 1, GL_FALSE, glm::value_ptr(model));

            glDrawElements(GL_TRIANGLES, mesh.indexCount, GL_UNSIGNED_INT, nullptr);
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `(five small squares in a row, each spinning in place at its own speed)

With wrongOrder() instead:
(the five squares all swing in wide circles around the centre of the
 screen, because they were rotated after being moved away from the origin)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your object orbits the centre of the screen instead of spinning in place. What is wrong?',
        options: [
          'The rotation axis is wrong',
          'The rotation is applied after the translation, so it rotates the already-moved position around the world origin; translate last (`T * R * S`)',
          'The angle is in degrees',
          'The scale is too large',
        ],
        answer: 1,
        explain:
          'Transformations apply right to left. In `T * R * S` the vertex is scaled, rotated about its own origin, and only then moved. Swap T and R and the object is moved away first, so the rotation sweeps it around the world origin — an orbit rather than a spin.',
        hint: 'Where is the object when the rotation is applied?',
      },
    },

    {
      id: 'gl-i-05',
      title: 'Model, view and projection',
      read: `Getting from a 3D model to a 2D screen takes three matrices.

## Model

Object space → world space. Where the object is in the world. (Previous step.)

## View

World space → view space. Where the **camera** is. It is really the inverse of the camera's own transform: moving the camera right is the same as moving the whole world left.

\`\`\`cpp
glm::mat4 view = glm::lookAt(cameraPos, cameraTarget, upVector);
\`\`\`

## Projection

View space → clip space. How the 3D volume maps onto the screen.

**Perspective** — things further away appear smaller, like a real camera:

\`\`\`cpp
glm::mat4 projection = glm::perspective(
    glm::radians(45.0f),          // field of view
    width / (float)height,        // aspect ratio
    0.1f,                         // near plane
    100.0f);                      // far plane
\`\`\`

**Orthographic** — no size change with distance. For 2D games, CAD and UI.

## Putting it together

\`\`\`glsl
gl_Position = uProjection * uView * uModel * vec4(aPos, 1.0);
\`\`\`

Right to left: model into the world, world into the camera's view, view onto the screen. This exact line appears in essentially every 3D vertex shader ever written.

## The near plane trap

Setting \`near\` to something tiny like \`0.001f\` wrecks depth precision and causes **z-fighting** — surfaces flickering against each other. Keep \`near\` as large as you can tolerate; it matters far more than \`far\`.`,
      sample: {
        lang: 'cpp',
        caption: 'The three matrices, and the aspect ratio kept in step with the window',
        code: `#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

int main() {
    // ... window and shader setup ...

    int windowWidth = 800, windowHeight = 600;

    const int modelLoc = glGetUniformLocation(program, "uModel");
    const int viewLoc  = glGetUniformLocation(program, "uView");
    const int projLoc  = glGetUniformLocation(program, "uProjection");

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        glfwGetFramebufferSize(window, &windowWidth, &windowHeight);

        glClearColor(0.08f, 0.09f, 0.16f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        // MODEL: place and orient the object
        glm::mat4 model(1.0f);
        model = glm::rotate(model, now * glm::radians(35.0f),
                            glm::vec3(0.5f, 1.0f, 0.0f));

        // VIEW: pull the camera back so we can see the origin
        glm::mat4 view = glm::lookAt(
            glm::vec3(0.0f, 0.0f, 3.0f),    // camera position
            glm::vec3(0.0f, 0.0f, 0.0f),    // looking at
            glm::vec3(0.0f, 1.0f, 0.0f));   // which way is up

        // PROJECTION: 45-degree perspective, matched to the window
        const float aspect = static_cast<float>(windowWidth) /
                             static_cast<float>(windowHeight);
        glm::mat4 projection = glm::perspective(
            glm::radians(45.0f), aspect, 0.1f, 100.0f);

        glUseProgram(program);
        glUniformMatrix4fv(modelLoc, 1, GL_FALSE, glm::value_ptr(model));
        glUniformMatrix4fv(viewLoc,  1, GL_FALSE, glm::value_ptr(view));
        glUniformMatrix4fv(projLoc,  1, GL_FALSE, glm::value_ptr(projection));

        glBindVertexArray(mesh.vao);
        glDrawElements(GL_TRIANGLES, mesh.indexCount, GL_UNSIGNED_INT, nullptr);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}

// ---------- vertex shader ----------
// #version 330 core
// layout (location = 0) in vec3 aPos;
// layout (location = 2) in vec2 aUV;
// uniform mat4 uModel;
// uniform mat4 uView;
// uniform mat4 uProjection;
// out vec2 vUV;
// void main() {
//     gl_Position = uProjection * uView * uModel * vec4(aPos, 1.0);
//     vUV = aUV;
// }`,
        output: `(the textured quad now sits in 3D space, tilting as it rotates —
 the near edge is visibly larger than the far edge, which is perspective)

Resizing the window no longer stretches the image, because the
aspect ratio is recomputed from the framebuffer size each frame.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does the **view** matrix represent?',
        options: [
          'Where the object is in the world',
          'The inverse of the camera’s transform — moving the camera right is expressed as moving the whole world left',
          'How the 3D scene is flattened onto the screen',
          'The size of the window',
        ],
        answer: 1,
        explain:
          'OpenGL has no camera; it always renders from the origin looking down −Z. A "camera" is therefore a transform applied to everything else — the inverse of where the camera would be. `glm::lookAt` builds it for you from a position, a target and an up vector.',
        hint: 'Is there actually a camera object in OpenGL?',
      },
    },

    {
      id: 'gl-i-06',
      title: 'Depth testing and the cube',
      read: `In 3D, some surfaces are behind others. Without help, whatever you drew **last** wins — so a cube looks inside-out and wrong.

## The depth buffer

A second buffer storing, per pixel, how far away the closest thing drawn so far is. A new fragment is kept only if it is nearer.

Three things to do:

1. Ask GLFW for a depth buffer (the default gives you 24 bits)
2. \`glEnable(GL_DEPTH_TEST);\` once at startup
3. Clear it every frame: \`glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);\`

**Forgetting the depth clear** is a classic bug: the first frame looks right and every frame after is progressively more broken, because stale depth values reject new fragments.

## A cube

36 vertices (6 faces × 2 triangles × 3 vertices), or 8 unique positions with 36 indices. With per-face UVs you usually want 24 vertices, because a corner needs different texture coordinates on each face it touches.

## z-fighting

Two surfaces at almost the same depth flicker, because the depth buffer cannot tell them apart. Causes: coplanar geometry, or a near plane set far too small. Fixes: move the surfaces apart, raise the near plane, or use \`glPolygonOffset\`.

## Face culling

\`glEnable(GL_CULL_FACE)\` skips triangles facing away from the camera — roughly half of a closed mesh, for free. It depends on consistent winding order, so it also *reveals* geometry with inconsistent winding: faces disappear.`,
      sample: {
        lang: 'cpp',
        caption: 'A cube, depth testing, and ten of them scattered in space',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <vector>

// 36 vertices: position (3) + uv (2). Each face needs its own UVs.
float cubeVertices[] = {
    // back face
    -0.5f, -0.5f, -0.5f,  0.0f, 0.0f,
     0.5f, -0.5f, -0.5f,  1.0f, 0.0f,
     0.5f,  0.5f, -0.5f,  1.0f, 1.0f,
     0.5f,  0.5f, -0.5f,  1.0f, 1.0f,
    -0.5f,  0.5f, -0.5f,  0.0f, 1.0f,
    -0.5f, -0.5f, -0.5f,  0.0f, 0.0f,
    // front face
    -0.5f, -0.5f,  0.5f,  0.0f, 0.0f,
     0.5f, -0.5f,  0.5f,  1.0f, 0.0f,
     0.5f,  0.5f,  0.5f,  1.0f, 1.0f,
     0.5f,  0.5f,  0.5f,  1.0f, 1.0f,
    -0.5f,  0.5f,  0.5f,  0.0f, 1.0f,
    -0.5f, -0.5f,  0.5f,  0.0f, 0.0f,
    // ... four more faces ...
};

int main() {
    // ... window setup ...

    glEnable(GL_DEPTH_TEST);            // once, at startup
    glEnable(GL_CULL_FACE);             // skip back-facing triangles
    glCullFace(GL_BACK);

    std::vector<glm::vec3> positions = {
        { 0.0f,  0.0f,  0.0f}, { 2.0f,  5.0f, -15.0f},
        {-1.5f, -2.2f, -2.5f}, {-3.8f, -2.0f, -12.3f},
        { 2.4f, -0.4f, -3.5f}, {-1.7f,  3.0f, -7.5f},
        { 1.3f, -2.0f, -2.5f}, { 1.5f,  2.0f, -2.5f},
        { 1.5f,  0.2f, -1.5f}, {-1.3f,  1.0f, -1.5f},
    };

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());

        glClearColor(0.06f, 0.07f, 0.12f, 1.0f);
        // BOTH bits — forgetting the depth bit breaks everything after frame 1
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        glm::mat4 view = glm::lookAt(glm::vec3(0.0f, 0.0f, 6.0f),
                                     glm::vec3(0.0f, 0.0f, 0.0f),
                                     glm::vec3(0.0f, 1.0f, 0.0f));
        glm::mat4 projection = glm::perspective(
            glm::radians(45.0f), aspect, 0.1f, 100.0f);

        shader.use();
        shader.setMat4("uView", view);
        shader.setMat4("uProjection", projection);
        glBindVertexArray(cubeVAO);

        for (std::size_t i = 0; i < positions.size(); ++i) {
            glm::mat4 model(1.0f);
            model = glm::translate(model, positions[i]);
            model = glm::rotate(model, now * glm::radians(20.0f * (i + 1)),
                                glm::vec3(1.0f, 0.3f, 0.5f));
            shader.setMat4("uModel", model);
            glDrawArrays(GL_TRIANGLES, 0, 36);
        }

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `(ten textured cubes tumbling at different speeds, correctly overlapping —
 nearer cubes hide the ones behind them, and each cube's own front faces
 hide its back faces)

Without glEnable(GL_DEPTH_TEST): the cubes look hollow and inside-out,
with back faces drawn over front faces depending only on draw order.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your first frame looks correct, but every frame after is increasingly broken with missing surfaces. What is the most likely cause?',
        options: [
          'The projection matrix is wrong',
          '`glClear` is only clearing `GL_COLOR_BUFFER_BIT`, so stale depth values from previous frames reject new fragments',
          'Face culling is enabled',
          'The cube has too many vertices',
        ],
        answer: 1,
        explain:
          'The depth buffer must be reset every frame along with the colour buffer. Left uncleared, it still holds last frame\'s distances, so anything further away than whatever was there before is discarded. The tell is exactly this symptom: frame one is fine, then it degrades.',
        hint: 'Which buffers does your `glClear` call actually clear?',
      },
    },

    {
      id: 'gl-i-07',
      title: 'A camera class',
      read: `Hard-coding \`glm::lookAt\` is fine for a demo. A camera you can move is a class.

## What a camera holds

- **Position** — where it is
- **Front** — the direction it looks (a unit vector)
- **Up** and **Right** — derived from Front with cross products
- **Yaw and pitch** — the angles the mouse controls

## Deriving Front from angles

\`\`\`cpp
glm::vec3 front;
front.x = cos(radians(yaw)) * cos(radians(pitch));
front.y = sin(radians(pitch));
front.z = sin(radians(yaw)) * cos(radians(pitch));
front = normalize(front);
\`\`\`

This is spherical coordinates. Yaw turns you left and right, pitch looks up and down.

## Constraining pitch

**Clamp pitch to ±89°.** At exactly 90° the front vector becomes parallel to the world up vector, the cross product that builds Right collapses to zero, and the camera flips out. This is gimbal lock, and every first-person camera clamps for it.

## Right and Up

\`\`\`cpp
right = normalize(cross(front, worldUp));
up    = normalize(cross(right, front));
\`\`\`

Recomputing Up from Right and Front, rather than using world up directly, keeps the camera level and correct at any pitch.

## The view matrix

\`\`\`cpp
glm::lookAt(position, position + front, up);
\`\`\`

Note \`position + front\` — the target is always one unit ahead of wherever you are.`,
      sample: {
        lang: 'cpp',
        caption: 'camera.h — a complete fly camera',
        code: `#pragma once

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <algorithm>

enum class Move { Forward, Backward, Left, Right, Up, Down };

class Camera {
public:
    explicit Camera(glm::vec3 position = {0.0f, 0.0f, 3.0f})
        : position_(position) { updateVectors(); }

    glm::mat4 viewMatrix() const {
        return glm::lookAt(position_, position_ + front_, up_);
    }

    float fov() const { return fov_; }
    glm::vec3 position() const { return position_; }
    glm::vec3 front() const { return front_; }

    void move(Move direction, float deltaTime) {
        const float distance = speed_ * deltaTime;    // per second
        switch (direction) {
            case Move::Forward:  position_ += front_ * distance; break;
            case Move::Backward: position_ -= front_ * distance; break;
            case Move::Left:     position_ -= right_ * distance; break;
            case Move::Right:    position_ += right_ * distance; break;
            case Move::Up:       position_ += worldUp_ * distance; break;
            case Move::Down:     position_ -= worldUp_ * distance; break;
        }
    }

    void look(float deltaX, float deltaY) {
        yaw_   += deltaX * sensitivity_;
        pitch_ += deltaY * sensitivity_;

        // never reach +-90: the cross product would collapse
        pitch_ = std::clamp(pitch_, -89.0f, 89.0f);

        updateVectors();
    }

    void zoom(float scrollY) {
        fov_ = std::clamp(fov_ - scrollY, 1.0f, 75.0f);
    }

private:
    void updateVectors() {
        glm::vec3 front;
        front.x = std::cos(glm::radians(yaw_)) * std::cos(glm::radians(pitch_));
        front.y = std::sin(glm::radians(pitch_));
        front.z = std::sin(glm::radians(yaw_)) * std::cos(glm::radians(pitch_));

        front_ = glm::normalize(front);
        right_ = glm::normalize(glm::cross(front_, worldUp_));
        // rebuild up from right and front so the camera stays level
        up_    = glm::normalize(glm::cross(right_, front_));
    }

    glm::vec3 position_{0.0f, 0.0f, 3.0f};
    glm::vec3 front_{0.0f, 0.0f, -1.0f};
    glm::vec3 up_{0.0f, 1.0f, 0.0f};
    glm::vec3 right_{1.0f, 0.0f, 0.0f};
    const glm::vec3 worldUp_{0.0f, 1.0f, 0.0f};

    float yaw_ = -90.0f;        // -90 so we start looking down -Z
    float pitch_ = 0.0f;
    float speed_ = 3.0f;        // units per second
    float sensitivity_ = 0.1f;
    float fov_ = 45.0f;
};`,
        output: `camera.viewMatrix() feeds straight into the shader.

Starting yaw of -90 makes the camera look down -Z, matching OpenGL's
default orientation. Without it you would start facing +X and wonder
why the scene is off to one side.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is the camera’s pitch clamped to ±89° rather than ±90°?',
        options: [
          'To stop the user looking straight up',
          'At exactly 90° the front vector is parallel to the world up vector, so `cross(front, worldUp)` is zero and the right/up vectors become undefined — the camera flips',
          'Because 90° is outside the valid range of sin',
          'To improve performance',
        ],
        answer: 1,
        explain:
          'The cross product of two parallel vectors is the zero vector, and normalising it divides by zero. The camera basis collapses and the view snaps wildly. Clamping just short of vertical is the standard fix in every engine.',
        hint: 'What is `cross(a, b)` when a and b point the same way?',
      },
    },

    {
      id: 'gl-i-08',
      title: 'Mouse look and capturing the cursor',
      read: `## Capture the cursor

\`\`\`cpp
glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
\`\`\`

The cursor is hidden and unlimited — it can keep moving in one direction forever, which is exactly what a first-person camera needs.

## The callback

\`\`\`cpp
void mouseCallback(GLFWwindow* window, double x, double y) {
    float deltaX = x - lastX;
    float deltaY = lastY - y;        // note: reversed
    lastX = x; lastY = y;
    camera.look(deltaX, deltaY);
}
\`\`\`

\`deltaY\` is inverted because screen y increases **downwards** while pitch increases **upwards**.

## The first-frame jump

The first callback reports the cursor's absolute position, which can be hundreds of pixels from your initial \`lastX\`/\`lastY\` — producing an enormous delta that spins the camera wildly. Guard with a \`firstMouse\` flag that just records the position and returns.

## Do not multiply mouse delta by deltaTime

Mouse movement is already a distance, not a rate. Scaling it by frame time makes sensitivity depend on frame rate — a subtle bug that makes a game feel different on different machines. **Keyboard movement uses deltaTime; mouse look does not.**

## Getting to the camera

The callback is a plain C function pointer, so use \`glfwSetWindowUserPointer\` to reach your objects, as you did in the last level.`,
      sample: {
        lang: 'cpp',
        caption: 'Complete mouse look with the first-frame guard',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include "camera.h"

struct App {
    Camera camera{glm::vec3(0.0f, 0.0f, 5.0f)};
    float lastX = 0.0f;
    float lastY = 0.0f;
    bool firstMouse = true;
};

void mouseCallback(GLFWwindow* window, double xPos, double yPos) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));

    const float x = static_cast<float>(xPos);
    const float y = static_cast<float>(yPos);

    if (app->firstMouse) {            // avoid an enormous first delta
        app->lastX = x;
        app->lastY = y;
        app->firstMouse = false;
        return;
    }

    const float deltaX = x - app->lastX;
    const float deltaY = app->lastY - y;    // reversed: screen y grows downwards
    app->lastX = x;
    app->lastY = y;

    app->camera.look(deltaX, deltaY);       // NOT scaled by deltaTime
}

void scrollCallback(GLFWwindow* window, double, double yOffset) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));
    app->camera.zoom(static_cast<float>(yOffset));
}

void processKeys(App& app, GLFWwindow* window, float deltaTime) {
    if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS) {
        glfwSetWindowShouldClose(window, true);
    }
    if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS)
        app.camera.move(Move::Forward, deltaTime);     // IS scaled by deltaTime
    if (glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS)
        app.camera.move(Move::Backward, deltaTime);
    if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS)
        app.camera.move(Move::Left, deltaTime);
    if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS)
        app.camera.move(Move::Right, deltaTime);
    if (glfwGetKey(window, GLFW_KEY_SPACE) == GLFW_PRESS)
        app.camera.move(Move::Up, deltaTime);
    if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT) == GLFW_PRESS)
        app.camera.move(Move::Down, deltaTime);
}

int main() {
    // ... window setup ...

    App app;
    glfwSetWindowUserPointer(window, &app);
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
    glfwSetCursorPosCallback(window, mouseCallback);
    glfwSetScrollCallback(window, scrollCallback);

    float lastFrame = 0.0f;

    while (!glfwWindowShouldClose(window)) {
        const float now = static_cast<float>(glfwGetTime());
        const float deltaTime = now - lastFrame;
        lastFrame = now;

        processKeys(app, window, deltaTime);

        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        shader.use();
        shader.setMat4("uView", app.camera.viewMatrix());
        shader.setMat4("uProjection", glm::perspective(
            glm::radians(app.camera.fov()), aspect, 0.1f, 100.0f));

        // ... draw the scene ...

        glfwSwapBuffers(window);
        glfwPollEvents();
    }
}`,
        output: `(a proper first-person fly camera: mouse to look, WASD to move,
 Space and Shift for up and down, scroll wheel to zoom)

Without the firstMouse guard, the view snaps violently the instant
you move the mouse, because the first delta is the cursor's absolute
position minus zero.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why should mouse-look deltas **not** be multiplied by `deltaTime`, when keyboard movement should?',
        options: [
          'Mouse input is more accurate',
          'A mouse delta is already a distance moved, not a rate; scaling it by frame time would make sensitivity depend on frame rate',
          'The mouse callback has no access to deltaTime',
          'It would make the camera too slow',
        ],
        answer: 1,
        explain:
          'The keyboard reports a *state* ("W is held"), so you must convert it to distance using elapsed time. The mouse reports a *displacement* that already happened. Multiplying it by deltaTime means the same physical hand movement turns you further at low frame rates — which players notice immediately.',
        hint: 'What does each input device actually report?',
      },
    },

    {
      id: 'gl-i-09',
      title: 'A Mesh class and RAII for GPU objects',
      read: `GPU objects are resources, just like heap memory — and C++ has an answer for resources: **RAII**.

\`\`\`cpp
class Mesh {
public:
    Mesh(const std::vector<Vertex>& vertices, const std::vector<unsigned int>& indices);
    ~Mesh();                                        // deletes the GL objects

    Mesh(const Mesh&) = delete;                     // two owners would double-delete
    Mesh& operator=(const Mesh&) = delete;

    Mesh(Mesh&& other) noexcept;                    // transferring is fine
    Mesh& operator=(Mesh&& other) noexcept;

    void draw() const;
};
\`\`\`

## Why delete the copy

The class owns \`vao\`, \`vbo\` and \`ebo\` — integers naming GPU resources. Copying the integers does not copy the resources, so two objects would each call \`glDeleteBuffers\` on the same id. The second call is an error, and the first leaves the other object pointing at a deleted object.

## Why the move is fine

A move **transfers** ownership: the source's ids are set to 0, so its destructor does nothing. Exactly one object owns the resource at any moment.

## A Vertex struct

\`\`\`cpp
struct Vertex {
    glm::vec3 position;
    glm::vec3 normal;
    glm::vec2 uv;
};
\`\`\`

Then \`offsetof(Vertex, normal)\` gives the attribute offset, and \`sizeof(Vertex)\` the stride — no hand-counted float arithmetic to get wrong.

## The order of destruction

An OpenGL object can only be deleted while a context is current. Destroy your meshes **before** \`glfwTerminate()\`, or the deletes silently do nothing. Scoping the objects inside a block, or making the window an RAII object constructed first, solves it.`,
      sample: {
        lang: 'cpp',
        caption: 'mesh.h — a GPU resource that cleans up after itself',
        code: `#pragma once

#include <glad/glad.h>
#include <glm/glm.hpp>
#include <cstddef>
#include <utility>
#include <vector>

struct Vertex {
    glm::vec3 position{0.0f};
    glm::vec3 normal{0.0f};
    glm::vec2 uv{0.0f};
};

class Mesh {
public:
    Mesh(const std::vector<Vertex>& vertices,
         const std::vector<unsigned int>& indices)
        : indexCount_(static_cast<int>(indices.size())) {

        glGenVertexArrays(1, &vao_);
        glGenBuffers(1, &vbo_);
        glGenBuffers(1, &ebo_);

        glBindVertexArray(vao_);

        glBindBuffer(GL_ARRAY_BUFFER, vbo_);
        glBufferData(GL_ARRAY_BUFFER,
                     static_cast<GLsizeiptr>(vertices.size() * sizeof(Vertex)),
                     vertices.data(), GL_STATIC_DRAW);

        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo_);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER,
                     static_cast<GLsizeiptr>(indices.size() * sizeof(unsigned int)),
                     indices.data(), GL_STATIC_DRAW);

        // offsetof keeps the layout in step with the struct automatically
        glEnableVertexAttribArray(0);
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex),
                              reinterpret_cast<void*>(offsetof(Vertex, position)));
        glEnableVertexAttribArray(1);
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex),
                              reinterpret_cast<void*>(offsetof(Vertex, normal)));
        glEnableVertexAttribArray(2);
        glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex),
                              reinterpret_cast<void*>(offsetof(Vertex, uv)));

        glBindVertexArray(0);
    }

    ~Mesh() { destroy(); }

    Mesh(const Mesh&) = delete;
    Mesh& operator=(const Mesh&) = delete;

    Mesh(Mesh&& other) noexcept
        : vao_(other.vao_), vbo_(other.vbo_), ebo_(other.ebo_),
          indexCount_(other.indexCount_) {
        other.vao_ = other.vbo_ = other.ebo_ = 0;    // source no longer owns them
        other.indexCount_ = 0;
    }

    Mesh& operator=(Mesh&& other) noexcept {
        if (this != &other) {
            destroy();
            vao_ = std::exchange(other.vao_, 0);
            vbo_ = std::exchange(other.vbo_, 0);
            ebo_ = std::exchange(other.ebo_, 0);
            indexCount_ = std::exchange(other.indexCount_, 0);
        }
        return *this;
    }

    void draw() const {
        glBindVertexArray(vao_);
        glDrawElements(GL_TRIANGLES, indexCount_, GL_UNSIGNED_INT, nullptr);
    }

private:
    void destroy() {
        if (vao_ != 0) glDeleteVertexArrays(1, &vao_);
        if (vbo_ != 0) glDeleteBuffers(1, &vbo_);
        if (ebo_ != 0) glDeleteBuffers(1, &ebo_);
        vao_ = vbo_ = ebo_ = 0;
    }

    unsigned int vao_ = 0, vbo_ = 0, ebo_ = 0;
    int indexCount_ = 0;
};`,
        output: `Using it:

    {
        Mesh cube = makeCube();            // vectors can hold Meshes because
        std::vector<Mesh> meshes;          // Mesh is movable
        meshes.push_back(std::move(cube));

        while (running) { meshes[0].draw(); }
    }   // every VAO/VBO/EBO deleted here, automatically

    glfwTerminate();   // AFTER the meshes are gone — the context must still exist`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is `Mesh`’s copy constructor deleted but its move constructor implemented?',
        options: [
          'Moving is faster than copying',
          'Copying would give two objects the same GL object ids, so both destructors would delete them; moving transfers the ids and zeroes the source, keeping exactly one owner',
          'OpenGL objects cannot be copied at all',
          'It is required for std::vector',
        ],
        answer: 1,
        explain:
          'The class owns resources named by integers. Duplicating the integers duplicates the *name*, not the resource — so a double delete follows. A move sets the source ids to 0, which the destructor checks, so ownership is transferred rather than shared. (Being movable is also what lets a `std::vector<Mesh>` work.)',
        hint: 'What does the destructor do, and how many times should it happen per resource?',
      },
    },

    {
      id: 'gl-i-10',
      title: 'Generating geometry in code',
      read: `Typing 36 vertices for a cube is tedious. Typing a sphere by hand is impossible. Generate them.

## A UV sphere

Two nested loops over latitude (**stacks**) and longitude (**sectors**):

\`\`\`cpp
for (int stack = 0; stack <= stacks; ++stack) {
    float phi = PI / 2 - stack * (PI / stacks);      // +90 down to -90
    for (int sector = 0; sector <= sectors; ++sector) {
        float theta = sector * (2 * PI / sectors);
        x = cos(phi) * cos(theta);
        y = sin(phi);
        z = cos(phi) * sin(theta);
    }
}
\`\`\`

For a unit sphere centred on the origin, the **normal is the position** — a pleasant simplification.

## Indices

Each quad in the grid becomes two triangles. Skip the degenerate ones at the poles, where several vertices coincide.

## A grid plane

Even simpler, and useful for terrain: a heightmap is just a grid with \`y\` sampled from a function or an image.

## Why generate

- **Parameterised** — change one number for more or less detail
- **Tiny** — a formula instead of a megabyte of vertices
- **Correct normals and UVs** by construction
- It teaches you what a mesh *is*, which makes loading real model files obvious later

> Loops, functions, vectors, trigonometry — this step is as much C++ practice as it is graphics.`,
      sample: {
        lang: 'cpp',
        caption: 'A sphere and a grid, both from nested loops',
        code: `#include <cmath>
#include <numbers>
#include <vector>
#include "mesh.h"

Mesh makeSphere(int stacks = 18, int sectors = 36) {
    constexpr float pi = std::numbers::pi_v<float>;

    std::vector<Vertex> vertices;
    vertices.reserve(static_cast<std::size_t>((stacks + 1) * (sectors + 1)));

    for (int stack = 0; stack <= stacks; ++stack) {
        const float phi = pi / 2.0f - static_cast<float>(stack) * (pi / stacks);
        const float y  = std::sin(phi);
        const float xz = std::cos(phi);

        for (int sector = 0; sector <= sectors; ++sector) {
            const float theta = static_cast<float>(sector) * (2.0f * pi / sectors);

            Vertex v;
            v.position = {xz * std::cos(theta), y, xz * std::sin(theta)};
            v.normal   = v.position;          // unit sphere: normal == position
            v.uv       = {static_cast<float>(sector) / sectors,
                          static_cast<float>(stack) / stacks};
            vertices.push_back(v);
        }
    }

    std::vector<unsigned int> indices;
    indices.reserve(static_cast<std::size_t>(stacks * sectors * 6));

    for (int stack = 0; stack < stacks; ++stack) {
        unsigned int current = static_cast<unsigned int>(stack * (sectors + 1));
        unsigned int next = current + static_cast<unsigned int>(sectors + 1);

        for (int sector = 0; sector < sectors; ++sector, ++current, ++next) {
            if (stack != 0) {                      // no triangle at the top pole
                indices.insert(indices.end(), {current, next, current + 1});
            }
            if (stack != stacks - 1) {             // none at the bottom pole
                indices.insert(indices.end(), {current + 1, next, next + 1});
            }
        }
    }

    return Mesh(vertices, indices);
}

Mesh makeGrid(int cells, float size) {
    std::vector<Vertex> vertices;
    std::vector<unsigned int> indices;
    const float step = size / cells;
    const float half = size / 2.0f;

    for (int z = 0; z <= cells; ++z) {
        for (int x = 0; x <= cells; ++x) {
            Vertex v;
            v.position = {-half + x * step, 0.0f, -half + z * step};
            v.normal   = {0.0f, 1.0f, 0.0f};
            v.uv       = {static_cast<float>(x) / cells,
                          static_cast<float>(z) / cells};
            vertices.push_back(v);
        }
    }

    const int stride = cells + 1;
    for (int z = 0; z < cells; ++z) {
        for (int x = 0; x < cells; ++x) {
            const unsigned int topLeft = static_cast<unsigned int>(z * stride + x);
            const unsigned int topRight = topLeft + 1;
            const unsigned int bottomLeft = topLeft + static_cast<unsigned int>(stride);
            const unsigned int bottomRight = bottomLeft + 1;

            indices.insert(indices.end(), {topLeft, bottomLeft, topRight});
            indices.insert(indices.end(), {topRight, bottomLeft, bottomRight});
        }
    }

    return Mesh(vertices, indices);
}`,
        output: `makeSphere(18, 36)  -> 703 vertices, 3672 indices (1224 triangles)
makeSphere(64, 128) -> 8385 vertices, 48768 indices

makeGrid(32, 10.0f) -> 1089 vertices, 6144 indices

(a smooth textured sphere floating above a flat grid plane —
 increase the stack and sector counts and it gets rounder)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'For a unit sphere centred on the origin, why is the vertex normal simply equal to its position?',
        options: [
          'It is a coincidence that only works for spheres of radius 1',
          'The surface normal points directly away from the centre, and for a unit sphere that direction is exactly the position vector — already normalised',
          'Normals are always equal to positions',
          'Because the sphere is generated with trigonometry',
        ],
        answer: 1,
        explain:
          'A sphere\'s outward normal at any point is the direction from the centre to that point. With the centre at the origin, that direction *is* the position, and for radius 1 it already has length 1 so no normalisation is needed. For any other radius you would divide by the radius.',
        hint: 'Which way does a sphere’s surface face at a given point?',
      },
    },

    {
      id: 'gl-i-11',
      title: 'Organising a renderer',
      read: `You now have Shader, Mesh, Camera and a scene. Time to think about how they fit together.

## Separate the pieces

- **Resources** — Shader, Mesh, Texture. Own GPU objects, know nothing about scenes.
- **Scene** — what exists: transforms, which mesh, which material.
- **Renderer** — walks the scene and issues draw calls.
- **Application** — window, input, main loop, ties it together.

Each layer knows about the one below and nothing about the one above. That is what makes a renderer replaceable without touching your scene code.

## Minimise state changes

The GPU pays for every bind. The standard approach is to **sort draws by state**: group by shader, then by texture, then draw. On a scene with hundreds of objects this can double your frame rate for no visual change.

## Resource ownership

Many objects share one mesh and one texture. So:

- Objects hold a **reference or index**, not a copy
- Resources live in a single owner — a \`ResourceManager\` holding \`std::vector<Mesh>\` or \`std::unordered_map<std::string, Texture>\`
- Look up by handle, so nothing dangles when the container grows

## What not to do yet

Do not build an engine. Build the thing you want to see, notice what is painful, and factor *that* out. Abstractions invented before the problem exists are almost always wrong.`,
      sample: {
        lang: 'cpp',
        caption: 'A small renderer with state-sorted draws',
        code: `#pragma once

#include <glm/glm.hpp>
#include <algorithm>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "camera.h"
#include "mesh.h"
#include "shader.h"

struct Material {
    unsigned int shaderIndex = 0;
    unsigned int textureId = 0;
    glm::vec3 tint{1.0f};
};

struct RenderItem {
    unsigned int meshIndex = 0;
    unsigned int materialIndex = 0;
    glm::mat4 model{1.0f};
};

class ResourceManager {
public:
    unsigned int addMesh(Mesh&& mesh) {
        meshes_.push_back(std::move(mesh));          // Mesh is movable
        return static_cast<unsigned int>(meshes_.size() - 1);
    }
    unsigned int addShader(std::unique_ptr<Shader> shader) {
        shaders_.push_back(std::move(shader));
        return static_cast<unsigned int>(shaders_.size() - 1);
    }
    unsigned int addMaterial(const Material& material) {
        materials_.push_back(material);
        return static_cast<unsigned int>(materials_.size() - 1);
    }

    const Mesh& mesh(unsigned int i) const { return meshes_[i]; }
    Shader& shader(unsigned int i) const { return *shaders_[i]; }
    const Material& material(unsigned int i) const { return materials_[i]; }

private:
    std::vector<Mesh> meshes_;
    std::vector<std::unique_ptr<Shader>> shaders_;
    std::vector<Material> materials_;
};

class Renderer {
public:
    void submit(const RenderItem& item) { queue_.push_back(item); }

    void flush(const ResourceManager& resources, const Camera& camera,
               float aspect) {
        // sort so identical state is adjacent: fewer binds
        std::sort(queue_.begin(), queue_.end(),
                  [&](const RenderItem& a, const RenderItem& b) {
                      const auto& ma = resources.material(a.materialIndex);
                      const auto& mb = resources.material(b.materialIndex);
                      if (ma.shaderIndex != mb.shaderIndex)
                          return ma.shaderIndex < mb.shaderIndex;
                      if (ma.textureId != mb.textureId)
                          return ma.textureId < mb.textureId;
                      return a.meshIndex < b.meshIndex;
                  });

        const glm::mat4 view = camera.viewMatrix();
        const glm::mat4 projection = glm::perspective(
            glm::radians(camera.fov()), aspect, 0.1f, 200.0f);

        unsigned int boundShader = ~0u;
        unsigned int boundTexture = ~0u;
        int binds = 0;

        for (const RenderItem& item : queue_) {
            const Material& material = resources.material(item.materialIndex);

            if (material.shaderIndex != boundShader) {
                Shader& shader = resources.shader(material.shaderIndex);
                shader.use();
                shader.setMat4("uView", view);
                shader.setMat4("uProjection", projection);
                boundShader = material.shaderIndex;
                ++binds;
            }
            if (material.textureId != boundTexture) {
                glActiveTexture(GL_TEXTURE0);
                glBindTexture(GL_TEXTURE_2D, material.textureId);
                boundTexture = material.textureId;
                ++binds;
            }

            Shader& shader = resources.shader(material.shaderIndex);
            shader.setMat4("uModel", item.model);
            shader.setVec3("uTint", material.tint.r, material.tint.g, material.tint.b);
            resources.mesh(item.meshIndex).draw();
        }

        lastBindCount_ = binds;
        queue_.clear();
    }

    int lastBindCount() const { return lastBindCount_; }

private:
    std::vector<RenderItem> queue_;
    int lastBindCount_ = 0;
};`,
        output: `400 objects, 3 shaders, 5 textures:

  unsorted:  742 state binds per frame,  41 fps
  sorted:      8 state binds per frame, 118 fps

Same image, same draw calls — only the order changed.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why sort render items by shader and texture before drawing?',
        options: [
          'To draw nearer objects first',
          'Grouping identical state together means each shader and texture is bound once instead of once per object, and state changes are among the most expensive GPU commands',
          'It improves image quality',
          'Sorting is required for depth testing',
        ],
        answer: 1,
        explain:
          'Binding a shader or texture flushes GPU pipeline state and costs far more than a draw call. Sorting turns hundreds of redundant binds into a handful with no visual difference. It is one of the highest-value optimisations in any renderer — and it is pure CPU-side bookkeeping.',
        hint: 'How many times is the same shader bound if the objects are interleaved?',
      },
    },

    {
      id: 'gl-i-12',
      title: 'Project: a 3D scene you can fly through',
      read: `Everything from this level: textures, matrices, depth testing, generated geometry, a camera, and classes that manage their own resources.

The scene:
- A textured ground grid
- A field of cubes and spheres at varying heights, each rotating
- A fly camera: WASD, mouse look, scroll to zoom, Space/Shift for altitude
- Live statistics in the window title

What to look for:

1. **Every GPU object is owned by a class** with a destructor. There is not a single \`glDelete\` call in \`main\`.
2. **The matrices are computed once per frame** where possible — view and projection do not change between objects, so they are set once per shader bind.
3. **Geometry is generated**, so changing the detail level is one number.
4. **Everything time-based uses \`deltaTime\`**, so the scene behaves the same at any frame rate.
5. **Resources are destroyed before \`glfwTerminate()\`** — note the extra scope block in \`main\`.

> Extend it: add a second texture per object, make the cubes bob on a sine wave, add collision so the camera cannot pass through the ground, or load a real model file. You now have the foundation for all of it.`,
      sample: {
        lang: 'cpp',
        caption: 'main.cpp — a complete 3D scene with a fly camera',
        code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <cstdio>
#include <random>
#include <vector>

#include "camera.h"
#include "mesh.h"
#include "shader.h"
#include "texture.h"
#include "geometry.h"

struct SceneObject {
    glm::vec3 position{0.0f};
    glm::vec3 axis{0.0f, 1.0f, 0.0f};
    float scale = 1.0f;
    float spinSpeed = 20.0f;
    glm::vec3 tint{1.0f};
    bool isSphere = false;
};

struct App {
    Camera camera{glm::vec3(0.0f, 2.0f, 8.0f)};
    float lastX = 0.0f, lastY = 0.0f;
    bool firstMouse = true;
};

std::vector<SceneObject> buildScene(int count) {
    std::mt19937 rng(1234);                       // fixed seed: reproducible
    std::uniform_real_distribution<float> spread(-14.0f, 14.0f);
    std::uniform_real_distribution<float> height(0.5f, 6.0f);
    std::uniform_real_distribution<float> size(0.4f, 1.3f);
    std::uniform_real_distribution<float> speed(-60.0f, 60.0f);
    std::uniform_real_distribution<float> channel(0.35f, 1.0f);

    std::vector<SceneObject> objects;
    objects.reserve(static_cast<std::size_t>(count));

    for (int i = 0; i < count; ++i) {
        SceneObject o;
        o.position = {spread(rng), height(rng), spread(rng)};
        o.axis = glm::normalize(glm::vec3(channel(rng), channel(rng), channel(rng)));
        o.scale = size(rng);
        o.spinSpeed = speed(rng);
        o.tint = {channel(rng), channel(rng), channel(rng)};
        o.isSphere = (i % 3 == 0);
        objects.push_back(o);
    }
    return objects;
}

int main() {
    GLFWwindow* window = createWindow(1280, 720, "3D Scene — WASD + mouse");
    if (window == nullptr) return -1;

    App app;
    glfwSetWindowUserPointer(window, &app);
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
    glfwSetCursorPosCallback(window, mouseCallback);
    glfwSetScrollCallback(window, scrollCallback);

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);

    int exitCode = 0;
    {   // scope: every GPU resource is destroyed before glfwTerminate()
        Shader shader("shaders/scene.vert", "shaders/scene.frag");
        if (!shader.valid()) { glfwTerminate(); return -1; }

        Texture crate("assets/container.jpg");
        Texture ground("assets/grid.png");
        if (!crate.valid() || !ground.valid()) { glfwTerminate(); return -1; }

        Mesh cube = makeCube();
        Mesh sphere = makeSphere(24, 48);
        Mesh grid = makeGrid(40, 40.0f);

        std::vector<SceneObject> objects = buildScene(120);

        shader.use();
        shader.setInt("uTexture", 0);

        float lastFrame = 0.0f;
        float titleTimer = 0.0f;
        int frames = 0;

        while (!glfwWindowShouldClose(window)) {
            const float now = static_cast<float>(glfwGetTime());
            const float deltaTime = now - lastFrame;
            lastFrame = now;

            processKeys(app, window, deltaTime);

            int width = 0, height = 0;
            glfwGetFramebufferSize(window, &width, &height);
            const float aspect = height > 0
                ? static_cast<float>(width) / static_cast<float>(height)
                : 1.0f;

            glClearColor(0.05f, 0.06f, 0.10f, 1.0f);
            glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

            const glm::mat4 view = app.camera.viewMatrix();
            const glm::mat4 projection = glm::perspective(
                glm::radians(app.camera.fov()), aspect, 0.1f, 200.0f);

            shader.use();                               // bound once
            shader.setMat4("uView", view);              // set once
            shader.setMat4("uProjection", projection);

            // ---- ground ----
            ground.bind(0);
            glm::mat4 groundModel(1.0f);
            shader.setMat4("uModel", groundModel);
            shader.setVec3("uTint", 0.55f, 0.58f, 0.68f);
            grid.draw();

            // ---- objects, grouped by mesh to avoid re-binding ----
            crate.bind(0);
            for (const SceneObject& o : objects) {
                if (o.isSphere) continue;
                glm::mat4 model(1.0f);
                model = glm::translate(model, o.position);
                model = glm::rotate(model, glm::radians(now * o.spinSpeed), o.axis);
                model = glm::scale(model, glm::vec3(o.scale));
                shader.setMat4("uModel", model);
                shader.setVec3("uTint", o.tint.r, o.tint.g, o.tint.b);
                cube.draw();
            }
            for (const SceneObject& o : objects) {
                if (!o.isSphere) continue;
                glm::mat4 model(1.0f);
                model = glm::translate(model, o.position);
                model = glm::rotate(model, glm::radians(now * o.spinSpeed), o.axis);
                model = glm::scale(model, glm::vec3(o.scale * 0.6f));
                shader.setMat4("uModel", model);
                shader.setVec3("uTint", o.tint.r, o.tint.g, o.tint.b);
                sphere.draw();
            }

            ++frames;
            titleTimer += deltaTime;
            if (titleTimer >= 0.5f) {
                char title[160];
                std::snprintf(title, sizeof(title),
                    "3D Scene | %d fps | pos %.1f %.1f %.1f | fov %.0f | %zu objects",
                    static_cast<int>(frames / titleTimer),
                    app.camera.position().x, app.camera.position().y,
                    app.camera.position().z, app.camera.fov(), objects.size());
                glfwSetWindowTitle(window, title);
                frames = 0;
                titleTimer = 0.0f;
            }

            glfwSwapBuffers(window);
            glfwPollEvents();
        }
    }   // shader, textures and meshes all destroyed here, context still alive

    glfwTerminate();
    return exitCode;
}`,
        output: `3D Scene | 144 fps | pos 3.2 2.0 8.0 | fov 45 | 120 objects

(a grid plane stretching away, with 120 rotating cubes and spheres
 floating above it in different colours and sizes. Fly around with
 WASD and the mouse; nearer objects correctly hide further ones.)

Draw calls: 121   Shader binds: 1   Texture binds: 2`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are the shader, textures and meshes declared inside an extra `{ }` block in `main`?',
        options: [
          'To keep main() tidy',
          'So their destructors run — deleting the GL objects — **before** `glfwTerminate()` destroys the OpenGL context; deleting GL objects with no current context silently does nothing',
          'To reduce memory usage',
          'Because C++ requires it for RAII',
        ],
        answer: 1,
        explain:
          'GPU object deletion requires a current context. Objects declared directly in `main` would be destroyed after `glfwTerminate()` returns, so their `glDelete*` calls would be no-ops (and on some drivers, errors). The extra scope forces destruction while the context still exists — the standard fix, and an ordering problem RAII does not solve by itself.',
        hint: 'What does `glfwTerminate()` destroy, and what do the destructors need?',
      },
    },
  ],
}

export default level
