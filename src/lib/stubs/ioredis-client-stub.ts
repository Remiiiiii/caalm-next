/** Turbopack client alias — ioredis is server-only. */
export default class IORedisStub {
	constructor() {
		throw new Error("ioredis is not available in the browser bundle");
	}
}

export { IORedisStub as Redis };
