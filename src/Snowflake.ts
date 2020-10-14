export class Snowflake {
	public static readonly epoch = new Date('Jun 1 2020 00:00 UTC').valueOf();
	public static increment = 0n;

	public static generate(): string {
		if (this.increment === 0b111111n) this.increment = 0n;

		const date = BigInt(Date.now() - this.epoch) << 6n;
		const incr = ++this.increment;
		const bin = date | incr;
		return bin.toString();
	}
}

/**
 * Snowflake structure:
 *
 * Timestamp (- epoch)						  Increment
 * 111111111111111111111111111111111111111111 111111
 * 48										  6
 *
 * Epoch: 1 Jun 2020 00:00 UTC or 1590969600000
 */

Snowflake.generate();
