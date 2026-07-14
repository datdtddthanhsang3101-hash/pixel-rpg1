// world.js
export const WORLD_W = 800;
export const WORLD_H = 400;
export const BLOCK_SIZE = 16;

export const BLOCKS = {
    AIR: 0, DIRT: 1, STONE: 2, GRASS: 3, SAND: 4, WOOD: 5, IRON: 6, GOLD: 7, TORCH: 8
};

// 1D Perlin-like Noise for terrain height
function noise(x, seed) {
    let n = Math.sin(x * 0.1 + seed) * 43758.5453;
    n = n - Math.floor(n);
    return n;
}

export class World {
    constructor(seed, mods) {
        this.seed = seed;
        this.tiles = new Uint8Array(WORLD_W * WORLD_H);
        this.generate();
        // Apply server modifications (broken/placed blocks)
        for (let key in mods) {
            let [x, y] = key.split('_').map(Number);
            if (x >= 0 && x < WORLD_W && y >= 0 && y < WORLD_H) {
                this.tiles[y * WORLD_W + x] = mods[key];
            }
        }
    }

    generate() {
        for (let x = 0; x < WORLD_W; x++) {
            // Multi-octave noise for natural hills
            let height = 100 + 
                         noise(x, this.seed) * 30 + 
                         noise(x * 0.5, this.seed + 1) * 15;
            
            // Biome determination based on x position
            let biome = 'forest';
            if (x > WORLD_W * 0.7) biome = 'snow';
            else if (x > WORLD_W * 0.4 && x < WORLD_W * 0.6) biome = 'desert';

            for (let y = 0; y < WORLD_H; y++) {
                let idx = y * WORLD_W + x;
                if (y < height) {
                    this.tiles[idx] = BLOCKS.AIR;
                } else if (y === Math.floor(height)) {
                    this.tiles[idx] = biome === 'desert' ? BLOCKS.SAND : BLOCKS.GRASS;
                } else if (y < height + 5 + noise(x, this.seed+2) * 5) {
                    this.tiles[idx] = biome === 'desert' ? BLOCKS.SAND : BLOCKS.DIRT;
                } else {
                    this.tiles[idx] = BLOCKS.STONE;
                    
                    // Ore Generation (Simple random scatter)
                    let r = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
                    r = r - Math.floor(r);
                    if (r > 0.98 && y > 150) this.tiles[idx] = BLOCKS.IRON;
                    if (r > 0.995 && y > 250) this.tiles[idx] = BLOCKS.GOLD;
                }
            }
        }

        // Cave Generation (Cellular Automata style wormholes)
        for (let i = 0; i < 200; i++) {
            let cx = Math.random() * WORLD_W;
            let cy = 120 + Math.random() * 250;
            for (let j = 0; j < 100; j++) {
                let idx = Math.floor(cy) * WORLD_W + Math.floor(cx);
                if (idx >= 0 && idx < this.tiles.length) this.tiles[idx] = BLOCKS.AIR;
                cx += Math.cos(j * 0.5) * 2;
                cy += Math.sin(j * 0.3) * 2;
            }
        }
    }

    getBlock(x, y) {
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return BLOCKS.STONE;
        return this.tiles[y * WORLD_W + x];
    }

    setBlock(x, y, id) {
        if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return;
        this.tiles[y * WORLD_W + x] = id;
    }
}