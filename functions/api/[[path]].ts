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
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
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
        `INSERT INTO videos (id, title, url, thumb, authorId, views, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`
      ).bind(id, body.title, body.url, body.thumb || null, body.authorId, Date.now()).run();
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
      ).bind(id, body.body, body.authorId, Date.now()).run();
      return json({ id, ...body }, 201);
    }

    if (path === '/api/likes' && request.method === 'POST') {
      const body: any = await request.json();
      const existing: any = await env.DB.prepare(
        `SELECT id FROM likes WHERE userId = ? AND videoId = ?`
      ).bind(body.userId, body.videoId).first();
      if (existing) {
        await env.DB.prepare(`DELETE FROM likes WHERE id = ?`).bind(existing.id).run();
        return json({ liked: false });
      }
      await env.DB.prepare(`INSERT INTO likes (id, userId, videoId) VALUES (?, ?, ?)`)
        .bind(crypto.randomUUID(), body.userId, body.videoId).run();
      return json({ liked: true });
    }

    if (path === '/api/comments' && request.method === 'POST') {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO comments (id, body, userId, videoId, createdAt) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, body.body, body.userId, body.videoId, Date.now()).run();
      return json({ id, ...body }, 201);
    }

    if (path === '/api/auth' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.mode === 'register') {
        const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(body.email).first();
        if (existing) return json({ error: 'Email taken' }, 400);
        const safeName =
          body.name && String(body.name).trim().length > 0
            ? String(body.name).trim()
            : 'user';
        const id = crypto.randomUUID();
        const hashed = await hash(body.password);
        await env.DB.prepare(
          `INSERT INTO users (id, email, name, password, banned, bonusSubs, createdAt) VALUES (?, ?, ?, ?, 0, 0, ?)`
        ).bind(id, body.email, safeName, hashed, Date.now()).run();
        return json({ id, name: safeName, isOwner: body.email === owner });
      }
      const user: any = await env.DB.prepare(
        `SELECT id, name, password, email, banned FROM users WHERE email = ?`
      ).bind(body.email).first();
      if (!user || user.password !== (await hash(body.password)))
        return json({ error: 'Bad creds' }, 401);
      if (user.banned) return json({ error: 'Account banned' }, 403);
      return json({ id: user.id, name: user.name, isOwner: user.email === owner });
    }

    if (path.startsWith('/api/video/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const video: any = await env.DB.prepare(
        `SELECT v.*, u.name as authorName, u.email as authorEmail
         FROM videos v JOIN users u ON v.authorId = u.id WHERE v.id = ?`
      ).bind(id).first();
      if (!video) return json({ error: 'Not found' }, 404);
      await env.DB.prepare(`UPDATE videos SET views = views + 1 WHERE id = ?`).bind(id).run();
      const { results: comments } = await env.DB.prepare(
        `SELECT c.*, u.name as authorName, u.email as authorEmail
         FROM comments c JOIN users u ON c.userId = u.id
         WHERE c.videoId = ? ORDER BY c.createdAt DESC`
      ).bind(id).all();
      return json({
        ...stripEmail(video, owner),
        views: (video.views || 0) + 1,
        comments: comments.map((c: any) => stripEmail(c, owner)),
      });
    }

    if (path.startsWith('/api/user/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const user: any = await env.DB.prepare(
        `SELECT id, name, email, banned, createdAt, bonusSubs FROM users WHERE id = ?`
      ).bind(id).first();
      if (!user) return json({ error: 'Not found' }, 404);

      const { results: userVideos } = await env.DB.prepare(
        `SELECT v.*, u.name as authorName, u.email as authorEmail,
           (SELECT COUNT(*) FROM likes WHERE videoId = v.id) as likes,
           (SELECT COUNT(*) FROM comments WHERE videoId = v.id) as comments
         FROM videos v JOIN users u ON v.authorId = u.id
         WHERE v.authorId = ? ORDER BY v.createdAt DESC`
      ).bind(id).all();

      const { results: userPosts } = await env.DB.prepare(
        `SELECT p.*, u.name as authorName, u.email as authorEmail
         FROM posts p JOIN users u ON p.authorId = u.id
         WHERE p.authorId = ? ORDER BY p.createdAt DESC`
      ).bind(id).all();

      const subCount: any = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM subscriptions WHERE channelId = ?`
      ).bind(id).first();

      const subscriberCount = (subCount?.count || 0) + (user.bonusSubs || 0);

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
      ).bind(body.subscriberId, body.channelId).first();
      if (existing) {
        await env.DB.prepare(`DELETE FROM subscriptions WHERE id = ?`).bind(existing.id).run();
        return json({ subscribed: false });
      }
      await env.DB.prepare(
        `INSERT INTO subscriptions (id, subscriberId, channelId, createdAt) VALUES (?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), body.subscriberId, body.channelId, Date.now()).run();
      return json({ subscribed: true });
    }

    if (path.startsWith('/api/subs/') && request.method === 'GET') {
      const id = path.split('/').pop();
      const { results } = await env.DB.prepare(
        `SELECT subscriberId FROM subscriptions WHERE channelId = ?`
      ).bind(id).all();
      return json({
        count: results.length,
        subscribers: results.map((r: any) => r.subscriberId),
      });
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

    if (path === '/api/admin/users' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const { results } = await env.DB.prepare(
        `SELECT id, email, name, banned, bonusSubs, createdAt FROM users ORDER BY createdAt DESC LIMIT 200`
      ).all();
      return json(results);
    }

    if (path === '/api/admin/all-videos' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const { results } = await env.DB.prepare(
        `SELECT v.*, u.name as authorName FROM videos v JOIN users u ON v.authorId = u.id ORDER BY v.createdAt DESC LIMIT 500`
      ).all();
      return json(results);
    }

    if (path === '/api/admin/all-posts' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const { results } = await env.DB.prepare(
        `SELECT p.*, u.name as authorName FROM posts p JOIN users u ON p.authorId = u.id ORDER BY p.createdAt DESC LIMIT 500`
      ).all();
      return json(results);
    }

    if (path === '/api/admin/all-comments' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const { results } = await env.DB.prepare(
        `SELECT c.*, u.name as authorName FROM comments c JOIN users u ON c.userId = u.id ORDER BY c.createdAt DESC LIMIT 500`
      ).all();
      return json(results);
    }

    if (path === '/api/admin/stats' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const u: any = await env.DB.prepare(`SELECT COUNT(*) as c FROM users`).first();
      const v: any = await env.DB.prepare(`SELECT COUNT(*) as c FROM videos`).first();
      const p: any = await env.DB.prepare(`SELECT COUNT(*) as c FROM posts`).first();
      const s: any = await env.DB.prepare(`SELECT COUNT(*) as c FROM subscriptions`).first();
      return json({ users: u?.c || 0, videos: v?.c || 0, posts: p?.c || 0, subs: s?.c || 0 });
    }

    if (path === '/api/admin/broadcast' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const me: any = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(owner).first();
      if (!me) return json({ error: 'Owner not found' }, 404);
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO posts (id, body, authorId, createdAt) VALUES (?, ?, ?, ?)`
      ).bind(id, body.body, me.id, Date.now()).run();
      return json({ id, posted: true }, 201);
    }

    if (path === '/api/admin/ban' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET banned = 1 WHERE id = ?`).bind(body.userId).run();
      return json({ banned: true });
    }

    if (path === '/api/admin/unban' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET banned = 0 WHERE id = ?`).bind(body.userId).run();
      return json({ banned: false });
    }

    if (path === '/api/admin/unban-all' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET banned = 0`).run();
      return json({ unbanned: true });
    }

    if (path === '/api/admin/give-subs' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const count = body.count || 1000;
      await env.DB.prepare(
        `UPDATE users SET bonusSubs = COALESCE(bonusSubs, 0) + ? WHERE id = ?`
      ).bind(count, body.channelId).run();
      return json({ granted: count });
    }

    if (path === '/api/admin/reset-subs' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM subscriptions WHERE channelId = ?`).bind(body.channelId).run();
      await env.DB.prepare(`UPDATE users SET bonusSubs = 0 WHERE id = ?`).bind(body.channelId).run();
      return json({ reset: true });
    }

    if (path === '/api/admin/toggle-verify' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const current: any = await env.DB.prepare(
        `SELECT bonusSubs FROM users WHERE id = ?`
      ).bind(body.userId).first();
      const newVal = (current?.bonusSubs || 0) >= 1000 ? 0 : 1000;
      await env.DB.prepare(`UPDATE users SET bonusSubs = ? WHERE id = ?`)
        .bind(newVal, body.userId).run();
      return json({ verified: newVal >= 1000 });
    }

    if (path === '/api/admin/rename-user' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`UPDATE users SET name = ? WHERE id = ?`)
        .bind(body.newName, body.userId).run();
      return json({ renamed: true });
    }

    if (path === '/api/admin/delete-user' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM posts WHERE authorId = ?`).bind(body.userId).run();
      await env.DB.prepare(`DELETE FROM videos WHERE authorId = ?`).bind(body.userId).run();
      await env.DB.prepare(`DELETE FROM comments WHERE userId = ?`).bind(body.userId).run();
      await env.DB.prepare(`DELETE FROM likes WHERE userId = ?`).bind(body.userId).run();
      await env.DB.prepare(`DELETE FROM subscriptions WHERE subscriberId = ? OR channelId = ?`).bind(body.userId, body.userId).run();
      await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(body.userId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-video' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM videos WHERE id = ?`).bind(body.videoId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-post' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(body.postId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-comment' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(body.commentId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-any-comment' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM comments WHERE userId = ?`).bind(body.userId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-any-post' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM posts WHERE authorId = ?`).bind(body.userId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/delete-any-video' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM videos WHERE authorId = ?`).bind(body.userId).run();
      return json({ deleted: true });
    }

    if (path === '/api/admin/wipe-posts' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM posts`).run();
      return json({ wiped: true });
    }

    if (path === '/api/admin/wipe-videos' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM videos`).run();
      return json({ wiped: true });
    }

    if (path === '/api/admin/wipe-comments' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM comments`).run();
      return json({ wiped: true });
    }

    if (path === '/api/admin/wipe-subs' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      await env.DB.prepare(`DELETE FROM subscriptions`).run();
      await env.DB.prepare(`UPDATE users SET bonusSubs = 0`).run();
      return json({ wiped: true });
    }

    if (path === '/api/admin/nuke' && request.method === 'POST') {
      const body: any = await request.json();
      if (body.ownerEmail !== owner) return json({ error: 'Forbidden' }, 403);
      const me: any = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(owner).first();
      if (!me) return json({ error: 'Owner not found' }, 404);
      await env.DB.prepare(`DELETE FROM posts`).run();
      await env.DB.prepare(`DELETE FROM videos`).run();
      await env.DB.prepare(`DELETE FROM comments`).run();
      await env.DB.prepare(`DELETE FROM likes`).run();
      await env.DB.prepare(`DELETE FROM subscriptions`).run();
      await env.DB.prepare(`DELETE FROM users WHERE id != ?`).bind(me.id).run();
      return json({ nuked: true });
    }

    return json({ error: 'Not found' }, 404);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
