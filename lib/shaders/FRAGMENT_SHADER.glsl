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

@define PI 3.141592653589

vec3 weight(float a) {
    vec3 s = max(abs(2.0 * PI * vec3(a - 1.5, a - 0.5, a + 0.5)), 1e-5);
    return sin(s) * sin(s / 3.0) / (s * s);
}

vec3 lum(sampler2D tex, vec3 x1, vec3 x2, float y, vec3 y1, vec3 y2)
{
    return mat3(
        texture(tex, vec2(x1.r, y)).rgb, 
        texture(tex, vec2(x1.g, y)).rgb, 
        texture(tex, vec2(x1.b, y)).rgb
    ) * y1 +
    mat3(
        texture(tex, vec2(x2.r, y)).rgb, 
        texture(tex, vec2(x2.g, y)).rgb, 
        texture(tex, vec2(x2.b, y)).rgb
    ) * y2;
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

    vec3 x = x1 + x2;
    float xsum = x.x + x.y + x.z;
    vec3 y = y1 + y2;
    float ysum = y.x + y.y + y.z ;
    
    x1 /= xsum;
    x2 /= xsum;
    y1 /= ysum;
    y2 /= ysum;
    
    vec2 pos = (-0.5 - f) * stp + uv;
    
    vec3 px1 = vec3(pos.x - stp.x * 2.0, pos.x, pos.x + stp.x * 2.0);
    vec3 px2 = vec3(pos.x - stp.x, pos.x + stp.x, pos.x + stp.x * 3.0);

    vec3 py1 = vec3(pos.y - stp.y * 2.0, pos.y, pos.y + stp.y * 2.0);
    vec3 py2 = vec3(pos.y - stp.y, pos.y + stp.y, pos.y + stp.y * 3.0);

    

    return
        lum(tex, px1, px2, py1.x, y1, y2) * x1.x +
        lum(tex, px1, px2, py1.y, y1, y2) * x1.y +
        lum(tex, px1, px2, py1.z, y1, y2) * x1.z +
        lum(tex, px1, px2, py2.x, y1, y2) * x2.x +
        lum(tex, px1, px2, py2.y, y1, y2) * x2.y +
        lum(tex, px1, px2, py2.z, y1, y2) * x2.z;
}

@define GAMMA 1.11
void main() {
    // outColor = texture(u_image, v_texCoord);
    outColor = vec4(lanczos(u_image, v_texCoord), 1.0);

    // apply gamma correction
    // outColor.rgb = pow(outColor.rgb, vec3(1.0/GAMMA));
}
