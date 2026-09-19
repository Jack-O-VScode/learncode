import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Lighting, framebuffers and a real renderer',
  summary:
    'Make the scene look like something: Phong and Blinn-Phong lighting, materials, multiple light types, model loading, render-to-texture and post-processing, blending, stencil outlines and instanced rendering.',
  outcomes: [
    'Implement ambient, diffuse and specular lighting',
    'Transform normals correctly and avoid the classic scaling bug',
    'Support directional, point and spot lights',
    'Load real 3D models from files',
    'Render to a framebuffer and apply post-processing',
    'Draw thousands of objects with instancing',
  ],
  steps: [
    {
      id: 'gl-s-01',
      title: 'The Phong lighting model',
      read: `Lighting is what turns flat coloured shapes into objects. The classic model has three components you simply add together.

## Ambient

A constant small amount of light everywhere, standing in for all the light that has bounced around the room. Without it, unlit faces are pure black and look like holes.

\`\`\`glsl
vec3 ambient = 0.1 * lightColour;
\`\`\`

## Diffuse

Light scattered evenly by a rough surface. The brightness depends on the **angle** between the surface normal and the direction to the light — and \`dot\` of two unit vectors gives exactly the cosine of that angle.

\`\`\`glsl
vec3 lightDir = normalize(lightPos - fragPos);
float diff = max(dot(normal, lightDir), 0.0);
vec3 diffuse = diff * lightColour;
\`\`\`

The \`max(..., 0.0)\` matters: a negative dot product means the surface faces away, and without the clamp you would get negative light.

## Specular

The bright highlight on shiny surfaces. It depends on the angle between the **reflected** light direction and the direction to the **viewer**.

\`\`\`glsl
vec3 viewDir = normalize(viewPos - fragPos);
vec3 reflectDir = reflect(-lightDir, normal);
float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
\`\`\`

The exponent is **shininess**: higher means a smaller, tighter highlight.

## Blinn-Phong

Using a **halfway vector** instead of the reflection is cheaper and fixes an artefact where Phong's highlight cuts off abruptly at grazing angles:

\`\`\`glsl
vec3 halfway = normalize(lightDir + viewDir);
float spec = pow(max(dot(normal, halfway), 0.0), 64.0);
\`\`\`

Blinn-Phong needs roughly 2–4× the exponent for a similar-looking highlight. **Use Blinn-Phong.**`,
      sample: {
        lang: 'glsl',
        caption: 'The complete lighting fragment shader, component by component',
        code: `#version 330 core

in vec3 vFragPos;      // the fragment's position in WORLD space
in vec3 vNormal;       // the interpolated surface normal
in vec2 vUV;

uniform vec3 uLightPos;
uniform vec3 uLightColour;
uniform vec3 uViewPos;
uniform vec3 uObjectColour;
uniform float uShininess;

out vec4 FragColor;

void main() {
    // interpolation denormalises: always renormalise in the fragment shader
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPos - vFragPos);
    vec3 viewDir = normalize(uViewPos - vFragPos);

    // 1. ambient: a floor so nothing is pure black
    vec3 ambient = 0.12 * uLightColour;

    // 2. diffuse: cosine of the angle between normal and light
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * uLightColour;

    // 3. specular (Blinn-Phong): the halfway vector
    vec3 halfway = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfway), 0.0), uShininess);

    // only light a surface that actually faces the light
    spec *= step(0.0001, diff);

    vec3 specular = 0.6 * spec * uLightColour;

    vec3 result = (ambient + diffuse + specular) * uObjectColour;
    FragColor = vec4(result, 1.0);
}`,
        output: `A cube that is bright where it faces the light, dark on the far side,
with a tight white highlight that moves as the camera orbits.

ambient only   -> flat, unlit silhouette
+ diffuse      -> solid, three-dimensional form
+ specular     -> looks like a material rather than a shape`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `max(dot(normal, lightDir), 0.0)` used rather than the raw dot product?',
        options: [
          'For performance',
          'A surface facing away from the light gives a negative dot product, which would subtract light and produce impossible negative brightness',
          'Because dot can exceed 1',
          'To normalise the result',
        ],
        answer: 1,
        explain:
          'The dot product of unit vectors ranges from −1 to 1. Negative means the surface is turned away, which physically means *no* light, not *negative* light. Without the clamp, back faces would darken the ambient term and produce black artefacts.',
        hint: 'What does a negative cosine mean for a surface and a light?',
      },
    },

    {
      id: 'gl-s-02',
      title: 'Normal matrices and the scaling bug',
      read: `Normals are directions, not positions, so they transform differently — and getting it wrong is one of the most common lighting bugs there is.

## The problem

Apply a **non-uniform scale** (say 2× in x only) to a model, transform the normals with the same matrix, and they are no longer perpendicular to the surface. Lighting goes visibly wrong: flat faces shade as if curved, highlights land in the wrong place.

## The fix

Transform normals by the **transpose of the inverse** of the model matrix:

\`\`\`cpp
glm::mat3 normalMatrix = glm::transpose(glm::inverse(glm::mat3(model)));
\`\`\`

Take \`mat3\` first, because a normal is a direction and must not be translated.

## Do it on the CPU

\`inverse()\` is expensive and runs **per vertex** if you compute it in the shader. Compute it once per object in C++ and send it as a uniform.

(If your model matrix only ever contains rotation and *uniform* scale, the upper-left 3×3 is already fine — but the normal matrix is correct in every case, so it is the safer habit.)

## Always renormalise

Interpolation across a triangle shortens normals: the average of two unit vectors is not a unit vector. **Renormalise in the fragment shader.** Skipping it makes surfaces darker in the middle of triangles — a subtle, easily-missed error.

## World space versus view space

Do the lighting consistently in one space. World space is the most intuitive and is what these examples use; just make sure the fragment position, the normal, the light position and the camera position are all in the same one.`,
      sample: {
        lang: 'cpp',
        caption: 'Computing the normal matrix, and the artefact when you do not',
        code: `#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

// per object, per frame — cheap here, expensive in a shader
glm::mat3 makeNormalMatrix(const glm::mat4& model) {
    return glm::transpose(glm::inverse(glm::mat3(model)));
}

void drawObject(Shader& shader, const Mesh& mesh,
                const glm::vec3& position, const glm::vec3& scale,
                float angleDegrees, const glm::vec3& axis) {
    glm::mat4 model(1.0f);
    model = glm::translate(model, position);
    model = glm::rotate(model, glm::radians(angleDegrees), axis);
    model = glm::scale(model, scale);            // possibly non-uniform

    shader.setMat4("uModel", model);
    shader.setMat3("uNormalMatrix", makeNormalMatrix(model));
    mesh.draw();
}

int main() {
    // ...
    // a deliberately non-uniform scale: 3x in x, 1x in y and z
    drawObject(shader, cube, {0, 1, 0}, {3.0f, 1.0f, 1.0f}, 30.0f, {0, 1, 0});
}

// ---------- vertex shader ----------
// #version 330 core
// layout (location = 0) in vec3 aPos;
// layout (location = 1) in vec3 aNormal;
// layout (location = 2) in vec2 aUV;
//
// uniform mat4 uModel;
// uniform mat4 uView;
// uniform mat4 uProjection;
// uniform mat3 uNormalMatrix;
//
// out vec3 vFragPos;
// out vec3 vNormal;
// out vec2 vUV;
//
// void main() {
//     vec4 worldPos = uModel * vec4(aPos, 1.0);
//     vFragPos = worldPos.xyz;                  // world space
//     vNormal  = uNormalMatrix * aNormal;       // NOT uModel
//     vUV      = aUV;
//     gl_Position = uProjection * uView * worldPos;
// }`,
        output: `With uNormalMatrix:
  the stretched cube's flat faces shade flatly and correctly.

With uModel used for normals instead:
  the same faces shade as if they were curved, and the specular
  highlight slides across a flat surface as the object rotates —
  the classic symptom of skewed normals.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why can the model matrix not be used to transform normals when scaling is non-uniform?',
        options: [
          'It is too slow',
          'Non-uniform scaling skews the normals so they are no longer perpendicular to the surface; the transpose of the inverse corrects for that',
          'Normals must never be transformed',
          'The model matrix is 4×4 and normals are 3D',
        ],
        answer: 1,
        explain:
          'Scaling a surface changes its slope, and a normal scaled the same way no longer meets the surface at a right angle. The inverse-transpose is the matrix that preserves perpendicularity under any affine transform. For rotation and uniform scale it reduces to the original matrix, which is why the bug only shows up with non-uniform scaling.',
        hint: 'What happens to the angle between a surface and its normal when you stretch one axis?',
      },
    },

    {
      id: 'gl-s-03',
      title: 'Materials and lighting maps',
      read: `A single \`objectColour\` gives every part of a surface the same properties. Real objects vary: the metal rim is shiny, the wooden panel is not.

## A material struct

\`\`\`glsl
struct Material {
    sampler2D diffuse;    // base colour, per texel
    sampler2D specular;   // how shiny each texel is
    float shininess;
};
uniform Material uMaterial;
\`\`\`

In C++ you set these with dotted names: \`shader.setInt("uMaterial.diffuse", 0)\`.

## Lighting maps

- **Diffuse map** — the base colour texture you already have
- **Specular map** — a greyscale image where white means "very shiny here" and black means "not at all". This is what makes the steel border of a wooden crate glint while the wood does not.
- **Normal map** — encodes surface detail as per-texel normals, giving bumps and grooves with no extra geometry. Probably the highest-value texture in real-time graphics.
- **Emissive map** — parts that glow regardless of lighting

## A light struct

\`\`\`glsl
struct Light {
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};
\`\`\`

Giving the light three separate colours rather than one lets you tune the look: a dim ambient, a strong diffuse, a white specular.

## Gamma

Textures are usually stored in sRGB (perceptual) space, while lighting maths assumes linear space. Ignore that and everything looks slightly washed out. The fix is to load colour textures as \`GL_SRGB\` and enable \`GL_FRAMEBUFFER_SRGB\`. Do it once and every scene looks better.`,
      sample: {
        lang: 'glsl',
        caption: 'A material-driven fragment shader with diffuse and specular maps',
        code: `#version 330 core

struct Material {
    sampler2D diffuse;
    sampler2D specular;
    sampler2D emissive;
    float shininess;
};

struct Light {
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vUV;

uniform Material uMaterial;
uniform Light uLight;
uniform vec3 uViewPos;

out vec4 FragColor;

void main() {
    vec3 albedo = texture(uMaterial.diffuse, vUV).rgb;
    vec3 shinyMask = texture(uMaterial.specular, vUV).rgb;

    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLight.position - vFragPos);
    vec3 viewDir = normalize(uViewPos - vFragPos);
    vec3 halfway = normalize(lightDir + viewDir);

    vec3 ambient = uLight.ambient * albedo;

    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = uLight.diffuse * diff * albedo;

    float spec = pow(max(dot(normal, halfway), 0.0), uMaterial.shininess);
    // the mask decides WHERE the surface is shiny
    vec3 specular = uLight.specular * spec * shinyMask;

    vec3 glow = texture(uMaterial.emissive, vUV).rgb;

    FragColor = vec4(ambient + diffuse + specular + glow, 1.0);
}

// ---------- C++ side ----------
// shader.setInt("uMaterial.diffuse", 0);
// shader.setInt("uMaterial.specular", 1);
// shader.setInt("uMaterial.emissive", 2);
// shader.setFloat("uMaterial.shininess", 64.0f);
//
// shader.setVec3("uLight.ambient",  0.12f, 0.12f, 0.14f);
// shader.setVec3("uLight.diffuse",  0.85f, 0.82f, 0.75f);
// shader.setVec3("uLight.specular", 1.0f,  1.0f,  1.0f);`,
        output: `A wooden crate with a steel border:
  - the wood is matte, because the specular map is black there
  - the steel border glints sharply as the camera moves
  - both come from ONE mesh, one draw call, two textures

Without the specular map the whole crate shines like plastic.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does a specular map contain and what does it control?',
        options: [
          'The colour of the highlights',
          'A per-texel mask of how reflective each part of the surface is, so one object can have matte and shiny regions',
          'The direction of the light',
          'The surface normals',
        ],
        answer: 1,
        explain:
          'It is usually greyscale: white means a strong highlight, black means none. Multiplying the specular term by it lets a single material describe wood and metal on one mesh — a big visual improvement for one extra texture lookup.',
        hint: 'What varies between the wood and the metal on a crate?',
      },
    },

    {
      id: 'gl-s-04',
      title: 'Directional, point and spot lights',
      read: `## Directional light

The sun: infinitely far away, so all rays are parallel and there is no position, only a direction. No attenuation.

\`\`\`glsl
vec3 lightDir = normalize(-light.direction);
\`\`\`

## Point light

A bulb: has a position, shines in all directions, and **fades with distance**.

\`\`\`glsl
float d = length(light.position - fragPos);
float attenuation = 1.0 / (light.constant + light.linear * d
                                          + light.quadratic * d * d);
\`\`\`

Physically correct falloff is \`1/d²\`, but that is harsh up close, so the constant and linear terms soften it. Typical values for a range of 50 units: constant 1.0, linear 0.09, quadratic 0.032.

## Spot light

A torch: a point light restricted to a cone. Compare the fragment's direction against the spotlight's axis with a dot product, and use two cone angles for a soft edge:

\`\`\`glsl
float theta = dot(lightDir, normalize(-light.direction));
float epsilon = light.cutOff - light.outerCutOff;
float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);
\`\`\`

Note these are compared as **cosines**, not angles — because \`dot\` already gives you a cosine, and cosine is monotonic over 0–90°, so \`>\` on cosines is the same test as \`<\` on angles. Avoiding \`acos\` per fragment is a real saving.

## Combining them

Write a function per light type returning a \`vec3\` contribution, then add them all up. Each function is small and testable; the main function reads like a summary.`,
      sample: {
        lang: 'glsl',
        caption: 'One shader, three light types, added together',
        code: `#version 330 core

struct Material { sampler2D diffuse; sampler2D specular; float shininess; };

struct DirLight {
    vec3 direction;
    vec3 ambient, diffuse, specular;
};

struct PointLight {
    vec3 position;
    float constant, linear, quadratic;
    vec3 ambient, diffuse, specular;
};

struct SpotLight {
    vec3 position, direction;
    float cutOff, outerCutOff;          // stored as COSINES
    float constant, linear, quadratic;
    vec3 ambient, diffuse, specular;
};

#define POINT_LIGHT_COUNT 4

in vec3 vFragPos;
in vec3 vNormal;
in vec2 vUV;

uniform Material uMaterial;
uniform DirLight uDirLight;
uniform PointLight uPointLights[POINT_LIGHT_COUNT];
uniform SpotLight uSpotLight;
uniform vec3 uViewPos;

out vec4 FragColor;

vec3 shade(vec3 lightDir, vec3 normal, vec3 viewDir,
           vec3 ambientC, vec3 diffuseC, vec3 specularC,
           vec3 albedo, vec3 shinyMask) {
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfway = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfway), 0.0), uMaterial.shininess);

    return ambientC * albedo
         + diffuseC * diff * albedo
         + specularC * spec * shinyMask;
}

float attenuationFor(float d, float c, float l, float q) {
    return 1.0 / (c + l * d + q * d * d);
}

void main() {
    vec3 albedo = texture(uMaterial.diffuse, vUV).rgb;
    vec3 shinyMask = texture(uMaterial.specular, vUV).rgb;
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uViewPos - vFragPos);

    // --- directional: no position, no attenuation ---
    vec3 result = shade(normalize(-uDirLight.direction), normal, viewDir,
                        uDirLight.ambient, uDirLight.diffuse, uDirLight.specular,
                        albedo, shinyMask);

    // --- point lights ---
    for (int i = 0; i < POINT_LIGHT_COUNT; ++i) {
        vec3 toLight = uPointLights[i].position - vFragPos;
        float dist = length(toLight);
        float att = attenuationFor(dist, uPointLights[i].constant,
                                   uPointLights[i].linear,
                                   uPointLights[i].quadratic);

        result += att * shade(normalize(toLight), normal, viewDir,
                              uPointLights[i].ambient, uPointLights[i].diffuse,
                              uPointLights[i].specular, albedo, shinyMask);
    }

    // --- spot light: a point light restricted to a cone ---
    vec3 toSpot = uSpotLight.position - vFragPos;
    float spotDist = length(toSpot);
    vec3 spotDir = normalize(toSpot);

    float theta = dot(spotDir, normalize(-uSpotLight.direction));
    float epsilon = uSpotLight.cutOff - uSpotLight.outerCutOff;
    float intensity = clamp((theta - uSpotLight.outerCutOff) / epsilon, 0.0, 1.0);
    float spotAtt = attenuationFor(spotDist, uSpotLight.constant,
                                   uSpotLight.linear, uSpotLight.quadratic);

    result += intensity * spotAtt
            * shade(spotDir, normal, viewDir,
                    uSpotLight.ambient, uSpotLight.diffuse,
                    uSpotLight.specular, albedo, shinyMask);

    FragColor = vec4(result, 1.0);
}`,
        output: `A scene lit by a dim blue "sky" directional light, four coloured point
lights that fade out with distance, and a torch attached to the camera
with a soft-edged cone.

Moving away from a point light dims it smoothly; walking out of the
torch beam fades rather than cuts.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are a spotlight’s cone angles stored and compared as **cosines** rather than angles?',
        options: [
          'Cosines are more precise',
          '`dot` already returns a cosine, so comparing cosines avoids an expensive `acos` per fragment — and cosine is monotonic over 0–90°, so the comparison is equivalent',
          'GLSL has no angle type',
          'Angles cannot be interpolated',
        ],
        answer: 1,
        explain:
          'You need "is the fragment within θ of the axis?". The dot product gives cos θ directly, so comparing against a precomputed cosine answers the question with no inverse trig. Since cosine decreases monotonically over 0–90°, a larger cosine means a smaller angle — the comparison just flips direction.',
        hint: 'What does `dot` of two unit vectors already give you?',
      },
    },

    {
      id: 'gl-s-05',
      title: 'Loading 3D models',
      read: `Generated spheres and cubes only go so far. Real content comes from Blender, and you load it.

## Assimp

The Open Asset Import Library reads 40+ formats (OBJ, FBX, glTF, COLLADA) and gives them all the same structure: a scene containing a tree of nodes, each referencing meshes, each referencing a material.

\`\`\`cpp
Assimp::Importer importer;
const aiScene* scene = importer.ReadFile(path,
    aiProcess_Triangulate | aiProcess_FlipUVs |
    aiProcess_GenSmoothNormals | aiProcess_CalcTangentSpace);
\`\`\`

Those post-processing flags do a lot of work for you: guarantee triangles, fix the UV origin, generate missing normals, and compute tangents for normal mapping.

## The walk

Recurse the node tree; for each mesh copy positions, normals and UVs into your \`Vertex\` struct, copy the indices, and load the material's textures.

## Cache your textures

The same texture is usually referenced by many meshes. Without a cache — a \`std::unordered_map<std::string, unsigned int>\` — you reload and re-upload the same image dozens of times, which dominates load time.

## glTF

If you get to choose the format, choose **glTF 2.0**. It is the modern standard: PBR materials, efficient binary buffers, animation, and designed for real-time rather than for film.

## Or write your own OBJ parser

OBJ is plain text and simple enough to parse in an afternoon. Doing it once teaches you exactly what a model file contains — and why its face indices being 1-based catches everyone out.`,
      sample: {
        lang: 'cpp',
        caption: 'model.h — recursive loading with a texture cache',
        code: `#pragma once

#include <assimp/Importer.hpp>
#include <assimp/postprocess.h>
#include <assimp/scene.h>

#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

#include "mesh.h"
#include "shader.h"

class Model {
public:
    explicit Model(const std::string& path) { load(path); }

    void draw(Shader& shader) const {
        for (const auto& mesh : meshes_) mesh.draw(shader);
    }

    bool valid() const { return !meshes_.empty(); }
    std::size_t meshCount() const { return meshes_.size(); }

private:
    void load(const std::string& path) {
        Assimp::Importer importer;
        const aiScene* scene = importer.ReadFile(path,
            aiProcess_Triangulate |
            aiProcess_FlipUVs |
            aiProcess_GenSmoothNormals |
            aiProcess_CalcTangentSpace |
            aiProcess_JoinIdenticalVertices);

        if (scene == nullptr ||
            (scene->mFlags & AI_SCENE_FLAGS_INCOMPLETE) ||
            scene->mRootNode == nullptr) {
            std::cerr << "assimp: " << importer.GetErrorString() << "\\n";
            return;
        }

        directory_ = path.substr(0, path.find_last_of('/'));
        processNode(scene->mRootNode, scene);

        std::cout << path << ": " << meshes_.size() << " meshes, "
                  << textureCache_.size() << " unique textures\\n";
    }

    void processNode(const aiNode* node, const aiScene* scene) {
        for (unsigned int i = 0; i < node->mNumMeshes; ++i) {
            meshes_.push_back(convert(scene->mMeshes[node->mMeshes[i]], scene));
        }
        for (unsigned int i = 0; i < node->mNumChildren; ++i) {
            processNode(node->mChildren[i], scene);      // recursion
        }
    }

    TexturedMesh convert(const aiMesh* mesh, const aiScene* scene) {
        std::vector<Vertex> vertices;
        vertices.reserve(mesh->mNumVertices);

        for (unsigned int i = 0; i < mesh->mNumVertices; ++i) {
            Vertex v;
            v.position = {mesh->mVertices[i].x, mesh->mVertices[i].y,
                          mesh->mVertices[i].z};
            if (mesh->HasNormals()) {
                v.normal = {mesh->mNormals[i].x, mesh->mNormals[i].y,
                            mesh->mNormals[i].z};
            }
            if (mesh->mTextureCoords[0] != nullptr) {
                v.uv = {mesh->mTextureCoords[0][i].x,
                        mesh->mTextureCoords[0][i].y};
            }
            vertices.push_back(v);
        }

        std::vector<unsigned int> indices;
        indices.reserve(mesh->mNumFaces * 3);
        for (unsigned int f = 0; f < mesh->mNumFaces; ++f) {
            const aiFace& face = mesh->mFaces[f];
            for (unsigned int i = 0; i < face.mNumIndices; ++i) {
                indices.push_back(face.mIndices[i]);
            }
        }

        std::vector<TextureRef> textures;
        if (mesh->mMaterialIndex < scene->mNumMaterials) {
            const aiMaterial* material = scene->mMaterials[mesh->mMaterialIndex];
            appendTextures(material, aiTextureType_DIFFUSE, "diffuse", textures);
            appendTextures(material, aiTextureType_SPECULAR, "specular", textures);
        }

        return TexturedMesh(vertices, indices, textures);
    }

    void appendTextures(const aiMaterial* material, aiTextureType type,
                        const std::string& usage,
                        std::vector<TextureRef>& out) {
        for (unsigned int i = 0; i < material->GetTextureCount(type); ++i) {
            aiString file;
            material->GetTexture(type, i, &file);
            const std::string path = directory_ + "/" + file.C_Str();

            // the cache is what stops the same image being uploaded 40 times
            auto found = textureCache_.find(path);
            if (found == textureCache_.end()) {
                const unsigned int id = loadTexture(path.c_str());
                found = textureCache_.emplace(path, id).first;
            }
            out.push_back({found->second, usage});
        }
    }

    std::vector<TexturedMesh> meshes_;
    std::unordered_map<std::string, unsigned int> textureCache_;
    std::string directory_;
};`,
        output: `assets/backpack/backpack.obj: 1 meshes, 5 unique textures
assets/sponza/sponza.gltf: 382 meshes, 68 unique textures

Without the texture cache, sponza reloads the same images 1100+ times:
  load time 47.2s -> 1.9s`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why cache loaded textures by file path when loading a model?',
        options: [
          'To reduce GPU memory',
          'Many meshes reference the same texture files, so without a cache the same image is decoded and uploaded to the GPU once per reference — often hundreds of times',
          'Assimp requires it',
          'To keep the file handles open',
        ],
        answer: 1,
        explain:
          'A single model can have hundreds of meshes sharing a handful of materials. Each decode-and-upload is expensive, so redundant loads dominate the load time — and each also wastes GPU memory on a duplicate. A map from path to texture id turns it into one load per unique file.',
        hint: 'How many meshes in a big model share the same material?',
      },
    },

    {
      id: 'gl-s-06',
      title: 'Framebuffers and render-to-texture',
      read: `So far everything renders to the screen. A **framebuffer object** lets you render into a texture instead — the basis of post-processing, shadows, reflections, mirrors, minimaps and deferred shading.

## The setup

\`\`\`cpp
glGenFramebuffers(1, &fbo);
glBindFramebuffer(GL_FRAMEBUFFER, fbo);

// a colour attachment you can sample later
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
                       GL_TEXTURE_2D, colourTexture, 0);

// depth + stencil you only write to: a renderbuffer is faster
glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT,
                          GL_RENDERBUFFER, rbo);

if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
    // incomplete: missing attachment, size mismatch, unsupported format
}
\`\`\`

**Always check completeness.** An incomplete framebuffer silently renders nothing.

## Texture or renderbuffer?

- **Texture** — if you need to *sample* it later (colour, usually)
- **Renderbuffer** — if you only write to it (depth and stencil, usually). Cannot be sampled, but is faster and simpler.

## The two-pass pattern

1. Bind the FBO, render the scene normally
2. Bind the default framebuffer (0), disable depth testing, and draw a **full-screen quad** sampling the texture through a post-processing shader

## The traps

- Set \`glViewport\` to the **framebuffer's** size, not the window's
- Resize the attachments when the window resizes, or your image is stretched or cropped
- You cannot read and write the same texture in one pass — ping-pong between two FBOs for multi-step effects`,
      sample: {
        lang: 'cpp',
        caption: 'framebuffer.h — RAII, resizable, completeness-checked',
        code: `#pragma once

#include <glad/glad.h>
#include <iostream>

class Framebuffer {
public:
    Framebuffer(int width, int height) { create(width, height); }
    ~Framebuffer() { destroy(); }

    Framebuffer(const Framebuffer&) = delete;
    Framebuffer& operator=(const Framebuffer&) = delete;

    void bind() const {
        glBindFramebuffer(GL_FRAMEBUFFER, fbo_);
        glViewport(0, 0, width_, height_);        // the FBO's size, not the window's
    }

    static void bindDefault(int windowWidth, int windowHeight) {
        glBindFramebuffer(GL_FRAMEBUFFER, 0);
        glViewport(0, 0, windowWidth, windowHeight);
    }

    void resize(int width, int height) {
        if (width == width_ && height == height_) return;
        destroy();
        create(width, height);
    }

    unsigned int colourTexture() const { return colour_; }
    bool valid() const { return complete_; }

private:
    void create(int width, int height) {
        width_ = width;
        height_ = height;

        glGenFramebuffers(1, &fbo_);
        glBindFramebuffer(GL_FRAMEBUFFER, fbo_);

        // colour: a TEXTURE, because the post pass samples it
        glGenTextures(1, &colour_);
        glBindTexture(GL_TEXTURE_2D, colour_);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB16F, width, height, 0,
                     GL_RGB, GL_FLOAT, nullptr);      // 16F: HDR headroom
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0,
                               GL_TEXTURE_2D, colour_, 0);

        // depth + stencil: a RENDERBUFFER, because we never sample it
        glGenRenderbuffers(1, &rbo_);
        glBindRenderbuffer(GL_RENDERBUFFER, rbo_);
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, width, height);
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT,
                                  GL_RENDERBUFFER, rbo_);

        const GLenum status = glCheckFramebufferStatus(GL_FRAMEBUFFER);
        complete_ = (status == GL_FRAMEBUFFER_COMPLETE);
        if (!complete_) {
            std::cerr << "framebuffer incomplete: 0x" << std::hex << status << "\\n";
        }

        glBindFramebuffer(GL_FRAMEBUFFER, 0);
    }

    void destroy() {
        if (colour_ != 0) glDeleteTextures(1, &colour_);
        if (rbo_ != 0) glDeleteRenderbuffers(1, &rbo_);
        if (fbo_ != 0) glDeleteFramebuffers(1, &fbo_);
        colour_ = rbo_ = fbo_ = 0;
    }

    unsigned int fbo_ = 0, colour_ = 0, rbo_ = 0;
    int width_ = 0, height_ = 0;
    bool complete_ = false;
};`,
        output: `The render loop becomes two passes:

    scene.bind();                       // -> render into the texture
    glClear(COLOR | DEPTH);
    drawEverything();

    Framebuffer::bindDefault(w, h);     // -> render to the screen
    glDisable(GL_DEPTH_TEST);
    postShader.use();
    glBindTexture(GL_TEXTURE_2D, scene.colourTexture());
    fullScreenQuad.draw();`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the colour attachment a texture while depth and stencil use a renderbuffer?',
        options: [
          'Renderbuffers support more formats',
          'The post-processing pass needs to *sample* the colour, which requires a texture; depth and stencil are only written to, and a renderbuffer is a cheaper write-only target',
          'Textures cannot store depth',
          'It is required by the specification',
        ],
        answer: 1,
        explain:
          'Choose the attachment type by how you will use it. Renderbuffers are optimised for being rendered into and cannot be sampled; textures can be sampled but carry more machinery. If a later pass needed the depth values — for fog or SSAO — you would make depth a texture too.',
        hint: 'Which attachment does the second pass read from?',
      },
    },

    {
      id: 'gl-s-07',
      title: 'Post-processing effects',
      read: `With the scene in a texture, a full-screen quad plus a shader can transform the whole image.

## The cheap ones

- **Inversion** — \`1.0 - colour\`
- **Greyscale** — weight by human sensitivity: \`dot(colour, vec3(0.2126, 0.7152, 0.0722))\`. Averaging the channels instead looks wrong because we perceive green far more strongly than blue.
- **Vignette** — darken with distance from the centre
- **Chromatic aberration** — sample R, G and B at slightly different offsets

## Kernel effects

Sample the neighbouring texels and combine them with weights:

- **Blur** — a 3×3 box or Gaussian kernel
- **Sharpen**, **edge detect** (Sobel), **emboss**

A proper Gaussian blur is **separable**: blurring horizontally then vertically gives the same result as a 2D pass but costs 2n samples instead of n². For a 9×9 kernel that is 18 samples instead of 81 — always do it in two passes.

## Tone mapping and gamma

Rendering in HDR (\`GL_RGB16F\`) lets light values exceed 1.0, then a tone-mapping curve compresses them into displayable range:

\`\`\`glsl
vec3 mapped = colour / (colour + vec3(1.0));      // Reinhard
mapped = pow(mapped, vec3(1.0 / 2.2));            // gamma correction
\`\`\`

This is the step that makes bright scenes look like photographs rather than blown-out white blobs.

## The cost

Post-processing is **per pixel of the screen**, every frame. At 4K that is 8 million invocations per pass. Keep the shaders short and the passes few.`,
      sample: {
        lang: 'glsl',
        caption: 'A post-processing shader with switchable effects',
        code: `#version 330 core

in vec2 vUV;
uniform sampler2D uScene;
uniform int uEffect;
uniform float uTime;
uniform vec2 uTexelSize;        // 1.0 / textureSize

out vec4 FragColor;

const float kernelBlur[9] = float[](
    1.0/16, 2.0/16, 1.0/16,
    2.0/16, 4.0/16, 2.0/16,
    1.0/16, 2.0/16, 1.0/16
);

const float kernelEdge[9] = float[](
    1.0,  1.0, 1.0,
    1.0, -8.0, 1.0,
    1.0,  1.0, 1.0
);

vec3 applyKernel(float kernel[9]) {
    vec2 offsets[9] = vec2[](
        vec2(-uTexelSize.x,  uTexelSize.y), vec2(0.0,  uTexelSize.y),
        vec2( uTexelSize.x,  uTexelSize.y), vec2(-uTexelSize.x, 0.0),
        vec2(0.0, 0.0),                     vec2( uTexelSize.x, 0.0),
        vec2(-uTexelSize.x, -uTexelSize.y), vec2(0.0, -uTexelSize.y),
        vec2( uTexelSize.x, -uTexelSize.y)
    );

    vec3 sum = vec3(0.0);
    for (int i = 0; i < 9; ++i) {
        sum += texture(uScene, vUV + offsets[i]).rgb * kernel[i];
    }
    return sum;
}

void main() {
    vec3 colour = texture(uScene, vUV).rgb;

    if (uEffect == 1) {
        colour = vec3(1.0) - colour;                        // invert
    } else if (uEffect == 2) {
        // perceptual weights, not a flat average
        float grey = dot(colour, vec3(0.2126, 0.7152, 0.0722));
        colour = vec3(grey);
    } else if (uEffect == 3) {
        colour = applyKernel(kernelBlur);
    } else if (uEffect == 4) {
        colour = applyKernel(kernelEdge);
    } else if (uEffect == 5) {
        // chromatic aberration, strongest at the edges
        vec2 toCentre = vUV - 0.5;
        float amount = 0.004 * length(toCentre);
        colour.r = texture(uScene, vUV + toCentre * amount).r;
        colour.b = texture(uScene, vUV - toCentre * amount).b;
    }

    // vignette, always applied
    float vignette = smoothstep(0.95, 0.35, length(vUV - 0.5));
    colour *= mix(0.55, 1.0, vignette);

    // HDR tone mapping, then gamma correction — always last
    colour = colour / (colour + vec3(1.0));
    colour = pow(colour, vec3(1.0 / 2.2));

    FragColor = vec4(colour, 1.0);
}`,
        output: `Press 1-5 to switch effects:
  1 inverted    2 greyscale    3 blur    4 edges    5 chromatic aberration

At 1920x1080 this shader runs 2,073,600 times per frame.
The 9-tap kernel means 18.6 million texture samples per frame — which
is why a separable two-pass Gaussian is worth the extra complexity.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a separable Gaussian blur (horizontal pass then vertical pass) preferred over a single 2D kernel?',
        options: [
          'It produces a better-looking blur',
          'For an n×n kernel it costs 2n samples per pixel instead of n² — a 9×9 blur drops from 81 samples to 18',
          'It uses less memory',
          'Single-pass kernels are not supported',
        ],
        answer: 1,
        explain:
          'A Gaussian is mathematically separable into two 1D passes whose combined result is identical. The saving grows quadratically with kernel size, so for any blur wider than about 3×3 the two-pass version is dramatically cheaper for exactly the same image.',
        hint: 'Compare 2n with n² for n = 9.',
      },
    },

    {
      id: 'gl-s-08',
      title: 'Blending and transparency',
      read: `\`\`\`cpp
glEnable(GL_BLEND);
glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
\`\`\`

The result is \`source * srcAlpha + destination * (1 - srcAlpha)\` — standard alpha blending.

Other useful modes: \`GL_ONE, GL_ONE\` is **additive**, correct for fire, sparks and glows, which should only ever brighten what is behind them.

## The ordering problem

Blending reads what is already in the framebuffer, so **order matters**. And the depth buffer makes it worse: a transparent surface drawn first writes depth, and opaque objects behind it are then rejected entirely — they simply vanish.

## The recipe

1. Draw all **opaque** objects first, depth writing on
2. **Sort transparent** objects back to front, by distance from the camera
3. Draw them with \`glDepthMask(GL_FALSE)\` — still depth *test* against opaque geometry, but do not *write* depth

Re-enable \`glDepthMask(GL_TRUE)\` afterwards or the next frame's opaque pass breaks.

## Sorting is imperfect

Per-object sorting fails for intersecting or concave transparent geometry — there is no single correct order. Proper solutions (order-independent transparency, depth peeling) are expensive; most engines sort per object and accept the artefacts.

## Cutout alpha is different

For foliage and fences, where alpha is only ever 0 or 1, do not blend at all — \`discard\` in the fragment shader. No sorting needed, and depth writing works normally.`,
      sample: {
        lang: 'cpp',
        caption: 'The full transparency pass, sorted back to front',
        code: `#include <glm/glm.hpp>
#include <algorithm>
#include <map>
#include <vector>

struct TransparentObject {
    glm::vec3 position;
    glm::vec3 colour;
    float alpha = 0.5f;
};

void renderFrame(const Camera& camera,
                 const std::vector<SceneObject>& opaque,
                 std::vector<TransparentObject>& transparent,
                 Shader& shader, const Mesh& quad) {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    // ---- 1. opaque, front to back is ideal (early depth rejection) ----
    glEnable(GL_DEPTH_TEST);
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);

    for (const auto& object : opaque) {
        drawObject(shader, object);
    }

    // ---- 2. sort transparent BACK to FRONT ----
    const glm::vec3 eye = camera.position();
    std::sort(transparent.begin(), transparent.end(),
              [&eye](const TransparentObject& a, const TransparentObject& b) {
                  // compare squared distance: no sqrt needed for ordering
                  const float da = glm::dot(a.position - eye, a.position - eye);
                  const float db = glm::dot(b.position - eye, b.position - eye);
                  return da > db;                    // furthest first
              });

    // ---- 3. draw them blended, without writing depth ----
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glDepthMask(GL_FALSE);          // test against opaque, but do not write

    shader.use();
    for (const auto& object : transparent) {
        glm::mat4 model(1.0f);
        model = glm::translate(model, object.position);
        shader.setMat4("uModel", model);
        shader.setVec4("uColour", object.colour.r, object.colour.g,
                       object.colour.b, object.alpha);
        quad.draw();
    }

    // ---- restore state, or the next frame's opaque pass is broken ----
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
}

// additive blending, for fire and sparks
void renderParticles(const Mesh& quad, Shader& shader) {
    glEnable(GL_BLEND);
    glBlendFunc(GL_ONE, GL_ONE);        // only ever brightens
    glDepthMask(GL_FALSE);
    // ... draw particles ...
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
}

// ---------- cutout alpha: no blending, no sorting ----------
// #version 330 core
// in vec2 vUV;
// uniform sampler2D uTexture;
// out vec4 FragColor;
// void main() {
//     vec4 sampled = texture(uTexture, vUV);
//     if (sampled.a < 0.1) discard;     // the fragment never exists
//     FragColor = sampled;
// }`,
        output: `Correct: three panes of coloured glass, each tinting what is behind it.

Without depth-mask off: panes drawn earlier hide the ones behind them
completely — you see glass, then nothing.

Without sorting: the tinting is wrong depending on which pane happened
to be drawn first; the effect changes as you walk around.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why call `glDepthMask(GL_FALSE)` when drawing transparent objects, rather than disabling the depth test entirely?',
        options: [
          'It is faster',
          'You still want transparent surfaces hidden by opaque geometry in front of them — so keep the depth *test*, but stop them *writing* depth and rejecting the transparent surfaces behind them',
          'The depth test cannot be disabled',
          'It prevents z-fighting',
        ],
        answer: 1,
        explain:
          'Testing and writing are separate. Keeping the test means a window behind a wall is correctly hidden. Disabling the write means a nearer pane of glass does not block the further pane behind it. Disabling the test entirely would draw transparent objects over everything, including walls in front of them.',
        hint: 'Which of the two do you still want against opaque geometry?',
      },
    },

    {
      id: 'gl-s-09',
      title: 'Stencil buffer and outlines',
      read: `The stencil buffer stores an integer per pixel that you can test and write, letting you mask which pixels a later draw may touch.

\`\`\`cpp
glEnable(GL_STENCIL_TEST);
glStencilFunc(GL_ALWAYS, 1, 0xFF);                 // write 1 everywhere we draw
glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
glStencilMask(0xFF);
\`\`\`

- \`glStencilFunc(func, ref, mask)\` — the **test**
- \`glStencilOp(sfail, dpfail, dppass)\` — what to **write** in each outcome
- \`glStencilMask\` — which bits may be written. **\`0x00\` disables stencil writes entirely** — a very common source of "why is my stencil not working".

## Object outlines

The classic use, and a good way to understand it:

1. Draw the object normally, writing 1 to the stencil where it covers
2. Set the test to "pass only where the stencil is **not** 1"
3. Disable depth testing and draw the object again, slightly scaled up, in the outline colour

The scaled-up copy only appears where the original was not — a clean border.

## Other uses

Portals and mirrors (render the reflected scene only inside the mirror's shape), shadow volumes, and masking any effect to a region.

## Remember to clear it

\`glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT)\`, and ask GLFW for a stencil buffer (the default 8 bits is plenty).`,
      sample: {
        lang: 'cpp',
        caption: 'Selection outlines with the stencil buffer',
        code: `#include <glad/glad.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <vector>

void drawWithOutline(Shader& objectShader, Shader& outlineShader,
                     const Mesh& mesh,
                     const std::vector<SceneObject>& objects,
                     int selectedIndex) {

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_STENCIL_TEST);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);

    // ---- pass 1: everything NOT selected, no stencil writing ----
    glStencilMask(0x00);                       // 0x00 = write nothing
    objectShader.use();
    for (std::size_t i = 0; i < objects.size(); ++i) {
        if (static_cast<int>(i) == selectedIndex) continue;
        objectShader.setMat4("uModel", modelMatrixFor(objects[i]));
        mesh.draw();
    }

    // ---- pass 2: the selected object, writing 1 into the stencil ----
    glStencilFunc(GL_ALWAYS, 1, 0xFF);         // always pass, reference 1
    glStencilMask(0xFF);                       // allow stencil writes
    objectShader.setMat4("uModel", modelMatrixFor(objects[selectedIndex]));
    mesh.draw();

    // ---- pass 3: the scaled-up copy, only where the stencil is NOT 1 ----
    glStencilFunc(GL_NOTEQUAL, 1, 0xFF);
    glStencilMask(0x00);                       // do not disturb the stencil
    glDisable(GL_DEPTH_TEST);                  // outline must not be occluded

    outlineShader.use();
    glm::mat4 scaled = modelMatrixFor(objects[selectedIndex]);
    scaled = glm::scale(scaled, glm::vec3(1.06f));
    outlineShader.setMat4("uModel", scaled);
    outlineShader.setVec3("uColour", 1.0f, 0.65f, 0.1f);
    mesh.draw();

    // ---- restore ----
    glStencilMask(0xFF);
    glStencilFunc(GL_ALWAYS, 1, 0xFF);
    glEnable(GL_DEPTH_TEST);
}

int main() {
    glfwWindowHint(GLFW_STENCIL_BITS, 8);      // ask for a stencil buffer
    // ...
    while (running) {
        glClearColor(0.06f, 0.07f, 0.12f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT |
                GL_STENCIL_BUFFER_BIT);         // clear the stencil too
        // ...
    }
}`,
        output: `(the selected crate has a clean orange border a few pixels wide,
 visible even when partly behind another object)

With glStencilMask(0x00) left on during pass 2: no outline at all,
because nothing was ever written to the stencil buffer.

Without clearing GL_STENCIL_BUFFER_BIT: the outline from the previous
frame's selection persists as a hole in this frame's outline.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The outline effect does not appear at all. `glStencilFunc` and the draw calls look right. What should you check first?',
        options: [
          'The depth test',
          '`glStencilMask` — if it is `0x00` during the pass that should write the stencil, nothing is written and the later test never matches',
          'The outline colour',
          'The scale factor',
        ],
        answer: 1,
        explain:
          '`glStencilMask(0x00)` makes the stencil buffer read-only regardless of what `glStencilOp` says. Since you deliberately set it to 0x00 for the passes that must not write, forgetting to set it back to 0xFF before the marking pass is the single most common stencil bug — and it fails completely silently.',
        hint: 'Which call controls whether stencil writes are allowed at all?',
      },
    },

    {
      id: 'gl-s-10',
      title: 'Instanced rendering',
      read: `Drawing 10,000 objects with 10,000 draw calls is CPU-bound: the GPU sits idle while the driver processes commands. **Instancing** draws them all in one call.

\`\`\`cpp
glDrawElementsInstanced(GL_TRIANGLES, indexCount, GL_UNSIGNED_INT, 0, 10000);
\`\`\`

## Getting per-instance data in

The key is \`glVertexAttribDivisor\`:

\`\`\`cpp
glVertexAttribDivisor(3, 1);   // advance this attribute once per INSTANCE
\`\`\`

- Divisor **0** (the default) — the attribute advances per **vertex**
- Divisor **1** — it advances per **instance**

So a buffer of 10,000 model matrices, with divisor 1, gives each instance its own transform.

## A mat4 takes four attribute slots

An attribute slot holds at most a \`vec4\`, so a \`mat4\` occupies locations 3, 4, 5 and 6 — each needing its own \`glVertexAttribPointer\` and \`glVertexAttribDivisor\`. It looks fiddly the first time; it is mechanical.

## gl_InstanceID

Inside the vertex shader, \`gl_InstanceID\` is the index of the current instance. For simple cases you can compute the transform from it and skip the buffer entirely.

## When it wins

Thousands of copies of the **same mesh with the same material**: grass, trees, particles, crowds, asteroid fields, bullets. Different meshes cannot be instanced together.

## Updating

If transforms change every frame, upload them with \`glBufferSubData\` or an orphaned buffer. Still one draw call.`,
      sample: {
        lang: 'cpp',
        caption: 'Ten thousand asteroids in a single draw call',
        code: `#include <glad/glad.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <random>
#include <vector>

unsigned int setupInstancing(unsigned int meshVAO,
                             const std::vector<glm::mat4>& transforms) {
    unsigned int instanceVBO = 0;
    glGenBuffers(1, &instanceVBO);
    glBindBuffer(GL_ARRAY_BUFFER, instanceVBO);
    glBufferData(GL_ARRAY_BUFFER,
                 static_cast<GLsizeiptr>(transforms.size() * sizeof(glm::mat4)),
                 transforms.data(), GL_STATIC_DRAW);

    glBindVertexArray(meshVAO);

    // a mat4 is four vec4 attribute slots: 3, 4, 5, 6
    const std::size_t vec4Size = sizeof(glm::vec4);
    for (unsigned int i = 0; i < 4; ++i) {
        const unsigned int location = 3 + i;
        glEnableVertexAttribArray(location);
        glVertexAttribPointer(location, 4, GL_FLOAT, GL_FALSE,
                              sizeof(glm::mat4),
                              reinterpret_cast<void*>(i * vec4Size));
        glVertexAttribDivisor(location, 1);      // ONCE PER INSTANCE
    }

    glBindVertexArray(0);
    return instanceVBO;
}

std::vector<glm::mat4> makeAsteroidField(int count, float radius, float spread) {
    std::mt19937 rng(42);
    std::uniform_real_distribution<float> offset(-spread, spread);
    std::uniform_real_distribution<float> scale(0.05f, 0.25f);
    std::uniform_real_distribution<float> angle(0.0f, 360.0f);

    std::vector<glm::mat4> transforms;
    transforms.reserve(static_cast<std::size_t>(count));

    for (int i = 0; i < count; ++i) {
        const float theta = (static_cast<float>(i) / count) * 360.0f;
        const float x = std::sin(glm::radians(theta)) * radius + offset(rng);
        const float y = offset(rng) * 0.4f;
        const float z = std::cos(glm::radians(theta)) * radius + offset(rng);

        glm::mat4 model(1.0f);
        model = glm::translate(model, glm::vec3(x, y, z));
        model = glm::rotate(model, glm::radians(angle(rng)),
                            glm::vec3(0.4f, 0.6f, 0.8f));
        model = glm::scale(model, glm::vec3(scale(rng)));
        transforms.push_back(model);
    }
    return transforms;
}

int main() {
    // ...
    auto transforms = makeAsteroidField(10000, 50.0f, 12.0f);
    setupInstancing(rockMesh.vao(), transforms);

    while (running) {
        shader.use();
        shader.setMat4("uView", camera.viewMatrix());
        shader.setMat4("uProjection", projection);

        glBindVertexArray(rockMesh.vao());
        glDrawElementsInstanced(GL_TRIANGLES, rockMesh.indexCount(),
                                GL_UNSIGNED_INT, nullptr,
                                static_cast<GLsizei>(transforms.size()));
    }
}

// ---------- vertex shader ----------
// layout (location = 0) in vec3 aPos;
// layout (location = 1) in vec3 aNormal;
// layout (location = 2) in vec2 aUV;
// layout (location = 3) in mat4 aInstanceModel;   // occupies 3,4,5,6
//
// void main() {
//     gl_Position = uProjection * uView * aInstanceModel * vec4(aPos, 1.0);
// }`,
        output: `10,000 asteroids:
  one draw call each:  10000 draw calls,  14 fps  (CPU bound)
  instanced:               1 draw call,  240 fps  (GPU bound)

The image is identical. Only the number of commands changed.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `glVertexAttribDivisor(3, 1)` do?',
        options: [
          'Divides attribute 3 by 1',
          'Makes attribute 3 advance once per **instance** rather than once per vertex, so every instance reads its own value from the buffer',
          'Sets the number of instances to 1',
          'Enables instancing for the whole VAO',
        ],
        answer: 1,
        explain:
          'The divisor is how often the attribute pointer moves forward. 0 (the default) means per vertex, 1 means per instance, 2 means every two instances. It is what lets one buffer supply per-instance transforms while the vertex buffer supplies per-vertex data — in the same draw call.',
        hint: 'What is being divided — the data, or the rate of advance?',
      },
    },

    {
      id: 'gl-s-11',
      title: 'Debugging graphics properly',
      read: `Graphics bugs produce wrong pixels, not stack traces. You need different tools.

## RenderDoc

Free, and the single most valuable tool in graphics. Capture a frame and inspect **every** draw call: the exact geometry submitted, every bound texture and buffer, the full pipeline state, uniform values, and the framebuffer contents before and after each call. It even lets you step through a shader for a chosen pixel.

When you cannot work out why a pixel is wrong, RenderDoc tells you.

## The debug callback

\`glDebugMessageCallback\` gives you a function the driver calls with a readable message the moment something is wrong, in the right place. Enable it in debug builds and stop guessing.

## Visual debugging

Output an intermediate value as a colour and *look* at it:

\`\`\`glsl
FragColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);   // normals as RGB
FragColor = vec4(vUV, 0.0, 1.0);                          // UVs
FragColor = vec4(vec3(gl_FragCoord.z), 1.0);              // depth
\`\`\`

Bad normals, flipped UVs and broken depth are all obvious the moment you can see them.

## The common failures

- **Black screen** — shader failed to compile/link; forgot \`glUseProgram\`; wrong VAO; camera inside the geometry; near plane too large
- **Nothing moves** — uniform location is −1; \`glUniform\` called before \`glUseProgram\`
- **Wrong colours** — texture unit mismatch; sRGB not handled
- **Flickering** — z-fighting; depth buffer not cleared
- **Upside-down texture** — forgot \`stbi_set_flip_vertically_on_load\`
- **Slow** — too many draw calls, or an expensive fragment shader at full resolution

## Timer queries

\`glBeginQuery(GL_TIME_ELAPSED, ...)\` measures **GPU** time for a section. CPU-side timers cannot see the GPU, and the two are pipelined — so a CPU timer around your draw calls measures almost nothing useful.`,
      sample: {
        lang: 'cpp',
        caption: 'A debug callback, GPU timer queries, and a visual-debug toggle',
        code: `#include <glad/glad.h>
#include <array>
#include <iostream>

void APIENTRY glDebugOutput(GLenum source, GLenum type, unsigned int id,
                            GLenum severity, GLsizei,
                            const char* message, const void*) {
    if (id == 131169 || id == 131185 || id == 131218 || id == 131204) return;

    std::cerr << "---------------\\n[GL " << id << "] " << message << "\\n";

    switch (source) {
        case GL_DEBUG_SOURCE_API: std::cerr << "Source: API"; break;
        case GL_DEBUG_SOURCE_SHADER_COMPILER: std::cerr << "Source: Shader"; break;
        default: std::cerr << "Source: Other"; break;
    }
    switch (severity) {
        case GL_DEBUG_SEVERITY_HIGH: std::cerr << " | Severity: HIGH\\n"; break;
        case GL_DEBUG_SEVERITY_MEDIUM: std::cerr << " | Severity: medium\\n"; break;
        default: std::cerr << " | Severity: low\\n"; break;
    }
}

class GpuTimer {
public:
    GpuTimer() { glGenQueries(2, queries_.data()); }
    ~GpuTimer() { glDeleteQueries(2, queries_.data()); }

    void begin() { glBeginQuery(GL_TIME_ELAPSED, queries_[current_]); }

    void end() {
        glEndQuery(GL_TIME_ELAPSED);
        // read LAST frame's result so we never stall waiting for the GPU
        const unsigned int other = 1 - current_;
        GLint available = 0;
        glGetQueryObjectiv(other, GL_QUERY_RESULT_AVAILABLE, &available);
        if (available) {
            GLuint64 nanoseconds = 0;
            glGetQueryObjectui64v(queries_[other], GL_QUERY_RESULT, &nanoseconds);
            lastMs_ = static_cast<double>(nanoseconds) / 1'000'000.0;
        }
        current_ = other;
    }

    double lastMilliseconds() const { return lastMs_; }

private:
    std::array<unsigned int, 2> queries_{};
    unsigned int current_ = 0;
    double lastMs_ = 0.0;
};

int main() {
    glfwWindowHint(GLFW_OPENGL_DEBUG_CONTEXT, GLFW_TRUE);
    // ... create window, load GLAD ...

    int flags = 0;
    glGetIntegerv(GL_CONTEXT_FLAGS, &flags);
    if (flags & GL_CONTEXT_FLAG_DEBUG_BIT) {
        glEnable(GL_DEBUG_OUTPUT);
        glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);
        glDebugMessageCallback(glDebugOutput, nullptr);
        glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DONT_CARE,
                              0, nullptr, GL_TRUE);
    }

    GpuTimer sceneTimer;
    GpuTimer postTimer;
    int debugView = 0;      // 0 normal, 1 normals, 2 UVs, 3 depth

    while (running) {
        sceneTimer.begin();
        shader.setInt("uDebugView", debugView);
        drawScene();
        sceneTimer.end();

        postTimer.begin();
        drawPostProcess();
        postTimer.end();

        printf("scene %.2f ms | post %.2f ms\\n",
               sceneTimer.lastMilliseconds(), postTimer.lastMilliseconds());
    }
}`,
        output: `scene 4.82 ms | post 1.14 ms

---------------
[GL 1282] GL_INVALID_OPERATION error generated. Array object is not active.
Source: API | Severity: HIGH

Press F1-F4 to switch debug views:
  F1 normal   F2 normals-as-colour   F3 UVs   F4 depth

A model with flipped UVs shows as a mirrored red/green gradient in F3 —
instantly obvious, where the textured view only looks "slightly off".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a CPU timer around your draw calls a poor way to measure GPU cost?',
        options: [
          'CPU timers are not accurate enough',
          'Draw calls are asynchronous — they queue commands and return immediately, so the CPU timer measures submission, not the GPU work, which happens later',
          'The GPU has no clock',
          'It measures the whole frame instead of one section',
        ],
        answer: 1,
        explain:
          'The CPU and GPU run in parallel with a deep command queue. `glDrawElements` returns long before the GPU has drawn anything. A GPU timer query is inserted into the command stream itself, so it measures the work where it actually happens — and reading last frame\'s result avoids stalling the pipeline to get it.',
        hint: 'What has actually happened by the time `glDrawElements` returns?',
      },
    },

    {
      id: 'gl-s-12',
      title: 'Project: a lit scene with post-processing',
      read: `Everything from this level in one renderer:

- A loaded model plus generated geometry, lit by a directional light, several point lights and a camera-mounted torch
- Diffuse and specular maps driving the material
- The whole scene rendered into an HDR framebuffer
- A post pass applying tone mapping, gamma correction and a switchable effect
- Transparent panels sorted and blended after the opaque pass
- Instanced grass or debris, thousands of blades in one draw call
- Stencil outlines on the selected object
- GPU timers reporting the cost of each pass

The structure to notice:

\`\`\`
renderShadowPass()        (next level)
renderOpaquePass()        -> HDR framebuffer
renderTransparentPass()   -> same framebuffer, sorted, depth-mask off
renderPostProcess()       -> default framebuffer, tone map + gamma
renderUI()                -> on top, no depth
\`\`\`

That pass ordering is what every real renderer looks like. Each pass has one job, sets the state it needs, and restores anything it changed.

> The honest measure of this level: can you add a new effect without breaking the others? If each pass owns its state, yes. If state leaks between passes, you will spend your evenings hunting for the \`glDepthMask\` somebody forgot to restore.`,
      sample: {
        lang: 'cpp',
        caption: 'renderer.cpp — the full multi-pass frame',
        code: `#include "renderer.h"

#include <algorithm>
#include <glm/gtc/matrix_transform.hpp>

void Renderer::renderFrame(const Scene& scene, const Camera& camera,
                           int windowWidth, int windowHeight) {
    const float aspect = static_cast<float>(windowWidth) /
                         static_cast<float>(windowHeight);
    const glm::mat4 view = camera.viewMatrix();
    const glm::mat4 projection = glm::perspective(
        glm::radians(camera.fov()), aspect, 0.1f, 300.0f);

    hdrBuffer_.resize(windowWidth, windowHeight);

    // ======================= PASS 1: opaque, into HDR =======================
    sceneTimer_.begin();
    hdrBuffer_.bind();
    glClearColor(0.02f, 0.03f, 0.06f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT);

    glEnable(GL_DEPTH_TEST);
    glDepthMask(GL_TRUE);
    glDisable(GL_BLEND);
    glEnable(GL_CULL_FACE);

    lightingShader_.use();
    lightingShader_.setMat4("uView", view);
    lightingShader_.setMat4("uProjection", projection);
    lightingShader_.setVec3("uViewPos", camera.position());
    uploadLights(lightingShader_, scene, camera);

    glEnable(GL_STENCIL_TEST);
    glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
    glStencilMask(0x00);                       // most objects write no stencil

    for (std::size_t i = 0; i < scene.objects.size(); ++i) {
        if (static_cast<int>(i) == scene.selectedIndex) continue;
        drawObject(lightingShader_, scene.objects[i]);
    }

    // the selected object also marks the stencil
    if (scene.selectedIndex >= 0) {
        glStencilFunc(GL_ALWAYS, 1, 0xFF);
        glStencilMask(0xFF);
        drawObject(lightingShader_, scene.objects[scene.selectedIndex]);
    }

    // ======================= PASS 2: instanced detail =======================
    instancedShader_.use();
    instancedShader_.setMat4("uView", view);
    instancedShader_.setMat4("uProjection", projection);
    instancedShader_.setFloat("uTime", scene.time);
    glBindVertexArray(grassMesh_.vao());
    glDrawElementsInstanced(GL_TRIANGLES, grassMesh_.indexCount(),
                            GL_UNSIGNED_INT, nullptr, grassCount_);

    // ======================= PASS 3: outline ================================
    if (scene.selectedIndex >= 0) {
        glStencilFunc(GL_NOTEQUAL, 1, 0xFF);
        glStencilMask(0x00);
        glDisable(GL_DEPTH_TEST);

        outlineShader_.use();
        outlineShader_.setMat4("uView", view);
        outlineShader_.setMat4("uProjection", projection);
        outlineShader_.setVec3("uColour", 1.0f, 0.65f, 0.1f);

        glm::mat4 model = modelMatrix(scene.objects[scene.selectedIndex]);
        model = glm::scale(model, glm::vec3(1.05f));
        outlineShader_.setMat4("uModel", model);
        meshFor(scene.objects[scene.selectedIndex]).draw();

        glEnable(GL_DEPTH_TEST);
        glStencilMask(0xFF);
    }
    glDisable(GL_STENCIL_TEST);

    // ======================= PASS 4: transparent ============================
    std::vector<const TransparentPanel*> sorted;
    sorted.reserve(scene.panels.size());
    for (const auto& panel : scene.panels) sorted.push_back(&panel);

    const glm::vec3 eye = camera.position();
    std::sort(sorted.begin(), sorted.end(),
              [&eye](const TransparentPanel* a, const TransparentPanel* b) {
                  return glm::dot(a->position - eye, a->position - eye) >
                         glm::dot(b->position - eye, b->position - eye);
              });

    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glDepthMask(GL_FALSE);
    glDisable(GL_CULL_FACE);                   // see both sides of glass

    glassShader_.use();
    glassShader_.setMat4("uView", view);
    glassShader_.setMat4("uProjection", projection);
    for (const TransparentPanel* panel : sorted) {
        glassShader_.setMat4("uModel", modelMatrix(*panel));
        glassShader_.setVec4("uColour", panel->colour.r, panel->colour.g,
                             panel->colour.b, panel->alpha);
        quadMesh_.draw();
    }

    glDepthMask(GL_TRUE);                      // restore, every time
    glDisable(GL_BLEND);
    glEnable(GL_CULL_FACE);
    sceneTimer_.end();

    // ======================= PASS 5: post-processing ========================
    postTimer_.begin();
    Framebuffer::bindDefault(windowWidth, windowHeight);
    glClear(GL_COLOR_BUFFER_BIT);
    glDisable(GL_DEPTH_TEST);                  // a full-screen quad needs none

    postShader_.use();
    postShader_.setInt("uScene", 0);
    postShader_.setInt("uEffect", effect_);
    postShader_.setFloat("uExposure", exposure_);
    postShader_.setVec2("uTexelSize", 1.0f / windowWidth, 1.0f / windowHeight);

    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, hdrBuffer_.colourTexture());
    fullScreenQuad_.draw();

    glEnable(GL_DEPTH_TEST);                   // restore for the next frame
    postTimer_.end();
}`,
        output: `scene 5.91 ms | post 0.87 ms | 1420 draw calls -> 6 after instancing

(a lit interior: a loaded model on a grid floor, four coloured point
 lights, a torch that follows the camera, 40,000 blades of instanced
 grass swaying on a sine wave, three panes of tinted glass you can see
 through in the correct order, and an orange outline on the crate you
 have selected — with tone mapping making the bright lights bloom
 gently rather than clip to white)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Each pass restores `glDepthMask`, `GL_BLEND` and `GL_CULL_FACE` before it finishes. Why is that discipline worth the extra lines?',
        options: [
          'OpenGL resets state automatically anyway',
          'State is global and persists across passes and frames, so a pass that leaves it changed silently breaks a different, unrelated pass — usually the one someone adds next week',
          'It makes the code shorter',
          'Because the driver requires it',
        ],
        answer: 1,
        explain:
          'OpenGL is one big global state machine with no scoping. A `glDepthMask(GL_FALSE)` left on by the transparency pass makes the *next frame\'s* opaque pass write no depth, producing a bug that appears in code you did not touch. Treating each pass as responsible for restoring what it changed is the only way a multi-pass renderer stays maintainable.',
        hint: 'What happens on the next frame, in a pass you did not edit?',
      },
    },
  ],
}

export default level
