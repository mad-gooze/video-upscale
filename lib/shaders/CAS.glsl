#version 300 es

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 outColor;

float luma(vec3 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

vec4 CAS(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));
    vec4 col = texture(tex, coord);

    float max_l = col.g;
    float min_l = col.g;
    float l;
    vec4 offset = vec4(1, 0, 1, -1) / texSize.xxyy;
    vec3 colw;

    vec3 col1 = texture(tex, coord + offset.yw).rgb;
    vec3 min_sample = col1;
	vec3 max_sample = col1;
    l = luma(col1);
    max_l = max(max_l, l);
    min_l = min(min_l, l);
    colw = col1;

    col1 = texture(tex, coord + offset.xy).rgb;
    min_sample = min(min_sample, col1);
    max_sample = max(max_sample, col1);
    l = luma(col1);
    max_l = max(max_l, l);
    min_l = min(min_l, l);
    colw += col1;

    col1 = texture(tex, coord + offset.yz).rgb;
    min_sample = min(min_sample, col1);
    max_sample = max(max_sample, col1);
    l = luma(col1);
    max_l = max(max_l, l);
    min_l = min(min_l, l);
    colw += col1;

    col1 = texture(tex, coord - offset.xy).rgb;
    min_sample = min(min_sample, col1);
    max_sample = max(max_sample, col1);
    l = luma(col1);
    max_l = max(max_l, l);
    min_l = min(min_l, l);
    colw += col1;

    float d_min_l = min_l;
    float d_max_l = 1.0 - max_l;
    float A;
    max_l = max(0.0, max_l); 
    if (d_max_l < d_min_l) {
        A = d_max_l / max_l;
    } else {
        A = d_min_l / max_l;
    }
    A = -0.2 * max(sqrt(A), 0.0);

    vec3 color = (col.rgb + colw * A) / (1.+4.*A);
    return vec4(color, col.a);
}

void main() {
    outColor = CAS(u_image, v_texCoord);
}
