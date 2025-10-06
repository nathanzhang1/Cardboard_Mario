import { THREE } from './engine.js';

// Goomba
class Goomba {
  constructor(scene, loader, position, movementRange, speed, deps) {
    this.scene = scene;
    this.loader = loader;
    this.position = position.clone();
    this.movementRange = movementRange;
    this.speed = speed;

    this.isMovingForward = true;
    this.isMirrored = false;
    this.mirrorInterval = null;
    this.model = null;
    this.isAlive = true;
    this.boxHelper = null;

    // deps:
    // {
    //   goombaSound, deathSound,
    //   onMarioDeath, onScore,
    //   isMarioInvincible, hasMarioPowerUp, clearMarioPowerUp,
    //   hasStar,
    //   onGoombaDead: (goomba) => void,
    //   startInvincibility: () => void
    // }
    this.deps = deps;

    this.loadModel();
  }

  loadModel() {
    this.loader.load('assets/voxel_goomba.glb', (gltf) => {
      this.model = gltf.scene;
      this.model.position.copy(this.position);
      this.model.scale.set(0.1, 0.1, 0.1);
      this.model.rotation.y = (-1 * Math.PI) / 2;
      this.model.name = 'Goomba';
      this.scene.add(this.model);

      this.boxHelper = new THREE.BoxHelper(this.model, 0x00ff00);
      this.boxHelper.visible = false;
      this.scene.add(this.boxHelper);

      this.model.traverse((child) => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });

      this.startWalking();
    }, undefined, (e) => console.error('Error loading Goomba model:', e));
  }

  startWalking() {
    this.mirrorInterval = setInterval(() => {
      this.model.scale.x *= -1;
      this.isMirrored = !this.isMirrored;
      if (this.isMovingForward) {
        this.model.position.z += this.isMirrored ? 1.25 : -1.25;
      } else {
        this.model.position.z += this.isMirrored ? -1.25 : 1.25;
      }
    }, 250);
  }

  stopWalking() { clearInterval(this.mirrorInterval); }

  update() {
    if (!this.model || !this.isAlive) return;
    if (this.isMovingForward) this.model.position.x -= this.speed;
    else this.model.position.x += this.speed;

    const dist = Math.abs(this.model.position.x - this.position.x);
    if (dist >= this.movementRange) {
      this.isMovingForward = !this.isMovingForward;
      this.model.scale.z *= -1;
      this.isMirrored = !this.isMirrored;
    }
    if (this.boxHelper) this.boxHelper.update();
  }

  handleStomp() {
    if (!this.isAlive) return;

    if (this.deps.goombaSound.isPlaying) this.deps.goombaSound.stop();
    this.deps.goombaSound.play();
    this.deps.onScore(100);

    this.removeSelf();
    if (this.deps.onGoombaDead) this.deps.onGoombaDead(this); // ensure array removal
  }

  handleMarioDamage() {
    if (this.deps.hasStar()) { this.handleStomp(); return; }
    if (this.deps.isMarioInvincible()) return;

    if (!this.deps.hasMarioPowerUp()) {
      if (this.deps.deathSound.isPlaying) this.deps.deathSound.stop();
      this.deps.deathSound.play();
      this.deps.onMarioDeath();
    } else {
      // Lose power-up, shrink, and start i-frames
      this.deps.clearMarioPowerUp();
      if (this.deps.startInvincibility) this.deps.startInvincibility();
    }
  }

  removeSelf() {
    if (this.model) this.scene.remove(this.model);
    if (this.boxHelper) this.scene.remove(this.boxHelper);
    this.stopWalking();
    this.isAlive = false;
    this.model = null;
    this.boxHelper = null;
  }
}

// SuperMushroom
class SuperMushroom {
  constructor(scene, mtlLoader, objLoader, position, deps) {
    this.scene = scene;
    this.mtlLoader = mtlLoader;
    this.objLoader = objLoader;
    this.position = position.clone();
    this.model = null;
    this.isCollected = false;
    this.deps = deps; // { onScore, mushroomSound, getPlayer, hasPowerUp, setPowerUp }

    this.loadModel();
  }

  loadModel() {
    this.mtlLoader.load(
      'assets/Custom Edited - Mario Customs - Super Mushroom Super Mario Bros Voxel/obj_item_supermushroom.mtl',
      (materials) => {
        materials.preload();
        this.objLoader.setMaterials(materials);
        this.objLoader.load(
          'assets/Custom Edited - Mario Customs - Super Mushroom Super Mario Bros Voxel/obj_item_supermushroom.obj',
          (object) => {
            this.model = object;
            this.model.position.copy(this.position);
            this.model.scale.set(0.8, 0.8, 0.8);
            this.scene.add(this.model);
          },
          undefined,
          (e) => console.error('Error loading Super Mushroom OBJ:', e)
        );
      },
      undefined,
      (e) => console.error('Error loading Super Mushroom MTL:', e)
    );
  }

  update() {
    if (!this.model || this.isCollected) return;
    const player = this.deps.getPlayer();
    const d = this.model.position.distanceTo(player.position);
    if (d < 1) this.handleCollision();
  }

  handleCollision() {
    if (this.isCollected) return;
    this.isCollected = true;
    this.deps.onScore(1000);
    if (this.deps.mushroomSound.isPlaying) this.deps.mushroomSound.stop();
    this.deps.mushroomSound.play();
    if (!this.deps.hasPowerUp()) {
      this.deps.setPowerUp(true);
      const player = this.deps.getPlayer();
      player.scale.set(1.2, 1.5, 1.2);
    }
    this.scene.remove(this.model);
  }

  removeSelf() { if (this.model) this.scene.remove(this.model); }
}

// SuperStar
class SuperStar {
  constructor(scene, loader, position, deps) {
    this.scene = scene;
    this.loader = loader;
    this.position = position.clone();
    this.model = null;
    this.isCollected = false;
    this.rotationSpeed = 0.02;
    this.deps = deps; // { onScore, mushroomSound, getPlayer, applyStar, hasStar }

    this.loadModel();
  }

  loadModel() {
    this.loader.load('assets/super_mario_64_star.glb', (gltf) => {
      this.model = gltf.scene;
      this.model.position.copy(this.position);
      this.model.scale.set(.35, .35, .35);
      this.scene.add(this.model);
      this.model.traverse((child) => {
        if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; }
      });
    }, undefined, (e) => console.error('Error loading Super Star model:', e));
  }

  update() {
    if (!this.model || this.isCollected) return;
    this.model.rotation.y += this.rotationSpeed;
    this.model.position.y = this.position.y + Math.sin(performance.now() * 0.005) * 0.2;
    const player = this.deps.getPlayer();
    const d = this.model.position.distanceTo(player.position);
    if (d < 1) this.handleCollision();
  }

  handleCollision() {
    if (this.isCollected) return;
    this.isCollected = true;
    if (this.deps.mushroomSound.isPlaying) this.deps.mushroomSound.stop();
    this.deps.mushroomSound.play();
    this.deps.onScore(2000);
    this.deps.applyStar();
    this.scene.remove(this.model);
  }

  removeSelf() { if (this.model) this.scene.remove(this.model); }
}

// BrickCoin
class BrickCoin {
  constructor(scene, loader, position, deps) {
    this.scene = scene;
    this.loader = loader;
    this.position = position.clone();
    this.model = null;
    this.isCollected = false;
    this.deps = deps; // { coinSound, onCoin, getPlayer }

    this.loadModel();
  }

  loadModel() {
    this.loader.load('assets/voxel_coin.glb', (gltf) => {
      this.model = gltf.scene;
      this.model.position.copy(this.position);
      this.model.scale.set(0.06, 0.06, 0.06);
      this.model.name = 'BrickCoin';
      this.scene.add(this.model);

      this.model.traverse((child) => {
        if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; }
      });
    }, undefined, (e) => console.error('Error loading BrickCoin model:', e));
  }

  update() {
    if (!this.model || this.isCollected) return;
    const player = this.deps.getPlayer();
    const box = new THREE.Box3().setFromObject(this.model);
    if (box.intersectsSphere(new THREE.Sphere(player.position, 1))) this.handleCollision();
  }

  handleCollision() {
    if (this.isCollected) return;
    this.isCollected = true;
    this.deps.onCoin();
    if (this.deps.coinSound.isPlaying) this.deps.coinSound.stop();
    this.deps.coinSound.play();
    this.scene.remove(this.model);
  }

  removeSelf() { if (this.model) this.scene.remove(this.model); }
}

export { Goomba, SuperMushroom, SuperStar, BrickCoin };
