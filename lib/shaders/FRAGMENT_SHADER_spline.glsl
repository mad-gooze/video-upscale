#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

@define PI 3.141592653589

// our texture
uniform sampler2D u_image;

// b_spline
// const float B = 1.0;
// const float C = 0.0;

// catmull_rom_spline
const float B = 0.0;
const float C = 0.5;

// mitchell_netravali
// const float B = 1.0 / 3.0;
// const float C = 1.0 / 3.0;

float mn_weight(float x) {
    float ax = abs(x);
    if (ax < 1.0) {
        return ((12.0 - 9.0 * B - 6.0 * C) * ax * ax * ax
            + (-18.0 + 12.0 * B + 6.0 * C) * ax * ax
            + (6.0 - 2.0 * B)) / 6.0;
    } else if (ax < 2.0) {
	    return ((-B - 6.0 * C) * ax * ax * ax 
            + (6.0 * B + 30.0 * C) * ax * ax
            + (-12.0 * B - 48.0 * C) * ax
            + (8.0 * B + 24.0 * C)) / 6.0;
    } else {
	    return 0.0;
    }
}

vec4 cubic_filter(float d, vec4 c0, vec4 c1, vec4 c2, vec4 c3) {
    return mn_weight(d + 1.0) * c0
         + mn_weight(d      ) * c1
         + mn_weight(1.0 - d) * c2
         + mn_weight(2.0 - d) * c3;
}

vec4 texture_cubic(sampler2D tex, vec2 coord) {        
    float x[4], y[4];

    vec2 texSize = vec2(textureSize(tex, 0));

    x[1] = floor((coord.x - 1.0 / texSize.x / 2.0) * texSize.x) / texSize.x + 1.0 / texSize.x / 2.0;
    y[1] = floor((coord.y - 1.0 / texSize.y / 2.0) * texSize.y) / texSize.y + 1.0 / texSize.y / 2.0;
    x[0] = x[1] - 1.0 / texSize.x;
    y[0] = y[1] - 1.0 / texSize.y;
    x[2] = x[1] + 1.0 / texSize.x;
    y[2] = y[1] + 1.0 / texSize.y;
    x[3] = x[2] + 1.0 / texSize.x;
    y[3] = y[2] + 1.0 / texSize.y;

    float dx = (coord.x - x[1]) * texSize.x;
    float dy = (coord.y - y[1]) * texSize.y;

    vec4 c[4];
    for (int i = 0; i < 4; i++) {
        c[i] = cubic_filter(dy, 
            texture(tex, vec2(x[i], y[0])),
            texture(tex, vec2(x[i], y[1])),
            texture(tex, vec2(x[i], y[2])),
            texture(tex, vec2(x[i], y[3])));
    }
    return cubic_filter(dx, c[0], c[1], c[2], c[3]);
}

@define GAMMA 1.11
void main() {
    outColor = texture_cubic(u_image, v_texCoord);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}