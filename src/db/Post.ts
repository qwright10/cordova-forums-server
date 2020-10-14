import { BaseEntity, Column, Entity, Generated, PrimaryColumn } from 'typeorm';

@Entity({ name: 'posts' })
export class Post extends BaseEntity {
	public static cache = new Map<string, Post>();

	@Generated('increment')
	@Column({ name: 'uid', type: 'int', unique: true })
	public uid!: number;

	@PrimaryColumn({ name: 'id', type: 'text', unique: true })
	public id!: string;

	@Column({ name: 'board', type: 'char' })
	public board!: string;

	@Column({ name: 'author', type: 'text' })
	public author!: string;

	@Column({ name: 'subject', type: 'text' })
	public subject!: string;

	@Column({ name: 'content', type: 'text' })
	public content!: string;

	@Column({ name: 'views', type: 'int', default: 0 })
	public views = 0;

	@Column({ name: 'parent', type: 'text', nullable: true })
	public parent!: string | null;

	@Column({ name: 'children', type: 'text', nullable: true, array: true })
	public children!: string[] | null;

	public static init(): Promise<typeof Post> {
		return this.createQueryBuilder()
			.select()
			.getMany()
			.then((r) => {
				r.map((p) => this.cache.set(p.id, p));
				return this;
			});
	}

	public static findByBoard(board: string): Promise<Post[]> {
		return this.createQueryBuilder('post')
			.where('post.board = :board', { board })
			.getMany()
			.then((r) => {
				r.forEach((p) => this.cache.set(p.id, p));
				return r;
			});
	}

	public static findByID(id: string): Promise<Post | null> {
		console.log('Find by ID:', id);
		return this.createQueryBuilder('post')
			.where('post.id = :id', { id })
			.getOne()
			.then((p) => {
				if (p) this.cache.set(p.id, p);
				return p ?? null;
			});
	}

	public static fetchChildren(post: Post | string): Promise<Post[] | null> {
		if (post instanceof Post && post.parent !== null) return Promise.resolve(null);
		return this.createQueryBuilder('post')
			.where('post.parent = :id', { id: post instanceof Post ? post.id : post })
			.getMany()
			.then((r) => {
				r.forEach((p) => this.cache.set(p.id, p));
				return r;
			});
	}

	public static fetchParent(post: Post | string): Promise<Post | null> {
		if (post instanceof Post && post.parent === null) return Promise.resolve(null);
		return this.createQueryBuilder('post')
			.where('post.id = :id', { id: post instanceof Post ? post.id : post })
			.getOne()
			.then((p) => {
				if (p) this.cache.set(p.id, p);
				return p ?? null;
			});
	}

	public toJSON() {
		return {
			id: this.id,
			author: this.author,
			subject: this.subject,
			content: this.content,
			views: this.views,
			parent: this.parent,
			children: this.children,
		};
	}
}

export interface IPost {
	id: string;
	author: string;
	subject: string;
	content: string;
	views?: number;
	parent: string | null;
	children: string[] | null;
}
