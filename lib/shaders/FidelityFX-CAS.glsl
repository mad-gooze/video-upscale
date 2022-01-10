#version 300 es

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 outColor;

vec3 flidelityFX_CAS(sampler2D tex, vec2 coord) {
    vec2 texSize = vec2(textureSize(tex, 0));

    vec3 col = texture(tex, coord).rgb;

    // CAS algorithm
    float max_g = col.y;
    float min_g = col.y;
    vec4 offset = vec4(1, 0, 1, -1) / texSize.xxyy;
    vec3 colw;
    vec3 col1 = texture(tex, coord + offset.yw).rgb;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw = col1;
    col1 = texture(tex, coord + offset.xy).rgb;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = texture(tex, coord + offset.yz).rgb;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
    colw += col1;
    col1 = texture(tex, coord - offset.xy).rgb;
    max_g = max(max_g, col1.y);
    min_g = min(min_g, col1.y);
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

    vec3 color = (col + colw * A) / (1.+4.*A);
    return color;
}


@define GAMMA 1.11
void main() {
    outColor = vec4(flidelityFX_CAS(u_image, v_texCoord), 1.0);
    // outColor = texture(u_image, v_texCoord);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}
