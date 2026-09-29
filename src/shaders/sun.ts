export const sunVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const sunFragmentShader = /* glsl */ `
uniform vec3  uTop;
uniform vec3  uBottom;
uniform float uBands;
uniform float uEmission;
uniform float uTime;
uniform float uGlitchRate;
uniform float uGlitchChance;
uniform float uGlitchDuration;
uniform float uGlitchSlices;
uniform float uGlitchAmount;
uniform float uGlitchDensity;
uniform float uGlitchSplit;
uniform float uGlitchDropout;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

/**
 * How much of the sun covers a point: the disc, minus the horizontal slices
 * that thicken toward the bottom until it dissolves into the horizon.
 *
 * Pulled out of main() so the glitch can evaluate it at several offsets and
 * tear the shape apart rather than just tinting it.
 */
float sunMask(vec2 uv) {
  float disc = 1.0 - smoothstep(0.985, 1.0, length(uv * 2.0 - 1.0));

  float band = fract((uv.y - uTime * 0.015) * uBands);
  float cut  = smoothstep(0.70, 0.20, uv.y);
  float bandAlpha = smoothstep(cut - 0.015, cut + 0.015, band);
  bandAlpha = mix(1.0, bandAlpha, step(0.001, cut));

  return disc * bandAlpha;
}

void main() {
  // Bursts, not a constant wobble: time is chopped into slots, each slot rolls
  // once for whether it tears, and the burst decays over the start of any slot
  // it wins. A glitch that runs continuously stops reading as a fault.
  float slot     = floor(uTime * uGlitchRate);
  float slotTime = fract(uTime * uGlitchRate);
  float fires    = step(1.0 - uGlitchChance, hash(vec2(slot, 11.0)));
  float env      = fires * smoothstep(uGlitchDuration, 0.0, slotTime);

  // Tear the disc into horizontal slices and shove a fraction of them sideways.
  float slice   = floor(vUv.y * uGlitchSlices);
  float shifted = step(1.0 - uGlitchDensity, hash(vec2(slice, slot * 3.7)));
  float offset  = (hash(vec2(slice * 1.7, slot)) * 2.0 - 1.0)
                * uGlitchAmount * shifted * env;

  vec2 guv = vec2(vUv.x + offset, vUv.y);

  // Channels come apart by different amounts, the way a bad signal separates
  // colour from luma.
  float split = uGlitchSplit * env * shifted;
  float mR = sunMask(guv + vec2(split, 0.0));
  float mG = sunMask(guv);
  float mB = sunMask(guv - vec2(split, 0.0));

  // A few slices drop out altogether mid-burst.
  float dropped = step(1.0 - uGlitchDropout, hash(vec2(slice * 5.3, slot * 2.1)))
                * step(0.15, env);

  float a = max(mR, max(mG, mB)) * (1.0 - dropped);
  if (a <= 0.001) discard;

  vec3 col = mix(uBottom, uTop, pow(clamp(guv.y, 0.0, 1.0), 0.85));

  // Pushed past 1.0 so the bloom pass has something to grab onto. Blending
  // multiplies by alpha again, so the per-channel coverage is divided back
  // out, to land on col * mChannel rather than col * mChannel * alpha.
  vec3 rgb = col * uEmission * vec3(mR, mG, mB) / max(a, 1e-4);

  gl_FragColor = vec4(rgb, a);
}
`;

export const haloFragmentShader = /* glsl */ `
uniform vec3  uColor;
uniform float uStrength;
uniform float uExtent;
uniform float uRadius;

varying vec2 vUv;

void main() {
  // Distance from the sun's centre in sun radii. Measuring it this way keeps
  // the falloff independent of however large the quad had to be cut.
  float r = length(vUv * 2.0 - 1.0) * uExtent;

  // Decay outward from the disc's edge, not its centre, and fade to nothing
  // inside the disc. A halo that peaks at the centre shows through the gaps
  // between the bands and fills them in.
  float outside = max(r - 1.0, 0.0);
  float a = exp(-outside / max(uRadius, 1e-3)) * uStrength * smoothstep(0.82, 1.0, r);

  gl_FragColor = vec4(uColor * a, a);
}
`;
