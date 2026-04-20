import http from 'http';
import { startDiscordSync, cancelDiscordSync } from './sync/discordSync.js';

export function startBotServer(client) {
  const PORT = parseInt(process.env.BOT_SERVER_PORT || '3002', 10);
  const SECRET = process.env.BOT_SERVER_SECRET || 'changeme';

  const server = http.createServer((req, res) => {
    if (req.headers['x-bot-secret'] !== SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');

        if (req.method === 'POST' && req.url === '/execute-sync') {
          const { jobId, moves, channelId } = data;
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'queued', jobId }));
          // Fire-and-forget — progress reported back via HTTP callbacks
          startDiscordSync(client, { jobId, moves, channelId });

        } else if (req.method === 'POST' && req.url === '/cancel-sync') {
          cancelDiscordSync(data.jobId);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'cancelled', jobId: data.jobId }));

        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(PORT, () => console.log(`Bot HTTP server listening on port ${PORT}`));
}
