import type { Meta, StoryObj } from "@storybook/react-vite";
import { PerspectiveCamera } from "@react-three/drei";
import { LinearVaporwave } from "./LinearVaporwave";
import GridTrack from "./grid-track";
import Mountains from "./mountains";
import { Sky, Stars } from "./sky";
import Sun from "./sun";
import Water from "./water";
import { useVaporwaveConfig } from "../utils/config-context";

const meta = {
  title: "Scenes/LinearVaporwave",
  component: LinearVaporwave,
  args: {
    sky: true,
    stars: true,
    sun: true,
    ground: "mountains",
    gridTrack: true,
  },
  argTypes: {
    children: { control: false },
    ground: {
      control: "inline-radio",
      options: ["water", "mountains", "none"],
    },
  },
} satisfies Meta<typeof LinearVaporwave>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MountainGround: Story = {
  name: "Mountains",
  args: { ground: "mountains" },
};

export const WaterGround: Story = {
  name: "Water",
  args: { ground: "water" },
};

export const NoGround: Story = {
  args: { ground: "none" },
};

export const SkyOnly: Story = {
  args: { sun: false, ground: "none", gridTrack: false },
};

/** A still camera matching the scene's, for composed stories. */
function SceneCamera() {
  const { camera } = useVaporwaveConfig().scene;
  return (
    <PerspectiveCamera
      makeDefault
      position={camera.position}
      rotation={[camera.tiltX, 0, 0]}
      fov={camera.fov}
      near={camera.near}
      far={camera.far}
    />
  );
}

/**
 * The pieces are also exported on their own for building a custom scene. The
 * layer controls still apply, so each piece can be toggled here too.
 */
export const Composed: Story = {
  render: ({ sky, stars, sun, ground, gridTrack }) => (
    <>
      <SceneCamera />
      {sky && <Sky />}
      {stars && <Stars />}
      {sun && <Sun />}
      {ground === "water" && <Water />}
      {ground === "mountains" && <Mountains />}
      {gridTrack && <GridTrack />}
    </>
  ),
};
