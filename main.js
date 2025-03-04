let gameStarted = false;

// Hide title screen overlay when Enter is pressed
document.addEventListener("keydown", (event) => {
    if (event.code === "Enter") {
        const titleScreen = document.getElementById("title-screen");
        if (titleScreen) {
            titleScreen.style.display = "none";  // Hides the overlay
        }
        gameStarted = true;
    }
});

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Set up scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6185f8);

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



const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05);
const wireframe = new THREE.WireframeGeometry(geometry);
const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.LineSegments(wireframe, material);
cube.position.set(0, 1.5, 0.35);

 
let level;
let parts = {};
let levelBoxes = [];
let levelBoxHelpers = [];


const loader = new GLTFLoader();
//scene.add(cube);
loader.load(
    'assets/namedLevel.glb', 
    function (gltf) {
        level = gltf.scene;
        level.position.set(65.69, 0, 0);
        //level.scale.set(2, 2, 2);
        scene.add(level);
        level.traverse((child) => {
            console.log(child.name);
            parts[child.name] = child;

            // Create a bounding box for each part
            const childBox = new THREE.Box3().setFromObject(child);
            levelBoxes.push(childBox);

            // Create a BoxHelper for each level part to visualize the bounding box
            const boxHelper = new THREE.BoxHelper(child, 0xff0000);  // Red box for each part
            levelBoxHelpers.push(boxHelper);
            scene.add(boxHelper);  // Add BoxHelper to the scene
        })
    },
    function (xhr) {
        console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    function (error) {
        console.error('Error loading model:', error);
    },
    
);
console.log('parts', parts);


//const box = new THREE.Box3().setFromObject(level);
//const boxHelper = new THREE.Box3Helper(box, 0x00ff00); 
//scene.add(boxHelper);

// //Create Player
let player; // Declare player globally
let currentModel; // To keep track of the current model (idle or walking)
let walkModel; // To store the walking model
let idleModel; // To store the idle model
let isWalking = false; // To check if Mario is walking
let mirrorInterval; // To handle the mirroring effect
let playerBox; // Mario bounding box

// Load the idle model
loader.load('assets/mario_-_super_mario_bros_3d_sprite.glb', function (gltf) {
    idleModel = gltf.scene;

    // Create a new group to act as the pivot point
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Compute the bounding box to find the dimensions of the model
    const box = new THREE.Box3().setFromObject(idleModel);
    const size = box.getSize(new THREE.Vector3()); // Get the size of the bounding box
    const center = box.getCenter(new THREE.Vector3()); // Get the center of the bounding box

    // Adjust the model's position so that the pivot is at the bottom (feet)
    idleModel.position.sub(center); // Center the model relative to the pivot
    idleModel.position.y += size.y / 2; // Move the model up by half its height

    // Add the model to the pivot group
    pivot.add(idleModel);

    // Position the pivot group in the scene
    pivot.position.set(0, 2.5, 3.82);

    // Update your player reference to the pivot group
    player = pivot;
    currentModel = idleModel; // Set the current model to idle

    // Create custom bounding box dimensions for the player (manually set dimensions)
    const playerBoxSize = new THREE.Vector3(2, 3, 1); // Set the width, height, and depth (x, y, z)
    const playerBoxCenter = player.position; // Position of the player's bounding box

    // Create a custom bounding box for the player
    playerBox = new THREE.Box3().setFromCenterAndSize(playerBoxCenter, playerBoxSize);
    let playerBoxHelper = new THREE.BoxHelper(player, 0x00ff00);  // Green box for the player
    scene.add(playerBoxHelper);

}, undefined, function (error) {
    console.error("Error loading Mario model:", error);
});


// Load the walking model
loader.load('assets/mario_walk.glb', function (gltf) {
    walkModel = gltf.scene;

    // Compute the bounding box to find the dimensions of the model
    const box = new THREE.Box3().setFromObject(walkModel);
    const size = box.getSize(new THREE.Vector3()); // Get the size of the bounding box
    const center = box.getCenter(new THREE.Vector3()); // Get the center of the bounding box

    // Center the model's geometry around its local origin
    walkModel.position.sub(center); // Move the model so its center is at (0, 0, 0)

    // Apply the initial position offset (adjust as needed)
    walkModel.position.set(0.25, -0.7, -0.15);

    // Rotate the walking model 90 degrees around the Y-axis
    walkModel.rotation.y = (-1 * Math.PI) / 2; // 90 degrees in radians

    walkModel.traverse((child) => {
        if(child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({ map: child.material.map });
        }
    });
    walkModel.visible = false; // Initially hide the walking model

    // Add the walking model to the player group (pivot)
    player.add(walkModel);
});

// Function to switch between idle and walking models
function switchModel(isWalking) {
    if (isWalking) {
        if (currentModel !== walkModel) {
            currentModel.visible = false;
            walkModel.visible = true;
            currentModel = walkModel;
            startMirroring();
        }
    } else {
        if (currentModel !== idleModel) {
            currentModel.visible = false;
            idleModel.visible = true;
            currentModel = idleModel;
            stopMirroring();
        }
    }
}

let isMirrored = false; // Track whether the model is currently mirrored

// Function to start mirroring the walking model
function startMirroring() {
    mirrorInterval = setInterval(() => {
        walkModel.scale.z *= -1; // Mirror the model by flipping the X scale
        isMirrored = !isMirrored; // Toggle the mirrored state

        // Adjust the position when mirroring
        if (isMirrored) {
            walkModel.position.x -= 0.5; // Adjust this value as needed
        } else {
            walkModel.position.x += 0.5; // Adjust this value as needed
        }
    }, 300); // Adjust the interval to control the speed of the walking effect
}

// Function to stop mirroring the walking model
function stopMirroring() {
    clearInterval(mirrorInterval);

    // Reset the scale and position
    if (isMirrored) {
        walkModel.scale.z = Math.abs(walkModel.scale.x); // Reset the scale to original
        walkModel.position.x += 0.5; // Adjust this value as needed
        isMirrored = false; // Reset the mirrored state
    }
}


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


let state = 0;
let appear = true;
let stuff;

document.addEventListener("keyup", (event) =>{
    if (event.key == "`"){
        state ++;
        if((state % 3) == 1){scene.add(cube);}
        if((state % 3) == 2){scene.remove(level);}
        if((state % 3) == 0){scene.remove(cube); scene.add(level);}

        console.log("state", state % 3);
    
    }

    if(event.key == 'p'){
        if(appear){
            appear = false; 
            stuff = parts['Object_4'];
            console.log(stuff);
            scene.remove(stuff);
            console.log('part removed')
        }
        else if (!appear){
            appear = true; 
            stuff = parts['Object_4'];
            console.log(stuff);
            stuff.scale.set(100, 100, 100);
            scene.add(stuff);
            console.log('part added');
        }
    }
});


//Camera Controller
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;  
controls.dampingFactor = 0.1;
controls.enablePan = false;
controls.minDistance = 3;  // Min zoom
controls.maxDistance = 10; // Max zoom

//Physics Variables
let velocity = { x: 0, y: 0, z: 0 };  
const speed = 0.15;  // Movement speed  
const gravity = 0.02;  // Gravity force  
const jumpStrength = 0.5;  
let isOnGround = false;  

// Function to check if the player is colliding with any object
function checkCollisions() {
    // Update the player's bounding box based on current position
    playerBox.setFromObject(player);

    // Check collision with level parts
    for (let i = 0; i < levelBoxes.length; i++) {
        if (playerBox.intersectsBox(levelBoxes[i])) {
            console.log('Collision detected with: ', parts[Object.keys(parts)[i]]);
            return true; // Collision detected
        }
    }

    return false; // No collision
}

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

        // Temporarily apply the movement
        let newPosition = player.position.clone().add(moveDirection);

        // Set the player's new position only if there's no collision
        player.position.set(newPosition.x, player.position.y, newPosition.z);

        // Check if the new position collides
        if (checkCollisions()) {
            // Revert to previous position if there's a collision
            player.position.set(player.position.x - moveDirection.x, player.position.y, player.position.z - moveDirection.z);
        }

        // Rotate Mario to face movement direction
        if (moveDirection.length() > 0) {
            player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        }
    }
}


function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) return;

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

    //if(mapRendered){scene.add(model)}

    // Update player movement
    updatePlayerMovement();

    // Check if Mario is walking
    isWalking = keys.forward || keys.backward || keys.left || keys.right;
    switchModel(isWalking);
    
    // Calculate the offset from the player based on the camera's current direction
    let offset = new THREE.Vector3();
    offset.subVectors(camera.position, controls.target); // Get current offset from target

    // Set the new target position to the player's updated position
    controls.target.set(player.position.x, player.position.y, player.position.z);

    // Maintain the same offset from the player
    camera.position.copy(player.position).add(offset);

    // Update OrbitControls without changing its orientation
    controls.update();


    renderer.render(scene, camera);
}

animate();