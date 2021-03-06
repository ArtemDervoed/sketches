// Based on https://www.youtube.com/watch?v=vlD_KOrzGDc                                                                                                                                                                                       
 
precision highp float; 
 
uniform vec2 u_resolution; 
uniform vec2 u_mouse; 
uniform float u_time; 
 
#define S(a, b, t)smoothstep(a, b, t)
#define sat(x)clamp(x, 0.0, 1.0)
 
float remap01(float a, float b, float t) { 
    return sat((t - a) / (b - a));
} 
 
float remap(float a, float b, float c, float d, float t) { 
    return remap01(a, b, t) * (d - c) + c;
} 
 
vec2 within(vec2 uv, vec4 rect) { 
    return (uv - rect.xy) / (rect.zw - rect.xy);
} 
 
vec4 Brow(vec2 uv, float smile) { 
    float offs = mix(0.2, 0.0, smile);
    uv.y += offs;
    float y = uv.y;
    uv.y += uv.x * mix(0.5, 0.8, smile) - mix(0.1, 0.3, smile);
    uv.x -= mix(0.0, 0.1, smile);
    uv -= 0.5;
    
    vec4 col = vec4(0.0);
    
    float blur = 0.1;
    
    float d1 = length(uv);
    float s1 = S(0.45, 0.45 - blur, d1);
    float d2 = length(uv - vec2(0.1, - 0.2) * 0.7);
    float s2 = S(0.5, 0.5 - blur, d2);
    
    float browMask = sat(s1 - s2);
    
    float colMask = remap01(0.7, 0.8, y) * 0.75;
    colMask *= S(0.6, 0.9, browMask);
    colMask *= (smile);
    vec4 browCol = mix(vec4(0.4, 0.2, 0.2, 1.0), vec4(1.0, 0.75, 0.5, 1.0), colMask);
    
    uv.y += 0.15 - offs * 0.5;
    blur += mix(0.0, 0.1, smile);
    d1 = length(uv);
    s1 = S(0.45, 0.45 - blur, d1);
    d2 = length(uv - vec2(0.1, - 0.2) * 0.7);
    s2 = S(0.5, 0.5 - blur, d2);
    float shadowMask = sat(s1 - s2);
    
    col = mix(col, vec4(0.0, 0.0, 0.0, 1.0), S(0.0, 1.0, shadowMask) * 0.2);
    
    col = mix(col, browCol, S(0.2, 0.4, browMask));
    return col;
} 
 
vec4 Eye(vec2 uv, float side, vec2 m, float smile) { 
    uv -= 0.5;
    
    uv.x *= side;
    
    float d = length(uv);
    
    vec4 irisCol = vec4(0.3, 0.5, 1.0, 1.0);
    vec4 col = mix(vec4(1.0), irisCol, S(0.1, 0.7, d) * 0.5);
    col.a = S(0.5, 0.48, d);
    
    col.rgb *= 1.0 - S(0.45, 0.5, d) * 0.5 * sat(-uv.y - uv.x * side);
    
    m *= 0.3;
    m.x *= -1.0;
    d = length(uv + m);
    
    col.rgb = mix(col.rgb, vec3(0.0), S(0.3, 0.28, d)); // iris out
    
    irisCol.rgb *= 1.0 + S(0.3, 0.05, d);
    float irisMask = S(0.28, 0.25, d);
    col.rgb = mix(col.rgb, irisCol.rgb, irisMask);
    
    d = length(uv + m*1.3);
    float pupilSize = mix(0.3, 0.20, smile);
    float pupilMask = S(pupilSize, pupilSize - 0.02, d);
    pupilMask *= irisMask;
    col.rgb = mix(col.rgb, vec3(0.0), pupilMask);
    
    float t = u_time * 3.0;
    vec2 offs = vec2(sin(t + uv.y * 25.0), sin(t + uv.x * 25.0));
    offs *= 0.01 * (1.0 - smile);
    uv += offs;
    
    float highlight = S(0.1, 0.09, length(uv - vec2(-0.15, 0.15)));
    highlight += S(0.07, 0.05, length(uv + vec2(-0.08, 0.08)));
    col.rgb = mix(col.rgb, vec3(1.0), highlight * 0.90);
    
    return col;
} 
 
vec4 Mouth(vec2 uv, float smile) { 
    uv -= 0.5;
    vec4 col = vec4(0.5, 0.18, 0.05, 1.0);
    
    uv.y *= 1.5;
    uv.y -= uv.x * uv.x * 2.0 * smile;
    
    uv.x *= mix(2.0, 1.0, smile);
    
    float d = length(uv);
    
    col.a = S(0.5, 0.48, d);
    
    vec2 tUv = uv;
    tUv.y += (abs(tUv.x) * 0.5 + 0.1) * (1.0 - smile);
    float td = length(tUv - vec2(0.0, 0.6));
    vec3 toothCol = vec3(1.0) * S(0.6, 0.35, d);
    col.rgb = mix(col.rgb, toothCol, S(0.4, 0.37, td));
    
    td = length(uv + vec2(0.0, 0.5));
    col.rgb = mix(col.rgb, vec3(1.0, 0.5, 0.5), S(0.5, 0.2, td));
    return col;
} 
 
vec4 Head(vec2 uv) { 
    vec4 col = vec4(0.9, 0.65, 0.1, 1.0);
    
    float d = length(uv);
    
    col.a = S(0.5, 0.49, d);
    
    float edgeShade = remap01(0.35, 0.5, d);
    edgeShade *= edgeShade;
    
    col.rgb *= 1.0 - edgeShade * 0.5;
    
    col.rgb = mix(col.rgb, vec3(0.6, 0.3, 0.1), S(0.47, 0.48, d));
    
    float highlight = S(0.41, 0.405, d);
    highlight *= remap(0.41, 0.0, 0.75, 0.0, uv.y);
    highlight *= S(0.18, 0.19, length(uv - vec2(0.21, 0.075)));
    col.rgb = mix(col.rgb , vec3(1.0), highlight);
    
    d = length(uv - vec2(0.25, - 0.2));
    float cheek = S(0.2, 0.01, d) * 0.4;
    cheek *= S(0.17, 0.16, d);
    col.rgb = mix(col.rgb, vec3(1.0, 0.1, 0.1), cheek);
    
    return col;
} 
 
vec4 Smiley(vec2 uv, vec2 m, float smile) { 
    vec4 col = vec4(0.0);
    
    float side = sign(uv.x);
    uv.x = abs(uv.x);
    vec4 head = Head(uv);
    vec4 eye = Eye(within(uv, vec4(0.03, - 0.1, 0.37, 0.25)), side, m, smile);
    vec4 mouth = Mouth(within(uv, vec4(-0.3, - 0.43, 0.3, - 0.13)), smile);
    vec4 brow = Brow(within(uv, vec4(0.03, 0.2, 0.4, 0.45)), smile);
    
    col = mix(col, head, head.a);
    col = mix(col, eye, eye.a);
    col = mix(col, mouth, mouth.a);
    col = mix(col, brow, brow.a);
    
    return col;
} 
 
void main() { 
    
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv -= 0.5;
    
    uv.x *= u_resolution.x / u_resolution.y;
    
    vec2 m = u_mouse.xy / u_resolution.xy;
    m -= 0.5;
    
    uv -= m*(0.25 - dot(uv, uv));
    
    float smile = sin(u_time) * 0.5 + 0.5;
    gl_FragColor = Smiley(uv, m, smile);
} 
