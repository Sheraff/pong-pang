/// <reference lib="webworker" />

import { setImmediate } from "./utils/setImmediate"

export type Incoming = { type: "canvas", data: { canvas: OffscreenCanvas } }
self.onmessage = (e: MessageEvent<Incoming>) => handleMessage(e.data)

const BLACK = "#451952"
const WHITE = "#F39F5A"

function handleMessage(event: Incoming) {
	if (event.type === "canvas") {
		const ctx = event.data.canvas.getContext("2d")!
		ctx.fillStyle = "red"
		ctx.fillRect(0, 0, 100, 100)
		start(ctx)
	}
}

function start(ctx: OffscreenCanvasRenderingContext2D) {
	const size = 24
	const speed = 300

	const grid = Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => y > x ? 1 : 0))

	const w = ctx.canvas.width
	const h = ctx.canvas.height
	const cellSize = Math.min(w, h) / size

	type Ball = {
		x: number
		y: number
		dx: number
		dy: number
		ignores: 0 | 1
	}

	const black: Ball = {
		x: cellSize + Math.random() * cellSize * 2,
		y: h / 2 + Math.random() * cellSize * 2 - cellSize,
		dx: 1,
		dy: -1,
		ignores: 1,
	}
	const white: Ball = {
		x: w - cellSize - Math.random() * cellSize * 2,
		y: h / 2 + Math.random() * cellSize * 2 - cellSize,
		dx: -1,
		dy: 1,
		ignores: 0,
	}
	const radius = cellSize / 2
	const circle = Math.PI * 2

	const metrics = {
		frames: 0,
		updates: 0,
		time: performance.now(),
		fps: 0,
		ups: 0,
	}

	function render() {
		metrics.frames++
		requestAnimationFrame(render)
		ctx.clearRect(0, 0, w, h)

		ctx.fillStyle = BLACK
		ctx.fillRect(0, 0, w, h)

		for (const row of grid) {
			for (const cell of row) {
				if (cell) {
					ctx.fillStyle = WHITE
					ctx.fillRect(0, 0, cellSize + 1, cellSize + 1)
				}
				ctx.translate(cellSize, 0)
			}
			ctx.translate(-cellSize * size, cellSize)
		}
		ctx.resetTransform()

		for (const [x, y] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
			// draw black
			ctx.beginPath()
			ctx.fillStyle = BLACK
			ctx.arc(black.x + x * w, black.y + y * h, radius, 0, circle)
			ctx.fill()
			ctx.closePath()

			// draw white
			ctx.beginPath()
			ctx.fillStyle = WHITE
			ctx.arc(white.x + x * w, white.y + y * h, radius, 0, circle)
			ctx.fill()
			ctx.closePath()

			// // draw black collision candidates
			// {
			// 	const xMin = Math.floor((black.x + x * w) / cellSize) - 1
			// 	const yMin = Math.floor((black.y + y * h) / cellSize) - 1
			// 	ctx.strokeStyle = "red"
			// 	ctx.strokeRect(xMin * cellSize, yMin * cellSize, cellSize * 3, cellSize * 3)
			// }

			// // draw white collision candidates
			// {
			// 	const xMin = Math.floor((white.x + x * w) / cellSize) - 1
			// 	const yMin = Math.floor((white.y + y * h) / cellSize) - 1
			// 	ctx.strokeStyle = "blue"
			// 	ctx.strokeRect(xMin * cellSize, yMin * cellSize, cellSize * 3, cellSize * 3)
			// }
		}


		// // draw metrics
		// ctx.font = "24px sans-serif"
		// ctx.fillStyle = "red"
		// ctx.fillText(`Frame: ${metrics.fps}`, 10, 24)
		// ctx.fillText(`Update: ${metrics.ups}`, 10, 48)

		// accumulate metrics over 1s
		const now = performance.now()
		const delta = now - metrics.time
		if (delta < 1000) return
		metrics.time = now
		metrics.fps = metrics.frames
		metrics.ups = metrics.updates
		metrics.frames = 0
		metrics.updates = 0
	}
	requestAnimationFrame(render)

	let lastTime = 0
	function loop() {
		const time = performance.now()
		setImmediate(loop)
		const delta = time - lastTime
		if (delta === 0) return
		lastTime = time
		metrics.updates++

		const m = speed * delta / 1000

		black.x += black.dx * m
		black.y += black.dy * m
		white.x += white.dx * m
		white.y += white.dy * m

		// collision
		let collided = true
		while (collided) {
			collide_resolution: for (const ball of [black, white]) {
				collided = false
				const xMin = Math.floor(ball.x / cellSize) - 1
				const yMin = Math.floor(ball.y / cellSize) - 1
				for (let y = yMin; y < yMin + 3; y++) {
					const wy = y < 0 ? size + y : y % size
					for (let x = xMin; x < xMin + 3; x++) {
						const wx = x < 0 ? size + x : x % size
						if (grid[wy][wx] === ball.ignores) continue
						const collision = computeCollision(ball.x, ball.y, radius, x * cellSize, y * cellSize, cellSize)
						if (!collision) continue
						collided = true
						grid[wy][wx] = ball.ignores
						if (collision === 'x') {
							ball.dx *= -1
							const contact = x * cellSize + (ball.dx > 0 ? (cellSize + radius) : (-radius))
							ball.x += Math.abs(ball.x - contact) * ball.dx * 2
						} else {
							ball.dy *= -1
							const contact = y * cellSize + (ball.dy > 0 ? (cellSize + radius) : (-radius))
							ball.y += Math.abs(ball.y - contact) * ball.dy * 2
						}
						break collide_resolution
					}
				}
			}
		}

		// wrap around
		black.x = (black.x + w) % w
		black.y = (black.y + h) % h
		white.x = (white.x + w) % w
		white.y = (white.y + h) % h
	}
	setImmediate(loop)
}

/**
 * @returns false if there is no collision, 'x' if the ball collided with the x-axis, 'y' if the ball collided with the y-axis
 */
function computeCollision(
	ballX: number,
	ballY: number,
	ballRadius: number,
	squareX: number,
	squareY: number,
	squareSize: number
) {
	const x = Math.max(squareX, Math.min(ballX, squareX + squareSize))
	const y = Math.max(squareY, Math.min(ballY, squareY + squareSize)
	)
	const dx = ballX - x
	const dy = ballY - y
	const collides = dx * dx + dy * dy <= ballRadius * ballRadius
	if (!collides) return false
	if (Math.abs(dx) > Math.abs(dy)) {
		return 'x'
	} else {
		return 'y'
	}
}
