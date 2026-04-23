import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useHandTracking } from '../../lib/gesture/HandTrackingContext';

/**
 * Check if a mesh is part of a physics/interactive object
 * (not the ground plane, grid, contact shadows, or cursor itself).
 */
function isInteractiveMesh(obj: THREE.Object3D, cursorMesh: THREE.Mesh | null): boolean {
  if (obj === cursorMesh) return false;
  if (!(obj instanceof THREE.Mesh)) return false;

  // Skip ground plane (huge geometry), grid helper children, and shadow planes
  const geo = obj.geometry;
  if (geo instanceof THREE.PlaneGeometry) {
    const params = geo.parameters;
    // Ground planes are very large (≥20 units)
    if (params.width >= 20 || params.height >= 20) return false;
  }

  // Skip objects that are just visual markers (transparent / very low opacity)
  const mat = obj.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  if (mat && 'opacity' in mat && mat.transparent && mat.opacity < 0.2) return false;

  return true;
}

/**
 * HandRaycaster — lives inside <Canvas>.
 * Converts hand cursor position to 3D raycasts and synthesizes
 * pointer events ONLY when hitting interactive objects.
 * This prevents conflict with OrbitControls.
 */
export default function HandRaycaster({ onGrabChange }: { onGrabChange?: (grabbing: boolean) => void }) {
  const { isTracking, cursorX, cursorY, isPinching, gesture } = useHandTracking();
  const { camera, scene, gl } = useThree();

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());
  const cursorMeshRef = useRef<THREE.Mesh>(null);
  const hitPointRef = useRef(new THREE.Vector3());

  // Track grab state
  const isGrabbingRef = useRef(false);
  const wasPinchingRef = useRef(false);
  const lastGrabStateRef = useRef(false);
  const isOrbitingRef = useRef(false);

  const notifyGrabChange = useCallback((grabbing: boolean) => {
    if (grabbing !== lastGrabStateRef.current) {
      lastGrabStateRef.current = grabbing;
      onGrabChange?.(grabbing);
    }
  }, [onGrabChange]);

  useFrame(() => {
    if (!isTracking) {
      if (cursorMeshRef.current) cursorMeshRef.current.visible = false;
      if (isGrabbingRef.current) {
        isGrabbingRef.current = false;
        notifyGrabChange(false);
      }
      return;
    }

    // Convert normalized hand coords (0–1) to NDC (-1 to +1)
    const ndcX = cursorX * 2 - 1;
    const ndcY = -(cursorY * 2 - 1); // Flip Y for Three.js NDC

    pointer.current.set(ndcX, ndcY);
    raycaster.current.setFromCamera(pointer.current, camera);

    // Raycast against all scene objects
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    // Find the first interactive mesh hit
    const hit = intersects.find((i) => isInteractiveMesh(i.object, cursorMeshRef.current));

    // Update 3D cursor position
    if (cursorMeshRef.current) {
      if (hit) {
        hitPointRef.current.copy(hit.point);
        cursorMeshRef.current.position.copy(hit.point);
        cursorMeshRef.current.visible = true;
      } else {
        // Project cursor into space at a default distance
        const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
        vec.unproject(camera);
        const dir = vec.sub(camera.position).normalize();
        const target = camera.position.clone().add(dir.multiplyScalar(10));
        cursorMeshRef.current.position.copy(target);
        cursorMeshRef.current.visible = true;
      }
    }

    // ── Synthesize pointer events ──
    const domElement = gl.domElement;
    const rect = domElement.getBoundingClientRect();
    const clientX = rect.left + cursorX * rect.width;
    const clientY = rect.top + cursorY * rect.height;

    const nowPinching = isPinching;
    const wasPinching = wasPinchingRef.current;
    
    const nowOrbiting = gesture === 'fist';
    const wasOrbiting = isOrbitingRef.current;

    // PINCH LOGIC - For interactive physics objects
    if (nowPinching && !wasPinching) {
      if (hit) {
        isGrabbingRef.current = true;
        notifyGrabChange(true);

        const downEvent = new PointerEvent('pointerdown', {
          clientX,
          clientY,
          button: 0,
          bubbles: true,
          pointerId: 999,
        });
        domElement.dispatchEvent(downEvent);
      }
    }

    if (nowPinching && isGrabbingRef.current) {
      const moveEvent = new PointerEvent('pointermove', {
        clientX,
        clientY,
        button: 0,
        buttons: 1,
        bubbles: true,
        pointerId: 999,
      });
      domElement.dispatchEvent(moveEvent);
    }

    if (!nowPinching && wasPinching) {
      if (isGrabbingRef.current) {
        const upEvent = new PointerEvent('pointerup', {
          clientX,
          clientY,
          button: 0,
          bubbles: true,
          pointerId: 999,
        });
        domElement.dispatchEvent(upEvent);
        isGrabbingRef.current = false;
        notifyGrabChange(false);
      }
    }

    // OPEN PALM LOGIC - For orbiting the scene
    if (nowOrbiting && !wasOrbiting && !isGrabbingRef.current) {
      isOrbitingRef.current = true;
      const downEvent = new PointerEvent('pointerdown', {
        clientX,
        clientY,
        button: 0,
        bubbles: true,
        pointerId: 998,
      });
      domElement.dispatchEvent(downEvent);
    }

    if (nowOrbiting && isOrbitingRef.current) {
      const moveEvent = new PointerEvent('pointermove', {
        clientX,
        clientY,
        button: 0,
        buttons: 1,
        bubbles: true,
        pointerId: 998,
      });
      domElement.dispatchEvent(moveEvent);
    }

    if (!nowOrbiting && wasOrbiting) {
      if (isOrbitingRef.current) {
        const upEvent = new PointerEvent('pointerup', {
          clientX,
          clientY,
          button: 0,
          bubbles: true,
          pointerId: 998,
        });
        domElement.dispatchEvent(upEvent);
        isOrbitingRef.current = false;
      }
    }

    // HOVER LOGIC - For hover states
    if (!nowPinching && !isGrabbingRef.current && !isOrbitingRef.current && gesture !== 'none') {
      const hoverEvent = new PointerEvent('pointermove', {
        clientX,
        clientY,
        button: 0,
        buttons: 0,
        bubbles: true,
        pointerId: 997,
      });
      domElement.dispatchEvent(hoverEvent);
    }

    wasPinchingRef.current = nowPinching;
  });

  // Cursor color based on state
  const cursorColor =
    isGrabbingRef.current
      ? '#50fa7b'
      : isOrbitingRef.current
        ? '#ff5555'
        : isPinching
          ? '#ffb86c'
          : gesture === 'fist'
            ? '#ff5555'
            : gesture === 'point'
              ? '#ffb86c'
              : '#8be9fd';

  return (
    <mesh ref={cursorMeshRef} visible={false}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial
        color={cursorColor}
        transparent
        opacity={0.6}
        depthTest={false}
      />
    </mesh>
  );
}
