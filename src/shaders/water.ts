export const waterVertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uWaterLevel;
uniform float uTrackHalfWidth;
uniform float uTrackFalloff;
uniform vec2  uCamXZ;

varying vec3  vWorldPos;
varying vec3  vNrm;
varying float vHeight;
varying float vDamp;
varying vec4  vScreenPos;

const float TAU = 6.283185307179586;

/**
 * One Gerstner wave. Displacement follows the usual circular-orbit form;
 * the normal is accumulated analytically (GPU Gems 1, ch. 1) so we never pay
 * for finite differences or a normal pass.
 */
void addWave(
  in vec2 p, in vec2 dir, in float amp, in float len,
  in float speed, in float steep, in float t,
  inout vec3 disp, inout vec3 nrm
) {
  float k = TAU / len;
  float phi = k * dot(dir, p) - speed * k * t;
  float s = sin(phi);
  float c = cos(phi);
  float wa = k * amp;

  disp.x += steep * amp * dir.x * c;
  disp.z += steep * amp * dir.y * c;
  disp.y += amp * s;

  nrm.x -= dir.x * wa * c;
  nrm.z -= dir.y * wa * c;
  nrm.y -= steep * wa * s;
}

void main() {
  vec2 xz = vec2(position.x, position.z);

  // Flat under the track, ramping to full chop out at sea.
  float damp = smoothstep(uTrackHalfWidth, uTrackHalfWidth + uTrackFalloff, abs(xz.x));

  // Poor man's LOD: drop the short wavelengths once the mesh is too coarse
  // to resolve them, which is also where the fog takes over anyway.
  float detail = 1.0 - smoothstep(4.0, 18.0, distance(xz, uCamXZ));

  float a = uAmp * damp;

  vec3 disp = vec3(0.0);
  vec3 nrm = vec3(0.0, 1.0, 0.0);

  addWave(xz, normalize(vec2( 0.00, 1.00)), a * 0.40,           2.40, 0.60, 0.46, uTime, disp, nrm);
  addWave(xz, normalize(vec2( 0.42, 0.91)), a * 0.27,           1.25, 0.76, 0.52, uTime, disp, nrm);
  addWave(xz, normalize(vec2(-0.55, 0.83)), a * 0.19,           0.68, 0.94, 0.56, uTime, disp, nrm);
  addWave(xz, normalize(vec2( 0.82, 0.57)), a * 0.10 * detail,  0.36, 1.22, 0.58, uTime, disp, nrm);
  addWave(xz, normalize(vec2(-0.88, 0.47)), a * 0.06 * detail,  0.18, 1.55, 0.60, uTime, disp, nrm);

  vec3 displaced = vec3(xz.x + disp.x, uWaterLevel + disp.y, xz.y + disp.z);
  vec4 world = modelMatrix * vec4(displaced, 1.0);

  vWorldPos = world.xyz;
  vNrm      = normalize(nrm);
  vHeight   = disp.y / max(uAmp, 1e-4);
  vDamp     = damp;

  vec4 clipPos = projectionMatrix * viewMatrix * world;

  vScreenPos = clipPos;
  gl_Position = clipPos;
}
`;

export const waterFragmentShader = /* glsl */ `
uniform vec3  uCamPos;
uniform vec3  uSunPos;
uniform vec3  uDeep;
uniform vec3  uShallow;
uniform vec3  uNeonA;
uniform vec3  uNeonB;
uniform vec3  uSunColor;
uniform vec3  uSunGlow;
uniform vec3  uTrackColor;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogPow;
uniform float uFogGlowExp;
uniform float uFogGlowStrength;
uniform float uTrackHalfWidth;
uniform float uTime;
uniform sampler2D uReflection;
uniform float uReflectionStrength;
uniform float uReflectionDistort;

varying vec3  vWorldPos;
varying vec3  vNrm;
varying float vHeight;
varying float vDamp;
varying vec4  vScreenPos;

void main() {
  vec3  n     = normalize(vNrm);
  vec3  toCam = uCamPos - vWorldPos;
  float dist  = length(toCam);
  vec3  v     = toCam / dist;

  float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.5);

  vec3  l   = normalize(uSunPos - vWorldPos);
  vec3  h   = normalize(l + v);
  float ndh = max(dot(n, h), 0.0);

  // Troughs read deep and cold, crests catch a little more light.
  vec3 col = mix(uDeep, uShallow, clamp(vHeight * 0.5 + 0.5, 0.0, 1.0));

  // Grazing angles mirror the world. The mirror pass used this same
  // projection, so a point on the surface lands at the same screen position in
  // both — which makes screen coordinates the correct lookup. The wave normal
  // then bends that lookup so the image ripples with the surface rather than
  // sitting on it like a decal.
  vec2 screenUv = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;

  // Distortion has to fall off hard with distance. The camera sits barely
  // above a huge plane, so by the horizon the whole upper hemisphere is
  // squeezed into a few pixels and a fixed screen-space offset there smears
  // the sun across half the sea.
  float rippleFade = 1.0 / (1.0 + dist * 0.6);
  screenUv += n.xz * uReflectionDistort * rippleFade;

  vec3 mirror = texture2D(uReflection, clamp(screenUv, 0.002, 0.998)).rgb;
  col = mix(col, mirror, fresnel * uReflectionStrength);

  // The sun's glitter path down the middle of the frame: a broad sheen with a
  // tight sparkle riding on top of it.
  col += uSunColor * pow(ndh, 55.0) * 0.9;
  col += vec3(1.0, 0.92, 0.88) * pow(ndh, 260.0) * 1.6;

  // Neon rims on the crests, drifting between the two accent hues.
  float crest = smoothstep(0.35, 0.95, vHeight) * vDamp;
  vec3  neon  = mix(uNeonA, uNeonB, 0.5 + 0.5 * sin(vWorldPos.x * 0.75 - uTime * 0.3));
  col += neon * crest * 0.3 * (0.35 + 0.65 * fresnel);

  // Light spilling off the track's neon rails onto the water beside it.
  float edge = max(abs(vWorldPos.x) - uTrackHalfWidth, 0.0);
  col += uTrackColor * exp(-edge * 3.0) * (0.12 + 0.4 * crest);

  // Aerial perspective: fog picks up the sun's glow when you look toward it.
  float sunAlign = max(dot(-v, normalize(uSunPos - uCamPos)), 0.0);
  vec3  fogCol   = uFogColor + uSunGlow * pow(sunAlign, uFogGlowExp) * uFogGlowStrength;

  float fog = pow(clamp((dist - uFogNear) / max(uFogFar - uFogNear, 1e-4), 0.0, 1.0), uFogPow);
  col = mix(col, fogCol, fog);

  gl_FragColor = vec4(col, 1.0);
}
`;
