export const skyVertexShader = /* glsl */ `
varying vec3 vDir;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const skyFragmentShader = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3  uSunGlow;
uniform vec3  uSunDir;
uniform float uGlowExp;
uniform float uGlowCoreExp;
uniform float uGlowStrength;
uniform float uSunCosInner;
uniform float uSunCosOuter;

varying vec3 vDir;

void main() {
  // Shaded by view direction rather than UV, so the gradient stays anchored to
  // the true horizon no matter where the backdrop plane sits.
  vec3  dir = normalize(vDir);
  float up  = clamp(dir.y, 0.0, 1.0);

  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.16, up));
  col = mix(col, uZenith, smoothstep(0.10, 0.55, up));

  // A broad wash with a tighter core riding on top of it.
  float sunAlign = max(dot(dir, normalize(uSunDir)), 0.0);
  vec3  glow = uSunGlow * pow(sunAlign, uGlowExp) * uGlowStrength;
  glow += uSunGlow * pow(sunAlign, uGlowCoreExp) * uGlowStrength * 0.82;

  // Both terms peak at the sun's centre, so left alone they burn through the
  // gaps between the bands and read as an orb floating inside the disc. The
  // glow is light scattered *around* the sun — the disc is what emits it, not
  // a window onto it — so cut it wherever the disc covers the sky.
  float behindDisc = smoothstep(uSunCosOuter, uSunCosInner, sunAlign);
  col += glow * (1.0 - behindDisc);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const starVertexShader = /* glsl */ `
attribute float aSize;
attribute float aPhase;

uniform float uTime;
uniform float uPixelRatio;

varying float vTwinkle;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);

  // Stars belong to the sky, so cull anything below the horizon outright
  // rather than trusting the sea to depth-test it away — that only holds while
  // the field sits further out than the water does.
  vec3  dir   = normalize(world.xyz - cameraPosition);
  float above = smoothstep(0.0, 0.012, dir.y);

  vTwinkle = (0.55 + 0.45 * sin(uTime * 1.6 + aPhase)) * above;
  gl_PointSize = aSize * uPixelRatio * above;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const starFragmentShader = /* glsl */ `
uniform vec3 uColor;

varying float vTwinkle;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(uColor * vTwinkle, a * vTwinkle);
}
`;
