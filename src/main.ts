import './style.css'
import { Game } from './game/Game'

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
const game = new Game(canvas)

game.start()

