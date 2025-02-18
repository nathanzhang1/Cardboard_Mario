import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Set up scene, camera, renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enabled = true;
controls.minDistance = 10;
controls.maxDistance = 50;


//Load 1-1 Model
const loader = new GLTFLoader();
loader.load(
    'assets/super_mario_bros._level_1_-_1.glb',  // <-- Update with your actual file path
    function (gltf) {
        const model = gltf.scene;
        model.position.set(0, 0, 0); // Adjust the position if needed
        scene.add(model);
    },
    function (xhr) {
        console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    function (error) {
        console.error('Error loading model:', error);
    }
);



// Ground plane
// const groundGeometry = new THREE.PlaneGeometry(50, 50);
// const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
// const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// ground.rotation.x = -Math.PI / 2;
// scene.add(ground);

// Walls
// const wallGeometry = new THREE.BoxGeometry(2, 5, 2);
// const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
// const wall = new THREE.Mesh(wallGeometry, wallMaterial);
// wall.position.set(0, 2.5, -5);
// scene.add(wall);

// Walls = 1, paths = 0
// const mazeLayout = [
//     [1, 1, 1, 1, 1],
//     [1, 0, 0, 0, 1],
//     [1, 0, 1, 0, 1],
//     [1, 0, 0, 0, 1],
//     [1, 1, 1, 1, 1]
// ];

// PLace walls
// for (let i = 0; i < mazeLayout.length; i++) {
//     for (let j = 0; j < mazeLayout[i].length; j++) {
//         if (mazeLayout[i][j] === 1) {
//             const wall = new THREE.Mesh(wallGeometry, wallMaterial);
//             wall.position.set(i * 2 - 5, 2.5, j * 2 - 5);
//             scene.add(wall);
//         }
//     }
// }



function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
