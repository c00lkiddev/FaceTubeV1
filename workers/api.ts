// @ts-nocheck
export interface Env {
  DB: D1Database;
  OWNER_EMAIL: string;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

async function hash(pw: string) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(pw)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function stripEmail(row: any, ownerEmail: string) {
  const { authorEmail, ...rest } = row;
  return { ...rest, isOwner: authorEmail === ownerEmail };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const path = url.pathname;
    const owner = env.OWNER_EMAIL || '';

    try {
      if (path === '/api/videos' && req.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT v.*, u.name as authorName, u.email as authorEmail,
             (SELECT COUNT(*) FROM likes WHERE videoId = v.id) as likes,
             (SELECT COUNT(*) FROM comments WHERE videoId = v.id) as comments
           FROM videos v JOIN users u ON v.authorId = u.id
           ORDER BY v.createdAt DESC LIMIT 100`
        ).all();
        return json(results.map((v: any) => stripEmail(v, owner)));
      }

      if (path === '/api/videos' && req.method === 'POST') {
        const { title, url: videoUrl, thumb, authorId } = await req.json();
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO videos (id, title, url, thumb, authorId, views, createdAt)
           VALUES (?, ?, ?, ?, ?, 0, ?)`
        )
          .bind(id, title, videoUrl, thumb || null, authorId, Date.now())
          .run();
        return json({ id, title, url: videoUrl, thumb, authorId }, 201);
      }

      if (path === '/api/posts' && req.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT p.*, u.name as authorName, u.email as authorEmail
           FROM posts p JOIN users u ON p.authorId = u.id
           ORDER BY p.createdAt DESC LIMIT 50`
        ).all();
        return json(results.map((p: any) => stripEmail(p, owner)));
      }

      if (path === '/api/posts' && req.method === 'POST') {
        const { body, authorId } = await req.json();
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO posts (id, body, authorId, createdAt) VALUES (?, ?, ?, ?)`
        )
          .bind(id, body, authorId, Date.now())
          .run();
        return json({ id, body, authorId }, 201);
      }

      if (path === '/api/likes' && req.method === 'POST') {
        const { userId, videoId } = await req.json();
        const existing = await env.DB.prepare(
          `SELECT id FROM likes WHERE userId = ? AND videoId = ?`
        )
          .bind(userId, videoId)
          .first();

        if (existing) {
          await env.DB.prepare(`DELETE FROM likes WHERE id = ?`)
            .bind(existing.id)
            .run();
          return json({ liked: false });
        }
        await env.DB.prepare(
          `INSERT INTO likes (id, userId, videoId) VALUES (?, ?, ?)`
        )
          .bind(crypto.randomUUID(), userId, videoId)
          .run();
        return json({ liked: true });
      }

      if (path === '/api/comments' && req.method === 'POST') {
        const { body, userId, videoId } = await req.json();
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO comments (id, body, userId, videoId, createdAt)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(id, body, userId, videoId, Date.now())
          .run();
        const user = await env.DB.prepare(
          `SELECT name, email FROM users WHERE id = ?`
        )
          .bind(userId)
          .first<any>();
        return json(
          {
            id,
            body,
            user: { name: user?.name },
            isOwner: user?.email === owner,
          },
          201
        );
      }

      if (path === '/api/auth' && req.method === 'POST') {
        const { email, name, password, mode } = await req.json();

        if (mode === 'register') {
          const existing = await env.DB.prepare(
            `SELECT id FROM users WHERE email = ?`
          )
            .bind(email)
            .first();
          if (existing) return json({ error: 'Email taken' }, 400);

          const id = crypto.randomUUID();
          const hashed = await hash(password);
          await env.DB.prepare(
            `INSERT INTO users (id, email, name, password, createdAt)
             VALUES (?, ?, ?, ?, ?)`
          )
            .bind(id, email, name, hashed, Date.now())
            .run();
          return json({ id, name, isOwner: email === owner });
        }

        const user = await env.DB.prepare(
          `SELECT id, name, password, email FROM users WHERE email = ?`
        )
          .bind(email)
          .first<any>();
        if (!user || user.password !== (await hash(password)))
          return json({ error: 'Bad creds' }, 401);
        return json({
          id: user.id,
          name: user.name,
          isOwner: user.email === owner,
        });
      }

      if (path.startsWith('/api/video/') && req.method === 'GET') {
        const id = path.split('/').pop();
        const video = await env.DB.prepare(
          `SELECT v.*, u.name as authorName, u.email as authorEmail
           FROM videos v JOIN users u ON v.authorId = u.id WHERE v.id = ?`
        )
          .bind(id)
          .first<any>();
        if (!video) return json({ error: 'Not found' }, 404);

        await env.DB.prepare(
          `UPDATE videos SET views = views + 1 WHERE id = ?`
        )
          .bind(id)
          .run();

        const { results: comments } = await env.DB.prepare(
          `SELECT c.*, u.name as authorName, u.email as authorEmail
           FROM comments c JOIN users u ON c.userId = u.id
           WHERE c.videoId = ? ORDER BY c.createdAt DESC`
        )
          .bind(id)
          .all();

        const cleanedComments = comments.map((c: any) =>
          stripEmail(c, owner)
        );
        const cleanedVideo = stripEmail(video, owner);

        return json({
          ...cleanedVideo,
          views: (video.views || 0) + 1,
          comments: cleanedComments,
        });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  },
};
