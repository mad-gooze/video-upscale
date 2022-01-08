uniform float shockMagnitude;
uniform int2 destSize;
sampler2D Image;
const float4 ones = float4(1.0, 1.0, 1.0, 1.0);

float4 ps_main(float4 inTex : TEXCOORD0) : COLOR0 {
    float3 inc = float3(1.0 / destSize, 0.0); // could be a uniform      
    float4 curCol = tex2D(Image, inTex);
    float4 upCol = tex2D(Image, inTex + inc.zy);
    float4 downCol = tex2D(Image, inTex - inc.zy);
    float4 rightCol = tex2D(Image, inTex + inc.xz);
    float4 leftCol = tex2D(Image, inTex - inc.xz);
    float4 Convexity = 4.0 * curCol - rightCol - leftCol - upCol - downCol;
    float2 diffusion = float2(dot((rightCol - leftCol) * Convexity, ones), dot((upCol - downCol) * Convexity, ones));
    diffusion *= shockMagnitude / (length(diffusion) + 0.00001);
    curCol += (diffusion.x > 0 ? diffusion.x * rightCol : - diffusion.x * leftCol) + (diffusion.y > 0 ? diffusion.y * upCol : - diffusion.y * downCol);
    return curCol / (1 + dot(abs(diffusion), ones.xy));
}