export const trackVertexShader = /* glsl */ `
varying vec3 vWorldPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const trackFragmentShader = /* glsl */ `
uniform vec3  uCamPos;
uniform vec3  uSunPos;
uniform vec3  uBase;
uniform vec3  uLineA;
uniform vec3  uLineB;
uniform vec3  uSunGlow;
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogPow;
uniform float uFogGlowExp;
uniform float uFogGlowStrength;
uniform float uTime;
uniform float uSpeed;
uniform float uCell;
uniform float uLineWidth;
uniform float uGlowWidth;
uniform float uHalfWidth;
uniform float uRail;

varying vec3 vWorldPos;

void main() {
  // The mesh never moves; the grid scrolls underneath it, so the loop is
  // seamless by construction rather than by teleporting planes around.
  // Subtracting time walks each line toward +z, i.e. toward the viewer.
  vec2 g = vec2(vWorldPos.x, vWorldPos.z - uTime * uSpeed) / uCell;

  vec2 d  = abs(fract(g - 0.5) - 0.5);
  vec2 aa = fwidth(g);

  vec2 lw = vec2(uLineWidth);
  vec2 line = 1.0 - smoothstep(vec2(0.0), lw + aa, d);

  // Energy-preserving fade: once a cell is thinner than a pixel, dim the line
  // instead of letting it alias into a shimmering slab.
  line *= clamp(lw / (lw + aa), 0.0, 1.0);

  vec2 glow = exp(-d / uGlowWidth);

  vec3 col = uBase;
  col += uLineA * line.x + uLineB * line.y;
  col += (uLineA * glow.x + uLineB * glow.y) * 0.16;

  // Neon rails down both edges of the causeway.
  float rail = smoothstep(uHalfWidth - 0.05, uHalfWidth - 0.008, abs(vWorldPos.x));
  col += uLineA * rail * uRail;

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
