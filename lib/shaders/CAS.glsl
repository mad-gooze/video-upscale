#version 300 es

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 outColor;

vec4 CAS(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));
    vec4 col = texture(tex, coord);

    float max_g = col.g;
    float min_g = col.g;
    vec4 offset = vec4(1, 0, 1, -1) / texSize.xxyy;
    vec3 colw;
    vec3 col1 = texture(tex, coord + offset.yw).rgb;
    max_g = max(max_g, col1.g);
    min_g = min(min_g, col1.g);
    colw = col1;
    col1 = texture(tex, coord + offset.xy).rgb;
    max_g = max(max_g, col1.g);
    min_g = min(min_g, col1.g);
    colw += col1;
    col1 = texture(tex, coord + offset.yz).rgb;
    max_g = max(max_g, col1.g);
    min_g = min(min_g, col1.g);
    colw += col1;
    col1 = texture(tex, coord - offset.xy).rgb;
    max_g = max(max_g, col1.g);
    min_g = min(min_g, col1.g);
    colw += col1;
    float d_min_g = min_g;
    float d_max_g = 1.0 - max_g;
    float A;
    max_g = max(0.0, max_g); 
    if (d_max_g < d_min_g) {
        A = d_max_g / max_g;
    } else {
        A = d_min_g / max_g;
    }
    A = -0.2 * max(sqrt(A), 0.0);

    vec3 color = (col.rgb + colw * A) / (1.+4.*A);
    return vec4(color, col.a);
}

void main() {
    outColor = CAS(u_image, v_texCoord);
}
