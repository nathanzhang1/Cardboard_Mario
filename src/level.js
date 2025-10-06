import { THREE, scene, loader } from './engine.js';

let level = null;
const parts = {};
const LEVEL_OFFSET = 66;

function convertMaterialsAndEnableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material instanceof THREE.MeshBasicMaterial) {
        child.material = new THREE.MeshStandardMaterial({
          color: child.material.color,
          map: child.material.map,
          roughness: 0.6,
          metalness: 0,
        });
      }
    }
  });
}

function loadLevel() {
  return new Promise((resolve, reject) => {
    loader.load(
      'assets/marioLevel.glb',
      (gltf) => {
        level = gltf.scene;
        level.position.set(LEVEL_OFFSET, 0, 0);
        scene.add(level);

        const elements = level.children[0].children[0].children[0].children[1];
        elements.children.forEach((child) => {
          convertMaterialsAndEnableShadows(child);
          parts[child.name] = child;
        });

        resolve(level);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

export { level, parts, loadLevel, convertMaterialsAndEnableShadows };
