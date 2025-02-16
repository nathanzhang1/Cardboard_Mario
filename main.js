import * as THREE from 'three';

// Set up scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Walls
const wallGeometry = new THREE.BoxGeometry(2, 5, 2);
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.set(0, 2.5, -5);
scene.add(wall);

// Position camera
camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

// Walls = 1, paths = 0
const mazeLayout = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1]
];

// PLace walls
for (let i = 0; i < mazeLayout.length; i++) {
    for (let j = 0; j < mazeLayout[i].length; j++) {
        if (mazeLayout[i][j] === 1) {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(i * 2 - 5, 2.5, j * 2 - 5);
            scene.add(wall);
        }
    }
}



function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
