import './style.css'
import { Game } from './game/Game'

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const game = new Game(canvas)

// Export game to window for debugging/accessibility
;(window as any).game = game

// Don't start automatically - wait for start button click
// game.start() will be called when the start button is clicked

