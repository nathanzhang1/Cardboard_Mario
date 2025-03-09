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
    'assets/marioLevel.glb', 
    function (gltf) {
        level = gltf.scene;
        level.position.set(65.69, 0, 0);
        //level.scale.set(2, 2, 2);
        scene.add(level);
        level.traverse((child) => {
            if(child.name == 'pipeTop001')
            {
                console.log('pipeTop001',child);
            }
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
// const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
// const playerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const block = new THREE.Mesh(playerGeometry, playerMaterial);
// block.position.set(0, 2.5, 3.82);
// scene.add(block);

//camera.lookAt(player.position);

let player; // Declare player globally

loader.load('assets/mario_-_super_mario_bros_3d_sprite.glb', function (gltf) {
    player = gltf.scene;

    // Create a new group to act as the pivot point
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Compute the bounding box to find the dimensions of the model
    const box = new THREE.Box3().setFromObject(player);
    const size = box.getSize(new THREE.Vector3()); // Get the size of the bounding box
    const center = box.getCenter(new THREE.Vector3()); // Get the center of the bounding box

    // Debugging: Log the size and center of the bounding box
    console.log("Bounding Box Size:", size);
    console.log("Bounding Box Center:", center);

    // Adjust the model's position so that the pivot is at the bottom (feet)
    player.position.sub(center); // Center the model relative to the pivot
    player.position.y += size.y / 2; // Move the model up by half its height

    // Add the model to the pivot group
    pivot.add(player);

    // Position the pivot group in the scene
    pivot.position.set(0, 2.5, 3.82);

    // Debugging: Add an AxesHelper to visualize the pivot point
    const axesHelper = new THREE.AxesHelper(1);
    pivot.add(axesHelper);

    // Update your player reference to the pivot group
    player = pivot;
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


// Create a raycaster once (outside the function) so we don't create a new one every frame.
const raycaster = new THREE.Raycaster();
const collisionDistance = 0.5; // Distance threshold to detect collisions


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

        // Set up the raycaster:
        // Start at the current player position and cast a ray in the moveDirection
        raycaster.set(player.position, moveDirection.clone().normalize());
        
        // Check for intersections with the level model (recursive to check all children)
        const intersections = raycaster.intersectObject(level, true);

        // If an intersection is detected within collisionDistance, cancel movement
        if (intersections.length > 0 && intersections[0].distance < collisionDistance) {
            // Optionally, you could adjust movement so Mario "slides" along the object.
            // For now, we simply block further movement in this direction.
            return;
        }

        // If no collision is detected, apply the movement:
        player.position.add(moveDirection);

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