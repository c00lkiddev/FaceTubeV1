export const onRequest = async (context: any) => {
  const { env, request } = context;
  const url = new URL(request.url);

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json', ...cors },
    });

  const hash = async (pw: string) => {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(pw)
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const stripEmail = (row: any, ownerEmail: string) => {
    const { authorEmail, ...rest } = row;
    return { ...rest, isOwner: authorEmail === ownerEmail };
  };

  const path = url.pathname;
  const owner = env.OWNER_EMAIL || '';

  try {
    if (path === '/api/videos' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT v.*, u.name as authorName, u.email as authorEmail,
           (SELECT COUNT(*) FROM likes WHERE videoId = v.id) as likes,
           (SELECT COUNT(*) FROM comments WHERE videoId = v.id) as comments
         FROM videos v JOIN users u ON v.authorId = u.id
         WHERE u.banned IS NOT 1
         ORDER BY v.createdAt DESC LIMIT 100`
      ).all();
      return json(results.map((v: any) => stripEmail(v, owner)));
    }

    if (path === '/api/videos' && request.method === 'POST') {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO videos (id, title, url, thumb, authorId, views, createdAt)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
        .bind(id, body.title, body.url, body.thumb || null, body.authorId, Date.now())
        .run();
      return json({ id, ...body }, 201);
    }

    if (path === '/api/posts' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT p.*, u.name as authorName, u.email as authorEmail
         FROM posts p JOIN users u ON p.authorId = u.id
         WHERE u.banned IS NOT 1
         ORDER BY p.createdAt DESC LIMIT 50`
      ).all();
      return json(results.map((p: any) => stripEmail(p, owner)));
    }

    if (path === '/api/posts' && request.method === 'POST') {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO posts (id, body, authorId, createdAt) VALUES (?, ?, ?, ?)`
      )
        .bind(id, body.body, body.authorId, Date.now())
        .run();
      return json({ id, ...body }, 201);
    }

    if (path === '/api/likes' && request.method === 'POST') {
      const body: any = await request.json();
      const existing: any = await env.DB.prepare(
        `SELECT id FROM likes WHERE userId = ? AND videoId = ?`
      )
        .bind(body.userId, body.videoId)
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
        .bind(crypto.randomUUID(), body.userId, body.videoId)
        .run();
      return json({ liked: true });
    }

    if (path === '/api/comments' && request.method === 'POST') {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO comments (id, body, userId, videoId, createdAt)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(id, body.body, body.userId, body.videoId, Date.now())
        .run();
      return json({ id, ...body }, 201);
    }

    if (path === '/api/auth' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.mode === 'register') {
        const existing = await env.DB.prepare(
          `SELECT id FROM users WHERE email = ?`
        )
          .bind(body.email)
          .first();
        if (existing) return json({ error: 'Email taken' }, 400);
        const id = crypto.randomUUID();
        const hashed = await hash(body.password);
        await env.DB.prepare(
          `INSERT INTO users (id, email, name, password, banned, createdAt)
           VALUES (?, ?, ?, ?, 0, ?)`
        )
          .bind(id, body.email, body.name, hashed, Date.now())
          .run();
        return json({ id, name: body.name, isOwner: body.email === owner });
      }
      const user: any = await env.DB.prepare(
        `SELECT id, name, password, email, banned FROM users WHERE email = ?`
      )
        .bind(body.email)
        .first();
      if (!user || user.password !== (await hash(body.password)))
        return json({ error: 'Bad creds' }, 401);
      if (user.banned) return json({ error: 'Account banned' }, 403);
      return json({
        id: user.id,
        name: user.name,
        isOwner: user.email === owner,
      });
    }

    if (path.startsWith('/api/video/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const video: any = await env.DB.prepare(
        `SELECT v.*, u.name as authorName, u.email as authorEmail
         FROM videos v JOIN users u ON v.authorId = u.id WHERE v.id = ?`
      )
        .bind(id)
        .first();
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
      return json({
        ...stripEmail(video, owner),
        views: (video.views || 0) + 1,
        comments: comments.map((c: any) => stripEmail(c, owner)),
      });
    }

    if (path.startsWith('/api/user/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const user: any = await env.DB.prepare(
        `SELECT id, name, email, banned, createdAt FROM users WHERE id = ?`
      )
        .bind(id)
        .first();
      if (!user) return json({ error: 'Not found' }, 404);

      const { results: userVideos } = await env.DB.prepare(
        `SELECT v.*, u.name as authorName, u.email as authorEmail,
           (SELECT COUNT(*) FROM likes WHERE videoId = v.id) as likes,
           (SELECT COUNT(*) FROM comments WHERE videoId = v.id) as comments
         FROM videos v JOIN users u ON v.authorId = u.id
         WHERE v.authorId = ? ORDER BY v.createdAt DESC`
      )
        .bind(id)
        .all();

      const { results: userPosts } = await env.DB.prepare(
        `SELECT p.*, u.name as authorName, u.email as authorEmail
         FROM posts p JOIN users u ON p.authorId = u.id
         WHERE p.authorId = ? ORDER BY p.createdAt DESC`
      )
        .bind(id)
        .all();

      const subCount: any = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM subscriptions WHERE channelId = ?`
      )
        .bind(id)
        .first();

      const subscriberCount = subCount?.count || 0;

      return json({
        user: {
          id: user.id,
          name: user.name,
          createdAt: user.createdAt,
          isOwner: user.email === owner,
          verified: subscriberCount >= 1000,
          banned: user.banned === 1,
        },
        subscriberCount,
        videos: userVideos.map((v: any) => stripEmail(v, owner)),
        posts: userPosts.map((p: any) => stripEmail(p, owner)),
      });
    }

    if (path === '/api/subscribe' && request.method === 'POST') {
      const body: any = await request.json();
      const existing: any = await env.DB.prepare(
        `SELECT id FROM subscriptions WHERE subscriberId = ? AND channelId = ?`
      )
        .bind(body.subscriberId, body.channelId)
        .first();
      if (existing) {
        await env.DB.prepare(`DELETE FROM subscriptions WHERE id = ?`)
          .bind(existing.id)
          .run();
        return json({ subscribed: false });
      }
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, subscriberId, channelId, createdAt)
         VALUES (?, ?, ?, ?)`
      )
        .bind(
          crypto.randomUUID(),
          body.subscriberId,
          body.channelId,
          Date.now()
        )
        .run();
      return json({ subscribed: true });
    }

    if (path.startsWith('/api/subs/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const { results } = await env.DB.prepare(
        `SELECT subscriberId FROM subscriptions WHERE channelId = ?`
      )
        .bind(id)
        .all();
      return json({
        count: results.length,
        subscribers: results.map((r: any) => r.subscriberId),
      });
    }

    if (path === '/api/admin/users' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const { results } = await env.DB.prepare(
        `SELECT id, email, name, banned, createdAt FROM users
         ORDER BY createdAt DESC LIMIT 200`
      ).all();
      return json(results);
    }

    if (path === '/api/admin/ban' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET banned = 1 WHERE id = ?`)
        .bind(body.userId)
        .run();
      return json({ banned: true });
    }

    if (path === '/api/admin/unban' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET banned = 0 WHERE id = ?`)
        .bind(body.userId)
        .run();
      return json({ banned: false });
    }

    if (path === '/api/admin/give-subs' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const count = body.count || 1000;
      for (let i = 0; i < count; i++) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO subscriptions (id, subscriberId, channelId, createdAt)
           VALUES (?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            'fake-' + crypto.randomUUID(),
            body.channelId,
            Date.now()
          )
          .run();
      }
      return json({ granted: count });
    }

    if (path === '/api/youtube/search' && request.method === 'GET') {
      const q = url.searchParams.get('q');
      if (!q) return json([]);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${env.YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      return json(data.items || []);
    }

    if (path === '/api/suggest' && request.method === 'GET') {
      const q = url.searchParams.get('q');
      if (!q) return json([]);
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`
      );
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return json(data[1] || []);
      } catch {
        return json([]);
      }
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
