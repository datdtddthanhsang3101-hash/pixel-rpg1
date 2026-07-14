// player.js
import { BLOCKS, BLOCK_SIZE } from './world.js';

export class Player {
    constructor(x, y, id) {
        this.id = id;
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.w = 12; this.h = 28; // Hitbox size
        this.jumpsLeft = 2;
        this.grounded = false;
        this.dir = 1; // 1 right, -1 left
        this.inventory = { [BLOCKS.DIRT]: 50, [BLOCKS.WOOD]: 20, [BLOCKS.TORCH]: 10 };
        this.selectedBlock = BLOCKS.DIRT;
        this.hp = 100;
    }

    update(keys, world) {
        // Horizontal Movement
        let moveSpeed = 4;
        if (keys['KeyA'] || keys['ArrowLeft']) { this.vx = -moveSpeed; this.dir = -1; }
        else if (keys['KeyD'] || keys['ArrowRight']) { this.vx = moveSpeed; this.dir = 1; }
        else this.vx = 0;

        // Jumping (Double Jump)
        if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && this.jumpsLeft > 0) {
            if (!this._jumpPressed) {
                this.vy = -9;
                this.jumpsLeft--;
                this._jumpPressed = true;
            }
        } else {
            this._jumpPressed = false;
        }

        // Gravity
        this.vy += 0.5;
        if (this.vy > 15) this.vy = 15; // Terminal velocity

        // X Collision
        this.x += this.vx;
        this.resolveCollisionX(world);

        // Y Collision
        this.y += this.vy;
        this.grounded = false;
        this.resolveCollisionY(world);

        if (this.grounded) this.jumpsLeft = 2;
    }

    resolveCollisionX(world) {
        let top = Math.floor(this.y / BLOCK_SIZE);
        let bottom = Math.floor((this.y + this.h - 1) / BLOCK_SIZE);
        let left = Math.floor(this.x / BLOCK_SIZE);
        let right = Math.floor((this.x + this.w - 1) / BLOCK_SIZE);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (world.getBlock(tx, ty) !== BLOCKS.AIR) {
                    if (this.vx > 0) this.x = tx * BLOCK_SIZE - this.w;
                    else if (this.vx < 0) this.x = (tx + 1) * BLOCK_SIZE;
                    this.vx = 0;
                }
            }
        }
    }

    resolveCollisionY(world) {
        let top = Math.floor(this.y / BLOCK_SIZE);
        let bottom = Math.floor((this.y + this.h - 1) / BLOCK_SIZE);
        let left = Math.floor(this.x / BLOCK_SIZE);
        let right = Math.floor((this.x + this.w - 1) / BLOCK_SIZE);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (world.getBlock(tx, ty) !== BLOCKS.AIR) {
                    if (this.vy > 0) { // Falling
                        this.y = ty * BLOCK_SIZE - this.h;
                        this.grounded = true;
                    } else if (this.vy < 0) { // Hitting ceiling
                        this.y = (ty + 1) * BLOCK_SIZE;
                    }
                    this.vy = 0;
                }
            }
        }
    }
}