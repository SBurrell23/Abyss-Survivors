import { spriteDefinitions } from './pixelData';

export class SpriteFactory {
  private static cache: Map<string, HTMLCanvasElement> = new Map();

  static getSprite(name: string, overridePalette?: Record<string, string>): HTMLCanvasElement {
    const cacheKey = name + (overridePalette ? JSON.stringify(overridePalette) : '');
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const def = spriteDefinitions[name];
    if (!def) {
        throw new Error(`Sprite definition '${name}' not found`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = def.size[0];
    canvas.height = def.size[1];
    const ctx = canvas.getContext('2d')!;

    // Merge palette
    const palette = { ...def.palette, ...overridePalette };

    for (let y = 0; y < def.data.length; y++) {
        const row = def.data[y];
        for (let x = 0; x < row.length; x++) {
            const char = row[x];
            const color = palette[char];
            if (color && color !== 'transparent') {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    this.cache.set(cacheKey, canvas);
    return canvas;
  }
  
  static createPattern(name: string): CanvasPattern | null {
      const sprite = this.getSprite(name);
      const ctx = document.createElement('canvas').getContext('2d')!;
      return ctx.createPattern(sprite, 'repeat');
  }
}

