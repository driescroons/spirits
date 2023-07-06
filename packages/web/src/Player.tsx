import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierCollider,
  RapierRigidBody,
  RigidBody,
  Vector3Object,
  vec3,
} from "@react-three/rapier";
import { useControls } from "leva";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Mesh, Vector3, Vector3Tuple } from "three";
import { lerp } from "three/src/math/MathUtils";
import { useStore } from "./store";

export const Player = ({
  position = [0, 0, 0],
}: {
  position: Vector3Tuple;
}) => {
  const ref = useRef<RapierRigidBody>(null);

  const set = useStore((store) => store.set);
  const playerState = useStore((store) => store.player.state);
  const playerStateRef = useRef(playerState);
  const playerHeight = useStore((store) => store.player.maxHeight);
  const directionRef = useRef(new Vector3(1, 0, 0));
  const pointerDown = useRef(false);
  const lastJumpedAt = useRef(0);
  const startedSlidingAt = useRef<number>();
  const didJumpRelease = useRef(true);
  const jumpsLeft = useRef(0);
  const directionPointerRef = useRef<Mesh>(null);

  const collisionMap = useRef<
    Map<string, { normal: Vector3Object; collider: RapierCollider }>
  >(new Map());

  const { speed, jumpHeight, jumpDamping, fallDamping } = useControls({
    speed: 5,
    jumpHeight: {
      value: 20,
      min: 10,
      max: 500,
    },
    jumpDamping: {
      value: 0.96,
      min: 0,
      max: 1,
    },
    fallDamping: {
      value: 1.04,
      min: 0,
      max: 5,
    },
  });

  const { gl } = useThree();

  useEffect(() => {
    const pointerDownHandler = () => {
      pointerDown.current = true;
    };

    const pointerUpHandler = () => {
      pointerDown.current = false;
    };

    gl.domElement.addEventListener("pointerdown", pointerDownHandler);
    gl.domElement.addEventListener("pointerup", pointerUpHandler);
    return () => {
      gl.domElement.removeEventListener("pointerdown", pointerDownHandler);
      gl.domElement.removeEventListener("pointerup", pointerUpHandler);
    };
  });

  const changeDirection = React.useCallback((dir?: Vector3) => {
    directionRef.current.copy(
      dir ?? directionRef.current.clone().multiplyScalar(-1)
    );

    directionPointerRef
      .current!.position.copy(directionRef.current)
      .multiplyScalar(0.5);
  }, []);

  useEffect(() => {
    if (playerStateRef.current === "sliding") {
      startedSlidingAt.current = Date.now();
    } else {
      startedSlidingAt.current = undefined;
    }
  }, [playerState]);

  useFrame((_, delta) => {
    const { current: player } = ref;
    if (!player) return;

    let state = playerStateRef.current;

    const linvel = vec3(player.linvel());

    linvel.x = directionRef.current.x * speed;

    const impulse = vec3();

    if (!didJumpRelease.current && !pointerDown.current) {
      didJumpRelease.current = true;
    }

    if (
      playerState !== "jumping" &&
      jumpsLeft.current > 0 &&
      pointerDown.current &&
      didJumpRelease.current &&
      lastJumpedAt.current + 200 < Date.now()
    ) {
      didJumpRelease.current = false;
      linvel.y = 0;
      impulse.y = jumpHeight;

      jumpsLeft.current -= 1;
      state = "jumping";
      lastJumpedAt.current = Date.now();
    }

    if (
      playerState === "jumping" &&
      jumpsLeft.current > 0 &&
      pointerDown.current &&
      didJumpRelease.current &&
      lastJumpedAt.current + 300 < Date.now()
    ) {
      didJumpRelease.current = false;
      linvel.y = 0;
      impulse.y = jumpHeight;
      jumpsLeft.current -= 1;
      lastJumpedAt.current = Date.now();
    }

    if (playerState === "sliding") {
      const diff = Date.now() - (startedSlidingAt.current ?? 0);
      linvel.multiply(new Vector3(0, 1, 0));
      linvel.y = lerp(player.linvel().y, -speed, diff > 20 ? 0.05 : 0);
    }

    player.setLinvel(linvel, true);
    player.applyImpulse(impulse, true);

    if (player.translation().y > playerHeight)
      set((store) => {
        store.player.maxHeight = Math.floor(player.translation().y);
      });

    playerStateRef.current = state;
    set((store) => {
      store.player.state = playerStateRef.current;
    });
  });

  useEffect(() => {
    set((store) => {
      store.player.ref = ref;
    });
  }, []);

  return (
    <>
      <RigidBody
        ref={ref}
        name="player"
        position={position}
        enabledTranslations={[true, true, false]}
        lockRotations={true}
        ccd={true}
        onCollisionEnter={({ other, manifold }) => {
          if (
            other?.rigidBodyObject?.name === "platform" &&
            !collisionMap.current.has(other.collider.handle.toString())
          ) {
            collisionMap.current.set(other.collider.handle.toString(), {
              normal: manifold.normal(),
              collider: other.collider,
            });

            let state = playerStateRef.current;
            const collisions = Array.from(collisionMap.current.values());

            const touchingFloor = collisions.some(
              ({ normal }) => Math.abs(normal.y) === 1
            );
            const touchingLeft = collisions.some(
              ({ normal }) => normal.x === -1
            );

            const touchingRight = collisions.some(
              ({ normal }) => normal.x === 1
            );

            if (touchingFloor) {
              state = "moving";
            }

            if ((touchingLeft || touchingRight) && !touchingFloor) {
              state = "sliding";
            }

            if (touchingFloor || touchingLeft || touchingRight) {
              jumpsLeft.current = 2;
            }

            if (
              ((state === "moving" && touchingFloor) || state === "sliding") &&
              (touchingRight || touchingLeft)
            ) {
              changeDirection(new Vector3(touchingRight ? -1 : 1, 0, 0));
            }

            playerStateRef.current = state;
            set((store) => {
              store.player.state = playerStateRef.current;
            });
          }
        }}
        onCollisionExit={({ other }) => {
          if (other?.rigidBodyObject?.name === "platform") {
            collisionMap.current.delete(other.collider.handle.toString());
          }
        }}
      >
        <CapsuleCollider args={[0.25, 4 / 6 / 2]} mass={2} />
        <mesh>
          <planeGeometry args={[0.5, (4 / 6) * 2]} />
          <meshStandardMaterial />
        </mesh>
        <mesh ref={directionPointerRef}>
          <boxGeometry args={[0.3, 1, 0.1]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>
    </>
  );
};
