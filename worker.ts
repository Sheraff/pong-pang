/// <reference lib="webworker" />

import { setImmediate } from "./utils/setImmediate"

export type Incoming = { type: "canvas", data: { canvas: OffscreenCanvas } }
self.onmessage = (e: MessageEvent<Incoming>) => handleMessage(e.data)

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

	const grid = Array.from({ length: size }, () => Array.from({ length: size }, (_, x) => x < size / 2 ? 1 : 0))

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

		ctx.fillStyle = "black"
		ctx.fillRect(0, 0, w, h)

		for (const row of grid) {
			for (const cell of row) {
				if (cell) {
					ctx.fillStyle = "white"
					ctx.fillRect(0, 0, cellSize + 1, cellSize + 1)
				}
				ctx.translate(cellSize, 0)
			}
			ctx.translate(-cellSize * size, cellSize)
		}
		ctx.resetTransform()

		// draw black
		ctx.beginPath()
		ctx.fillStyle = "black"
		ctx.arc(black.x, black.y, radius, 0, circle)
		ctx.fill()
		ctx.closePath()

		// draw white
		ctx.beginPath()
		ctx.fillStyle = "white"
		ctx.arc(white.x, white.y, radius, 0, circle)
		ctx.fill()
		ctx.closePath()

		// // draw black collision candidates
		// {
		// 	const xMin = Math.floor(black.x / cellSize) - 1
		// 	const yMin = Math.floor(black.y / cellSize) - 1
		// 	ctx.strokeStyle = "red"
		// 	ctx.strokeRect(xMin * cellSize, yMin * cellSize, cellSize * 3, cellSize * 3)
		// }

		// // draw white collision candidates
		// {
		// 	const xMin = Math.floor(white.x / cellSize) - 1
		// 	const yMin = Math.floor(white.y / cellSize) - 1
		// 	ctx.strokeStyle = "blue"
		// 	ctx.strokeRect(xMin * cellSize, yMin * cellSize, cellSize * 3, cellSize * 3)
		// }

		// draw metrics
		ctx.font = "24px sans-serif"
		ctx.fillStyle = "red"
		ctx.fillText(`Frame: ${metrics.fps}`, 10, 24)
		ctx.fillText(`Update: ${metrics.ups}`, 10, 48)

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
		lastTime = time
		if (delta === 0) return
		metrics.updates++

		const m = speed * delta / 1000

		black.x += black.dx * m
		black.y += black.dy * m
		white.x += white.dx * m
		white.y += white.dy * m

		// collision
		for (const ball of [black, white]) {
			const xMin = Math.floor(ball.x / cellSize) - 1
			const yMin = Math.floor(ball.y / cellSize) - 1
			for (let y = yMin; y < yMin + 3; y++) {
				for (let x = xMin; x < xMin + 3; x++) {
					// if (!grid[y]) continue
					if (grid[y]?.[x] === ball.ignores) continue
					const collision = computeCollision(ball.x, ball.y, radius, x * cellSize, y * cellSize, cellSize)
					if (!collision) continue
					if (y >= 0 && y < size && x >= 0 && x < size) {
						grid[y][x] = ball.ignores
					}
					if (collision === 'x') {
						ball.dx *= -1
						ball.x = x * cellSize + (ball.dx > 0 ? (cellSize + radius) : (-radius))
					} else {
						ball.dy *= -1
						ball.y = y * cellSize + (ball.dy > 0 ? (cellSize + radius) : (-radius))
					}
				}
			}
		}
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
