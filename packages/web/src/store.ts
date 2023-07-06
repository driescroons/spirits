// import { RigidBodyApi } from "@react-three/rapier";
import { RapierRigidBody } from "@react-three/rapier";
import CameraControls from "camera-controls";
import { setAutoFreeze } from "immer";
import { createRef, MutableRefObject, RefObject } from "react";
import { Mesh, Vector2, Vector3, MathUtils } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

setAutoFreeze(false);

export type ActionType = "up" | "down" | "left" | "right" | "jump";

export type PlayerState =
  | "idle"
  | "moving"
  | "attacking"
  | "jumping"
  | "falling"
  | "dead"
  | "victory"
  | "sliding";

export type EntityType =
  | "platform"
  | "spiked-platform"
  | "coin"
  | "spike"
  | "snake";

export type Entity = {
  type: EntityType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  color?: string;
  id: string;

  // platform specific
  oneWay?: boolean;
  orientation?: string;
};

export type Level = {
  entities: Map<string, Entity>;
  floor: MutableRefObject<Mesh | null> | null;
};

export type Actions = {
  [key in ActionType]: {
    value: number;
    startedAt: number | null;
    force?: number;
    pressure?: number;
  };
};

export type Store = {
  player: {
    state: PlayerState;
    ref: RefObject<RapierRigidBody> | null;
    score: number;
    maxHeight: number;
    scoredCoinsRef: RefObject<Set<string>> | null;
  };
  level: Level;
  camera: {
    controls: RefObject<CameraControls> | null;
    movement: MutableRefObject<Vector2>;
  };
  controls: {
    direction: MutableRefObject<Vector3>;
  };
  game: {
    isPaused: boolean;
    isPlaying: boolean;
    isLevelEditing: boolean;
  };
  set: (fn: (state: Store) => void | Store) => void;
};

export const useStore = create(
  immer<Store>((set) => ({
    player: {
      state: "moving",
      ref: null,
      score: 0,
      maxHeight: 0,
      scoredCoinsRef: createRef<Set<string>>() as MutableRefObject<Set<string>>,
    },
    level: {
      entities: new Map(),
      floor: null,
    },
    game: {
      isPaused: false,
      isPlaying: true,
      isLevelEditing: false,
    },
    camera: {
      controls: null,
      movement: createRef<Vector2>() as MutableRefObject<Vector2>,
    },
    controls: {
      direction: createRef<Vector3>() as MutableRefObject<Vector3>,
      actions: createRef<Actions>(),
    },
    set: (fn: (state: Store) => void | Store) => {
      set(fn as any);
    },
  }))
);

useStore.setState((store) => {
  store.camera.movement.current = new Vector2();
  store.controls.direction.current = new Vector3(0, 0, 1);

  const level: any = [
    {
      position: [-8, -30, 0],
      scale: [1, 200, 1],
      type: "platform",
      rotation: [0, 0, 0],
    },
    {
      position: [8, -30, 0],
      scale: [1, 200, 1],
      type: "platform",
      rotation: [0, 0, 0],
    },
    {
      position: [0, 8, 0],
      scale: [15, 0.1, 1],
      type: "platform",
      oneWay: true,
    },
    {
      position: [0, 20, 0],
      scale: [15, 0.1, 1],
      oneWay: true,
      type: "platform",
    },
    { position: [3, 12, 0], scale: [1, 8, 1], type: "platform" },
    {
      position: [0, 36, 0],
      scale: [15, 0.1, 1],
      oneWay: true,
      type: "platform",
    },
    { position: [-3, 28, 0], scale: [1, 8, 1], type: "platform" },
    {
      position: [0, 36, 0],
      scale: [15, 0.1, 1],
      oneWay: true,
      type: "platform",
    },
    { position: [3, 42, 0], scale: [1, 4, 1], type: "platform" },
    { position: [-3, 46, 0], scale: [1, 4, 1], type: "platform" },
    { position: [3, 50, 0], scale: [1, 4, 1], type: "platform" },
    {
      position: [0, 54, 0],
      scale: [15, 0.1, 1],
      oneWay: true,
      type: "platform",
    },
    {
      type: "platform",
      position: [0, 0, 7.57424949949359e-17],
      rotation: [0, 0, 0, "XYZ"],
      scale: [10, 1, 1],
    },
    {
      type: "platform",
      position: [-4.501453752595175, 0.9903821338516628, 0],
      rotation: [0, 0, 0, "XYZ"],
      scale: [1, 1, 1],
    },
    {
      type: "platform",
      position: [4.494184453177482, 1.0089148532462096, 0],
      rotation: [0, 0, 0, "XYZ"],
      scale: [1, 1, 1],
    },
    {
      type: "snake",
      position: [-2.1129750155979163, 14.808470144781928, 0],
      rotation: [0, 0, 0, "XYZ"],
      scale: [5, 5, 1],
    },
    {
      type: "coin",
      position: [-2.141827620454394, 14.746902928963388, 0],
      rotation: [0, 0, 0, "XYZ"],
      scale: [1, 1, 1],
    },
    {
      type: "spiked-platform",
      position: [3, 16.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  ];

  store.level.entities = new Map([
    ...level.map((entity, index) => {
      const uuid = MathUtils.generateUUID();
      return [
        uuid,
        {
          ...entity,
          id: uuid,
        },
      ];
    }),
  ]);
});
