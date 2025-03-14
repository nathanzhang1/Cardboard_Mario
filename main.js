import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';


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

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // High-quality soft shadows

const sunLight = new THREE.PointLight(0xffffff, 50000);
sunLight.position.set(100, 100, 100); // High up to simulate the sun
// sunLight.intensity = 3;
// sunLight.distance = 5000;
//sunLight.target.position.set(100, 0, 100);
sunLight.castShadow = true;

// Create the Sun Cube
const sunGeometry = new THREE.BoxGeometry(20, 20, 20); // Small cube
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sunCube = new THREE.Mesh(sunGeometry, sunMaterial);

// Position the sun cube at the same position as the light
sunCube.position.copy(sunLight.position);

scene.add(sunCube);

sunLight.shadow.mapSize.width = 2048;  // Increase resolution
sunLight.shadow.mapSize.height = 2048;

sunLight.shadow.camera.near = 0.5;     // Adjust near plane
sunLight.shadow.camera.far = 500;      // Increase far plane

sunLight.shadow.camera.left = -500;    // Expand shadow coverage
sunLight.shadow.camera.right = 500;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;

// Add light to the scene
scene.add(sunLight);

const helper = new THREE.PointLightHelper(sunLight);
scene.add(helper);

const shadowHelper = new THREE.CameraHelper(sunLight.shadow.camera);
scene.add(shadowHelper);

const planeGeometry = new THREE.PlaneGeometry(500, 500, 500, 500)
const planeMaterial = new THREE.MeshBasicMaterial({color: 0x6185f8, side: THREE.DoubleSide})
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
//lane.position.set(0, -30, 0);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

let level;
let parts = {};
const offset = 66;
const loader = new GLTFLoader();

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

//scene.add(cube);
loader.load(
    'assets/marioLevel.glb', 
    function (gltf) {
        level = gltf.scene;
        level.position.set(offset, 0, 0);
        //level.scale.set(2, 2, 2);
        scene.add(level);

       
        let elements = level.children[0].children[0].children[0].children[1];
        elements.children.forEach(function(child){
            convertMaterialsAndEnableShadows(child);
            parts[child.name] = child;
        })


        //console.log('parts', parts);
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

let hasPowerUp = false; // To handle if Mario has a mushroom
let isInvincible = false; // Tracks if Mario is currently invincible
let invincibilityTimer = 0; // Tracks how long Mario has been invincible
const invincibilityDuration = 1000; // 1 second of invincibility
let hasStar = false; //To handle if Mario has a star
let starTimer = 0; // Tracks how long Mario has been invincible
const starDuration = 10000; // 1 second of invincibility

let marioSize;
let marioCenter;
let win = false;

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

    convertMaterialsAndEnableShadows(idleModel);

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

    convertMaterialsAndEnableShadows(walkModel);

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

    convertMaterialsAndEnableShadows(jumpModel);

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

        //console.log("state", state % 3);
    
    }
    if(event.key == 'p'){
        if(appear){
            appear = false; 
            stuff = parts['pipes'];
           
            scene.remove(stuff);
            //console.log('part removed')
        }
        else if (!appear){
            appear = true; 
            stuff = parts['pipes'];
            stuff.position.set(offset, 0, 0);    

            sceneAdd(scene, stuff);
            //console.log('part added');
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
const terminalVelocity = -0.5;
let isOnGround = false;  


// Create a raycaster once (outside the function) so we don't create a new one every frame.
const forwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const upwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const downwardRaycasters = [new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster(), new THREE.Raycaster()];
const forwardCollisionDist = 0.5;
const upwardCollisionDist = 0.1;
const downwardCollisionDist = 0.55;

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

    // Toggle Goomba bounding box visibility
    goombas.forEach(goomba => {
        if (goomba.boxHelper) {
            goomba.boxHelper.visible = showRays;
        }
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

// For making blocks bounce when hit by Mario's head
let bouncingBlocks = [];

function bounceBlock(block) {
    if (bouncingBlocks.includes(block)) return; // Prevent duplicate bounces

    bouncingBlocks.push({ block, startY: block.position.y, upY: block.position.y + 0.5, direction: 1 });
}

let coinCount = 0;
let collectedCoins = new Set();

function checkCoinCollection() {
    if (player.position.y < 0) {
        parts.coins.children.forEach(coin => {
            const boundingBox = new THREE.Box3().setFromObject(coin);
            if (boundingBox.intersectsSphere(new THREE.Sphere(player.position, 1))) {
                if (!collectedCoins.has(coin)) {
                    collectedCoins.add(coin);
                    coin.parent.remove(coin);
                    coinCount++;
                    //console.log(coinCount);
                }
            }
        });
    }
}

function findRootGoombaModel(object) {
    // Traverse up the parent hierarchy to find the root Goomba model
    while (object.parent) {
        if (object.parent.name === "Goomba") {
            return object.parent;
        }
        object = object.parent;
    }
    return null; // Return null if no Goomba model is found
}

let questionBlock002_spawn = false;
let questionBlock005_spawn = false;
let questionBlock0010_spawn = false;

let starBrick_spawn = false;

let brickCoinSpawns = {
    brick001: false,
    brick003: false,
    brick005: false,
    brick017: false,
    brick027: false,
    brick028: false,
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
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0)),
        player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 1.3, 0)), 
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 1.3, 0))
    ];

    let canMoveForward = true;
    let shouldClimb = false;

    for (let i = 0; i < 4; i++) {
        forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
        forwardArrows[i] = visualizeRay(forwardRayOrigins[i], moveDirection, forwardArrows[i]);

        const forwardIntersections = forwardRaycasters[i].intersectObjects([level, ...goombas.map(goomba => goomba.model)], true);
        if (forwardIntersections.length > 0 && forwardIntersections[0].distance < forwardCollisionDist) {
            const hitObject = forwardIntersections[0].object;
            //console.log(forwardIntersections);
            // Find the root Goomba model
            const rootGoombaModel = findRootGoombaModel(hitObject);

            // Check if the hit object is part of a Goomba
            if (rootGoombaModel) {
                console.log("Mario hit a Goomba from the side!");
                const goomba = goombas.find(g => g.model === rootGoombaModel);
                if (goomba) {
                    goomba.handleMarioDamage();
                }
            } else if (hitObject.parent.name === "coins") {
                continue; // Ignore coins
            } else {

           if(hitObject.name == 'pipeTop5')
           {
             player.position.set(170.5, 4.2, 4)
             lightSwitch(0);
           }
           if(hitObject.name == 'flagBrick')
           {
             win = true;
           }
        
    
            // Check if only the bottom rays (0 and 1) detect a collision while the top ones (2 and 3) do not
            if (i < 2) {
                shouldClimb = true;
            } else {
                shouldClimb = false;
            }

            canMoveForward = false;
            }
        }
    }

    // Jumping logic
    if (keys.jump && isOnGround) {
        velocity.y = jumpStrength;
        isOnGround = false;
    }

    // Apply gravity
    if (!isOnGround) {
        velocity.y -= gravity;
    }

    // Apply terminal velocity cap
    if (velocity.y < terminalVelocity) {
        velocity.y = terminalVelocity;
    }

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
            console.log("Upward", upwardIntersections);
            if (upwardIntersections[0].object.parent.name === "coins") {
                continue;
            }
            let hitObject = upwardIntersections[0].object.parent; // This is the actual block eg. questionBlock001
            if (hitObject && (hitObject.parent.name === "questionBlocks" || hitObject.parent.parent.name === "questionBlocks" || hitObject.parent.name === "bricks" || hitObject.parent.parent.name === "bricks")) {
                bounceBlock(hitObject);
                if (hitObject && hitObject.name === "questionBlock002" ) {
                    if(!questionBlock002_spawn) {
                        spawnMushroom(hitObject.name);
                        questionBlock002_spawn = true;
                    }
                }
                if (hitObject && hitObject.name === "questionBlock005" ) {
                    if(!questionBlock005_spawn) {
                        spawnMushroom(hitObject.name);
                        questionBlock005_spawn = true;
                    }
                }
                if (hitObject && hitObject.name === "questionBlock010") {
                    if(!questionBlock0010_spawn) {
                        console.log("HERE");
                        spawnMushroom(hitObject.name);
                        questionBlock0010_spawn = true;
                    }
                }
                if (hitObject && hitObject.name === "brick019") {
                    if(!starBrick_spawn) {
                        spawnStar(hitObject.name);
                        starBrick_spawn = true;
                    }
                }

                if (hitObject && hitObject.parent.name === "coinBrick") {
                    if (!brickCoinSpawns[hitObject.name]) {
                        spawnBrickCoin(hitObject.name);
                        brickCoinSpawns[hitObject.name] = true;
                    }
                    console.log("x", player.position.x);
                    console.log("y", player.position.y);
                    console.log("z", player.position.z);
                }
            }
            hitCeiling = true;
        }
    }

    if (hitCeiling) {
        velocity.y = Math.min(velocity.y, 0);
    }

    function spawnMushroom(blockName) {
        let mushroomPosition;
        switch (blockName) {
            case "questionBlock002":
                mushroomPosition = new THREE.Vector3(21.83, 6.75, 4);
                break;
            case "questionBlock005":
                mushroomPosition = new THREE.Vector3(83, 6.75, 4);
                break;
            case "questionBlock010":
                mushroomPosition = new THREE.Vector3(115, 10.75, 4);
                break;
            default:
                return;
        }
        // Check if the mushroom has already been spawned
        const mushroom = mushrooms.find(m => m.position.equals(mushroomPosition));
        if (!mushroom || mushroom.isCollected) {
            mushrooms.push(new SuperMushroom(scene, mtlLoader, objLoader, mushroomPosition));
        }
    }

    function spawnStar(blockName) {
        let starPosition;
        switch (blockName) {
            case "brick019":
                starPosition = new THREE.Vector3(106.69, 6.75, 4);
                break;
            default:
                return;
        }
        // Check if the star has already been spawned
        const star = superStars.find(m => m.position.equals(starPosition));
        if (!star || star.isCollected) {
            superStars.push(new SuperStar(scene, loader, starPosition));
        }
    }

    function spawnBrickCoin(blockName) {
        let brickCoinPosition;
        switch(blockName) {
            case "brick001":
                brickCoinPosition = new THREE.Vector3(20.5, 2.3, 3.5);
                break;
            case "brick003":
                brickCoinPosition = new THREE.Vector3(24.5, 2.3, 3.5);
                break;
            case "brick005":
                brickCoinPosition = new THREE.Vector3(83.6, 2.3, 3.5);
                break;
            case "brick017":
                brickCoinPosition = new THREE.Vector3(99.2, 2.3, 3.5);
                break;
            case "brick027":
                brickCoinPosition = new THREE.Vector3(136.2, 2.3, 3.5);
                break;
            case "brick028":
                brickCoinPosition = new THREE.Vector3(175.5, 2.3, 3.5);
                break;
            default:
                return;
        }

        // Check if the coin has already been spawned
        const brickCoin = brickCoins.find(coin => coin.position.equals(brickCoinPosition));
        if (!brickCoin || brickCoin.isCollected) {
            brickCoins.push(new BrickCoin(scene, loader, brickCoinPosition));
        }
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

        const downwardIntersections = downwardRaycasters[i].intersectObjects([level, ...goombas.map(goomba => goomba.model)], true);
        //console.log(downwardIntersections);
        
        // const downwardIntersections = downwardRaycasters[i].intersectObject(level, true);
        //console.log(downwardIntersections)
        if (downwardIntersections.length > 0 && downwardIntersections[0].distance < downwardCollisionDist) {
            const hitObject = downwardIntersections[0].object;

            // Find the root Goomba model
            const rootGoombaModel = findRootGoombaModel(hitObject);

            // Check if the hit object is part of a Goomba
            if (rootGoombaModel) {
                console.log("Mario is stomping on a Goomba!");
                if (velocity.y < 0) { // Mario is falling
                    const goomba = goombas.find(g => g.model === rootGoombaModel);
                    if (goomba && !isOnGround) {
                        goomba.handleStomp();
                        velocity.y = jumpStrength * 0.5; // Small bounce after stomping
                        onGround = true; // Mario is considered on ground after stomping
                    }
                }
            } else if (hitObject.parent.name === "coins") {
                continue; // Ignore coins
            } else {
                // Normal ground collision
                onGround = true;
                player.position.y = downwardIntersections[0].point.y + 0.1;
                velocity.y = 0;
            }
            
            //let hitObject = downwardIntersections[0].object.parent;
        
            player.position.y = downwardIntersections[0].point.y + 0.1;
            velocity.y = 0;
            if (hitObject && hitObject.name == 'pipeTop4')
            {      
                player.position.set(157 , -12, 4);   
                lightSwitch(1);                 
            }
        }
    }

    isOnGround = onGround;

    // Auto stair climbing logic, also if player falling don't auto climb
    if (shouldClimb & velocity.y >= 0) {
        player.position.y += 1;  // Move Mario up one unit
        canMoveForward = true;   // Allow movement again since he climbed the step
    }

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
        player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 0.3, 0)), 
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 0.3, 0)),
        player.position.clone().add(right.clone().multiplyScalar(-0.25)).add(new THREE.Vector3(0, 1.3, 0)), 
        player.position.clone().add(right.clone().multiplyScalar(0.25)).add(new THREE.Vector3(0, 1.3, 0))
    ];
    
    for (let i = 0; i < 4; i++) {
        forwardRaycasters[i].set(forwardRayOrigins[i], moveDirection.clone().normalize());
    }

    if (player.position.y <= -30) {  // If Mario falls below y = -30
        // Mario respawns a little higher than where he originally spawns in because he respawns in the ground otherwise for some unknown reason
        velocity.y = 0;
        player.position.copy(new THREE.Vector3(5, 2.5, 3.82)); 
        console.log("Mario fell to his death! Resetting position.");
    }
}

let lamp;
function lightSwitch(status = 0)
{
    console.log('status', status);
    
    
    if (status)
    {
        planeMaterial.color.set(0x000000);
        plane.position.set(0, -1, 0);
        scene.background = new THREE.Color(0x000000)

        lamp = new THREE.PointLight(0xffdc52, 50);
        lamp.position.set(160, -3, 2); // High up to simulate the sun
        lamp.castShadow = true; 
        const lampGeometry = new THREE.BoxGeometry(1, 1, 1); // Small cube
        const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffdc52 });
        let lampCube = new THREE.Mesh(lampGeometry, lampMaterial);
        lampCube.position.copy(lamp.position)
        scene.remove(sunLight);
        scene.remove(sunCube);
        scene.add(lamp);
        scene.add(lampCube);

        
    }
    else if (status === 0)
    {
        console.log('rahhhhhhhhhhhh');
        scene.background = new THREE.Color(0x6185f8)
        planeMaterial.color.set(0x6185f8);
        //plane.position.set(0, -30, 0);
        lamp.intensity = 0;
        scene.remove(lamp);
        //scene.remove(lampCube);
        scene.add(sunLight);
        scene.add(sunCube);
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
        this.isAlive = true;
        
        this.boxHelper = null; // Add this to store the bounding box helper

        this.loadModel();
    }

    loadModel() {
        this.loader.load('assets/voxel_goomba.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(0.1, 0.1, 0.1);
            this.model.rotation.y = (-1 * Math.PI) / 2; // Rotate to face the correct direction
            this.model.name = "Goomba";
            this.scene.add(this.model);

            // Create and add the bounding box helper
            this.boxHelper = new THREE.BoxHelper(this.model, 0x00ff00); // Green wireframe box
            this.scene.add(this.boxHelper);
            this.boxHelper.visible = false;

            // Enable shadows for the Goomba and all its meshes
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

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
            if (this.isMovingForward) {
                if (this.isMirrored) {
                    this.model.position.z += 1.25; // Adjust this value as needed
                } else {
                    this.model.position.z -= 1.25; // Adjust this value as needed
                }
            } else {
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
        if (!this.model || !this.isAlive) return;

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

        // Update the bounding box helper to match the Goomba's current position
        if (this.boxHelper) {
            this.boxHelper.update(); // This ensures the box helper tracks the Goomba's movement
        }
    }

    handleStomp() {
        if (!this.isAlive) return;

        // Remove the Goomba from the scene
        this.scene.remove(this.model);
        if (this.boxHelper) {
            this.scene.remove(this.boxHelper);
        }
        this.stopWalking();
        this.isAlive = false;

        // Remove the Goomba from the goombas array
        const index = goombas.indexOf(this);
        if (index !== -1) {
            goombas.splice(index, 1);
        }

        console.log("Mario stomped the Goomba!");
    }

    handleMarioDamage() {
        if (hasStar) { // If Mario has a star, the Goomba dies
            this.handleStomp();
            return;
        }

        if (isInvincible) return; // If Mario is invincible, do nothing
    
        if (!hasPowerUp) {
            // Mario dies and the level restarts
            player.position.copy(new THREE.Vector3(5, 5, 3.82)); // Reset Mario's position
            console.log("Mario died! Resetting position.");
        } else {
            // Mario loses powerup and returns to original state
            hasPowerUp = false;
            player.scale.set(1, 1, 1); // Reset Mario's size
            console.log("Mario lost powerup!");
        }
    
        // Start invincibility
        isInvincible = true;
        invincibilityTimer = 0; // Reset the timer
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


const mtlLoader = new MTLLoader();
const objLoader = new OBJLoader();

// Array to store all Mushroom instances
const mushrooms = [];

class SuperMushroom {
    constructor(scene, mtlLoader, objLoader, position) {
        this.scene = scene;
        this.mtlLoader = mtlLoader;
        this.objLoader = objLoader;
        this.position = position.clone();
        this.model = null;
        this.isCollected = false;

        this.loadModel();
    }

    loadModel() {
        // Load the MTL file first
        this.mtlLoader.load('assets/Custom Edited - Mario Customs - Super Mushroom Super Mario Bros Voxel/obj_item_supermushroom.mtl', (materials) => {
            materials.preload();

            // Set the materials for the OBJLoader
            this.objLoader.setMaterials(materials);

            // Load the OBJ file
            this.objLoader.load('assets/Custom Edited - Mario Customs - Super Mushroom Super Mario Bros Voxel/obj_item_supermushroom.obj', (object) => {
                this.model = object;
                this.model.position.copy(this.position);
                this.model.scale.set(0.8, 0.8, 0.8); // Adjust scale as needed
                this.scene.add(this.model);
            }, undefined, (error) => {
                console.error("Error loading Super Mushroom OBJ model:", error);
            });
        }, undefined, (error) => {
            console.error("Error loading Super Mushroom MTL materials:", error);
        });
    }

    update() {
        if (!this.model || this.isCollected) return;

        // Check for collision with Mario
        const distanceToMario = this.model.position.distanceTo(player.position);
        if (distanceToMario < 1) { // Adjust collision distance as needed
            this.handleCollision();
        }
    }

    handleCollision() {
        if (!this.isCollected) {
            this.isCollected = true;
            this.scene.remove(this.model); // Remove the mushroom from the scene
            this.applyPowerUp();
        }
    }

    applyPowerUp() {
        if (!hasPowerUp) {
            hasPowerUp = true;
            player.scale.set(1.2, 1.5, 1.2); // Increase Mario's size
            console.log("Mario grew bigger!");
        }
    }
}

class SuperStar {
    constructor(scene, loader, position) {
        this.scene = scene;
        this.loader = loader;
        this.position = position.clone();
        this.model = null;
        this.isCollected = false;
        this.rotationSpeed = 0.02;

        this.loadModel();
    }

    loadModel() {
        this.loader.load('assets/super_mario_64_star.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(.35, .35, .35); // Adjust scale as needed
            this.scene.add(this.model);

            // Enable shadows for the Super Star and all its meshes
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }, undefined, (error) => {
            console.error("Error loading Super Star model:", error);
        });
    }

    update() {
        if (!this.model || this.isCollected) return;

        // Rotate the star around its Y-axis
        this.model.rotation.y += this.rotationSpeed;

        // Add a bobbing effect
        this.model.position.y = this.position.y + Math.sin(performance.now() * 0.005) * 0.2;

        // Check for collision with Mario
        const distanceToMario = this.model.position.distanceTo(player.position);
        if (distanceToMario < 1) { // Adjust collision distance as needed
            this.handleCollision();
        }
    }

    handleCollision() {
        if (!this.isCollected) {
            this.isCollected = true;
            this.scene.remove(this.model); // Remove the Super Star from the scene
            this.applyPowerUp();
        }
    }

    applyPowerUp() {
        if (!hasStar) {
            hasStar = true;
            starTimer = 0; // Reset the timer
            applyInvincibilityEffect(); // Apply the invincibility shader
            console.log("Mario is invincible!");
        }
    }
}

const superStars = [];
//superStars.push(new SuperStar(scene, loader, new THREE.Vector3(106.69, 6.75, 4)));

const brickCoins = [];

class BrickCoin {
    constructor(scene, loader, position) {
        this.scene = scene;
        this.loader = loader;
        this.position = position.clone();
        this.model = null;
        this.isCollected = false;

        this.loadModel();
    }

    loadModel() {
        this.loader.load('assets/voxel_coin.glb', (gltf) => {
            this.model = gltf.scene;
            this.model.position.copy(this.position);
            this.model.scale.set(0.06, 0.06, 0.06);
            // this.model.rotation.y = (-1 * Math.PI) / 2; // Rotate to face the correct direction
            this.model.name = "BrickCoin";
            this.scene.add(this.model);

            // Enable shadows for the Goomba and all its meshes
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }, undefined, (error) => {
            console.error("Error loading Goomba model:", error);
        });
    }

    update() {
        if (!this.model || this.isCollected) return;

        const boundingBox = new THREE.Box3().setFromObject(this.model);
        if (boundingBox.intersectsSphere(new THREE.Sphere(player.position, 1))) {
            this.handleCollision();
        }
    }

    handleCollision() {
        if (!this.isCollected) {
            this.isCollected = true;
            this.scene.remove(this.model); // Remove the coin from the scene
            coinCount++;
            console.log(coinCount);
        }
    }
}


const invincibilityShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 vWorldPosition;

        void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz; // Calculate world position
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vWorldPosition; // Pass the world position to the fragment shader
        uniform float time;

        void main() {
            // Define a set of colors for the gradient
            vec3 color1 = vec3(1.0, 0.0, 0.0); // Red
            vec3 color2 = vec3(0.0, 1.0, 0.0); // Green
            vec3 color3 = vec3(0.0, 0.0, 1.0); // Blue
            vec3 color4 = vec3(1.0, 1.0, 0.0); // Yellow

            // Create a gradient based on world position and time
            float gradient = sin(vWorldPosition.x * 0.5 + time * 2.0) * 0.5 + 0.5; // Oscillates between 0 and 1

            // Blend between colors based on the gradient
            vec3 color;
            if (gradient < 0.25) {
                color = mix(color1, color2, gradient * 4.0);
            } else if (gradient < 0.5) {
                color = mix(color2, color3, (gradient - 0.25) * 4.0);
            } else if (gradient < 0.75) {
                color = mix(color3, color4, (gradient - 0.5) * 4.0);
            } else {
                color = mix(color4, color1, (gradient - 0.75) * 4.0);
            }

            // Output the final color
            gl_FragColor = vec4(color, 1.0);
        }
    `,
    uniforms: {
        time: { value: 0.0 } // Time uniform to animate the effect
    }
});

let originalMaterials = []; // Store Mario's original materials

function applyInvincibilityEffect() {
    player.traverse((child) => {
        if (child.isMesh) {
            originalMaterials.push(child.material); // Save the original material
            child.material = invincibilityShaderMaterial; // Apply the invincibility shader
        }
    });
}

function removeInvincibilityEffect() {
    let i = 0;
    player.traverse((child) => {
        if (child.isMesh) {
            child.material = originalMaterials[i++]; // Restore the original material
        }
    });
    originalMaterials = []; // Clear the stored materials
}


function animate() {
    requestAnimationFrame(animate);

    if (!gameStarted) return;

    // Update player movement
    updatePlayerMovement();

    // Check for underground coin collection
    checkCoinCollection();
    //console.log(player.position);

  
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

    // Update all Mushrooms
    mushrooms.forEach(mushroom => mushroom.update());

    // Update all BrickCoins
    brickCoins.forEach(coin => coin.update());

    // Update all Super Stars
    superStars.forEach(star => star.update());

    // Check if Mario is walking or jumping
    isWalking = keys.forward || keys.backward || keys.left || keys.right;
    isJumping = !isOnGround; // Mario is jumping if he's not on the ground

    // Switch models based on walking and jumping states
    switchModel(isWalking, isJumping);

    //animate the flag if win is true
    if(win)
    {
        let f = parts['flag'].children[0];
        if (f.position.y > -8)
        {
            f.position.y -= 0.1;
            
        }
    }
    // Update invincibility timer and flash Mario if invincible
    if (isInvincible) {
        invincibilityTimer += 16; // Approximate time per frame (60 FPS = ~16ms per frame)
        if (invincibilityTimer >= invincibilityDuration) {
            isInvincible = false; // End invincibility
            invincibilityTimer = 0; // Reset the timer
            player.visible = true; // Ensure Mario is visible after invincibility ends
        } else {
            // Flash Mario by toggling visibility
            player.visible = !player.visible; // Toggle visibility every frame
        }
    }

    // Update Super Star effect
    if (hasStar) {
        starTimer += 16; // Approximate time per frame (60 FPS = ~16ms per frame)

        // Update the invincibility shader's time uniform for animation
        invincibilityShaderMaterial.uniforms.time.value = performance.now() * 0.001;

        // End Super Star effect after 10 seconds
        if (starTimer >= starDuration) {
            hasStar = false; // End Super Star effect
            starTimer = 0; // Reset the timer
            removeInvincibilityEffect(); // Remove the invincibility shader
            console.log("Super Star effect ended!");
        }
    }
    
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