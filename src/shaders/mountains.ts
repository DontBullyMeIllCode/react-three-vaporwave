export const mountainsVertexShader = /* glsl */ `
uniform float uScroll;
uniform float uRowOffset;
uniform float uCell;
uniform float uValley;
uniform float uRamp;
uniform float uHeight;
uniform float uScale;
uniform float uFloor;

varying vec3  vWorldPos;
varying vec2  vGrid;
varying float vMask;
varying float vHeight;

// Hash without sine (Dave Hoskins) — stays stable on large lattice coordinates.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Ridged fbm: folding the noise about its midpoint turns soft hills into
// sharp crests, which is what gives the ranges their jagged skyline.
float ridged(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(valueNoise(p) * 2.0 - 1.0);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    p = p * 2.03 + vec2(17.1, 9.2);
  }
  return sum / norm;
}

void main() {
  vec3 pos = position;

  // Each vertex slides toward the viewer by less than one cell, then snaps back
  // a row while the lattice it samples advances a row. Heights are read at the
  // lattice point, so after the snap every vertex wears the shape its neighbour
  // just had and the terrain appears to flow forever without a seam.
  vec2 lattice = vec2(pos.x, pos.z - uRowOffset);

  float mask = smoothstep(uValley, uValley + uRamp, abs(pos.x));
  float h = ridged(lattice / uScale) * uHeight * mask;

  pos.y = uFloor + h;
  pos.z += uScroll;

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorldPos = world.xyz;
  vGrid = lattice / uCell;
  vMask = mask;
  vHeight = h / max(uHeight, 1e-4);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const mountainsFragmentShader = /* glsl */ `
uniform vec3  uCamPos;
uniform vec3  uSunPos;
uniform vec3  uBase;
uniform vec3  uLine;
uniform vec3  uSunGlow;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogPow;
uniform float uFogGlowExp;
uniform float uFogGlowStrength;
uniform float uLineWidth;
uniform float uGlowWidth;

varying vec3  vWorldPos;
varying vec2  vGrid;
varying float vMask;
varying float vHeight;

// Anti-aliased line at every integer of x, faded once cells go sub-pixel.
float gridLine(float x, float width) {
  float d  = abs(fract(x - 0.5) - 0.5);
  float aa = fwidth(x);
  float line = 1.0 - smoothstep(0.0, width + aa, d);
  return line * clamp(width / (width + aa), 0.0, 1.0);
}

void main() {
  // Lattice coordinates are whole numbers at every vertex, so these lines sit
  // exactly on the mesh edges — a true wireframe without a second draw call.
  float lx = gridLine(vGrid.x, uLineWidth);
  float lz = gridLine(vGrid.y, uLineWidth);

  // The triangle diagonals, only on the slopes so the valley floor reads as the
  // same square grid as the track.
  float diag = gridLine(vGrid.x + vGrid.y, uLineWidth) * vMask;

  float line = max(max(lx, lz), diag);

  vec2  d    = abs(fract(vGrid - 0.5) - 0.5);
  float glow = exp(-min(d.x, d.y) / uGlowWidth);

  vec3 col = uBase;
  col += uLine * line;
  col += uLine * glow * 0.12;

  // Crests catch a little more light than the troughs.
  col += uLine * 0.08 * vHeight;

  // Sheen as the surface tips toward the sun on the horizon.
  col += uSunGlow * 0.07 * smoothstep(2.0, -25.0, vWorldPos.z);

  float dist     = distance(uCamPos, vWorldPos);
  float sunAlign = max(dot(normalize(vWorldPos - uCamPos), normalize(uSunPos - uCamPos)), 0.0);
  vec3  fogCol   = uFogColor + uSunGlow * pow(sunAlign, uFogGlowExp) * uFogGlowStrength;

  float fog = pow(clamp((dist - uFogNear) / max(uFogFar - uFogNear, 1e-4), 0.0, 1.0), uFogPow);
  col = mix(col, fogCol, fog);

  gl_FragColor = vec4(col, 1.0);
}
`;
