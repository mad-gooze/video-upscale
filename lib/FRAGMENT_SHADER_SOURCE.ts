export const FRAGMENT_SHADER_SOURCE = `
#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

#define M_PI 3.1415926535897932384626433832795

vec3 weight(float a) {
    vec3 s = max(abs(2.0 * M_PI * vec3(a - 1.5, a - 0.5, a + 0.5)), 1e-5);
    return sin(s) * sin(s / 3.0) / (s * s);
}

vec3 lum(sampler2D tex, vec3 x1, vec3 x2, float y, vec3 y1, vec3 y2)
{
    #define TEX(a) texture(tex, vec2(a, y)).rgb

    return
        mat3(TEX(x1.r), TEX(x1.g), TEX(x1.b)) * y1 +
        mat3(TEX(x2.r), TEX(x2.g), TEX(x2.b)) * y2;
}

vec3 lanczos(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));
    vec2 stp = 1.0 / texSize;
    vec2 uv = coord + stp * 0.5;
    vec2 f = fract(uv / stp);

    vec3 y1 = weight(0.5 - f.x * 0.5);
    vec3 y2 = weight(1.0 - f.x * 0.5);
    vec3 x1 = weight(0.5 - f.y * 0.5);
    vec3 x2 = weight(1.0 - f.y * 0.5);

    const vec3 one = vec3(1.0);
    float xsum = dot(x1, one) + dot(x2, one);
    float ysum = dot(y1, one) + dot(y2, one);
    
    x1 /= xsum;
    x2 /= xsum;
    y1 /= ysum;
    y2 /= ysum;
    
    vec2 pos = (-0.5 - f) * stp + uv;
    
    vec3 px1 = vec3(pos.x - stp.x * 2.0, pos.x, pos.x + stp.x * 2.0);
    vec3 px2 = vec3(pos.x - stp.x, pos.x + stp.x, pos.x + stp.x * 3.0);

    vec3 py1 = vec3(pos.y - stp.y * 2.0, pos.y, pos.y + stp.y * 2.0);
    vec3 py2 = vec3(pos.y - stp.y, pos.y + stp.y, pos.y + stp.y * 3.0);

    #define LUM(a) lum(tex, px1, px2, a, y1, y2)

    return
        LUM(py1.r) * x1.r +
        LUM(py1.g) * x1.g +
        LUM(py1.b) * x1.b +
        LUM(py2.r) * x2.r +
        LUM(py2.g) * x2.g +
        LUM(py2.b) * x2.b;
}

void main() {
    outColor = vec4(lanczos(u_image, v_texCoord), 1.0);
}
`;
