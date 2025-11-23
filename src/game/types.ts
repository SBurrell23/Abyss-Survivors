import type { Game } from './Game';

export interface UpgradeOption {
    name: string;
    desc: string;
    apply: (game: Game) => void;
}
