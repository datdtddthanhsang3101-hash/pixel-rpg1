// network.js
export class Network {
    constructor(socket) {
        this.socket = socket;
        this.players = {};
        this.enemies = [];
        this.drops = [];
        this.events = [];

        this.socket.on('tick', (data) => {
            this.players = data.players.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
            this.enemies = data.enemies;
            this.drops = data.drops;
        });

        this.socket.on('blockUpdate', (data) => {
            this.events.push({ type: 'block', data });
        });
    }

    sendPos(player) {
        this.socket.emit('playerUpdate', { x: player.x, y: player.y, vx: player.vx, vy: player.vy });
    }

    breakBlock(x, y) { this.socket.emit('breakBlock', { x, y }); }
    placeBlock(x, y, id) { this.socket.emit('placeBlock', { x, y, blockId: id }); }
}