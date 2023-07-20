const shade_round = [[0.0, 0.5], [0.2, 0.0], [0.5, 0.0], [0.75, 0.5], [1.0, 1.0]]
const shade_round_shiny = [[0.0, 0.5], [0.1, 0.0], [0.1, 0.3], [0.3, 0], [0.4, 0], [0.6, 1], [0.8, 0.3], [0.9, 0], [1.0, 1.0]]
const shade_hex = [
    [0.00, 0.2], [0.25, 0.5],
    [0.25, 0.0], [0.50, 0.0],
    [0.50, 0.8], [0.75, 0.2],
    [0.75, 1.0], [1.00, 0.5]]
const shade_point = [
    [0.0, 0.4], [0.2, 0.1], [0.5, 0.0],
    [0.5, 0.6], [0.8, 0.2], [1.0, 0.6],
]
const shade_flat = [
    [0.0, 1.0],
    [0.25, 1.0],
    [0.5, 1.0],
    [0.8, 1.0],
    [0.9, 1.0],
    [1.0, 1.0]
]

const allShades = [shade_point]

function getShadeAtAngle(shadeStyle, angle, shadeSteps = false) {
    angle = angle % 360
    if (angle < 0) angle += 360
    if (angle > 180) angle = 360 - angle
    const t = map(angle, 180, 0, 0, 1)
    let v = getShadeAtVal(shadeStyle, t)
    if (shadeSteps) v = round(v * shadeSteps) / shadeSteps
    return v
}
function getShadeAtVal(shadeStyle, t) {
    for (let i = 0; i < shadeStyle.length - 1; i++) {
        const posS = shadeStyle[i][0]
        const posE = shadeStyle[i + 1][0]
        const valS = shadeStyle[i][1]
        const valE = shadeStyle[i + 1][1]

        if (t >= posS && t <= posE) {
            return lerp(valS, valE, (t - posS) / (posE - posS))
        }
    }
    return -1
}



let shaderGraphics
let sketchShaders = {}
function applyShader(fragment, uniforms = {}) {
    if (!shaderGraphics) {
        shaderGraphics = createGraphics(width, height, WEBGL)
        shaderGraphics.noStroke()
    }
    if (!(fragment.name in sketchShaders))
        sketchShaders[fragment.name] = shaderGraphics.createShader(BasicVertexShader, fragment.code)

    shaderGraphics.clear()
    shaderGraphics.shader(sketchShaders[fragment.name])
    sketchShaders[fragment.name].setUniform('uTexture', get())
    sketchShaders[fragment.name].setUniform('uResolution', [width, height])
    for (const key in uniforms)
    sketchShaders[fragment.name].setUniform(key, uniforms[key])

    shaderGraphics.rect(0, 0, width, height)
    push()
    resetMatrix()
    copy(shaderGraphics, 0, 0, width, height, 0, 0, width, height)
    pop()
}



BasicVertexShader = `
    attribute vec3 aPosition;
    attribute vec2 aTexCoord;
    varying vec2 vTexCoord;

    void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    positionVec4.y *= -1.0;
    gl_Position = positionVec4;
    }`,

    BasicFragmentShader = `
    precision mediump float;
    varying vec2 vTexCoord;

    uniform sampler2D uTexture;
    uniform vec2 uResolution;

    void main() {
        vec4 texColor = texture2D(uTexture, vTexCoord);
        gl_FragColor = texColor;
    }`

const shaderNoise = `
    uniform vec2 noiseOffset;
    vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float cnoise(vec2 P){
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x,gy.x);
        vec2 g10 = vec2(gx.y,gy.y);
        vec2 g01 = vec2(gx.z,gy.z);
        vec2 g11 = vec2(gx.w,gy.w);
        vec4 norm = 1.79284291400159 - 0.85373472095314 * 
            vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
        g00 *= norm.x;
        g01 *= norm.y;
        g10 *= norm.z;
        g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
    }`

function createFragment(name, main, uniforms = '', props = {}) {
    const code = `precision mediump float;
            varying vec2 vTexCoord;

            uniform sampler2D uTexture;
            uniform vec2 uResolution;

            ${props.mask ? 'uniform sampler2D mask;' : ''}
            ${uniforms}

            ${props.noise ? shaderNoise : ''}

            ${props.func || ''}

            void main() {
                ${props.mask ? 'vec4 maskColor = texture2D(mask, vTexCoord); if (maskColor.a == 0.0) discard;' : ''}
                vec4 texColor = texture2D(uTexture, vTexCoord);

                ${main || ''}

                gl_FragColor = texColor;
                } `
    return { name, code }
}