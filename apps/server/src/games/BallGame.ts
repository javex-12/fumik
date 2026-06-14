import { Server, Socket } from 'socket.io';
import { Room, Player } from '@fumik/shared/types';
import { BaseGame } from './BaseGame';
import Matter from 'matter-js';

export class BallGame extends BaseGame {
  private engines: Map<string, Matter.Engine> = new Map();
  private runnerIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super('ball');
  }

  start(io: Server, room: Room) {
    const engine = Matter.Engine.create();
    engine.gravity.y = 0;
    this.engines.set(room.code, engine);

    const world = engine.world;
    const playerBodies: Map<string, Matter.Body> = new Map();

    room.players.forEach((p, i) => {
      const body = Matter.Bodies.circle(100 + i * 100, 300, 15, {
        frictionAir: 0.1,
        restitution: 0.5,
        label: p.userId
      });
      playerBodies.set(p.userId, body);
      Matter.World.add(world, body);
    });

    // Add walls
    const wallOptions = { isStatic: true };
    Matter.World.add(world, [
      Matter.Bodies.rectangle(400, 0, 800, 50, wallOptions),
      Matter.Bodies.rectangle(400, 600, 800, 50, wallOptions),
      Matter.Bodies.rectangle(0, 300, 50, 600, wallOptions),
      Matter.Bodies.rectangle(800, 300, 50, 600, wallOptions)
    ]);

    room.gameState = {
      status: 'starting',
      playerBodies,
      countdown: 3
    };

    // Server-side countdown loop
    let count = 3;
    const countdownInterval = setInterval(() => {
      io.to(room.code).emit('ball:starting', { countdown: count });
      if (count <= 0) {
        clearInterval(countdownInterval);
        room.gameState.status = 'playing';
        this.startPhysics(io, room, engine, playerBodies);
      }
      count--;
    }, 1000);
  }

  private startPhysics(io: Server, room: Room, engine: Matter.Engine, playerBodies: Map<string, Matter.Body>) {
    const interval = setInterval(() => {
      if (room.gameState.status !== 'playing') return;
      Matter.Engine.update(engine, 1000 / 60);
      
      const state = {
        players: Array.from(playerBodies.entries()).map(([userId, body]) => ({
          userId,
          id: room.players.find(p => p.userId === userId)?.id,
          x: body.position.x,
          y: body.position.y,
          velocity: body.velocity
        }))
      };

      io.to(room.code).emit('ball:state', state);
    }, 1000 / 60);

    this.runnerIntervals.set(room.code, interval);
  }

  handleInput(io: Server, socket: Socket, room: Room, data: any) {
    if (!room.gameState || room.currentGame !== 'ball') return;
    const { input } = data;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const body = room.gameState.playerBodies.get(player.userId);
    if (body) {
      const force = 0.005;
      const appliedForce = { x: 0, y: 0 };
      if (input.up) appliedForce.y -= force;
      if (input.down) appliedForce.y += force;
      if (input.left) appliedForce.x -= force;
      if (input.right) appliedForce.x += force;
      
      Matter.Body.applyForce(body, body.position, appliedForce);
    }
  }

  private stopGame(code: string) {
    const interval = this.runnerIntervals.get(code);
    if (interval) clearInterval(interval);
    this.runnerIntervals.delete(code);
    this.engines.delete(code);
  }

  // Override end to clean up physics
  end(io: Server, room: Room, winner: string) {
    this.stopGame(room.code);
    super.end(io, room, winner);
  }
}
