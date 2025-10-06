import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6185f8);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 50000);
sunLight.position.set(100, 100, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -500;
sunLight.shadow.camera.right = 500;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;
scene.add(sunLight);

const sunGeometry = new THREE.BoxGeometry(20, 20, 20);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sunCube = new THREE.Mesh(sunGeometry, sunMaterial);
sunCube.position.copy(sunLight.position);
scene.add(sunCube);

const helper = new THREE.PointLightHelper(sunLight);
scene.add(helper);
helper.visible = false;

const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
scene.add(shadowHelper);
shadowHelper.visible = false;

const planeGeometry = new THREE.PlaneGeometry(500, 500, 500, 500);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x6185f8, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 10;

// Audio
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();

const mushroomSound = new THREE.Audio(listener);
const coinSound = new THREE.Audio(listener);
const goombaSound = new THREE.Audio(listener);
const pipSound = new THREE.Audio(listener);
const deathSound = new THREE.Audio(listener);
const winSound = new THREE.Audio(listener);

audioLoader.load('assets/Super Mario Bros. - Mushroom Sound Effect.mp3', (b) => { mushroomSound.setBuffer(b); mushroomSound.setVolume(0.1); });
audioLoader.load('assets/Super Mario Bros. - Coin Sound Effect.mp3', (b) => { coinSound.setBuffer(b); coinSound.setVolume(0.2); });
audioLoader.load('assets/Super Mario Bros- Goomba Stomp Sound.mp3', (b) => { goombaSound.setBuffer(b); goombaSound.setVolume(1); });
audioLoader.load('assets/Super Mario Bros. -Pipe TravelPower Down Sound Effect -.mp3', (b) => { pipSound.setBuffer(b); pipSound.setVolume(0.5); });
audioLoader.load('assets/Mario Death - Sound Effect (HD).mp3', (b) => { deathSound.setBuffer(b); deathSound.setVolume(0.5); });
audioLoader.load('assets/Super Mario Bros (NES) Music - Level Clear.mp3', (b) => { winSound.setBuffer(b); winSound.setVolume(0.5); });

// Loaders
const gltfLoader = new GLTFLoader();
const mtlLoader = new MTLLoader();
const objLoader = new OBJLoader();

function setHelpersVisible(v) {
  helper.visible = v;
  shadowHelper.visible = v;
}

export {
  THREE,
  scene,
  camera,
  renderer,
  controls,
  sunLight,
  sunCube,
  helper,
  shadowHelper,
  setHelpersVisible,
  plane,
  planeMaterial,
  gltfLoader as loader,
  mtlLoader,
  objLoader,
  mushroomSound,
  coinSound,
  goombaSound,
  pipSound,
  deathSound,
  winSound,
};
