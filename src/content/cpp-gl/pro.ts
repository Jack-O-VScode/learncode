import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'Modern GPU architecture and engine design',
  summary:
    'Deferred shading, shadow mapping, physically based rendering, HDR and bloom, compute shaders, GPU-driven rendering, profiling, render graphs, threading, and the road from OpenGL to Vulkan.',
  outcomes: [
    'Use modern OpenGL: DSA, persistent mapping, bindless-style access',
    'Implement deferred shading and shadow mapping, and know their limits',
    'Explain and implement physically based rendering',
    'Write compute shaders and GPU-driven draw submission',
    'Profile GPU work and find the real bottleneck',
    'Design a render graph and thread a renderer safely',
  ],
  steps: [
    {
      id: 'gl-p-01',
      title: 'Modern OpenGL: DSA and beyond',
      read: `The bind-to-edit model you have been using is from 1992. OpenGL 4.5 added **Direct State Access**, which lets you modify an object by name without binding it.

\`\`\`cpp
// old: bind, then modify whatever is bound
glBindBuffer(GL_ARRAY_BUFFER, vbo);
glBufferData(GL_ARRAY_BUFFER, size, data, GL_STATIC_DRAW);

// DSA: say what you mean
glCreateBuffers(1, &vbo);
glNamedBufferStorage(vbo, size, data, GL_DYNAMIC_STORAGE_BIT);
\`\`\`

Why it matters beyond tidiness: bind-to-edit means every function's behaviour depends on hidden global state, so a forgotten bind corrupts an unrelated object. DSA removes that whole class of bug, and reduces driver validation work.

## Immutable storage

\`glBufferStorage\` / \`glTexStorage2D\` allocate once with fixed size and flags. The driver knows the allocation will never change and can optimise accordingly. You can still update the *contents*.

## Persistent mapping

\`\`\`cpp
glNamedBufferStorage(buffer, size, nullptr,
    GL_MAP_WRITE_BIT | GL_MAP_PERSISTENT_BIT | GL_MAP_COHERENT_BIT);
void* ptr = glMapNamedBufferRange(buffer, 0, size, ...);
\`\`\`

Map once, keep the pointer forever, write to it like ordinary memory. No map/unmap per frame. You must then handle synchronisation yourself — triple-buffer the region and use \`glFenceSync\` so you never write to memory the GPU is still reading.

## Bindless textures

\`ARB_bindless_texture\` turns a texture into a 64-bit handle you can store in a buffer, removing the texture-unit limit entirely. Not core OpenGL, but supported on desktop NVIDIA and AMD, and the foundation of GPU-driven rendering.

> Direction of travel: fewer binds, fewer driver calls, more data resident on the GPU. That is also the philosophy behind Vulkan.`,
      sample: {
        lang: 'cpp',
        caption: 'DSA setup and a persistently-mapped, triple-buffered uniform ring',
        code: `#include <glad/glad.h>
#include <array>
#include <cstring>

// ---------- DSA: no binds anywhere in the setup ----------
unsigned int createMeshDSA(const std::vector<Vertex>& vertices,
                           const std::vector<unsigned int>& indices) {
    unsigned int vbo = 0, ebo = 0, vao = 0;

    glCreateBuffers(1, &vbo);
    glNamedBufferStorage(vbo, vertices.size() * sizeof(Vertex),
                         vertices.data(), 0);          // immutable

    glCreateBuffers(1, &ebo);
    glNamedBufferStorage(ebo, indices.size() * sizeof(unsigned int),
                         indices.data(), 0);

    glCreateVertexArrays(1, &vao);
    glVertexArrayVertexBuffer(vao, 0, vbo, 0, sizeof(Vertex));
    glVertexArrayElementBuffer(vao, ebo);

    glEnableVertexArrayAttrib(vao, 0);
    glVertexArrayAttribFormat(vao, 0, 3, GL_FLOAT, GL_FALSE,
                              offsetof(Vertex, position));
    glVertexArrayAttribBinding(vao, 0, 0);

    glEnableVertexArrayAttrib(vao, 1);
    glVertexArrayAttribFormat(vao, 1, 3, GL_FLOAT, GL_FALSE,
                              offsetof(Vertex, normal));
    glVertexArrayAttribBinding(vao, 1, 0);

    return vao;
}

// ---------- persistent mapping with fences ----------
template <typename T, std::size_t Frames = 3>
class PersistentRing {
public:
    PersistentRing() {
        const GLbitfield flags = GL_MAP_WRITE_BIT | GL_MAP_PERSISTENT_BIT |
                                 GL_MAP_COHERENT_BIT;
        glCreateBuffers(1, &buffer_);
        glNamedBufferStorage(buffer_, sizeof(T) * Frames, nullptr, flags);
        mapped_ = static_cast<T*>(
            glMapNamedBufferRange(buffer_, 0, sizeof(T) * Frames, flags));
    }

    ~PersistentRing() {
        for (auto& fence : fences_) if (fence) glDeleteSync(fence);
        glUnmapNamedBuffer(buffer_);
        glDeleteBuffers(1, &buffer_);
    }

    // write this frame's data, waiting only if the GPU is still using this slot
    void write(const T& data) {
        if (fences_[slot_] != nullptr) {
            glClientWaitSync(fences_[slot_], GL_SYNC_FLUSH_COMMANDS_BIT,
                             1'000'000'000);
            glDeleteSync(fences_[slot_]);
            fences_[slot_] = nullptr;
        }
        std::memcpy(mapped_ + slot_, &data, sizeof(T));
    }

    void bind(unsigned int bindingPoint) const {
        glBindBufferRange(GL_UNIFORM_BUFFER, bindingPoint, buffer_,
                          static_cast<GLintptr>(slot_ * sizeof(T)), sizeof(T));
    }

    // call after submitting the draws that read this slot
    void endFrame() {
        fences_[slot_] = glFenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        slot_ = (slot_ + 1) % Frames;
    }

private:
    unsigned int buffer_ = 0;
    T* mapped_ = nullptr;
    std::array<GLsync, Frames> fences_{};
    std::size_t slot_ = 0;
};`,
        output: `Per-frame uniform upload, 10,000 objects:

  glBufferData each frame:      2.81 ms  (driver allocates and copies)
  glBufferSubData:              1.94 ms
  persistent mapped + fences:   0.09 ms  (a memcpy into mapped memory)

Without triple buffering and fences, the persistent version is FASTER
and WRONG: you overwrite data the GPU is still reading, and the image
tears or flickers.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must a persistently-mapped buffer be multi-buffered with fence synchronisation?',
        options: [
          'To reduce memory use',
          'The GPU may still be reading the region while the CPU writes the next frame’s data; fences plus several slots ensure you only write to memory the GPU has finished with',
          'Because mapping is slow',
          'OpenGL requires three buffers',
        ],
        answer: 1,
        explain:
          'Removing the map/unmap also removes the implicit synchronisation it provided. The CPU typically runs 1–3 frames ahead, so writing into the same region immediately corrupts in-flight data. A ring of slots plus `glFenceSync` gives you the same safety at a fraction of the cost.',
        hint: 'How far ahead of the GPU is the CPU?',
      },
    },

    {
      id: 'gl-p-02',
      title: 'Deferred shading',
      read: `Forward rendering shades every fragment for every light. With 100 lights and overdraw, most of that work is thrown away by the depth test.

**Deferred shading** splits it in two:

## Geometry pass

Render the scene once, writing surface properties into a **G-buffer** — several render targets at once:

- position (or reconstructed from depth)
- normal
- albedo + specular/roughness

No lighting at all. Multiple render targets come from \`glDrawBuffers\` and several \`layout(location = n) out\` declarations.

## Lighting pass

Draw a full-screen quad. For each pixel, read the G-buffer and light it — **once**, regardless of scene complexity. Cost becomes *pixels × lights* rather than *fragments × lights*.

That makes hundreds of lights practical.

## The costs

- **Bandwidth.** A G-buffer at 1080p is 30–60 MB read and written per frame. On mobile this is often the deciding factor against it.
- **No hardware MSAA** — the G-buffer holds attributes, not colours, so multisampling does not resolve correctly. Use FXAA/TAA instead.
- **No transparency.** Transparent surfaces need a forward pass afterwards.
- **One material model** for everything in the G-buffer.

## Reducing the G-buffer

Reconstruct position from depth rather than storing it. Encode normals in two channels (octahedral). Pack aggressively — every byte is bandwidth.

## Tiled and clustered

Modern engines divide the screen into tiles (or the frustum into clusters), compute which lights affect each, and shade with only those. That is **forward+**, and it gets deferred's light count while keeping forward's flexibility.`,
      sample: {
        lang: 'glsl',
        caption: 'The G-buffer pass and the lighting pass',
        code: `// ================= geometry pass: fragment shader =================
#version 330 core

layout (location = 0) out vec3 gPosition;
layout (location = 1) out vec3 gNormal;
layout (location = 2) out vec4 gAlbedoSpec;

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vUV;

uniform sampler2D uDiffuse;
uniform sampler2D uSpecular;

void main() {
    gPosition = vFragPos;                          // world space
    gNormal = normalize(vNormal);
    gAlbedoSpec.rgb = texture(uDiffuse, vUV).rgb;
    gAlbedoSpec.a = texture(uSpecular, vUV).r;     // packed into alpha
}

// ================= lighting pass: fragment shader =================
#version 330 core

in vec2 vUV;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D gAlbedoSpec;

struct Light {
    vec3 position;
    vec3 colour;
    float linear;
    float quadratic;
    float radius;          // beyond this the contribution is negligible
};

const int kMaxLights = 256;
uniform Light uLights[kMaxLights];
uniform int uLightCount;
uniform vec3 uViewPos;

out vec4 FragColor;

void main() {
    // one texture fetch each, then shade ONCE per screen pixel
    vec3 fragPos = texture(gPosition, vUV).rgb;
    vec3 normal = texture(gNormal, vUV).rgb;
    vec3 albedo = texture(gAlbedoSpec, vUV).rgb;
    float specularStrength = texture(gAlbedoSpec, vUV).a;

    vec3 viewDir = normalize(uViewPos - fragPos);
    vec3 lighting = albedo * 0.05;                 // ambient

    for (int i = 0; i < uLightCount; ++i) {
        float dist = length(uLights[i].position - fragPos);

        // skip lights that cannot reach this pixel — the key optimisation
        if (dist >= uLights[i].radius) continue;

        vec3 lightDir = normalize(uLights[i].position - fragPos);
        vec3 diffuse = max(dot(normal, lightDir), 0.0)
                     * albedo * uLights[i].colour;

        vec3 halfway = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfway), 0.0), 32.0);
        vec3 specular = uLights[i].colour * spec * specularStrength;

        float attenuation = 1.0 / (1.0 + uLights[i].linear * dist
                                       + uLights[i].quadratic * dist * dist);

        lighting += (diffuse + specular) * attenuation;
    }

    FragColor = vec4(lighting, 1.0);
}`,
        output: `Sponza, 1920x1080, 200 point lights:

  forward:   4.1 fps    (every fragment shaded by every light)
  deferred: 96.0 fps    (every screen pixel shaded once)

G-buffer cost: 3 render targets, 47 MB written per frame.
On a mobile GPU that bandwidth alone would dominate the frame.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the fundamental advantage of deferred shading over forward rendering?',
        options: [
          'It uses less memory',
          'Lighting cost becomes proportional to screen pixels × lights rather than shaded fragments × lights, so overdraw no longer multiplies the lighting work',
          'It supports transparency better',
          'It requires fewer draw calls',
        ],
        answer: 1,
        explain:
          'Forward rendering shades fragments that may later be hidden, and does so for every light. Deferred defers shading until visibility is resolved, so each visible pixel is lit exactly once. The price is G-buffer bandwidth, no hardware MSAA and no transparency — which is why forward+ exists.',
        hint: 'How much lighting work does forward rendering do on a fragment that is later occluded?',
      },
    },

    {
      id: 'gl-p-03',
      title: 'Shadow mapping',
      read: `The idea is elegant: **render the scene from the light's point of view, storing depth. Then, when shading, check whether a point is further from the light than the stored depth — if so, something is in the way.**

## The passes

1. Render depth-only from the light into a depth texture, using the light's view and projection
2. In the main pass, transform the fragment into light space, project to get texture coordinates and a depth, and compare

Directional lights use an orthographic projection; point lights need a cube map with six faces.

## Shadow acne

Depth precision and surface slope cause a surface to shadow itself, producing stripes. Fixes:
- **Slope-scaled bias** — offset more on surfaces at a grazing angle
- **Front-face culling** during the depth pass, so only back faces write depth

Too much bias causes **peter-panning**: shadows detach from their objects. It is a balance, not a formula.

## Soft edges

A raw comparison gives hard, aliased edges. **PCF** (percentage-closer filtering) samples a small neighbourhood and averages the results. More samples, softer edges, more cost. **Variance** and **moment** shadow maps give softer results with fewer samples but have their own artefacts.

## Cascades

A single shadow map covering a whole outdoor scene has terrible resolution near the camera. **Cascaded shadow maps** split the view frustum into slices, each with its own map, giving high resolution where it matters. This is what every open-world game does, and the cascade transitions are the hard part.

## The peter-panning tell

If your shadows look detached, your bias is too large. If they look striped, it is too small.`,
      sample: {
        lang: 'glsl',
        caption: 'Shadow lookup with slope-scaled bias and 3×3 PCF',
        code: `// ================= depth pass: vertex shader =================
#version 330 core
layout (location = 0) in vec3 aPos;
uniform mat4 uLightSpaceMatrix;      // lightProjection * lightView
uniform mat4 uModel;
void main() {
    gl_Position = uLightSpaceMatrix * uModel * vec4(aPos, 1.0);
}
// the fragment shader can be empty: only depth is written

// ================= main pass: fragment shader =================
#version 330 core

in vec3 vFragPos;
in vec3 vNormal;
in vec4 vFragPosLightSpace;

uniform sampler2D uShadowMap;
uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uAlbedo;

out vec4 FragColor;

float shadowFactor(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir) {
    // perspective divide, then map from -1..1 into 0..1 texture space
    vec3 projected = fragPosLightSpace.xyz / fragPosLightSpace.w;
    projected = projected * 0.5 + 0.5;

    // outside the light's frustum: treat as lit, not shadowed
    if (projected.z > 1.0) return 0.0;

    float currentDepth = projected.z;

    // slope-scaled bias: steeper surfaces need more offset
    float bias = max(0.0025 * (1.0 - dot(normal, lightDir)), 0.0005);

    // 3x3 PCF: nine comparisons, averaged, for a soft edge
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
    for (int x = -1; x <= 1; ++x) {
        for (int y = -1; y <= 1; ++y) {
            float pcfDepth = texture(uShadowMap,
                                     projected.xy + vec2(x, y) * texelSize).r;
            shadow += (currentDepth - bias > pcfDepth) ? 1.0 : 0.0;
        }
    }
    return shadow / 9.0;
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPos - vFragPos);
    vec3 viewDir = normalize(uViewPos - vFragPos);
    vec3 halfway = normalize(lightDir + viewDir);

    vec3 ambient = 0.15 * uAlbedo;
    vec3 diffuse = max(dot(normal, lightDir), 0.0) * uAlbedo;
    vec3 specular = vec3(pow(max(dot(normal, halfway), 0.0), 64.0));

    float shadow = shadowFactor(vFragPosLightSpace, normal, lightDir);

    // ambient is never shadowed: a fully shadowed surface is dark, not black
    vec3 result = ambient + (1.0 - shadow) * (diffuse + specular);
    FragColor = vec4(result, 1.0);
}`,
        output: `bias 0.0     -> heavy moire stripes across every lit surface (acne)
bias 0.05    -> shadows detached from their objects (peter-panning)
slope-scaled -> clean contact shadows at every angle

1x1 sample   -> hard, visibly aliased shadow edges
3x3 PCF      -> soft edges, 9x the shadow-map samples
Cascaded     -> sharp shadows near the camera, coarse in the distance`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What causes shadow acne, and why does increasing the bias too much cause peter-panning?',
        options: [
          'The shadow map resolution is too low; a larger bias blurs it',
          'Limited depth precision makes a surface shadow itself; bias pushes the comparison depth away, but too much pushes it past genuine contact points so shadows detach from objects',
          'The light is too bright',
          'The normals are incorrect',
        ],
        answer: 1,
        explain:
          'One shadow-map texel covers an area of surface at a single depth, so a sloped surface has points both in front of and behind that stored value — half of it shadows itself. Bias offsets the test, but a constant bias large enough for steep surfaces detaches shadows on flat ones. Slope-scaled bias varies the offset with the angle, which is why it works where a constant does not.',
        hint: 'What does one shadow-map texel cover on a sloped surface?',
      },
    },

    {
      id: 'gl-p-04',
      title: 'Physically based rendering',
      read: `Blinn-Phong has knobs you tune until it looks right. **PBR** uses parameters with physical meaning, so materials look correct under any lighting — which is why every modern engine uses it.

## The parameters

- **Albedo** — base colour, with no lighting baked in
- **Metallic** — 0 for dielectrics (wood, plastic, skin), 1 for metals. Almost never in between, except at boundaries.
- **Roughness** — 0 mirror, 1 completely diffuse
- **Ambient occlusion** — how much ambient light reaches this point

Artists author these once and the material works in sunlight, candlelight or a dark room.

## The Cook-Torrance BRDF

\`\`\`
f = kD * albedo/π  +  (D * G * F) / (4 * (n·v) * (n·l))
\`\`\`

- **D** — normal distribution (GGX/Trowbridge-Reitz): how many microfacets point at the halfway vector. This is what roughness controls.
- **G** — geometry/shadowing: microfacets occluding each other, significant at grazing angles
- **F** — Fresnel (Schlick): everything becomes reflective at grazing angles. This is why a road looks like a mirror at sunset.

## Energy conservation

A surface cannot reflect more light than it receives. \`kD = (1 - F) * (1 - metallic)\` ensures the diffuse and specular parts share one budget. Blinn-Phong has no such constraint, which is why it can look "too bright".

## Image-based lighting

Ambient light from an environment map: an irradiance map for diffuse, a pre-filtered mipmapped map plus a BRDF lookup texture for specular. This is what makes PBR objects sit convincingly in a scene rather than floating.

## Gamma is not optional

PBR maths is linear. Load albedo textures as sRGB, do the lighting in linear space, tone map, then apply gamma at the very end. Get this wrong and nothing looks right no matter how correct the BRDF is.`,
      sample: {
        lang: 'glsl',
        caption: 'A complete Cook-Torrance PBR fragment shader',
        code: `#version 330 core

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vUV;

uniform sampler2D uAlbedoMap;
uniform sampler2D uNormalMap;
uniform sampler2D uMetallicMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uAoMap;

uniform vec3 uLightPositions[4];
uniform vec3 uLightColours[4];
uniform vec3 uViewPos;

out vec4 FragColor;

const float PI = 3.14159265359;

// D: GGX normal distribution — roughness controls the highlight shape
float distributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

// G: microfacet self-shadowing
float geometrySchlickGGX(float NdotV, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    return NdotV / (NdotV * (1.0 - k) + k);
}

float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    return geometrySchlickGGX(max(dot(N, V), 0.0), roughness) *
           geometrySchlickGGX(max(dot(N, L), 0.0), roughness);
}

// F: Fresnel — everything is reflective at grazing angles
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
    // sRGB -> linear for colour textures; the others are already linear
    vec3 albedo = pow(texture(uAlbedoMap, vUV).rgb, vec3(2.2));
    float metallic = texture(uMetallicMap, vUV).r;
    float roughness = texture(uRoughnessMap, vUV).r;
    float ao = texture(uAoMap, vUV).r;

    vec3 N = normalize(vNormal);
    vec3 V = normalize(uViewPos - vFragPos);

    // dielectrics reflect ~4%; metals reflect their albedo
    vec3 F0 = mix(vec3(0.04), albedo, metallic);

    vec3 Lo = vec3(0.0);
    for (int i = 0; i < 4; ++i) {
        vec3 L = normalize(uLightPositions[i] - vFragPos);
        vec3 H = normalize(V + L);
        float dist = length(uLightPositions[i] - vFragPos);
        float attenuation = 1.0 / (dist * dist);        // inverse square: correct
        vec3 radiance = uLightColours[i] * attenuation;

        float D = distributionGGX(N, H, roughness);
        float G = geometrySmith(N, V, L, roughness);
        vec3  F = fresnelSchlick(max(dot(H, V), 0.0), F0);

        vec3 numerator = D * G * F;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        vec3 specular = numerator / denominator;

        // energy conservation: what is not reflected may be diffused,
        // and metals have no diffuse component at all
        vec3 kD = (vec3(1.0) - F) * (1.0 - metallic);

        Lo += (kD * albedo / PI + specular) * radiance * max(dot(N, L), 0.0);
    }

    vec3 ambient = vec3(0.03) * albedo * ao;
    vec3 colour = ambient + Lo;

    colour = colour / (colour + vec3(1.0));             // tone map
    colour = pow(colour, vec3(1.0 / 2.2));              // gamma

    FragColor = vec4(colour, 1.0);
}`,
        output: `A row of spheres, metallic 0 to 1 across, roughness 0 to 1 down:

  top-left      mirror-like dielectric, a tiny sharp highlight
  top-right     polished metal, reflecting the light colour itself
  bottom-left   matte plastic
  bottom-right  brushed metal, broad soft highlight

The same materials under a dim indoor light and bright sunlight both
look correct with no retuning — which is the whole point of PBR.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'In PBR, why is `kD` computed as `(1 - F) * (1 - metallic)`?',
        options: [
          'To make metals darker',
          'Energy conservation: light reflected specularly (F) cannot also be diffused, and metals have no diffuse component at all because they absorb refracted light',
          'To improve performance',
          'It is an artistic choice',
        ],
        answer: 1,
        explain:
          'A surface receives a fixed amount of light and must split it between reflection and diffusion — it cannot exceed 100%. Metals additionally absorb all refracted light, so their diffuse term is zero and their specular colour is their albedo. This constraint is exactly what makes PBR materials behave correctly under any lighting instead of needing per-scene tuning.',
        hint: 'Where does the light that is not specularly reflected go?',
      },
    },

    {
      id: 'gl-p-05',
      title: 'HDR, bloom and tone mapping',
      read: `An 8-bit framebuffer clamps at 1.0. The sun and a white sheet of paper both become the same white, and all the detail in bright regions is lost.

## HDR

Render into a **floating-point** framebuffer (\`GL_RGB16F\`). Now a value of 12.0 is meaningful. At the end, **tone map** the result into displayable range.

## Tone mapping operators

- **Reinhard** — \`c / (c + 1)\`. Simple, desaturates highlights.
- **ACES** — the film-industry standard curve. Better contrast and colour in highlights, and what most engines use.
- **Uncharted 2 / filmic** — a hand-tuned curve, still popular.

Exposure control (\`c * exposure\` before mapping) lets you simulate a camera adapting to a dark or bright scene.

## Bloom

Bright light bleeds in real optics. The classic implementation:

1. Extract pixels above a brightness threshold into a second render target (an extra \`out\` in the shader, using \`glDrawBuffers\`)
2. Gaussian blur it — **separably**, and at half or quarter resolution
3. Add it back to the scene before tone mapping

Modern engines instead use a **mip chain**: downsample repeatedly with a filtered blur, then upsample and combine. It is cheaper and much more stable than a threshold, which causes flickering when a pixel crosses it.

## The ordering that matters

\`\`\`
render HDR → bloom → add → exposure → tone map → gamma → display
\`\`\`

Gamma is always last. Tone mapping before bloom gives a muddy result, because the bright values you wanted to bloom have already been compressed.`,
      sample: {
        lang: 'cpp',
        caption: 'Bright extraction, ping-pong blur, and the composite pass',
        code: `#include <glad/glad.h>

// two colour attachments: the scene, and just the bright parts
void setupHdrFramebuffer(unsigned int& fbo, unsigned int colour[2],
                         int width, int height) {
    glGenFramebuffers(1, &fbo);
    glBindFramebuffer(GL_FRAMEBUFFER, fbo);

    glGenTextures(2, colour);
    for (int i = 0; i < 2; ++i) {
        glBindTexture(GL_TEXTURE_2D, colour[i]);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA16F, width, height, 0,
                     GL_RGBA, GL_FLOAT, nullptr);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glFramebufferTexture2D(GL_FRAMEBUFFER,
                               GL_COLOR_ATTACHMENT0 + i, GL_TEXTURE_2D,
                               colour[i], 0);
    }

    const unsigned int attachments[2] = {GL_COLOR_ATTACHMENT0,
                                         GL_COLOR_ATTACHMENT1};
    glDrawBuffers(2, attachments);      // the shader writes to BOTH
}

unsigned int blurBloom(unsigned int brightTexture,
                       unsigned int pingpongFbo[2],
                       unsigned int pingpongTex[2],
                       Shader& blurShader, const Mesh& quad,
                       int passes = 10) {
    bool horizontal = true;
    bool firstPass = true;

    blurShader.use();
    for (int i = 0; i < passes; ++i) {
        glBindFramebuffer(GL_FRAMEBUFFER, pingpongFbo[horizontal]);
        blurShader.setInt("uHorizontal", horizontal);

        glBindTexture(GL_TEXTURE_2D,
                      firstPass ? brightTexture : pingpongTex[!horizontal]);
        quad.draw();

        horizontal = !horizontal;
        firstPass = false;
    }
    return pingpongTex[!horizontal];
}

// ---------- scene fragment shader: two outputs ----------
// layout (location = 0) out vec4 FragColor;
// layout (location = 1) out vec4 BrightColor;
// void main() {
//     vec3 colour = doLighting();
//     FragColor = vec4(colour, 1.0);
//     float brightness = dot(colour, vec3(0.2126, 0.7152, 0.0722));
//     BrightColor = brightness > 1.0 ? vec4(colour, 1.0) : vec4(0,0,0,1);
// }

// ---------- separable blur ----------
// uniform bool uHorizontal;
// const float weight[5] = float[](0.2270, 0.1945, 0.1216, 0.0540, 0.0162);
// void main() {
//     vec2 texel = 1.0 / textureSize(uImage, 0);
//     vec3 result = texture(uImage, vUV).rgb * weight[0];
//     for (int i = 1; i < 5; ++i) {
//         vec2 offset = uHorizontal ? vec2(texel.x * i, 0.0)
//                                   : vec2(0.0, texel.y * i);
//         result += texture(uImage, vUV + offset).rgb * weight[i];
//         result += texture(uImage, vUV - offset).rgb * weight[i];
//     }
//     FragColor = vec4(result, 1.0);
// }

// ---------- composite ----------
// vec3 scene = texture(uScene, vUV).rgb;
// vec3 bloom = texture(uBloom, vUV).rgb;
// vec3 colour = scene + bloom;             // add BEFORE tone mapping
// colour *= uExposure;
// colour = acesToneMap(colour);
// colour = pow(colour, vec3(1.0 / 2.2));   // gamma always last`,
        output: `LDR (8-bit, no tone mapping):
  every bright light is a flat white blob, all detail clipped

HDR + ACES + bloom:
  bright lights keep their colour, glow softly into the surroundings,
  and the dark corners of the scene are still readable

Exposure 0.4 -> a sunlit exterior looks correct
Exposure 3.0 -> stepping into a dark interior brightens it, like an eye`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must bloom be added to the scene **before** tone mapping rather than after?',
        options: [
          'It is faster',
          'Tone mapping compresses values above 1.0 into displayable range; doing it first destroys exactly the bright information that bloom is supposed to spread',
          'Bloom requires an LDR input',
          'The order makes no difference',
        ],
        answer: 1,
        explain:
          'Bloom exists to represent very bright light bleeding optically. That brightness only exists in HDR values above 1.0. Tone map first and a value of 12.0 becomes 0.92 — indistinguishable from an ordinary bright surface, so the bloom has nothing to work with. The pipeline order is not stylistic; it is what makes the effect meaningful.',
        hint: 'What does tone mapping do to a value of 12.0?',
      },
    },

    {
      id: 'gl-p-06',
      title: 'Compute shaders',
      read: `A compute shader runs general-purpose work on the GPU — no vertices, no fragments, no rasteriser. Just thousands of threads over your data.

\`\`\`glsl
#version 430 core
layout (local_size_x = 16, local_size_y = 16) in;
layout (rgba32f, binding = 0) uniform image2D outputImage;

void main() {
    ivec2 coord = ivec2(gl_GlobalInvocationID.xy);
    imageStore(outputImage, coord, vec4(...));
}
\`\`\`

\`\`\`cpp
glDispatchCompute(width / 16, height / 16, 1);
glMemoryBarrier(GL_SHADER_IMAGE_ACCESS_BARRIER_BIT);
\`\`\`

## Work groups

Threads are organised into work groups. Threads **within** a group can share fast \`shared\` memory and synchronise with \`barrier()\`. Threads in **different** groups cannot — there is no global synchronisation inside a dispatch.

Local size should be a multiple of 32 (NVIDIA warp) or 64 (AMD wavefront). 16×16 = 256 is a good default.

## Memory barriers are not optional

The GPU reorders and caches aggressively. Without \`glMemoryBarrier\`, a later pass may read stale data. This is the most common compute-shader bug, and it is timing-dependent — so it works on your machine and fails on someone else's.

## What they are for

- Particle simulation — a million particles updated entirely on the GPU, never touching the CPU
- Post-processing, especially with shared memory for blur kernels
- Culling and GPU-driven rendering
- Physics, fluid simulation, image processing
- Building acceleration structures

## Shader storage buffers

\`SSBO\`s are large read-write buffers, the natural input and output for compute. Unlike uniform buffers they can be hundreds of megabytes and written from the shader.

> Compute is where graphics and general GPU programming meet, and where most modern engine innovation happens.`,
      sample: {
        lang: 'glsl',
        caption: 'A GPU particle system: simulate and render with no CPU involvement',
        code: `// ================= particles.comp =================
#version 430 core

layout (local_size_x = 256) in;

struct Particle {
    vec4 position;      // xyz + lifetime
    vec4 velocity;      // xyz + size
    vec4 colour;
};

layout (std430, binding = 0) buffer ParticleBuffer {
    Particle particles[];
};

uniform float uDeltaTime;
uniform vec3 uGravity;
uniform vec3 uEmitterPos;
uniform float uTime;

// cheap hash for per-particle randomness
float hash(uint n) {
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float(n & 0x7fffffffU) / float(0x7fffffff);
}

void main() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= particles.length()) return;      // guard the tail

    Particle p = particles[index];

    p.position.w -= uDeltaTime;                   // lifetime

    if (p.position.w <= 0.0) {
        // respawn at the emitter with a random direction
        float a = hash(index * 7919u + uint(uTime * 60.0)) * 6.2831853;
        float b = hash(index * 104729u + uint(uTime * 60.0));
        p.position.xyz = uEmitterPos;
        p.position.w = 1.0 + b * 2.0;
        p.velocity.xyz = vec3(cos(a) * b, 2.0 + b * 3.0, sin(a) * b);
        p.colour = vec4(1.0, 0.5 + b * 0.5, 0.1, 1.0);
    } else {
        p.velocity.xyz += uGravity * uDeltaTime;
        p.position.xyz += p.velocity.xyz * uDeltaTime;

        // bounce off the ground, losing energy
        if (p.position.y < 0.0) {
            p.position.y = 0.0;
            p.velocity.y = -p.velocity.y * 0.55;
        }
        p.colour.a = clamp(p.position.w, 0.0, 1.0);   // fade out
    }

    particles[index] = p;
}

// ================= C++ =================
// glUseProgram(computeProgram);
// glBindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, particleSSBO);
// glUniform1f(deltaLoc, deltaTime);
// glDispatchCompute((particleCount + 255) / 256, 1, 1);
//
// // WITHOUT this the render pass may read stale particle data
// glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT);
//
// // the same buffer is then bound as vertex data — it never leaves the GPU
// glUseProgram(renderProgram);
// glBindVertexArray(particleVAO);
// glDrawArraysInstanced(GL_TRIANGLES, 0, 6, particleCount);`,
        output: `1,000,000 particles with gravity and ground bounce:

  CPU update + upload:  41.2 ms/frame   (24 fps, PCIe bandwidth bound)
  compute shader:        0.9 ms/frame   (the data never leaves the GPU)

Dispatch: 3907 work groups x 256 threads = 1,000,192 invocations.

Omit glMemoryBarrier and it still looks fine on one machine and
shows one-frame-stale particles on another.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `glMemoryBarrier` required between a compute dispatch and a draw that reads its output?',
        options: [
          'To wait for the CPU',
          'GPU memory operations are reordered and cached; the barrier guarantees the compute writes are visible to the subsequent reads, and omitting it produces timing-dependent stale data',
          'It resets the compute shader',
          'It is only needed for images, not buffers',
        ],
        answer: 1,
        explain:
          'Without an explicit barrier the driver is free to overlap the dispatch and the draw, and caches may not be flushed. The resulting bug depends on GPU model, driver version and timing — so it can work perfectly on your machine and fail on a user\'s. The barrier bit must match how the data will be read, hence `GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT` when it becomes vertex data.',
        hint: 'What is the GPU allowed to do with the order of memory operations?',
      },
    },

    {
      id: 'gl-p-07',
      title: 'GPU-driven rendering',
      read: `The CPU submitting every draw call is a bottleneck. GPU-driven rendering moves the decisions onto the GPU itself.

## Indirect drawing

\`\`\`cpp
glMultiDrawElementsIndirect(GL_TRIANGLES, GL_UNSIGNED_INT, nullptr, drawCount, 0);
\`\`\`

The draw parameters — index count, instance count, offsets — come from a **buffer**, not from function arguments. A compute shader can therefore write them.

## GPU culling

1. Upload all object bounding volumes once
2. A compute shader tests each against the frustum (and against a depth pyramid for occlusion culling)
3. Visible objects have their draw commands appended to an indirect buffer with an atomic counter
4. One \`glMultiDrawElementsIndirect\` draws exactly the visible set

The CPU issues **one** command for the whole scene, and never learns what was visible.

## Why it is transformative

- CPU cost becomes independent of object count
- Culling is massively parallel, so it can be far more thorough
- No CPU→GPU round trip, which would cost a full frame of latency

## What it needs

- Meshes in shared buffers, addressed by offset (no per-mesh VAO binds)
- Bindless textures or texture arrays, so materials are indices not binds
- Per-object data in large SSBOs

## Mesh shaders

The next step, in Vulkan/DX12 and OpenGL extensions: replace the vertex pipeline entirely with task and mesh shaders that generate geometry on the GPU, enabling per-cluster culling and continuous LOD. This is how Unreal's Nanite works.`,
      sample: {
        lang: 'glsl',
        caption: 'Compute-shader frustum culling writing indirect draw commands',
        code: `// ================= cull.comp =================
#version 430 core

layout (local_size_x = 64) in;

struct DrawElementsIndirectCommand {
    uint count;
    uint instanceCount;
    uint firstIndex;
    uint baseVertex;
    uint baseInstance;
};

struct ObjectData {
    mat4 model;
    vec4 boundingSphere;      // xyz centre (world), w radius
    uint indexCount;
    uint firstIndex;
    uint baseVertex;
    uint materialIndex;
};

layout (std430, binding = 0) readonly buffer Objects {
    ObjectData objects[];
};

layout (std430, binding = 1) writeonly buffer DrawCommands {
    DrawElementsIndirectCommand commands[];
};

layout (std430, binding = 2) buffer Counter {
    uint drawCount;
};

layout (std430, binding = 3) writeonly buffer VisibleIndices {
    uint visible[];
};

uniform vec4 uFrustumPlanes[6];      // xyz normal, w distance

bool insideFrustum(vec3 centre, float radius) {
    for (int i = 0; i < 6; ++i) {
        if (dot(uFrustumPlanes[i].xyz, centre) + uFrustumPlanes[i].w < -radius) {
            return false;                       // entirely outside this plane
        }
    }
    return true;
}

void main() {
    uint index = gl_GlobalInvocationID.x;
    if (index >= objects.length()) return;

    ObjectData object = objects[index];

    if (!insideFrustum(object.boundingSphere.xyz, object.boundingSphere.w)) {
        return;                                 // culled: no command written
    }

    // atomically claim a slot in the command buffer
    uint slot = atomicAdd(drawCount, 1u);

    commands[slot].count = object.indexCount;
    commands[slot].instanceCount = 1u;
    commands[slot].firstIndex = object.firstIndex;
    commands[slot].baseVertex = object.baseVertex;
    commands[slot].baseInstance = slot;

    visible[slot] = index;                      // so the vertex shader can
}                                               // find this object's transform

// ================= C++ per frame =================
// uint zero = 0;
// glNamedBufferSubData(counterBuffer, 0, sizeof(uint), &zero);
//
// glUseProgram(cullProgram);
// glUniform4fv(planesLoc, 6, &frustumPlanes[0][0]);
// glDispatchCompute((objectCount + 63) / 64, 1, 1);
// glMemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_COMMAND_BARRIER_BIT);
//
// glUseProgram(renderProgram);
// glBindVertexArray(sharedVAO);                // ONE vao for every mesh
// glBindBuffer(GL_DRAW_INDIRECT_BUFFER, commandBuffer);
// glBindBuffer(GL_PARAMETER_BUFFER, counterBuffer);
// glMultiDrawElementsIndirectCount(GL_TRIANGLES, GL_UNSIGNED_INT,
//                                  nullptr, 0, maxDraws, 0);`,
        output: `100,000 objects, ~8,000 visible:

  CPU culling + 8,000 draw calls:  18.4 ms CPU,  54 fps
  GPU culling + 1 indirect call:    0.3 ms CPU, 240 fps (GPU bound)

The CPU no longer knows or cares how many objects were drawn —
glMultiDrawElementsIndirectCount reads the count from GPU memory.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'In GPU-driven rendering, why does the CPU never learn how many objects were visible?',
        options: [
          'It could, but nobody needs the number',
          'Reading it back would force a CPU–GPU synchronisation costing a full frame of latency; `glMultiDrawElementsIndirectCount` lets the GPU read the count from its own memory instead',
          'The GPU cannot count',
          'The count is always the same',
        ],
        answer: 1,
        explain:
          'A readback stalls the CPU until the GPU finishes, destroying the pipelining that keeps both busy. Keeping the count in GPU memory and letting the draw command read it there preserves the parallelism — and is the whole reason indirect drawing exists.',
        hint: 'What would the CPU have to wait for to read that number?',
      },
    },

    {
      id: 'gl-p-08',
      title: 'Profiling and finding the real bottleneck',
      read: `"It's slow" is not a diagnosis. Find out **what** is slow.

## The possible bottlenecks

- **CPU** — too many draw calls, expensive scene traversal, driver overhead
- **Vertex** — too many vertices, or an expensive vertex shader
- **Fragment** — expensive fragment shader × pixels, made worse by overdraw
- **Bandwidth** — moving texture and framebuffer data
- **Synchronisation** — CPU waiting on GPU, or vice versa

## Identifying which

- **Halve the resolution.** If the frame time drops proportionally, you are fragment or bandwidth bound.
- **Replace the fragment shader with a constant colour.** Big improvement means shader cost; none means geometry or CPU.
- **Draw half the objects.** Linear improvement means CPU or vertex bound.
- **Check CPU frame time separately** from GPU time. If the CPU is at 10ms and the GPU at 4ms, optimising shaders is wasted effort.

## The tools

- **Nsight Graphics** (NVIDIA), **Radeon GPU Profiler** (AMD) — per-draw timings, occupancy, stall reasons, memory traffic
- **RenderDoc** — correctness, plus rough timings
- **Timer queries** — cheap, always-on, in-engine measurement per pass

## The wins, roughly in order

1. Draw fewer things — culling, LOD, instancing
2. Change state less — sort by material
3. Reduce overdraw — depth pre-pass, front-to-back for opaque
4. Cheaper shaders — move work to the vertex stage, use lower precision
5. Smaller textures, compressed formats (BC/ASTC), mipmaps
6. Only then micro-optimise

## Occupancy

A shader using too many registers reduces how many threads can be resident, so the GPU cannot hide memory latency. Sometimes a *slightly longer* shader that uses fewer registers is faster overall — one of several reasons to measure rather than reason.`,
      sample: {
        lang: 'cpp',
        caption: 'Per-pass GPU timing with pipeline statistics',
        code: `#include <glad/glad.h>
#include <array>
#include <string>
#include <vector>

class GpuProfiler {
public:
    static constexpr int kFramesInFlight = 3;

    void beginPass(const std::string& name) {
        auto& frame = frames_[current_];
        frame.names.push_back(name);
        unsigned int query = 0;
        glGenQueries(1, &query);
        glBeginQuery(GL_TIME_ELAPSED, query);
        frame.queries.push_back(query);
    }

    void endPass() { glEndQuery(GL_TIME_ELAPSED); }

    // read results from N frames ago, so we never stall the pipeline
    void endFrame() {
        current_ = (current_ + 1) % kFramesInFlight;
        auto& old = frames_[current_];

        results_.clear();
        for (std::size_t i = 0; i < old.queries.size(); ++i) {
            GLint available = 0;
            glGetQueryObjectiv(old.queries[i], GL_QUERY_RESULT_AVAILABLE,
                               &available);
            if (available) {
                GLuint64 ns = 0;
                glGetQueryObjectui64v(old.queries[i], GL_QUERY_RESULT, &ns);
                results_.push_back({old.names[i], ns / 1'000'000.0});
            }
            glDeleteQueries(1, &old.queries[i]);
        }
        old.queries.clear();
        old.names.clear();
    }

    struct Result { std::string name; double milliseconds; };
    const std::vector<Result>& results() const { return results_; }

private:
    struct Frame {
        std::vector<unsigned int> queries;
        std::vector<std::string> names;
    };
    std::array<Frame, kFramesInFlight> frames_;
    std::vector<Result> results_;
    int current_ = 0;
};

// pipeline statistics: what the GPU actually processed
class PipelineStats {
public:
    PipelineStats() {
        glGenQueries(1, &verticesQuery_);
        glGenQueries(1, &fragmentsQuery_);
        glGenQueries(1, &clippedQuery_);
    }

    void begin() {
        glBeginQuery(GL_VERTICES_SUBMITTED, verticesQuery_);
        glBeginQuery(GL_FRAGMENT_SHADER_INVOCATIONS, fragmentsQuery_);
        glBeginQuery(GL_CLIPPING_OUTPUT_PRIMITIVES, clippedQuery_);
    }

    void end() {
        glEndQuery(GL_VERTICES_SUBMITTED);
        glEndQuery(GL_FRAGMENT_SHADER_INVOCATIONS);
        glEndQuery(GL_CLIPPING_OUTPUT_PRIMITIVES);
    }

    void report(int screenPixels) {
        GLuint64 vertices = 0, fragments = 0, primitives = 0;
        glGetQueryObjectui64v(verticesQuery_, GL_QUERY_RESULT, &vertices);
        glGetQueryObjectui64v(fragmentsQuery_, GL_QUERY_RESULT, &fragments);
        glGetQueryObjectui64v(clippedQuery_, GL_QUERY_RESULT, &primitives);

        printf("vertices %llu | primitives %llu | fragments %llu\\n",
               vertices, primitives, fragments);
        printf("overdraw %.2fx\\n",
               static_cast<double>(fragments) / screenPixels);
    }

private:
    unsigned int verticesQuery_ = 0, fragmentsQuery_ = 0, clippedQuery_ = 0;
};`,
        output: `shadow      1.82 ms
gbuffer     2.41 ms
lighting    5.93 ms   <- the bottleneck
ssao        1.10 ms
bloom       0.74 ms
composite   0.31 ms
--------------------
GPU total  12.31 ms   CPU 3.20 ms   -> GPU bound

vertices 1842301 | primitives 613400 | fragments 17284922
overdraw 8.34x     <- far too high; a depth pre-pass would help

After adding a depth pre-pass:
lighting    2.10 ms   overdraw 1.12x   GPU total 8.6 ms`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You halve the window resolution and the frame time drops by almost exactly half. What does that tell you?',
        options: [
          'The application is CPU bound',
          'It is fragment-shader or bandwidth bound — the cost scales with pixel count, so cheaper shading, less overdraw or smaller render targets will help',
          'The vertex shader is too slow',
          'Nothing useful',
        ],
        answer: 1,
        explain:
          'Resolution only affects per-pixel work. A proportional change points squarely at fragment shading or framebuffer bandwidth. If the frame time had barely moved, the cost would be in the CPU, the vertex stage or draw-call overhead — which is why this ten-second test is the best first diagnostic there is.',
        hint: 'What part of the pipeline depends on how many pixels there are?',
      },
    },

    {
      id: 'gl-p-09',
      title: 'Render graphs and engine architecture',
      read: `A real renderer has a dozen passes with complicated dependencies. Hard-coding the order works until you add a pass and spend a day on a state bug.

## The render graph

Declare passes and the resources they **read** and **write**. The graph then:

- **Orders** passes by dependency automatically
- **Culls** passes whose outputs nothing consumes
- **Aliases memory** — two textures whose lifetimes do not overlap can share an allocation, often saving hundreds of MB
- **Inserts barriers** correctly (essential in Vulkan/DX12, useful in OpenGL)
- **Validates** — reading a resource nobody writes is caught at build time, not as a black screen

Frostbite popularised the approach; nearly every modern engine has one.

## Why it is worth it

Adding a new pass becomes *declaring* it, and correct ordering follows. That is the difference between an engine that can evolve and one that ossifies.

## The rest of the architecture

- **Data-oriented design.** Store components in contiguous arrays, not objects in a tree. Transform update is then a tight loop over a packed array — an order of magnitude faster than chasing pointers.
- **Job system.** A thread pool with work stealing, not a thread per subsystem. Graphics work is bursty and fine-grained.
- **Frame allocators.** A bump allocator reset each frame for per-frame data. No fragmentation, no free cost.
- **Handles, not pointers.** A 32-bit handle (index + generation) into an array survives reallocation and detects use-after-free.

## The warning

None of this is worth building before you have the problem. A render graph for four passes is pure overhead. Build the renderer, feel the pain, then abstract — abstractions designed before the problem are almost always wrong.`,
      sample: {
        lang: 'cpp',
        caption: 'A minimal render graph with automatic ordering and culling',
        code: `#pragma once

#include <algorithm>
#include <functional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

struct ResourceDesc {
    int width = 0, height = 0;
    unsigned int format = 0;
    bool isDepth = false;
};

class RenderGraph {
public:
    using PassFn = std::function<void()>;

    struct PassBuilder {
        RenderGraph* graph;
        std::size_t passIndex;

        PassBuilder& reads(const std::string& resource) {
            graph->passes_[passIndex].reads.push_back(resource);
            return *this;
        }
        PassBuilder& writes(const std::string& resource, ResourceDesc desc = {}) {
            graph->passes_[passIndex].writes.push_back(resource);
            graph->resources_[resource] = desc;
            graph->producers_[resource] = passIndex;
            return *this;
        }
        PassBuilder& execute(PassFn fn) {
            graph->passes_[passIndex].execute = std::move(fn);
            return *this;
        }
    };

    PassBuilder addPass(const std::string& name) {
        passes_.push_back({name, {}, {}, nullptr});
        return PassBuilder{this, passes_.size() - 1};
    }

    void setBackbuffer(const std::string& resource) { backbuffer_ = resource; }

    void compile() {
        order_.clear();
        std::unordered_set<std::size_t> visited;
        std::unordered_set<std::size_t> onStack;

        // walk back from the backbuffer: anything not reached is CULLED
        auto producer = producers_.find(backbuffer_);
        if (producer != producers_.end()) {
            visit(producer->second, visited, onStack);
        }

        culled_ = passes_.size() - order_.size();
    }

    void execute() const {
        for (std::size_t index : order_) {
            if (passes_[index].execute) passes_[index].execute();
        }
    }

    std::size_t passCount() const { return order_.size(); }
    std::size_t culledCount() const { return culled_; }

private:
    struct Pass {
        std::string name;
        std::vector<std::string> reads;
        std::vector<std::string> writes;
        PassFn execute;
    };

    // depth-first post-order: dependencies are emitted before their dependents
    void visit(std::size_t index, std::unordered_set<std::size_t>& visited,
               std::unordered_set<std::size_t>& onStack) {
        if (visited.count(index)) return;
        if (onStack.count(index)) {
            throw std::runtime_error("cycle involving pass " + passes_[index].name);
        }
        onStack.insert(index);

        for (const std::string& input : passes_[index].reads) {
            auto producer = producers_.find(input);
            if (producer != producers_.end() && producer->second != index) {
                visit(producer->second, visited, onStack);
            }
        }

        onStack.erase(index);
        visited.insert(index);
        order_.push_back(index);
    }

    std::vector<Pass> passes_;
    std::unordered_map<std::string, ResourceDesc> resources_;
    std::unordered_map<std::string, std::size_t> producers_;
    std::vector<std::size_t> order_;
    std::string backbuffer_;
    std::size_t culled_ = 0;

    friend struct PassBuilder;
};

// ---------------- declaring a frame ----------------
// graph.addPass("shadow")
//      .writes("shadowMap", {2048, 2048, GL_DEPTH_COMPONENT32F, true})
//      .execute([&] { renderShadowMap(); });
//
// graph.addPass("gbuffer")
//      .writes("gAlbedo").writes("gNormal").writes("gDepth")
//      .execute([&] { renderGBuffer(); });
//
// graph.addPass("ssao")
//      .reads("gNormal").reads("gDepth")
//      .writes("ao")
//      .execute([&] { renderSSAO(); });
//
// graph.addPass("lighting")
//      .reads("gAlbedo").reads("gNormal").reads("gDepth")
//      .reads("ao").reads("shadowMap")
//      .writes("hdr")
//      .execute([&] { renderLighting(); });
//
// graph.addPass("debugOverlay")          // nothing reads its output
//      .writes("debugTex")
//      .execute([&] { renderDebug(); });
//
// graph.addPass("tonemap").reads("hdr").writes("backbuffer")
//      .execute([&] { tonemap(); });
//
// graph.setBackbuffer("backbuffer");
// graph.compile();
// graph.execute();`,
        output: `compiled: 5 passes, 1 culled

execution order (derived, not hand-written):
  1. shadow
  2. gbuffer
  3. ssao
  4. lighting
  5. tonemap

"debugOverlay" culled: nothing reads debugTex.

Memory aliasing: shadowMap (16 MB) and ao (8 MB) have disjoint
lifetimes and share one allocation. Frame VRAM: 214 MB -> 138 MB.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the main benefit of declaring passes with their reads and writes rather than calling them in a fixed order?',
        options: [
          'It runs faster',
          'The correct order, unused passes and resource lifetimes can all be derived automatically — so adding a pass cannot break the ordering of the others',
          'It uses less code',
          'It allows passes to run in parallel on the CPU',
        ],
        answer: 1,
        explain:
          'Hand-ordered passes encode dependencies implicitly, so every change risks a subtle ordering bug that shows up as a wrong image. Declaring the data dependencies makes the order a derived property — plus you get dead-pass culling, memory aliasing and cycle detection from the same information.',
        hint: 'What happens to a hand-written order when someone inserts a pass in the middle?',
      },
    },

    {
      id: 'gl-p-10',
      title: 'Threading a renderer',
      read: `One thread cannot keep a modern GPU fed. But an OpenGL context is bound to **one thread at a time**, which shapes everything.

## What you can thread in OpenGL

- **Scene traversal, culling, animation, physics** — pure CPU work on your own data
- **Asset loading** — decode images and parse meshes on worker threads, upload on the render thread
- **Command building** — build your own command list in parallel, submit it on the render thread
- **Shared contexts** — a second context sharing objects can upload buffers and textures while the main thread renders. Driver support varies and it is easy to get wrong.

## What you cannot

Issue GL calls from several threads on one context. Vulkan and DX12 exist largely to fix this: multiple command buffers recorded in parallel, submitted together.

## The standard architecture

\`\`\`
Main thread:   input, game logic, produces a frame's worth of commands
Render thread: consumes commands, issues GL calls
Worker pool:   culling, animation, asset decode, particle simulation
\`\`\`

The main and render threads are separated by a queue with **double or triple buffering**. That adds a frame of latency and buys a large throughput gain.

## The rules

- Never share mutable state without synchronisation
- Prefer message passing over locks
- Use a job system with work stealing, not a thread per subsystem
- Measure — threading adds real complexity and can be slower if the work is too fine-grained
- Debugging race conditions costs far more time than you expect. ThreadSanitizer is worth the runtime cost.

> If your renderer is GPU bound, threading the CPU side gains nothing. Profile first.`,
      sample: {
        lang: 'cpp',
        caption: 'A job system and a double-buffered render command queue',
        code: `#include <atomic>
#include <condition_variable>
#include <functional>
#include <mutex>
#include <queue>
#include <thread>
#include <vector>

class JobSystem {
public:
    explicit JobSystem(unsigned int threads = std::thread::hardware_concurrency()) {
        for (unsigned int i = 0; i < threads; ++i) {
            workers_.emplace_back([this] { workerLoop(); });
        }
    }

    ~JobSystem() {
        { std::lock_guard lock(mutex_); running_ = false; }
        condition_.notify_all();
        for (auto& worker : workers_) worker.join();
    }

    void submit(std::function<void()> job) {
        { std::lock_guard lock(mutex_); jobs_.push(std::move(job)); }
        ++pending_;
        condition_.notify_one();
    }

    void waitAll() {
        while (pending_.load(std::memory_order_acquire) > 0) {
            std::this_thread::yield();
        }
    }

private:
    void workerLoop() {
        while (true) {
            std::function<void()> job;
            {
                std::unique_lock lock(mutex_);
                condition_.wait(lock, [this] { return !jobs_.empty() || !running_; });
                if (!running_ && jobs_.empty()) return;
                job = std::move(jobs_.front());
                jobs_.pop();
            }
            job();
            --pending_;
        }
    }

    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> jobs_;
    std::mutex mutex_;
    std::condition_variable condition_;
    std::atomic<int> pending_{0};
    bool running_ = true;
};

// ---------------- parallel culling ----------------
std::vector<uint32_t> cullParallel(JobSystem& jobs,
                                   const std::vector<Bounds>& bounds,
                                   const Frustum& frustum) {
    const std::size_t chunkSize = 2048;
    const std::size_t chunks = (bounds.size() + chunkSize - 1) / chunkSize;

    // each chunk writes to its OWN vector: no locks, no false sharing
    std::vector<std::vector<uint32_t>> perChunk(chunks);

    for (std::size_t c = 0; c < chunks; ++c) {
        jobs.submit([&, c] {
            const std::size_t begin = c * chunkSize;
            const std::size_t end = std::min(begin + chunkSize, bounds.size());
            auto& out = perChunk[c];
            out.reserve(end - begin);
            for (std::size_t i = begin; i < end; ++i) {
                if (frustum.intersects(bounds[i])) {
                    out.push_back(static_cast<uint32_t>(i));
                }
            }
        });
    }
    jobs.waitAll();

    std::vector<uint32_t> visible;
    for (const auto& chunk : perChunk) {
        visible.insert(visible.end(), chunk.begin(), chunk.end());
    }
    return visible;
}

// ---------------- double-buffered command queue ----------------
struct RenderCommands {
    std::vector<DrawCommand> draws;
    Camera camera;
    float time = 0.0f;
    void clear() { draws.clear(); }
};

class FrameQueue {
public:
    RenderCommands& writeBuffer() { return buffers_[writeIndex_]; }

    void publish() {
        std::lock_guard lock(mutex_);
        readIndex_ = writeIndex_;
        writeIndex_ = 1 - writeIndex_;
        buffers_[writeIndex_].clear();
        ready_ = true;
        condition_.notify_one();
    }

    const RenderCommands& acquire() {
        std::unique_lock lock(mutex_);
        condition_.wait(lock, [this] { return ready_; });
        ready_ = false;
        return buffers_[readIndex_];
    }

private:
    std::array<RenderCommands, 2> buffers_;
    int writeIndex_ = 0, readIndex_ = 1;
    bool ready_ = false;
    std::mutex mutex_;
    std::condition_variable condition_;
};`,
        output: `100,000 objects, frustum culling:

  single threaded:  8.42 ms
  8 worker threads: 1.31 ms   (6.4x on 8 cores)

Full frame, main thread:
  before: logic 2.1 | cull 8.4 | submit 4.2 = 14.7 ms  (68 fps)
  after:  logic 2.1 | cull 1.3 | submit 4.2 =  7.6 ms  (131 fps)

Note the chunked culling writes to per-chunk vectors: one shared
output vector with a mutex measured SLOWER than single-threaded,
because of lock contention.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does each culling job write to its own vector instead of appending to one shared result vector under a mutex?',
        options: [
          'Vectors are not thread-safe',
          'Lock contention on every push would serialise the work and can be slower than one thread; per-chunk vectors need no synchronisation at all and are merged once at the end',
          'To use less memory',
          'The mutex would deadlock',
        ],
        answer: 1,
        explain:
          'With eight threads pushing thousands of times each, the mutex becomes the bottleneck and the threads spend their time waiting rather than working — plus the shared vector may reallocate under the lock. Giving each job private output removes the synchronisation entirely; the single merge afterwards is cheap and sequential.',
        hint: 'How often would the lock be taken, and what are the other threads doing then?',
      },
    },

    {
      id: 'gl-p-11',
      title: 'OpenGL, Vulkan and what comes next',
      read: `## Why Vulkan exists

OpenGL's driver does an enormous amount of hidden work: tracking state, validating, compiling shaders on demand, managing memory, synchronising. That is convenient, unpredictable, single-threaded and opaque.

Vulkan hands all of it to you:

- **Explicit memory** — you allocate and sub-allocate. No surprise stalls.
- **Command buffers** — recorded in parallel on many threads, submitted together
- **Explicit synchronisation** — barriers, semaphores, fences. Correct or broken, never accidentally slow.
- **Pipeline state objects** — compiled up front, so no shader compilation stutter mid-frame
- **SPIR-V** — shaders compiled offline to bytecode

A Vulkan triangle is roughly 800 lines against OpenGL's 100. The payoff is predictable performance, real multithreading and no driver guesswork.

## Which to choose

- **OpenGL / WebGL** — learning, tools, prototypes, wide compatibility, small teams
- **Vulkan** — shipping engines, mobile, when you need multithreaded submission or predictable frame times
- **DirectX 12** — Windows and Xbox
- **Metal** — Apple platforms
- **WebGPU** — the modern web API, and a genuinely nice middle ground: explicit enough to be fast, simple enough to learn

## What transfers

**Everything conceptual.** The pipeline, shaders, buffers, textures, framebuffers, lighting, shadows, PBR, deferred, compute — all identical. Only the API shape changes. Someone who understands rendering learns a new API in a fortnight; someone who only memorised OpenGL calls starts again.

## Where it is going

Ray tracing hardware, mesh shaders, work graphs, ML denoising and upscaling (DLSS/FSR), and GPU-driven everything. The constant is that the GPU is asked to do more of the deciding, and the CPU less.`,
      sample: {
        lang: 'cpp',
        caption: 'The same operation in three APIs — note what changes and what does not',
        code: `// ================= OpenGL: the driver decides =================
glBindBuffer(GL_ARRAY_BUFFER, vbo);
glBufferData(GL_ARRAY_BUFFER, size, data, GL_STATIC_DRAW);
// Where did it allocate? When is the upload complete? Unknown.
// The driver may also stall here if the buffer is in use.

// ================= Vulkan: you decide =================
// VkBufferCreateInfo bufferInfo{};
// bufferInfo.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
// bufferInfo.size = size;
// bufferInfo.usage = VK_BUFFER_USAGE_VERTEX_BUFFER_BIT |
//                    VK_BUFFER_USAGE_TRANSFER_DST_BIT;
// bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
// vkCreateBuffer(device, &bufferInfo, nullptr, &buffer);
//
// VkMemoryRequirements requirements;
// vkGetBufferMemoryRequirements(device, buffer, &requirements);
//
// VkMemoryAllocateInfo allocInfo{};
// allocInfo.allocationSize = requirements.size;
// allocInfo.memoryTypeIndex = findMemoryType(requirements.memoryTypeBits,
//                                 VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT);
// vkAllocateMemory(device, &allocInfo, nullptr, &memory);
// vkBindBufferMemory(device, buffer, memory, 0);
//
// // upload via a staging buffer, with an explicit barrier
// vkCmdCopyBuffer(commandBuffer, staging, buffer, 1, &copyRegion);
// VkBufferMemoryBarrier barrier{};
// barrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
// barrier.dstAccessMask = VK_ACCESS_VERTEX_ATTRIBUTE_READ_BIT;
// vkCmdPipelineBarrier(commandBuffer,
//                      VK_PIPELINE_STAGE_TRANSFER_BIT,
//                      VK_PIPELINE_STAGE_VERTEX_INPUT_BIT,
//                      0, 0, nullptr, 1, &barrier, 0, nullptr);

// ================= WebGPU: the middle ground =================
// const buffer = device.createBuffer({
//     size: data.byteLength,
//     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
// });
// device.queue.writeBuffer(buffer, 0, data);

// ================= what is IDENTICAL in all three =================
//   - vertices, indices, attribute layouts, strides
//   - vertex and fragment shader stages and what they compute
//   - model / view / projection, and why order matters
//   - depth testing, blending, culling, stencil
//   - Phong, PBR, shadow mapping, deferred shading, post-processing
//   - the reasons things are slow: draw calls, overdraw, bandwidth, state`,
        output: `Lines of code for a textured triangle:

  WebGL      ~120
  OpenGL     ~150
  WebGPU     ~280
  Metal      ~350
  DirectX 12 ~800
  Vulkan     ~900

Concepts to learn, having understood OpenGL:  almost none.
What you are actually buying with those lines: explicit control over
memory, synchronisation and multithreaded submission.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Having learned OpenGL well, what is the main thing you must learn to move to Vulkan?',
        options: [
          'A completely new rendering model',
          'The explicit management the OpenGL driver was doing for you — memory allocation, synchronisation, command buffer recording and pipeline state — while the rendering concepts carry over unchanged',
          'A different shading language with different maths',
          'How GPUs work',
        ],
        answer: 1,
        explain:
          'The pipeline, shaders, transforms, lighting and every rendering technique are identical; Vulkan only changes who is responsible for the bookkeeping. That is why understanding *why* things work — rather than memorising `gl` function names — is what makes graphics knowledge portable.',
        hint: 'Which of the two is about rendering, and which is about resource management?',
      },
    },

    {
      id: 'gl-p-12',
      title: 'Capstone: a small modern renderer',
      read: `The final project: a renderer that puts every technique from this track together, structured the way a real engine is.

## The frame

\`\`\`
1. Update       — transforms, animation, camera (job system, parallel)
2. Cull         — GPU compute, frustum + occlusion, writes indirect commands
3. Shadow       — cascaded shadow maps, one indirect draw per cascade
4. G-buffer     — one glMultiDrawElementsIndirect, bindless materials
5. SSAO         — compute shader, half resolution
6. Lighting     — clustered, hundreds of lights, compute
7. Forward      — transparent objects, sorted
8. Post         — bloom mip chain, ACES tone mapping, FXAA
9. UI           — immediate mode, on top
\`\`\`

All declared in a render graph, so the order is derived and unused passes are culled.

## The architecture

- **Data-oriented**: components in packed arrays, transforms updated in a tight loop
- **Handles, not pointers**: index + generation, so reallocation and use-after-free are both safe
- **Frame allocator**: a bump allocator reset each frame for per-frame data
- **Job system**: work stealing, for culling, animation and asset decode
- **Persistent mapped ring buffers** for per-frame GPU data, with fences
- **GPU profiler** always on, per pass

## What actually matters

You could spend years on this. What makes it worth building is not the feature list — it is that you understand *why* each piece is there, what it costs, and what you would measure to find out whether it is helping.

> That is what separates someone who can follow a graphics tutorial from someone who can ship a renderer: not knowing more techniques, but knowing which one this scene actually needs, and being able to prove it.`,
      sample: {
        lang: 'cpp',
        caption: 'renderer.cpp — the whole frame, declared rather than hard-coded',
        code: `#include "renderer.h"

void Renderer::renderFrame(Scene& scene, const Camera& camera, float deltaTime) {
    profiler_.beginFrame();

    // ---------- 1. CPU update, parallel over packed component arrays ----------
    {
        ScopedCpuTimer timer(cpuStats_, "update");
        const std::size_t count = scene.transforms.size();
        const std::size_t chunk = 4096;

        for (std::size_t begin = 0; begin < count; begin += chunk) {
            jobs_.submit([&, begin] {
                const std::size_t end = std::min(begin + chunk, count);
                for (std::size_t i = begin; i < end; ++i) {
                    scene.worldMatrices[i] = composeMatrix(scene.transforms[i]);
                    scene.worldBounds[i] =
                        transformBounds(scene.localBounds[i], scene.worldMatrices[i]);
                }
            });
        }
        jobs_.waitAll();
    }

    // ---------- upload per-frame data into the persistent ring ----------
    FrameUniforms frameData{};
    frameData.view = camera.viewMatrix();
    frameData.projection = camera.projectionMatrix(aspect_);
    frameData.viewProjection = frameData.projection * frameData.view;
    frameData.cameraPosition = glm::vec4(camera.position(), 1.0f);
    frameData.time = scene.time;
    frameData.deltaTime = deltaTime;
    frameRing_.write(frameData);
    frameRing_.bind(0);

    objectRing_.writeRange(scene.worldMatrices);
    objectRing_.bindStorage(1);

    // ---------- 2-9. declare the graph; it derives the order ----------
    RenderGraph graph;

    graph.addPass("cull")
         .reads("objectBuffer")
         .writes("drawCommands").writes("visibleCount")
         .execute([&] {
             GpuScope scope(profiler_, "cull");
             cullPass_.dispatch(scene, camera, frameRing_);
         });

    for (int cascade = 0; cascade < kCascadeCount; ++cascade) {
        graph.addPass("shadow" + std::to_string(cascade))
             .reads("drawCommands")
             .writes("shadowCascade" + std::to_string(cascade),
                     {2048, 2048, GL_DEPTH_COMPONENT32F, true})
             .execute([&, cascade] {
                 GpuScope scope(profiler_, "shadow");
                 shadowPass_.render(cascade, scene, camera);
             });
    }

    graph.addPass("gbuffer")
         .reads("drawCommands").reads("visibleCount")
         .writes("gAlbedo").writes("gNormal").writes("gMaterial").writes("gDepth")
         .execute([&] {
             GpuScope scope(profiler_, "gbuffer");
             gbuffer_.bind();
             glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
             gbufferShader_.use();
             glBindVertexArray(megaVao_);          // ONE vao for the whole scene
             glBindBuffer(GL_DRAW_INDIRECT_BUFFER, cullPass_.commandBuffer());
             glMultiDrawElementsIndirectCount(GL_TRIANGLES, GL_UNSIGNED_INT,
                                              nullptr, 0, kMaxDraws, 0);
         });

    graph.addPass("ssao")
         .reads("gNormal").reads("gDepth")
         .writes("ao")
         .execute([&] {
             GpuScope scope(profiler_, "ssao");
             ssaoPass_.dispatch(gbuffer_, frameRing_);
         });

    graph.addPass("lighting")
         .reads("gAlbedo").reads("gNormal").reads("gMaterial").reads("gDepth")
         .reads("ao").reads("shadowCascade0")
         .writes("hdr")
         .execute([&] {
             GpuScope scope(profiler_, "lighting");
             clusteredLighting_.dispatch(scene.lights, gbuffer_, camera);
         });

    graph.addPass("forward")
         .reads("hdr").reads("gDepth")
         .writes("hdr")
         .execute([&] {
             GpuScope scope(profiler_, "forward");
             transparentPass_.render(scene, camera);    // sorted back to front
         });

    graph.addPass("bloom")
         .reads("hdr")
         .writes("bloomChain")
         .execute([&] {
             GpuScope scope(profiler_, "bloom");
             bloom_.downsampleUpsample(hdrTarget_);
         });

    graph.addPass("post")
         .reads("hdr").reads("bloomChain")
         .writes("backbuffer")
         .execute([&] {
             GpuScope scope(profiler_, "post");
             Framebuffer::bindDefault(width_, height_);
             postShader_.use();
             postShader_.setFloat("uExposure", exposure_);
             fullScreenTriangle_.draw();               // a triangle, not a quad
         });

    graph.setBackbuffer("backbuffer");
    graph.compile();
    graph.execute();

    // ---------- fences and profiling ----------
    frameRing_.endFrame();
    objectRing_.endFrame();
    profiler_.endFrame();
    frameAllocator_.reset();          // O(1): everything this frame allocated
}`,
        output: `Sponza + 400 dynamic objects + 512 point lights, 2560x1440, RTX 3060:

  cull        0.21 ms   (100,000 objects tested, 6,140 visible)
  shadow      1.94 ms   (4 cascades, 4 indirect draws)
  gbuffer     2.38 ms   (1 draw call for the entire scene)
  ssao        0.81 ms   (compute, half res)
  lighting    2.10 ms   (clustered, 512 lights)
  forward     0.34 ms
  bloom       0.62 ms
  post        0.28 ms
  ----------------------
  GPU         8.68 ms   CPU 1.90 ms   ->  115 fps, GPU bound

Draw calls issued by the CPU per frame: 6
Objects actually drawn: 6,140`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The CPU issues 6 draw calls per frame while 6,140 objects are drawn. Which combination of techniques makes that possible?',
        options: [
          'Instancing alone',
          'GPU culling writing indirect draw commands, all meshes in shared buffers behind one VAO, and bindless/array materials — so one `glMultiDrawElementsIndirectCount` covers the whole visible set',
          'A faster CPU',
          'Deferred shading',
        ],
        answer: 1,
        explain:
          'Three things have to be true together: the draw parameters must live in GPU memory (indirect), the geometry must be addressable without rebinding (one mega-buffer and VAO), and materials must be indices rather than binds (bindless or texture arrays). Remove any one and you are back to per-object CPU submission.',
        hint: 'What would force the CPU to issue a separate call per object?',
      },
    },
  ],
}

export default level
