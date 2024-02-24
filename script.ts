import type { Incoming } from "./worker"
import Worker from "./worker?worker"
const worker = new Worker()
function post<I extends Incoming["type"]>(
	type: I,
	data: Extract<Incoming, { type: I }>["data"],
	transfer?: Transferable[]
) {
	worker.postMessage({ type, data }, { transfer })
}

const canvas = document.querySelector('canvas')!

const offscreen = canvas.transferControlToOffscreen()
post("canvas", { canvas: offscreen }, [offscreen])