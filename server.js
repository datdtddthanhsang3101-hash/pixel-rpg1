// server.js
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
app.use(express.static('public'));

const WORLD_W = 800;
const WORLD_H = 400;
const BLOCK = { AIR: 0, DIRT: 1, STONE: 2, GRASS: 3, SAND: 4, WOOD: 5, IRON: 6, GOLD: 7, TORCH: 8 };

// In a real game, use a spatial hash. For this prototype, a flat object of changes.
let worldModifications = {}; 
let players = {};
let enemies = [];
let dropItems = [];

// Simple Seeded Random for Server-Side validation (matches client)
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Spawn Enemies
function spawnEnemy() {
    if (enemies.length < 10) {
        let ex = Math.random() * WORLD_W * 16;
        // Find surface
        let ey = 0;
        for (let y = 0; y < WORLD_H; y++) {
            if (worldModifications[`${Math.floor(ex/16)}_${y}`] !== BLOCK.AIR) { ey = (y-2)*16; break; }
        }
        enemies.push({ id: Math.random().toString(36).substr(2,9), x: ex, y: ey, vx: 0, vy: 0, hp: 50, dir: 1 });
    }
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Send world seed and existing modifications to new player
    socket.emit('initWorld', { 
        seed: 12345, // In a full game, generate a random seed here
        mods: worldModifications,
        players: Object.values(players)
    });

    players[socket.id] = { id: socket.id, x: 100, y: 100, vx: 0, vy: 0 };

    socket.on('playerUpdate', (data) => {
        if (!players[socket.id]) return;
        // Basic anti-cheat: clamp position
        players[socket.id].x = Math.max(0, Math.min(WORLD_W*16, data.x));
        players[socket.id].y = Math.max(0, Math.min(WORLD_H*16, data.y));
        players[socket.id].vx = data.vx;
        players[socket.id].vy = data.vy;
    });

    socket.on('breakBlock', (data) => {
        const key = `${data.x}_${data.y}`;
        // Anti-cheat: Check distance
        const p = players[socket.id];
        if (!p || Math.hypot(p.x - data.x*16, p.y - data.y*16) > 100) return;

        const currentBlock = worldModifications[key] !== undefined ? worldModifications[key] : -1; // -1 means unmodified
        if (currentBlock === BLOCK.AIR) return;

        worldModifications[key] = BLOCK.AIR;
        io.emit('blockUpdate', { x: data.x, y: data.y, id: BLOCK.AIR });
        
        // Drop item logic
        dropItems.push({ x: data.x * 16 + 8, y: data.y * 16, vy: -5, id: currentBlock, timer: 600 });
    });

    socket.on('placeBlock', (data) => {
        const key = `${data.x}_${data.y}`;
        const p = players[socket.id];
        if (!p || Math.hypot(p.x - data.x*16, p.y - data.y*16) > 100) return;
        
        // Prevent placing inside player
        const px = Math.floor(p.x / 16), py = Math.floor(p.y / 16);
        if (data.x === px && (data.y === py || data.y === py-1)) return;

        worldModifications[key] = data.blockId;
        io.emit('blockUpdate', { x: data.x, y: data.y, id: data.blockId });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
});

// Main Server Loop (Physics & AI)
setInterval(() => {
    // 1. Sand Physics (Server Authoritative)
    for (let key in worldModifications) {
        if (worldModifications[key] === BLOCK.SAND) {
            let [x, y] = key.split('_').map(Number);
            let belowKey = `${x}_${y + 1}`;
            let belowBlock = worldModifications[belowKey] !== undefined ? worldModifications[belowKey] : -1;
            
            if (belowBlock === BLOCK.AIR) {
                worldModifications[key] = BLOCK.AIR;
                worldModifications[belowKey] = BLOCK.SAND;
                io.emit('blockUpdate', { x, y, id: BLOCK.AIR });
                io.emit('blockUpdate', { x, y: y + 1, id: BLOCK.SAND });
            }
        }
    }

    // 2. Enemy AI
    enemies.forEach(e => {
        let target = null;
        let minDist = 300;
        for (let id in players) {
            let d = Math.hypot(players[id].x - e.x, players[id].y - e.y);
            if (d < minDist) { minDist = d; target = players[id]; }
        }

        if (target) {
            e.dir = target.x > e.x ? 1 : -1;
            e.vx = e.dir * 2;
            if (e.y > target.y - 20 && e.vy === 0) e.vy = -8; // Jump towards player
        } else {
            e.vx = 0;
        }
        
        e.vy += 0.5; // Gravity
        e.x += e.vx;
        e.y += e.vy;
        
        // Basic floor collision
        let checkY = Math.floor(e.y / 16) + 2;
        let checkX = Math.floor(e.x / 16);
        let blockBelow = worldModifications[`${checkX}_${checkY}`] !== undefined ? worldModifications[`${checkX}_${checkY}`] : -1;
        if (blockBelow !== BLOCK.AIR && e.vy > 0) { e.vy = 0; e.y = (checkY - 2) * 16; }
    });

    // 3. Drop Item Physics
    dropItems.forEach(d => {
        d.vy += 0.4;
        d.y += d.vy;
        d.timer--;
        let checkY = Math.floor(d.y / 16) + 1;
        let checkX = Math.floor(d.x / 16);
        let blockBelow = worldModifications[`${checkX}_${checkY}`] !== undefined ? worldModifications[`${checkX}_${checkY}`] : -1;
        if (blockBelow !== BLOCK.AIR && d.vy > 0) { d.vy = 0; d.y = (checkY - 1) * 16; }
    });
    dropItems = dropItems.filter(d => d.timer > 0);

    // Broadcast state
    io.emit('tick', { players: Object.values(players), enemies, drops: dropItems });
    
    if (Math.random() < 0.05) spawnEnemy();
}, 1000 / 20);

http.listen(3000, () => console.log('Sandbox RPG Server running on port 3000'));