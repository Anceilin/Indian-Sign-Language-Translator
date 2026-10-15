/**
 * TTS Proxy Route — /api/tts
 *
 * Proxies text to the unofficial Google Translate TTS endpoint and streams
 * the resulting MP3 audio back to the browser.
 *
 * FREE — no API key, no paid plan.
 * Uses the same endpoint as the open-source Python gTTS library.
 *
 * Query params:
 *   text  — the text to speak (URL-encoded)
 *   lang  — language code, e.g. "ta" for Tamil, "en" for English (default: "ta")
 */

import express from 'express';
import https from 'https';

const router = express.Router();

router.get('/', (req, res) => {
  const text = (req.query.text || '').trim();
  const lang = (req.query.lang || 'ta').trim();

  if (!text) {
    return res.status(400).json({ error: 'Query param "text" is required.' });
  }

  const encoded = encodeURIComponent(text);

  // Unofficial Google Translate TTS endpoint (used by gTTS, many OSS projects)
  // client=tw-ob bypasses the need for an auth token
  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob&ttsspeed=0.9`;

  const options = {
    headers: {
      // Mimic a real browser request to avoid 403 from Google
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
      Accept: 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.5',
    },
  };

  const proxyReq = https.get(url, options, (googleRes) => {
    // Forward the audio stream directly to the browser
    res.setHeader('Content-Type', googleRes.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(googleRes.statusCode || 200);
    googleRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[TTS Proxy] Request error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'TTS proxy failed. Check internet connection.' });
    }
  });

  proxyReq.setTimeout(8000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'TTS proxy timed out.' });
    }
  });
});

export default router;
