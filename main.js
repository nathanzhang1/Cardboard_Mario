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

let marioSize;
let marioCenter;

// Load the idle model
loader.load('assets/mario_-_super_mario_bros_3d_sprite.glb', function (gltf) {
    idleModel = gltf.scene;

    // Compute the bounding box to find the dimensions of the model
    const box = new THREE.Box3().setFromObject(idleModel);
    const size = box.getSize(new THREE.Vector3()); // Get the size of the bounding box
    const center = box.getCenter(new THREE.Vector3()); // Get the center of the bounding box

    marioSize = size;
    marioCenter = center;

    // Create a new group to act as the pivot point
    const pivot = new THREE.Group();
    scene.add(pivot);

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


// Create a raycaster once (outside the function) so we don't create a new one every frame.
const forwardRaycaster = new THREE.Raycaster();
const upwardRaycaster = new THREE.Raycaster();
const collisionDistance = 0.5; // Distance threshold to detect collisions

let forwardArrow, upwardArrow;
function visualizeRay(origin, direction, existingArrow) {
    if (existingArrow) scene.remove(existingArrow); // Remove the previous arrow
    const length = 5;
    const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, 0xffff00);
    scene.add(arrowHelper);
    return arrowHelper;
}

function updatePlayerMovement() {
    let direction = new THREE.Vector3();
    let moveDirection = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (keys.forward || keys.backward || keys.left || keys.right) {
        // Get camera's forward direction
        camera.getWorldDirection(direction);
        direction.y = 0;
        right.crossVectors(camera.up, direction).normalize();

        // Calculate movement direction based on input
        let moveDirection = new THREE.Vector3();
        if (keys.forward) moveDirection.add(direction);
        if (keys.backward) moveDirection.sub(direction);
        if (keys.left) moveDirection.add(right);
        if (keys.right) moveDirection.sub(right);

        moveDirection.normalize().multiplyScalar(speed);

        // Update forward ray origin to follow the player's position (adjusted by height)
        let forwardRayOrigin = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        forwardRaycaster.set(forwardRayOrigin, moveDirection.clone().normalize());

        forwardArrow = visualizeRay(forwardRayOrigin, moveDirection, forwardArrow);
        
        const forwardIntersections = forwardRaycaster.intersectObject(level, true);
        console.log("forward intersections", forwardIntersections);

        // If an intersection is detected within collisionDistance, cancel movement
        if (forwardIntersections.length > 0 && forwardIntersections[0].distance < collisionDistance) {
            return;
        }

        // If no collision is detected, apply the movement:
        player.position.add(moveDirection);

        // Rotate Mario to face movement direction
        if (moveDirection.length() > 0) {
            player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
        }
    }

    // Jumping logic
    if (keys.jump && isOnGround) {
        velocity.y = jumpStrength;  // Apply jump force
        isOnGround = false;  // The player is now in the air
    }

    // Apply gravity
    velocity.y -= gravity;

    let upwardRayOrigin = player.position.clone().add(new THREE.Vector3(0, marioSize.y, 0));
    upwardRaycaster.set(upwardRayOrigin, new THREE.Vector3(0, 1, 0));

    upwardArrow = visualizeRay(upwardRayOrigin, new THREE.Vector3(0, 1, 0), upwardArrow);

    const upwardIntersections = upwardRaycaster.intersectObject(level, true);
    console.log("upward intersections", upwardIntersections);

    if (upwardIntersections.length > 0 && upwardIntersections[0].distance < 0.1) {
        velocity.y = Math.min(velocity.y, 0);  // Stop upward movement if hitting a ceiling
    }

    player.position.y += velocity.y;

    // Update the forwardRay origin and direction during jumping (same as ground movement)
    let forwardRayOrigin = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));  // Adjust for player height
    forwardRaycaster.set(forwardRayOrigin, moveDirection.clone().normalize()); // Update the forwardRay’s direction dynamically
}


function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) return;

    // // Apply gravity
    // velocity.y -= gravity;
    // player.position.y += velocity.y;

    // Simulate ground collision (adjust based on your level's ground height)
    if (player.position.y <= 2) {  
        player.position.y = 2;
        velocity.y = 0;
        isOnGround = true;
    } else {
        isOnGround = false;
    }

    // // Jumping logic
    // if (keys.jump && isOnGround) {
    //     velocity.y = jumpStrength;
    // }

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