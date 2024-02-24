let nextHandle = 1 // Spec says greater than zero
const tasksByHandle = new Map<number, () => void>()
let currentlyRunningATask = false


export function setImmediate(callback: () => void) {
	// Copy function arguments
	const args = new Array(arguments.length - 1)
	for (let i = 0; i < args.length; i++) {
		args[i] = arguments[i + 1]
	}
	// Store and register the task
	tasksByHandle.set(nextHandle, callback)
	registerImmediate(nextHandle)
	return nextHandle++
}

export function clearImmediate(handle: number) {
	tasksByHandle.delete(handle)
}

const channel = new MessageChannel()
channel.port1.onmessage = function (event) {
	const handle = event.data

	var task = tasksByHandle.get(handle)
	if (task) {
		currentlyRunningATask = true
		try {
			task()
		} finally {
			clearImmediate(handle)
			currentlyRunningATask = false
		}
	}
}

function registerImmediate(handle: number) {
	channel.port2.postMessage(handle)
}