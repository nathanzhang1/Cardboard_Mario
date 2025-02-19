import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Set up scene, camera, renderer
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);
//camera.lookAt(0, 0, 0);

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
    'assets/super_mario_bros._level_1_-_1.glb', 
    function (gltf) {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        scene.add(model);
    },
    function (xhr) {
        console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    function (error) {
        console.error('Error loading model:', error);
    }
);



//Create Player
const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 2.5, 3.82);
scene.add(player);

camera.lookAt(player.position);

//Player Controller
const keys = { forward: false, backward: false, left: false, right: false, jump: false };
document.addEventListener("keydown", (event) => {
    if (event.code === "ArrowUp" || event.code === "KeyW") keys.forward = true;
    if (event.code === "ArrowDown" || event.code === "KeyS") keys.backward = true;
    if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = true;
    if (event.code === "Space") keys.jump = true;
});

document.addEventListener("keyup", (event) => {
    if (event.code === "ArrowUp" || event.code === "KeyW") keys.forward = false;
    if (event.code === "ArrowDown" || event.code === "KeyS") keys.backward = false;
    if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = false;
    if (event.code === "Space") keys.jump = false;
});

let velocity = { x: 0, y: 0, z: 0 };  
const speed = 0.15;  // Movement speed  
const gravity = 0.02;  // Gravity force  
const jumpStrength = 0.5;  
let isOnGround = false;  

function animate() {
    requestAnimationFrame(animate);

    // Reset velocity each frame
    velocity.x = 0;
    velocity.z = 0;

    // Movement in four directions
    if (keys.left) velocity.x = -speed;
    if (keys.right) velocity.x = speed;
    if (keys.forward) velocity.z = -speed;
    if (keys.backward) velocity.z = speed;

    // Apply gravity
    velocity.y -= gravity;
    player.position.y += velocity.y;

    // Simulate ground collision (adjust based on your level's ground height)
    if (player.position.y <= 2.5) {  
        player.position.y = 2.5;
        velocity.y = 0;
        isOnGround = true;
    } else {
        isOnGround = false;
    }

    // Jumping logic
    if (keys.jump && isOnGround) {
        velocity.y = jumpStrength;
    }

    // Apply movement
    player.position.x += velocity.x;
    player.position.z += velocity.z;


    // Update camera position (smooth follow)
    const cameraOffset = new THREE.Vector3(0, 8, 12);  // Adjust as needed
    const targetPosition = player.position.clone().add(cameraOffset);

    // Smoothly interpolate the camera's position
    camera.position.lerp(targetPosition, 0.5);  

    // Make the camera look at the player
    camera.lookAt(player.position);


    renderer.render(scene, camera);
}

animate();