import express, { Request, Response } from 'express';
import { Post } from './db/Post';
import { json } from 'body-parser';
import { createConnection } from 'typeorm';
import { Snowflake } from './Snowflake';
const app = express();

const postTypes = {
	subject: 'string',
	content: 'string',
};

void createConnection({
	type: 'postgres',
	url: 'postgres://wksfmntt:2vqFG4yknemUnrVTvuIuLMWr7ea2OOwy@lallah.db.elephantsql.com:5432/wksfmntt',
	synchronize: true,
	logging: true,
	entities: [Post],
});

app.use(json());

app.use((error: any, req: Request, res: Response, next: any) => {
	if (error instanceof Error) return res.status(500).end();
	next();
});

app.use((req, res, next) => {
	console.debug('Request from', req.ip, 'to', req.path, 'via', req.hostname);
	res
		.header('Cache-Control', 'no-store')
		.header('Access-Control-Allow-Origin', '*')
		.header('Access-Control-Allow-Headers', '*')
		// eslint-disable-next-line quotes
		.header('Content-Security-Policy', "default-src 'self'");
	next();
});

app.options('/boards/:board/posts', (req, res) => {
	if (guards.boards(req, res)) return;

	res
		.status(204)
		.header('Allow', 'OPTIONS, GET, PUT')
		.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT')
		.end();
});

app.get('/boards/:board/posts', async (req, res) => {
	if (guards.boards(req, res)) return;

	const board = req.params.board;
	const posts = await Post.findByBoard(board);
	return res.status(200).send({ error: null, data: posts });
});

/**
 * PUT /boards/:board/posts
 * Creates a new post on board ":board"
 *
 * Checks:
 * • Valid board
 * • Valid body
 * • Content-Type header
 * • Well-formed body
 */
app.put('/boards/:board/posts', async (req, res) => {
	if (guards.boards(req, res)) return;
	if (guards.body(req, res)) return;
	if (guards.contentType(req, res)) return;
	if (guards.malformedBody(req, res)) return;

	const post = ((await Post.create({
		...req.body,
		board: req.params.board,
		id: Snowflake.generate(),
		author: Snowflake.generate(),
		views: 0,
		parent: null,
		children: [],
	})) as unknown) as Post;

	await post.save();
	return res
		.status(201)
		.header('Content-Location', `/boards/${req.params.board}/posts/${post.id}`)
		.send({ error: null, data: post.toJSON() });
});

/**
 * A catch-all for un-routed methods
 * Returns 405 with "Allow" header
 */
app.all('/boards/:board/posts', (req, res) => {
	return res.status(405).header('Allow', 'OPTIONS, GET, PUT').end();
});

/**
 * OPTIONS /boards/:board/posts/:id
 * Returns request options
 *
 * Checks:
 * • Valid board
 */
app.options('/boards/:board/posts/:id', (req, res) => {
	if (guards.boards(req, res)) return;

	res
		.status(204)
		.header('Allow', 'OPTIONS, GET, PATCH, DELETE')
		.header('Access-Control-Allow-Methods', 'OPTIONS, GET, PATCH, DELETE')
		.end();
});

/**
 * GET /boards/:board/posts/:id
 * Returns a post (200) if found, else error (404)
 *
 * Checks:
 * • Valid board
 */
app.get('/boards/:board/posts/:id', async (req, res) => {
	if (guards.boards(req, res)) return;

	const id = req.params.id;
	const post = await Post.findByID(id);
	if (post) return res.status(200).send({ error: null, data: post });
	return res.status(404).send({ error: { message: 'post not found' }, data: null });
});

/**
 * PATCH /boards/:board/posts/:id
 * Not used
 */
app.patch('/boards/:board/posts/:id', (req, res) => {
	return res.status(400).send({ error: { message: 'endpoint not used' }, data: null });
});

/**
 * DELETE /boards/:board/posts/:id
 * Deletes a post
 *
 * Checks:
 * • Valid board
 * • ID type
 */
app.delete('/boards/:board/posts/:id', async (req, res) => {
	if (guards.boards(req, res)) return;
	if (guards.idType(req, res)) return;

	const id = req.params.id;
	const post = await Post.delete(id);
	if (post.affected) return res.status(200).send({ error: null, data: { id, deleted: true } });
	return res.status(404).send({ error: { message: 'post not found' } });
});

app.all('/boards/:board/posts/:id', (req, res) => {
	return res.status(405).header('Allow', 'OPTIONS, GET, PATCH, DELETE').end();
});

app.options('/boards/:board/posts/:id/replies', (req, res) => {
	res.status(204).header('Allow', 'OPTIONS, PUT').header('Access-Control-Allow-Methods', 'OPTIONS, PUT').end();
});

app.put('/boards/:board/posts/:id/replies', async (req, res) => {
	if (guards.boards(req, res)) return;
	if (guards.idType(req, res)) return;
	if (guards.malformedBody(req, res)) return;

	const id = req.params.id;
	const parent = await Post.findByID(id);
	if (!parent) return res.status(404).send({ error: { message: 'post not found' }, data: null });
	if (parent.parent) return res.status(400).send({ error: { message: 'post is not a parent post' }, data: null });

	const child = ((await Post.create({
		...req.body,
		board: req.params.board,
		id: Snowflake.generate(),
		author: Snowflake.generate(),
		views: 0,
		parent: parent.id,
		children: null,
	})) as unknown) as Post;

	parent.children!.push(child.id);
	await parent.save();
	await child.save();

	return res.status(201).send({ error: null, data: parent.toJSON() }).end();
});

app.all('/boards/:board/posts/:id/replies', (req, res) => {
	return res.status(405).header('Allow', 'OPTIONS, PUT').end();
});

app.options('/boards/:board/posts/:id/replies/:reply', (req, res) => {
	return res.status(204).header('Allow', 'OPTIONS, GET').header('Access-Control-Allow-Methods', 'OPTIONS, GET').end();
});

app.get('/boards/:board/posts/:id/replies/:reply', async (req, res) => {
	if (guards.boards(req, res)) return;
	if (guards.idType(req, res)) return;
	if (guards.idType(req, res, req.params.reply)) return;

	const pid = req.params.id;
	const cid = req.params.reply;
	const children = new Map((await Post.fetchChildren(pid).then((r) => r?.map((p) => [p.id, p]))) ?? []);

	if (!children.size) return res.status(404).send({ error: { message: 'parent not found' }, data: null });
	const child = children.get(cid);
	if (!child) return res.status(404).send({ error: { message: 'child not found' }, data: null });
	return res.status(200).send({ error: null, data: child });
});

app.all('/boards/:board/posts/:id/replies/:reply', (req, res) => {
	return res.status(405).header('Allow', 'OPTIONS, GET').end();
});

app.all('*', (_, res) => res.status(404).send({ error: { message: 'not found' }, data: null }));

app.listen(3000, () => {
	console.log('Listening on port:', 3000);
});

function typeCheck(obj: any, target: Record<string, any>): boolean {
	if (Object.keys(obj) !== Object.keys(target)) return false;

	for (const [key, value] of Object.entries(target)) {
		console.log('Expecting:', key, 'of', obj, 'to be', value);
		if (typeof obj[key] === value) continue;
		else return false;
	}

	return true;
}

const guards: Record<
	'boards' | 'body' | 'contentType' | 'idType' | 'malformedBody',
	(req: Request, res: Response, third?: any) => boolean
> = {
	boards(req, res) {
		if (!['b', 's', 'g', 't'].includes(req.params.board)) {
			res.status(404).send({ error: { message: 'unknown board' }, data: null });
			return true;
		}

		return false;
	},

	body(req, res) {
		if (!req.body) {
			res.status(400).send({ error: { message: 'missing body' }, data: null });
			return true;
		}

		return false;
	},

	contentType(req, res) {
		if (!req.headers['content-type']?.match(/^application\/json/i)) {
			res.status(415).send({ error: { message: 'request must contain "content-type" header' }, data: null });
			return true;
		}

		return false;
	},

	idType(req, res, id?: string) {
		if (isNaN(id ?? (req.params.id as any))) {
			res.status(400).send({ error: { message: 'expected id to be bigint string' }, data: null });
			return true;
		}

		return false;
	},

	malformedBody(req, res) {
		if (!typeCheck(req.body, postTypes)) {
			res.status(400).send({ error: { message: 'malformed body' }, data: null });
			return true;
		}

		return false;
	},
};

/**
 * obj:
 * {
 *   a: 10,
 * 	 b: 'hello'
 * }
 *
 * target:
 * {
 *   a: 'number',
 *   b: 'string'
 * }
 */
