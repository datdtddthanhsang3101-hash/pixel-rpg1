// main.js
import { World, BLOCKS, BLOCK_SIZE } from './world.js';
import { Player } from './player.js';
import { Network } from './network.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const loadingScreen = document.getElementById('loading'); // Grab the loading div

let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

const socket = io();
const network = new Network(socket);
let world;
let localPlayer;
let keys = {};
let particles = [];
let time = 0;
let camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
let rainDrops = [];

// --- FIX: HANDLE SERVER SLEEP / WAKE UP ---
socket.on('connect_error', () => {
    loadingScreen.innerText = "Server is waking up (30-60s)... Please wait.";
});

socket.on('connect', () => {
    loadingScreen.innerText = "Connected! Generating World...";
});

// --- INITIALIZATION ---
socket.on('initWorld', (data) => {
    world = new World(data.seed, data.mods);
    localPlayer = new Player(100, 50, socket.id);
    
    // Find safe spawn Y
    for(let y=0; y<200; y++) {
        if (world.getBlock(6, y) !== BLOCKS.AIR) {
            localPlayer.y = (y-2) * 16;
            break;
        }
    }
    
    network.players[data.players] = data.players; // Init existing players
    
    // --- FIX: HIDE THE LOADING SCREEN ONCE WORLD IS READY ---
    loadingScreen.style.display = 'none';
});