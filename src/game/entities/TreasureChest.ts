import { Game } from '../Game';
import { Vector2 } from '../utils';
import { SpriteFactory } from '../graphics/SpriteFactory';

export class TreasureChest {
    game: Game;
    position: Vector2;
    radius: number = 20;
    active: boolean = true;

    constructor(game: Game, x: number, y: number) {
        this.game = game;
        this.position = new Vector2(x, y);
    }

    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        const sprite = SpriteFactory.getSprite('treasure_chest');
        const scale = 3;
        
        // Bobbing animation
        const offset = Math.sin(performance.now() / 500) * 5;
        
        ctx.drawImage(sprite, -sprite.width * scale / 2, -sprite.height * scale / 2 + offset, sprite.width * scale, sprite.height * scale);
        
        // Glow
        ctx.shadowColor = 'gold';
        ctx.shadowBlur = 10;
        
        ctx.restore();
    }
}

