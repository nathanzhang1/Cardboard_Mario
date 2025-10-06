import {
  THREE, scene, camera, renderer, controls,
  sunLight, sunCube, setHelpersVisible, plane, planeMaterial,
  loader, mtlLoader, objLoader,
  mushroomSound, coinSound, goombaSound, pipSound, deathSound, winSound
} from './engine.js';

import { level, parts, loadLevel } from './level.js';
import { Goomba, SuperMushroom, SuperStar, BrickCoin } from './entities.js';

// ---------------- UI & Game State ----------------
const gameState = {
  score: 0,
  coins: 0,
  level: '1-1',
  timeLeft: 400,
  timerInterval: null,
  gameStarted: false,
};

function updateOverlay() {
  document.getElementById('score').textContent = gameState.score.toString().padStart(6, '0');
  document.getElementById('coins').textContent = gameState.coins;
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('timer').textContent = gameState.timeLeft;
}

window.onload = () => {
  const overlay = document.getElementById('game-overlay');
  if (overlay) overlay.style.display = 'none';
};
document.addEventListener('keydown', (e) => { if (e.code === 'Enter') startGame(); });

// ---------------- One-off flags ----------------
let questionBlock002_spawn = false;
let questionBlock005_spawn = false;
let questionBlock0010_spawn = false;

let brickCoinSpawns = {
  brick001: false, brick003: false, brick005: false,
  brick017: false, brick027: false, brick028: false,
};
let starBrick_spawn = false;

// ---------------- Player & Models ----------------
let player = null, currentModel = null, walkModel = null, idleModel = null, jumpModel = null;
let isWalking = false, isJumping = false, mirrorInterval = null, isMirrored = false;
let underGround = false;

let hasPowerUp = false;
let isInvincible = false;
let invincibilityTimer = 0;
const invincibilityDuration = 1000;

let hasStar = false;
let starTimer = 0;
const starDuration = 10000;

let marioSize = null;
let marioCenter = null;
let win = false;
let victoryScreenTimer = 0;
const victoryScreenDuration = 500;

// Load Idle
loader.load('assets/mario_-_super_mario_bros_3d_sprite.glb', (gltf) => {
  idleModel = gltf.scene;
  const box = new THREE.Box3().setFromObject(idleModel);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  marioSize = size; marioCenter = center;

  const pivot = new THREE.Group();
  scene.add(pivot);

  idleModel.position.sub(center);
  idleModel.position.y += size.y / 2;
  pivot.add(idleModel);
  pivot.position.set(5, 2.5, 3.82);

  player = pivot;
  currentModel = idleModel;
  convertToStandardAndShadows(idleModel);
}, undefined, (e) => console.error('Error loading Mario model:', e));

// Load Walk
loader.load('assets/mario_walk.glb', (gltf) => {
  walkModel = gltf.scene;
  const box = new THREE.Box3().setFromObject(walkModel);
  const center = box.getCenter(new THREE.Vector3());
  walkModel.position.sub(center);
  walkModel.position.set(0.25, -0.7, -0.15);
  walkModel.rotation.y = (-1 * Math.PI) / 2;
  convertToStandardAndShadows(walkModel);
  walkModel.visible = false;
  player.add(walkModel);
});

// Load Jump
loader.load('assets/voxel_mario_amiibo.glb', (gltf) => {
  jumpModel = gltf.scene;
  const box = new THREE.Box3().setFromObject(jumpModel);
  const center = box.getCenter(new THREE.Vector3());
  jumpModel.position.sub(center);
  jumpModel.position.set(0, 0.15, -0.15);
  jumpModel.scale.set(0.1, 0.1, 0.1);
  convertToStandardAndShadows(jumpModel);
  jumpModel.visible = false;
  player.add(jumpModel);
});

// Helpers
function convertToStandardAndShadows(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true; child.receiveShadow = true;
      if (child.material instanceof THREE.MeshBasicMaterial) {
        child.material = new THREE.MeshStandardMaterial({
          color: child.material.color, map: child.material.map, roughness: 0.6, metalness: 0,
        });
      }
    }
  });
}

// Model switching
function switchModel(walk, jump) {
  if (jump) {
    if (currentModel !== jumpModel) {
      currentModel.visible = false; jumpModel.visible = true; currentModel = jumpModel; stopMirroring();
    }
  } else if (walk) {
    if (currentModel !== walkModel) {
      currentModel.visible = false; walkModel.visible = true; currentModel = walkModel; startMirroring();
    }
  } else {
    if (currentModel !== idleModel) {
      currentModel.visible = false; idleModel.visible = true; currentModel = idleModel; stopMirroring();
    }
  }
}

function startMirroring() {
  mirrorInterval = setInterval(() => {
    walkModel.scale.z *= -1;
    isMirrored = !isMirrored;
    if (isMirrored) walkModel.position.x -= 0.5;
    else walkModel.position.x += 0.5;
  }, 250);
}
function stopMirroring() {
  clearInterval(mirrorInterval);
  if (isMirrored) {
    walkModel.scale.z = Math.abs(walkModel.scale.x);
    walkModel.position.x += 0.5;
    isMirrored = false;
  }
}

// ---------------- Input ----------------
const keys = { forward: false, backward: false, left: false, right: false, jump: false };
document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.forward = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.backward = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space') keys.jump = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.forward = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.backward = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space') keys.jump = false;
});

let state = 0;
document.addEventListener('keyup', (e) => {
  if (e.key === 'l') {
    state++;
    if ((state % 3) === 1) scene.add(cube);
    if ((state % 3) === 2) scene.remove(level);
    if ((state % 3) === 0) { scene.remove(cube); scene.add(level); }
  }
  if (e.key === '1') console.log('parts', parts);
  if (e.key === '2') console.log('scene', scene);
});
document.addEventListener('keydown', (e) => {
  if (e.key === '`') setRaysVisibleToggle();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'r') resetGame();
});

// ---------------- Camera helpers ----------------
let cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff00ff }));

// ---------------- Physics ----------------
let velocity = { x: 0, y: 0, z: 0 };
const speed = 0.15;
const gravity = 0.02;
const jumpStrength = 0.5;
const terminalVelocity = -0.5;
let isOnGround = false;

const forwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const upwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const downwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const forwardCollisionDist = 0.5;
const upwardCollisionDist = 0.1;
const downwardCollisionDist = 0.55;

let showRays = false;
let forwardArrows = [], upwardArrows = [], downwardArrows = [];

function setRaysVisibleToggle() {
  showRays = !showRays;
  [...forwardArrows, ...upwardArrows, ...downwardArrows].forEach(a => { if (a) a.visible = showRays; });
  goombas.forEach(g => { if (g.boxHelper) g.boxHelper.visible = showRays; });
  setHelpersVisible(showRays ? true : false);
}

function visualizeRay(origin, direction, existingArrow) {
  if (!showRays) return existingArrow;
  if (existingArrow) {
    existingArrow.position.copy(origin);
    existingArrow.setDirection(direction.clone().normalize());
    return existingArrow;
  }
  const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), origin, 5, 0xffff00);
  arrowHelper.visible = showRays;
  scene.add(arrowHelper);
  return arrowHelper;
}

function rotateVector(vector, ry) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
  return vector.clone().applyQuaternion(q);
}

// ---------------- Block Bounce ----------------
let bouncingBlocks = [];
function bounceBlock(block) {
  if (bouncingBlocks.find(b => b.block === block)) return;
  bouncingBlocks.push({ block, startY: block.position.y, upY: block.position.y + 0.5, direction: 1 });
}

// ---------------- Coin collection (underground) ----------------
let collectedCoins = new Set();
function checkCoinCollection() {
  if (player.position.y < 0) {
    parts.coins.children.forEach((coin) => {
      const bb = new THREE.Box3().setFromObject(coin);
      if (bb.intersectsSphere(new THREE.Sphere(player.position, 1))) {
        if (!collectedCoins.has(coin)) {
          collectedCoins.add(coin);
          coin.parent.remove(coin);
          gameState.coins++;
          gameState.score += 100;
          updateOverlay();
          if (coinSound.isPlaying) coinSound.stop();
          coinSound.play();
        }
      }
    });
  }
}

function findRootGoombaModel(object) {
  while (object.parent) {
    if (object.parent.name === 'Goomba') return object.parent;
    object = object.parent;
  }
  return null;
}

// ---------------- Light Switch (overworld/underground) ----------------
let lamp = null, lampCube = null;
function lightSwitch(status = 0) {
  if (status) {
    underGround = true;
    planeMaterial.color.set(0x000000);
    plane.position.set(0, -1, 0);
    scene.background = new THREE.Color(0x000000);

    lamp = new THREE.PointLight(0xffdc52, 50);
    lamp.position.set(160, -3, 2);
    lamp.castShadow = true; lamp.name = 'lamp';
    const lampGeometry = new THREE.BoxGeometry(1, 1, 1);
    const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffdc52 });
    lampCube = new THREE.Mesh(lampGeometry, lampMaterial);
    lampCube.position.copy(lamp.position);
    lampCube.name = 'lampCube';
    scene.remove(sunLight);
    scene.remove(sunCube);
    scene.add(lamp);
    scene.add(lampCube);
  } else {
    underGround = false;
    scene.background = new THREE.Color(0x6185f8);
    planeMaterial.color.set(0x6185f8);
    scene.children.slice().forEach((child) => { if (child.name === 'lamp' || child.name === 'lampCube') child.parent.remove(child); });
    scene.add(sunLight);
    scene.add(sunCube);
  }
}

// ---------------- Entities & deps ----------------
let goombas = [];
let mushrooms = [];
let superStars = [];
let brickCoins = [];

const entityDeps = {
  forGoomba: {
    goombaSound,
    deathSound,
    onMarioDeath: () => resetGame(),
    onScore: (n) => { gameState.score += n; },
    isMarioInvincible: () => isInvincible,
    hasMarioPowerUp: () => hasPowerUp,
    clearMarioPowerUp: () => { hasPowerUp = false; player.scale.set(1, 1, 1); },
    hasStar: () => hasStar,
    onGoombaDead: (g) => {
      const idx = goombas.indexOf(g);
      if (idx > -1) goombas.splice(idx, 1);
    },
    startInvincibility: () => {
      isInvincible = true;
      invincibilityTimer = 0;
    },
  },
  forMushroom: {
    onScore: (n) => { gameState.score += n; },
    mushroomSound,
    getPlayer: () => player,
    hasPowerUp: () => hasPowerUp,
    setPowerUp: (v) => { hasPowerUp = v; },
  },
  forStar: {
    onScore: (n) => { gameState.score += n; },
    mushroomSound, // reuse per original
    getPlayer: () => player,
    applyStar: () => { if (!hasStar) { hasStar = true; starTimer = 0; applyInvincibilityEffect(); } },
    hasStar: () => hasStar,
  },
  forBrickCoin: {
    coinSound,
    onCoin: () => { gameState.coins++; gameState.score += 100; updateOverlay(); },
    getPlayer: () => player,
  },
};

function spawnGoombas() {
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(17.5, 2.10, 3.32), 10, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(43.75, 2.10, 3.32), 2, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(53.5, 2.10, 3.32), 3.5, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(82.5, 2.10, 1.32), 5, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(82.5, 2.10, 5.32), 5, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(105, 2.10, 3.32), 10, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(125, 2.10, 1.32), 10, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(125, 2.10, 5.32), 10, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(175, 2.10, 1.32), 10, 0.05, entityDeps.forGoomba));
  goombas.push(new Goomba(scene, loader, new THREE.Vector3(175, 2.10, 5.32), 10, 0.05, entityDeps.forGoomba));
}

// ---------------- Invincibility shader ----------------
const invincibilityShaderMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    varying vec3 vWorldPosition;
    uniform float time;
    void main() {
      vec3 c1 = vec3(1.,0.,0.);
      vec3 c2 = vec3(0.,1.,0.);
      vec3 c3 = vec3(0.,0.,1.);
      vec3 c4 = vec3(1.,1.,0.);
      float g = sin(vWorldPosition.x * 0.5 + time * 2.0) * 0.5 + 0.5;
      vec3 color;
      if (g < 0.25) color = mix(c1, c2, g * 4.);
      else if (g < 0.5) color = mix(c2, c3, (g - 0.25) * 4.);
      else if (g < 0.75) color = mix(c3, c4, (g - 0.5) * 4.);
      else color = mix(c4, c1, (g - 0.75) * 4.);
      gl_FragColor = vec4(color, 1.0);
    }`,
  uniforms: { time: { value: 0.0 } }
});
let originalMaterials = [];
function applyInvincibilityEffect() {
  player.traverse((child) => {
    if (child.isMesh) {
      originalMaterials.push(child.material);
      child.material = invincibilityShaderMaterial;
    }
  });
}
function removeInvincibilityEffect() {
  let i = 0;
  player.traverse((child) => { if (child.isMesh) child.material = originalMaterials[i++]; });
  originalMaterials = [];
}

// ---------------- Movement & collisions ----------------
function updatePlayerMovement() {
  const direction = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  const right = new THREE.Vector3();

  if (keys.forward || keys.backward || keys.left || keys.right) {
    camera.getWorldDirection(direction);
    direction.y = 0;
    right.crossVectors(camera.up, direction).normalize();

    moveDirection.set(0,0,0);
    if (keys.forward) moveDirection.add(direction);
    if (keys.backward) moveDirection.sub(direction);
    if (keys.left) moveDirection.add(right);
    if (keys.right) moveDirection.sub(right);
    moveDirection.normalize().multiplyScalar(speed);
  }

  // alive goomba models only
  const aliveGoombaModels = goombas.filter(g => g.isAlive && g.model).map(g => g.model);

  // forward rays
  let forwardRayOrigins = [
    player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 0.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 1.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 1.3, 0)),
  ];
  let canMoveForward = true;
  let shouldClimb = false;

  for (let i = 0; i < 4; i++) {
    forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
    forwardArrows[i] = visualizeRay(forwardRayOrigins[i], moveDirection, forwardArrows[i]);

    const forwardHits = forwardRaycasters[i].intersectObjects([level, ...aliveGoombaModels], true);
    if (forwardHits.length > 0 && forwardHits[0].distance < forwardCollisionDist) {
      const hitObj = forwardHits[0].object;
      const rootGoomba = findRootGoombaModel(hitObj);
      if (rootGoomba) {
        const g = goombas.find(gg => gg.model === rootGoomba);
        if (g) g.handleMarioDamage();
      } else if (hitObj.parent.name === 'coins') {
        // ignore coins
      } else {
        if (hitObj.name === 'pipeTop5') {
          player.position.set(170.5, 4.2, 4);
          lightSwitch(0);
          if (pipSound.isPlaying) pipSound.stop();
          pipSound.play();
        }
        if (hitObj.name === 'flagBrick' || hitObj.name === 'flag') {
          win = true;
          gameState.score += 5000;
          if (winSound.isPlaying) winSound.stop();
          winSound.play();
        }
        if (i < 2) shouldClimb = true; else shouldClimb = false;
        canMoveForward = false;
      }
    }
  }

  // jump & gravity
  if (keys.jump && isOnGround) { velocity.y = jumpStrength; isOnGround = false; }
  if (!isOnGround) velocity.y -= gravity;
  if (velocity.y < terminalVelocity) velocity.y = terminalVelocity;

  const headCorners = [
    new THREE.Vector3(-0.25, marioSize?.y ?? 1, -0.25),
    new THREE.Vector3(0.25,  marioSize?.y ?? 1, -0.25),
    new THREE.Vector3(-0.25, marioSize?.y ?? 1,  0.35),
    new THREE.Vector3(0.25,  marioSize?.y ?? 1,  0.35),
  ].map(c => rotateVector(c, player.rotation.y).add(player.position));

  let hitCeiling = false;
  for (let i = 0; i < 4; i++) {
    upwardRaycasters[i].set(headCorners[i], new THREE.Vector3(0,1,0));
    upwardArrows[i] = visualizeRay(headCorners[i], new THREE.Vector3(0,1,0), upwardArrows[i]);
    const hits = upwardRaycasters[i].intersectObject(level, true);
    if (hits.length > 0 && hits[0].distance < upwardCollisionDist) {
      if (hits[0].object.parent.name === 'coins') continue;
      let hitObject = hits[0].object.parent;
      if (hitObject && (hitObject.parent.name === 'questionBlocks' || hitObject.parent.parent?.name === 'questionBlocks' ||
                        hitObject.parent.name === 'bricks' || hitObject.parent.parent?.name === 'bricks')) {
        bounceBlock(hitObject);

        if (hitObject.name === 'questionBlock002' && !questionBlock002_spawn) { spawnMushroom('questionBlock002'); questionBlock002_spawn = true; }
        if (hitObject.name === 'questionBlock005' && !questionBlock005_spawn) { spawnMushroom('questionBlock005'); questionBlock005_spawn = true; }
        if (hitObject.name === 'questionBlock010' && !questionBlock0010_spawn) { spawnMushroom('questionBlock010'); questionBlock0010_spawn = true; }

        if (hitObject.name === 'brick019' && !starBrick_spawn) { spawnStar('brick019'); starBrick_spawn = true; }

        if (hitObject.parent.name === 'coinBrick') {
          if (!brickCoinSpawns[hitObject.name]) {
            spawnBrickCoin(hitObject.name);
            brickCoinSpawns[hitObject.name] = true;
          }
        }
      }
      hitCeiling = true;
    }
  }
  if (hitCeiling) velocity.y = Math.min(velocity.y, 0);

  // gravity apply
  player.position.y += velocity.y;

  // ground detection
  const footCorners = [
    new THREE.Vector3(-0.45, 0, -0.25),
    new THREE.Vector3( 0.45, 0, -0.25),
    new THREE.Vector3(-0.45, 0,  0.05),
    new THREE.Vector3( 0.45, 0,  0.05),
  ].map(c => rotateVector(c, player.rotation.y).add(player.position));

  let onGround = false;
  for (let i = 0; i < 4; i++) {
    downwardRaycasters[i].set(footCorners[i], new THREE.Vector3(0,-1,0));
    downwardArrows[i] = visualizeRay(footCorners[i], new THREE.Vector3(0,-1,0), downwardArrows[i]);

    const hits = downwardRaycasters[i].intersectObjects([level, ...aliveGoombaModels], true);
    if (hits.length > 0 && hits[0].distance < downwardCollisionDist) {
      const hitObj = hits[0].object;
      const rootGoomba = findRootGoombaModel(hitObj);

      if (rootGoomba) {
        if (velocity.y < 0) {
          const g = goombas.find(gg => gg.model === rootGoomba);
          if (g && !isOnGround) {
            g.handleStomp();
            velocity.y = jumpStrength * 0.5;
            onGround = true;
          }
        }
      } else if (hitObj.parent.name === 'coins') {
        // ignore coins
      } else {
        onGround = true;
        player.position.y = hits[0].point.y + 0.1;
        velocity.y = 0;
      }

      if (hitObj && hitObj.name === 'pipeTop4') {
        player.position.set(157, -12, 4);
        lightSwitch(1);
        if (pipSound.isPlaying) pipSound.stop();
        pipSound.play();
      }
    }
  }
  isOnGround = onGround;

  // auto stair step
  if (shouldClimb && velocity.y >= 0) {
    player.position.y += 1;
    canMoveForward = true;
  }

  // move & rotate
  if (canMoveForward) player.position.add(moveDirection);
  if (canMoveForward && moveDirection.length() > 0) {
    player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
  }

  // refresh forward rays after position update
  forwardRayOrigins = [
    player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 0.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 1.3, 0)),
    player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 1.3, 0)),
  ];
  for (let i = 0; i < 4; i++) {
    forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
  }

  // death on fall
  if ((player.position.y <= -30 && underGround) || (player.position.y < -1 && !underGround)) {
    if (deathSound.isPlaying) deathSound.stop();
    deathSound.play();
    resetGame();
  }
}

// ---------------- Spawners ----------------
function spawnMushroom(blockName) {
  let pos = null;
  if (blockName === 'questionBlock002') pos = new THREE.Vector3(21.83, 6.75, 4);
  if (blockName === 'questionBlock005') pos = new THREE.Vector3(83, 6.75, 4);
  if (blockName === 'questionBlock010') pos = new THREE.Vector3(115, 10.75, 4);
  if (!pos) return;
  const existing = mushrooms.find(m => m.position?.equals?.(pos));
  if (!existing || existing.isCollected) {
    mushrooms.push(new SuperMushroom(scene, mtlLoader, objLoader, pos, entityDeps.forMushroom));
  }
}
function spawnStar(blockName) {
  let pos = null;
  if (blockName === 'brick019') pos = new THREE.Vector3(106.69, 6.75, 4);
  if (!pos) return;
  const existing = superStars.find(s => s.position?.equals?.(pos));
  if (!existing || existing.isCollected) {
    superStars.push(new SuperStar(scene, loader, pos, entityDeps.forStar));
  }
}
function spawnBrickCoin(blockName) {
  let pos = null;
  if (blockName === 'brick001') pos = new THREE.Vector3(20.5, 2.3, 3.5);
  if (blockName === 'brick003') pos = new THREE.Vector3(24.5, 2.3, 3.5);
  if (blockName === 'brick005') pos = new THREE.Vector3(83.6, 2.3, 3.5);
  if (blockName === 'brick017') pos = new THREE.Vector3(99.2, 2.3, 3.5);
  if (blockName === 'brick027') pos = new THREE.Vector3(136.2, 2.3, 3.5);
  if (blockName === 'brick028') pos = new THREE.Vector3(175.5, 2.3, 3.5);
  if (!pos) return;
  const existing = brickCoins.find(c => c.position?.equals?.(pos));
  if (!existing || existing.isCollected) {
    brickCoins.push(new BrickCoin(scene, loader, pos, entityDeps.forBrickCoin));
  }
}

// ---------------- Timer & Start/Reset ----------------
function startGameTimer() {
  if (gameState.timerInterval) return;
  gameState.gameStarted = true;
  gameState.timerInterval = setInterval(() => {
    if (gameState.timeLeft > 0) {
      gameState.timeLeft--;
      document.getElementById('timer').textContent = gameState.timeLeft;
    } else {
      clearInterval(gameState.timerInterval);
      player.position.copy(new THREE.Vector3(5, 5, 3.82));
    }
  }, 1000);
}

async function startGame() {
  if (gameState.gameStarted) return;
  gameState.gameStarted = true;

  const titleScreen = document.getElementById('title-screen');
  if (titleScreen) titleScreen.style.display = 'none';
  document.getElementById('game-overlay').style.display = 'flex';

  await loadLevel();
  spawnGoombas();
  startGameTimer();
}

function resetGame() {
  gameState.timeLeft = 400;
  gameState.coins = 0;
  gameState.score = 0;

  startGameTimer();
  updateOverlay();

  if (level) scene.remove(level);
  loadLevel();

  Object.keys(brickCoinSpawns).forEach(k => brickCoinSpawns[k] = false);
  questionBlock0010_spawn = questionBlock002_spawn = questionBlock005_spawn = false;
  starBrick_spawn = false;

  mushrooms.forEach(m => m.removeSelf());
  brickCoins.forEach(c => c.removeSelf());
  goombas.forEach(g => g.removeSelf());
  superStars.forEach(s => s.removeSelf());

  goombas = [];
  mushrooms = [];
  brickCoins = [];
  superStars = [];

  spawnGoombas();

  hasPowerUp = false;
  isInvincible = false;
  invincibilityTimer = 0;
  starTimer = starDuration;
  if (underGround) { underGround = false; lightSwitch(0); }
  player.scale.set(1, 1, 1);
  velocity.y = 0;
  player.position.set(5, 2.5, 3.82);
}

// ---------------- Animate ----------------
let angle = 0;
const radius = 100;
const radSpeed = 0.2;
const amplitude = Math.PI / 3;

function animate() {
  requestAnimationFrame(animate);

  if (!gameState.gameStarted) return;
  updateOverlay();
  if (!level) return;

  updatePlayerMovement();
  checkCoinCollection();

  angle += 0.02 * radSpeed;
  const theta = amplitude * Math.sin(angle);
  sunLight.position.y = radius * Math.cos(theta);
  sunLight.position.z = radius * Math.sin(theta);
  sunCube.position.copy(sunLight.position);

  // bouncing blocks
  bouncingBlocks.forEach((entry, idx) => {
    const { block, startY, upY } = entry;
    entry.block.position.y += entry.direction * 0.05;
    if (entry.direction === 1 && block.position.y >= upY) entry.direction = -1;
    else if (entry.direction === -1 && block.position.y <= startY) {
      block.position.y = startY;
      bouncingBlocks.splice(idx, 1);
    }
  });

  goombas.forEach(g => g.update());
  mushrooms.forEach(m => m.update());
  brickCoins.forEach(c => c.update());
  superStars.forEach(s => s.update());

  isWalking = keys.forward || keys.backward || keys.left || keys.right;
  isJumping = !isOnGround;
  switchModel(isWalking, isJumping);

  const victoryScreen = document.getElementById('victory-screen');
  if (win) {
    const f = parts['flag']?.children?.[0];
    if (f && f.position.y > -8) f.position.y -= 0.1;
    else {
      gameState.timeLeft = 400;
      victoryScreenTimer += 16;
      if (victoryScreenTimer >= victoryScreenDuration && victoryScreen) {
        victoryScreen.style.display = 'flex';
      }
    }
  }

  // invincibility blink
  if (isInvincible) {
    invincibilityTimer += 16;
    if (invincibilityTimer >= invincibilityDuration) {
      isInvincible = false; invincibilityTimer = 0; player.visible = true;
    } else {
      player.visible = !player.visible;
    }
  }

  // star shader
  if (hasStar) {
    starTimer += 16;
    invincibilityShaderMaterial.uniforms.time.value = performance.now() * 0.001;
    if (starTimer >= starDuration) {
      hasStar = false; starTimer = 0;
      removeInvincibilityEffect();
    }
  }

  // keep camera offset constant
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  controls.target.set(player.position.x, player.position.y, player.position.z);
  camera.position.copy(player.position).add(offset);
  controls.update();

  renderer.render(scene, camera);
}
animate();

