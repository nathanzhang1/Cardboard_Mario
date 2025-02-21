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

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.target.set(0, 0, 0);
// controls.enabled = true;
// controls.minDistance = 10;
// controls.maxDistance = 50;

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
const block = new THREE.Mesh(playerGeometry, playerMaterial);
block.position.set(0, 2.5, 3.82);
scene.add(block);

//camera.lookAt(player.position);

let player; // Declare player globally

loader.load('assets/mario_-_super_mario_bros_3d_sprite.glb', function (gltf) {
    player = gltf.scene;

    // Compute bounding box to inspect the actual center
    const box = new THREE.Box3().setFromObject(player);
    const center = box.getCenter(new THREE.Vector3());
    console.log("Bounding Box Center:", center); // Debugging

    // Helper: Show the pivot position
    const pivotHelper = new THREE.AxesHelper(1);
    player.add(pivotHelper);

    player.position.set(0, 2.5, 3.82);

    scene.add(player);

}, undefined, function (error) {
    console.error("Error loading Mario model:", error);
});


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


const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;  
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.minDistance = 3;  // Min zoom
controls.maxDistance = 10; // Max zoom



let velocity = { x: 0, y: 0, z: 0 };  
const speed = 0.15;  // Movement speed  
const gravity = 0.02;  // Gravity force  
const jumpStrength = 0.5;  
let isOnGround = false;  


function updatePlayerMovement() {
    let direction = new THREE.Vector3();

    if (keys.forward || keys.backward || keys.left || keys.right) {
        // Get camera's forward direction
        camera.getWorldDirection(direction);
        direction.y = 0; // Ignore vertical movement

        let right = new THREE.Vector3();
        right.crossVectors(camera.up, direction).normalize(); // Get right vector

        // Calculate movement direction based on input
        let moveDirection = new THREE.Vector3();
        if (keys.forward) moveDirection.add(direction);
        if (keys.backward) moveDirection.sub(direction);
        if (keys.left) moveDirection.add(right);
        if (keys.right) moveDirection.sub(right);

        moveDirection.normalize().multiplyScalar(speed);
        player.position.add(moveDirection);

        // Rotate Mario to face movement direction
        if (moveDirection.length() > 0) {
            player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        }
    }
}


function animate() {
    requestAnimationFrame(animate);

    // // Reset velocity each frame
    // velocity.x = 0;
    // velocity.z = 0;

    // // Movement in four directions
    // if (keys.left) velocity.x = -speed;
    // if (keys.right) velocity.x = speed;
    // if (keys.forward) velocity.z = -speed;
    // if (keys.backward) velocity.z = speed;

    // Apply gravity
    velocity.y -= gravity;
    player.position.y += velocity.y;

    // Simulate ground collision (adjust based on your level's ground height)
    if (player.position.y <= 2) {  
        player.position.y = 2;
        velocity.y = 0;
        isOnGround = true;
    } else {
        isOnGround = false;
    }

    // Jumping logic
    if (keys.jump && isOnGround) {
        velocity.y = jumpStrength;
    }

    // // Apply movement
    // player.position.x += velocity.x;
    // player.position.z += velocity.z;



    // Update player movement
    updatePlayerMovement();

    // Calculate the offset from the player based on the camera's current direction
    let offset = new THREE.Vector3();
    offset.subVectors(camera.position, controls.target); // Get current offset from target

    // Set the new target position to the player's updated position
    controls.target.set(player.position.x, player.position.y, player.position.z);

    // Maintain the same offset from the player
    camera.position.copy(player.position).add(offset);

    // Update OrbitControls without changing its orientation
    controls.update();



    // // Update camera position (smooth follow)
    // const cameraOffset = new THREE.Vector3(0, 8, 12);  // Adjust as needed
    // const targetPosition = player.position.clone().add(cameraOffset);

    // // Smoothly interpolate the camera's position
    // camera.position.lerp(targetPosition, 0.5);  

    // // Make the camera look at the player
    // camera.lookAt(player.position);


    renderer.render(scene, camera);
}

animate();