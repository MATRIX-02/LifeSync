/**
 * The single id generator for anything that gets persisted.
 *
 * Rows used to be created with `${prefix}_${Date.now()}_${Math.random()...}`.
 * That caused real damage: syncService's assignIdIfMissing() would see a
 * non-UUID id, mint a fresh UUID, and upsert under it - leaving the original
 * row behind. One habit, two rows. See the habit duplication fix.
 *
 * UUID v4 also beats the timestamp scheme on its own merits:
 *   - collisions: two devices creating a row in the same millisecond could
 *     collide before; v4 has ~122 bits of randomness.
 *   - disclosure: a timestamp id leaks when a row was created and is trivially
 *     enumerable. UUIDs are not guessable, which is defence in depth behind RLS.
 *   - schema: ids in this shape can be stored in real `uuid` columns later,
 *     with proper indexes and foreign keys. `habit_1787…` cannot.
 *
 * Not crypto-grade (Math.random), but neither was what it replaces, and these
 * are row identifiers rather than secrets or tokens.
 */
export const generateUUID = (): string =>
	"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});

export const isValidUUID = (id: unknown): id is string =>
	typeof id === "string" &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		id
	);

export default generateUUID;
