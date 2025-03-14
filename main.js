import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


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



// Set up scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6185f8);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Soft white light
scene.add(ambientLight);

let level;
let parts = {};
const offset = 66;
const loader = new GLTFLoader();

//scene.add(cube);
loader.load(
    'assets/marioLevel.glb', 
    function (gltf) {
        level = gltf.scene;
        level.position.set(offset, 0, 0);
        //level.scale.set(2, 2, 2);
        scene.add(level);

        console.log('level', level.children[0].children[0].children[0].children[1]);
        let elements = level.children[0].children[0].children[0].children[1];
        elements.children.forEach(function(child){
            parts[child.name] = child;
        })


        console.log('parts', parts);
    },
    function (xhr) {
        console.log(`Loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
    },
    function (error) {
        console.error('Error loading model:', error);
    },
    
);


// //Create Player
let player; // Declare player globally
let currentModel; // To keep track of the current model (idle or walking)
let walkModel; // To store the walking model
let idleModel; // To store the idle model
let jumpModel; // To store the jumping model
let isWalking = false; // To check if Mario is walking
let isJumping = false; // To check if Mario is jumping
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
    pivot.position.set(5, 2.5, 3.82);

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

//Load the jump model
loader.load('assets/voxel_mario_amiibo.glb', function (gltf) {
    jumpModel = gltf.scene;

    // Compute the bounding box to find the dimensions of the model
    const box = new THREE.Box3().setFromObject(jumpModel);
    const size = box.getSize(new THREE.Vector3()); // Get the size of the bounding box
    const center = box.getCenter(new THREE.Vector3()); // Get the center of the bounding box

    // Center the model's geometry around its local origin
    jumpModel.position.sub(center); // Move the model so its center is at (0, 0, 0)

    // Apply the initial position offset (adjust as needed)
    jumpModel.position.set(0, 0.15, -0.15);

    // Rotate the jumping model 90 degrees around the Y-axis
    //jumpModel.rotation.y = (-1 * Math.PI) / 2; // 90 degrees in radians

    // Rescale the jumping model (adjust the values as needed)
    jumpModel.scale.set(0.1, 0.1, 0.1); // Scale down to 50% of the original size

    jumpModel.traverse((child) => {
        if(child.isMesh) {
            child.material = new THREE.MeshBasicMaterial({ map: child.material.map });
        }
    });
    jumpModel.visible = false; // Initially hide the jumping model

    // Add the jumping model to the player group (pivot)
    player.add(jumpModel);
});

// Function to switch between idle, walking, and jumping models
function switchModel(isWalking, isJumping) {
    if (isJumping) {
        // Activate the jumping model
        if (currentModel !== jumpModel) {
            currentModel.visible = false;
            jumpModel.visible = true;
            currentModel = jumpModel;
            stopMirroring(); // Stop mirroring if it was active
        }
    } else if (isWalking) {
        // Activate the walking model
        if (currentModel !== walkModel) {
            currentModel.visible = false;
            walkModel.visible = true;
            currentModel = walkModel;
            startMirroring();
        }
    } else {
        // Activate the idle model
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
    }, 250); // Adjust the interval to control the speed of the walking effect
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
            stuff = parts['pipes'];
           
            scene.remove(stuff);
            console.log('part removed')
        }
        else if (!appear){
            appear = true; 
            stuff = parts['pipes'];
            stuff.position.set(offset, 0, 0);    

            sceneAdd(scene, stuff);
            console.log('part added');
        }
    }
    if(event.key === '1') console.log('parts', parts);
    if(event.key === '2') console.log('scene', scene);
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
const forwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster()];
const upwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const downwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const forwardCollisionDist = 0.5;
const upwardCollisionDist = 0.1;
const downwardCollisionDist = 0.5;

let showRays = false;
let forwardArrows = [], upwardArrows = [], downwardArrows = [];

document.addEventListener("keydown", (event) => {
    if (event.key === "r" || event.key === "R") {
        showRays = !showRays;
        updateRayVisibility();
    }
});

function updateRayVisibility() {
    forwardArrows.forEach(arrow => {
        if (arrow) arrow.visible = showRays;
    });

    upwardArrows.forEach(arrow => {
        if (arrow) arrow.visible = showRays;
    });

    downwardArrows.forEach(arrow => {
        if (arrow) arrow.visible = showRays;
    });
}

function visualizeRay(origin, direction, existingArrow) {
    if (!showRays) return existingArrow; // Don't create or modify if rays are hidden

    if (existingArrow) {
        existingArrow.position.copy(origin);
        existingArrow.setDirection(direction.clone().normalize());
        return existingArrow;
    }

    const length = 5;
    const arrowHelper = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, 0xffff00);
    arrowHelper.visible = showRays; // Respect visibility state
    scene.add(arrowHelper);
    return arrowHelper;
}

function rotateVector(vector, rotationY) {
    let quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
    return vector.clone().applyQuaternion(quaternion);
}


let bouncingBlocks = [];

function bounceBlock(block) {
    if (bouncingBlocks.includes(block)) return; // Prevent duplicate bounces

    bouncingBlocks.push({ block, startY: block.position.y, upY: block.position.y + 0.5, direction: 1 });
}

function updatePlayerMovement() {
    let direction = new THREE.Vector3();
    let moveDirection = new THREE.Vector3();
    let right = new THREE.Vector3();

    if (keys.forward || keys.backward || keys.left || keys.right) {
        // Get camera's forward direction
        camera.getWorldDirection(direction);
        direction.y = 0; // Ignore vertical movement for forward direction
        right.crossVectors(camera.up, direction).normalize();

        // Calculate movement direction based on input
        moveDirection.set(0, 0, 0); // Reset move direction
        if (keys.forward) moveDirection.add(direction);
        if (keys.backward) moveDirection.sub(direction);
        if (keys.left) moveDirection.add(right);
        if (keys.right) moveDirection.sub(right);

        moveDirection.normalize().multiplyScalar(speed);
    }

    // Update forward ray origin to follow the player's position (adjusted by height)
    let forwardRayOrigins = [
        player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 0.3, 0)), 
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0))
    ];

    let canMoveForward = true;
    for (let i = 0; i < 2; i++) {
        forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
        forwardArrows[i] = visualizeRay(forwardRayOrigins[i], moveDirection, forwardArrows[i]);

        const forwardIntersections = forwardRaycasters[i].intersectObject(level, true);
        if (forwardIntersections.length > 0 && forwardIntersections[0].distance < forwardCollisionDist) {
            canMoveForward = false;
        }
    }

    // Jumping logic
    if (keys.jump && isOnGround) {
        velocity.y = jumpStrength;
        isOnGround = false;
    }

    // Apply gravity
    velocity.y -= gravity;

    // **ROTATE HEAD AND FOOT CORNERS ACCORDING TO MARIO'S ROTATION**
    const headCorners = [
        new THREE.Vector3(-0.25, marioSize.y, -0.25), 
        new THREE.Vector3(0.25, marioSize.y, -0.25),  
        new THREE.Vector3(-0.25, marioSize.y, 0.35),  
        new THREE.Vector3(0.25, marioSize.y, 0.35)   
    ].map(corner => rotateVector(corner, player.rotation.y).add(player.position));

    let hitCeiling = false;
    for (let i = 0; i < 4; i++) {
        upwardRaycasters[i].set(headCorners[i], new THREE.Vector3(0, 1, 0));
        upwardArrows[i] = visualizeRay(headCorners[i], new THREE.Vector3(0, 1, 0), upwardArrows[i]);

        const upwardIntersections = upwardRaycasters[i].intersectObject(level, true);
        if (upwardIntersections.length > 0 && upwardIntersections[0].distance < upwardCollisionDist) {
            let hitObject = upwardIntersections[0].object.parent; // This is the actual block eg. questionBlock001
            if (hitObject && (hitObject.parent.name === "questionBlocks" ||hitObject.parent.parent.name === "questionBlocks" || hitObject.parent.name === "bricks")) {
                bounceBlock(hitObject);
            }
            hitCeiling = true;
        }
    }

    if (hitCeiling) {
        velocity.y = Math.min(velocity.y, 0);
    }

    // Apply gravity (affect vertical movement)
    player.position.y += velocity.y;

    // Multi-ray ground detection
    const footCorners = [
        new THREE.Vector3(-0.45, 0, -0.25),  
        new THREE.Vector3(0.45, 0, -0.25),   
        new THREE.Vector3(-0.45, 0, 0.05),   
        new THREE.Vector3(0.45, 0, 0.05)     
    ].map(corner => rotateVector(corner, player.rotation.y).add(player.position));

    let onGround = false;
    for (let i = 0; i < 4; i++) {
        downwardRaycasters[i].set(footCorners[i], new THREE.Vector3(0, -1, 0));
        downwardArrows[i] = visualizeRay(footCorners[i], new THREE.Vector3(0, -1, 0), downwardArrows[i]);
        
        
        const downwardIntersections = downwardRaycasters[i].intersectObject(level, true);
        console.log(downwardIntersections)
        if (downwardIntersections.length > 0 && downwardIntersections[0].distance < downwardCollisionDist) {
            onGround = true;
            let hitObject = downwardIntersections[0].object.parent;
            console.log('hitO', hitObject);
            if (hitObject && hitObject.name == 'pipe4')
            {
                player.position.set(100, 100, 100);
            }
            player.position.y = downwardIntersections[0].point.y + 0.1;
            velocity.y = 0;
        }
    }

    isOnGround = onGround;

    // Move player **ONLY IF NO FORWARD COLLISION**, but still allow gravity!
    if (canMoveForward) {
        player.position.add(moveDirection);
    }

    // Rotate player to face movement direction if moving
    if (canMoveForward && moveDirection.length() > 0) {
        player.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
    }

    // Update the forward ray dynamically with jumping motion
    forwardRayOrigins = [
        player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 0.3, 0)), // Left edge
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0))  // Right edge
    ];
    
    for (let i = 0; i < 2; i++) {
        forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
    }
}



class Goomba {
    constructor(scene, loader, position, movementRange, speed) {
        this.scene = scene;
        this.loader = loader;
        this.position = position.clone();
        this.movementRange = movementRange;
        this.speed = speed;
        this.isMovingForward = true;
        this.isMirrored = false;
        this.mirrorInterval = null;
        this.model = null;

        this.loadModel();
    }

    loadModel() {
        this.loader.load('assets/voxel_goomba.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(0.1, 0.1, 0.1);
            this.model.rotation.y = (-1 * Math.PI) / 2; // Rotate to face the correct direction
            this.scene.add(this.model);

            // Start the walking animation
            this.startWalking();
        }, undefined, (error) => {
            console.error("Error loading Goomba model:", error);
        });
    }

    startWalking() {
        this.mirrorInterval = setInterval(() => {
            this.model.scale.x *= -1; // Mirror the model by flipping the X scale
            this.isMirrored = !this.isMirrored; // Toggle the mirrored state

            // Adjust the position when mirroring
            if(this.isMovingForward) {
                if (this.isMirrored) {
                    this.model.position.z += 1.25; // Adjust this value as needed
                } else {
                    this.model.position.z -= 1.25; // Adjust this value as needed
                }
            }
            else {
                if (this.isMirrored) {
                    this.model.position.z -= 1.25; // Adjust this value as needed
                } else {
                    this.model.position.z += 1.25; // Adjust this value as needed
                }
            }
        }, 250); // Adjust the interval to control the speed of the walking effect
    }

    stopWalking() {
        clearInterval(this.mirrorInterval);
    }

    update() {
        if (!this.model) return;

        // Move forward or backward based on the current state
        if (this.isMovingForward) {
            this.model.position.x -= this.speed; // Move forward (negative X direction)
        } else {
            this.model.position.x += this.speed; // Move backward (positive X direction)
        }

        // Check if the Goomba has reached the end of its movement range
        const distanceTraveled = Math.abs(this.model.position.x - this.position.x);
        if (distanceTraveled >= this.movementRange) {
            // Toggle movement direction
            this.isMovingForward = !this.isMovingForward;

            // Flip the Goomba's direction
            this.model.scale.z *= -1;
            this.isMirrored = !this.isMirrored;
        }

        // Check for collisions with Mario
        const distanceToMario = this.model.position.distanceTo(player.position);
        if (distanceToMario < 1) { // Adjust collision distance as needed
            this.handleCollision();
        }
    }

    handleCollision() {
        // Check if Mario is jumping on the Goomba
        if (isJumping && player.position.y > this.model.position.y + 0.5) {
            // Mario stomps the Goomba
            this.scene.remove(this.model);
            this.stopWalking();
        } else {
            // Mario loses a life or takes damage
            console.log("Mario hit by Goomba!");
            // Implement logic for Mario losing a life or taking damage
        }
    }

}

// Array to store all Goomba instances
const goombas = [];

// Create multiple Goombas with different positions and movement ranges
goombas.push(new Goomba(scene, loader, new THREE.Vector3(17.5, 2.10, 3.32), 10, 0.05)); // Goomba 1
goombas.push(new Goomba(scene, loader, new THREE.Vector3(43.75, 2.10, 3.32), 2, 0.05)); // Goomba 2
goombas.push(new Goomba(scene, loader, new THREE.Vector3(53.5, 2.10, 3.32), 3.5, 0.05)); // Goomba 3
goombas.push(new Goomba(scene, loader, new THREE.Vector3(82.5, 2.10, 1.32), 5, 0.05)); // Goomba 4
goombas.push(new Goomba(scene, loader, new THREE.Vector3(82.5, 2.10, 5.32), 5, 0.05)); // Goomba 5
goombas.push(new Goomba(scene, loader, new THREE.Vector3(105, 2.10, 3.32), 10, 0.05)); // Goomba 6
goombas.push(new Goomba(scene, loader, new THREE.Vector3(125, 2.10, 1.32), 10, 0.05)); // Goomba 7
goombas.push(new Goomba(scene, loader, new THREE.Vector3(125, 2.10, 5.32), 10, 0.05)); // Goomba 8
goombas.push(new Goomba(scene, loader, new THREE.Vector3(175, 2.10, 1.32), 10, 0.05)); // Goomba 9
goombas.push(new Goomba(scene, loader, new THREE.Vector3(175, 2.10, 5.32), 10, 0.05)); // Goomba 10


function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) return;

    // Update player movement
    updatePlayerMovement();
    

    // Handle bouncing blocks
    bouncingBlocks.forEach((entry, index) => {
        let { block, startY, upY, direction } = entry;
        block.position.y += direction * 0.05;

        if (direction === 1 && block.position.y >= upY) {
            entry.direction = -1;
        } else if (direction === -1 && block.position.y <= startY) {
            block.position.y = startY; // Snap back
            bouncingBlocks.splice(index, 1); // Remove from array
        }
    });
    // Update all Goombas
    goombas.forEach(goomba => goomba.update());

    // Check if Mario is walking or jumping
    isWalking = keys.forward || keys.backward || keys.left || keys.right;
    isJumping = !isOnGround; // Mario is jumping if he's not on the ground

    // Switch models based on walking and jumping states
    switchModel(isWalking, isJumping);
    
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