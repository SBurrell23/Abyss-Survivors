export class Vector2 {
  constructor(public x: number, public y: number) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y)
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y)
  }

  scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar)
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  normalize(): Vector2 {
    const len = this.length()
    if (len === 0) return new Vector2(0, 0)
    return new Vector2(this.x / len, this.y / len)
  }
  
  distanceTo(other: Vector2): number {
    return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
  }
}

export function checkCollision(pos1: Vector2, radius1: number, pos2: Vector2, radius2: number): boolean {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (radius1 + radius2);
}

