import { RapierRigidBody } from "@react-three/rapier";
import { PublicKey } from "@solana/web3.js";
import CameraControls from "camera-controls";
import { enableMapSet, setAutoFreeze } from "immer";
import { createRef, MutableRefObject, RefObject } from "react";
import { Mesh, Vector2, Vector3, MathUtils, Quaternion } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { levels } from "./levels";

setAutoFreeze(false);
enableMapSet();

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
  | "checkpoint"
  | "spiked-platform"
  | "coin"
  | "spike"
  | "snake"
  | "enemy"
  | "trophy"
  | "vertical-platform"
  | "vertical-platform-small"
  | "platform-section"
  | "square-platform";

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
  checkpoint: Vector3;
  loadLevel: (name: string) => void;
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
    publicKey: PublicKey | null;
    reset: () => void;
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
  immer<Store>((set, get) => ({
    player: {
      state: "moving",
      ref: null,
      score: 0,
      maxHeight: 0,
      scoredCoinsRef: createRef<Set<string>>() as MutableRefObject<Set<string>>,
      publicKey: null,
      reset: () => {
        get().player.ref?.current?.setTranslation(
          get().level.checkpoint.clone().add(new Vector3(0, 2, 0)),
          false
        );
        get().player.ref?.current?.setLinvel(new Vector3(0, 0, 0), false);
        get().player.ref?.current?.setAngvel(new Vector3(0, 0, 0), false);
        get().player.ref?.current?.setRotation(new Quaternion(), false);
        get().controls.direction.current = new Vector3(1, 0, 0);
      },
    },
    level: {
      entities: new Map(),
      floor: null,
      checkpoint: new Vector3(0, 0, 0),
      loadLevel: (levelName) => {
        const level = levels[levelName];

        // set((store) => {
        get().level.entities = new Map([
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
        get().level.checkpoint = level.checkpoint;
        get().game.isLevelEditing = false;

        get().player.reset();
      },
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

  store.level.loadLevel("first");
});
