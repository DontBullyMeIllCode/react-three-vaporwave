![don't bully me i'll code](https://raw.githubusercontent.com/DontBullyMeIllCode/dbmic-assets/main/images/dbmic-banner-full-logo.png)

# React Three Vaporwave

An endless vaporwave drive for [React Three Fiber](https://r3f.docs.pmnd.rs): a
neon grid running to a banded sun, between wireframe mountains or a reflective
sea. Everything moves in shader space — nothing is recycled or teleported — so
the loop is seamless however long it runs.

<img src="https://raw.githubusercontent.com/DontBullyMeIllCode/react-three-vaporwave/main/previews/composed.gif" width="640" alt="A neon grid scrolling toward a banded orange sun, between blue wireframe mountains under a purple sky">

**[Turn the knobs in Storybook →](https://dontbullymeillcode.github.io/react-three-vaporwave/)**

## Install

```sh
npm install @dontbullymeillcode/react-three-vaporwave
```

Peer dependencies, which your app provides:

```sh
npm install react three @react-three/fiber @react-three/drei
```

| Package              | Version   |
| -------------------- | --------- |
| `react`              | `>=19`    |
| `three`              | `>=0.159` |
| `@react-three/fiber` | `>=9`     |
| `@react-three/drei`  | `>=10`    |

## Usage

```tsx
import { Canvas } from "@react-three/fiber";
import { LinearVaporwave } from "@dontbullymeillcode/react-three-vaporwave";

export function Scene() {
  return (
    <Canvas>
      <LinearVaporwave />
    </Canvas>
  );
}
```

`LinearVaporwave` brings its own camera, so the canvas needs no camera props.

### Choosing the pieces

```tsx
<LinearVaporwave ground="water" stars={false} />
```

### Tuning the look

Every distance, timing and colour is configurable. Pass only what you want to
change — everything else keeps its default:

```tsx
<LinearVaporwave
  config={{
    scene: {
      mountains: { height: 2, valley: 1.5 },
      track: { speed: 1 },
      glitch: { enabled: true },
    },
    palette: {
      mountainLine: "#ff45c8",
      sunTop: "#ffd76a",
    },
  }}
/>
```

Changes apply live, so the config can come from state or a UI. Colours and most
numbers only update shader values; changing a size (extents, mesh density, star
count) rebuilds just the geometry it affects.

### Building your own scene

The pieces are exported individually. Wrap them in `VaporwaveConfigProvider` to
configure them, and provide your own camera:

```tsx
import {
  GridTrack,
  Sky,
  Stars,
  Sun,
  VaporwaveConfigProvider,
} from "@dontbullymeillcode/react-three-vaporwave";

<Canvas camera={{ position: [0, 0.34, 1.1], fov: 72, near: 0.01, far: 1200 }}>
  <VaporwaveConfigProvider config={{ palette: { trackLineA: "#00ffcc" } }}>
    <Sky />
    <Stars />
    <Sun />
    <GridTrack />
  </VaporwaveConfigProvider>
</Canvas>;
```

The pieces are sized for a camera sitting just above the track, as in
`DEFAULT_CONFIG.scene.camera`.

## API

### `<LinearVaporwave>`

| Prop        | Type                               | Default       | Description                                           |
| ----------- | ---------------------------------- | ------------- | ----------------------------------------------------- |
| `ground`    | `"mountains" \| "water" \| "none"` | `"mountains"` | What lies either side of the track.                   |
| `sky`       | `boolean`                          | `true`        | Gradient sky with a glow around the sun.              |
| `stars`     | `boolean`                          | `true`        | Twinkling star field.                                 |
| `sun`       | `boolean`                          | `true`        | Banded sun and its halo.                              |
| `gridTrack` | `boolean`                          | `true`        | The neon grid floor.                                  |
| `config`    | `VaporwaveConfigOverrides`         | —             | Overrides layered over the defaults and any provider. |
| `children`  | `ReactNode`                        | —             | Extra objects, rendered inside the scene's config.    |

### Pieces

| Component   | What it draws                                                                      |
| ----------- | ---------------------------------------------------------------------------------- |
| `Sky`       | Vertical gradient backdrop with a wash of light around the sun.                    |
| `Stars`     | Seeded star field — the same sky every time, on the server and in the browser.     |
| `Sun`       | Gradient disc with bands that thicken toward the horizon, plus an optional glitch. |
| `GridTrack` | The scrolling grid floor.                                                          |
| `Mountains` | Procedural wireframe ranges that scroll in step with the grid.                     |
| `Water`     | A sea of Gerstner waves with a real-time planar reflection.                        |

### Configuration

| Export                            | Description                                                             |
| --------------------------------- | ----------------------------------------------------------------------- |
| `VaporwaveConfigProvider`         | Supplies config to every piece below it. Providers nest, inner winning. |
| `useVaporwaveConfig()`            | The resolved config in effect at that point in the tree.                |
| `DEFAULT_CONFIG`                  | The stock scene: `{ scene, palette }`.                                  |
| `resolveConfig(overrides, base?)` | Layers overrides over `base` (the defaults unless given).               |

Config is grouped into sections. Every value is documented in its type, so your
editor shows what each one does.

| `scene.*`    | Controls                                                            |
| ------------ | ------------------------------------------------------------------- |
| `camera`     | Position, field of view, clipping and upward tilt.                  |
| `track`      | Grid width and length, cell size, scroll speed, line and rail glow. |
| `mountains`  | Valley width, slope, peak height and width, lattice extent.         |
| `water`      | Level, wave height, extent and mesh density.                        |
| `sun`        | Position, radius, band count and brightness.                        |
| `glitch`     | `enabled`, plus how often and how hard the sun tears.               |
| `sunGlow`    | Size and strength of the halo, the sky wash and the fog tint.       |
| `reflection` | Resolution, strength and ripple distortion of the water's mirror.   |
| `fog`        | Start and end distance and falloff curve.                           |
| `stars`      | Count and sky-sphere radius.                                        |

`palette.*` holds every colour as a hex string — sky, sun, grid lines, mountains,
water, fog and stars.

Types: `VaporwaveConfig`, `VaporwaveConfigOverrides`, `VaporwaveScene`,
`VaporwavePalette`, `VaporwaveGround`, `LinearVaporwaveProps`.

## Development

This repository uses [pnpm](https://pnpm.io); the version is pinned by
`packageManager` in `package.json`.

```sh
pnpm install
pnpm dev          # playground in ./example, imports straight from ./src
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm format       # prettier
pnpm build        # tsup -> dist/ (ESM + CJS + types)
```

The playground and Storybook both carry a [leva](https://github.com/pmndrs/leva)
panel over the whole config. It lives in `dev/`, outside `src/`, so leva never
reaches the published package.

### Storybook

```sh
pnpm storybook       # dev server on :6006
pnpm build-storybook # static build -> storybook-static/
```

Stories sit beside the components as `src/**/*.stories.tsx`, so `pnpm
typecheck` and `pnpm lint` cover them; `src/index.ts` never reaches them, so
they stay out of `dist`. Pushing to `main` publishes them to
[GitHub Pages](https://dontbullymeillcode.github.io/react-three-vaporwave/).

Pages must be set to deploy from **GitHub Actions** (Settings → Pages → Source)
before the first deploy.

### Previews

```sh
pnpm previews  # previews/*.gif, from the Storybook build
```

The README's GIF is rendered rather than recorded. The script loads the built
Storybook in headless Chrome with its clock replaced: `performance.now` and
`requestAnimationFrame` only move when the script steps them, so every frame is
rendered at an exact time however slow the software renderer is. The loop is a
whole number of grid cells at the configured speed, so the track wraps
seamlessly; the mountains are not periodic and shift slightly at the wrap.

Needs Chrome — set `CHROME_PATH` if it is not in the default macOS location —
and Node 22.18 or newer, which imports the TypeScript config directly.
`previews/` is outside the `files` list, so none of it reaches the tarball.

### Tests

Tests run headless with `@react-three/test-renderer`, so they check what each
piece hands its shaders — config reaching uniforms, live updates, geometry
rebuilds, the scroll maths — rather than pixels. `src/shaders/uniforms.test.tsx`
also checks that every uniform a shader declares is actually supplied, since
GLSL silently reads 0 from one that isn't.

### Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
lint, format check, typecheck, tests, the library build and the Storybook build.

### Releasing

Publishing is triggered by a GitHub Release, not by a push. Bump the version,
commit it, then create a release whose tag matches — `v1.2.3` for `1.2.3`. The
workflow refuses to publish if the two disagree, reruns the full CI suite, and
publishes with provenance. A release marked as a prerelease publishes under the
`next` dist-tag rather than `latest`.

No npm token is stored anywhere. The workflow authenticates with npm's trusted
publishing: GitHub mints a short-lived OIDC token, npm checks its claims against
a trust relationship recorded on the package, and provenance is attested
automatically. pnpm installs and builds; the publish itself uses npm, whose OIDC
support is what the trust relationship is made for.

A trust relationship is attached to a package that already exists, so the very
first version is published from a logged-in terminal:

```sh
npm login
npm publish   # prepublishOnly runs typecheck, lint, test and build
```

Then configure the relationship. This is a one-time job, and it needs an
interactive 2FA challenge, so it has to be done from a logged-in terminal or the
website rather than from CI:

```sh
npm trust github @dontbullymeillcode/react-three-vaporwave \
  --repo DontBullyMeIllCode/react-three-vaporwave \
  --file publish.yml \
  --env npm \
  --allow-publish

npm trust list @dontbullymeillcode/react-three-vaporwave   # confirm it saved
```

That last command should report `permissions: publish, stage publish`. The
labels are what to read it by: `publish` is `npm publish`, `stage publish` is
`npm stage publish`, and they are comma-separated, so a lone `stage publish`
means direct publishing is _not_ granted.

Every one of those has to match the workflow exactly, and they are
case-sensitive. `--env npm` corresponds to the job's `environment:` block —
change one and you must change the other. `--allow-publish` is the flag that
matters most: a relationship without it is trusted but not permitted to publish,
which fails as `OIDC permission denied for this action` rather than as anything
that names the real cause. Add `--allow-stage-publish` as well to also allow
`npm stage publish`, where a version waits in npm's staging area until a
maintainer approves it with 2FA.

To run the pipeline without cutting a release, trigger the workflow by hand from
the Actions tab. It defaults to a dry run, so it will do everything except the
publish itself.

## License

MIT © Alexandra Smith
