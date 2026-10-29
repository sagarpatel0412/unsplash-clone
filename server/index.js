import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
const accessKey = process.env.UNSPLASH_ACCESS_KEY;
const base = 'https://api.unsplash.com';
const headers = () => ({ Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' });

async function fromUnsplash(path) {
  if (!accessKey) { const e = new Error('Set UNSPLASH_ACCESS_KEY in server/.env'); e.status = 500; throw e; }
  const response = await fetch(base + path, { headers: headers() });
  if (!response.ok) {
    const e = new Error(response.status === 403 ? 'Unsplash API rate limit reached or access forbidden' : `Unsplash API error (${response.status})`);
    e.status = response.status;
    throw e;
  }
  return response.json();
}

const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < 60000) return hit.data;
  const data = await fn();
  if (cache.size > 80) cache.clear();
  cache.set(key, { data, time: Date.now() });
  return data;
}

app.get('/api/photos', async (req, res) => {
  try {
    const query = String(req.query.query || '').trim().slice(0, 100);
    const order = req.query.order_by === 'latest' ? 'latest' : 'relevant';
    const orientation = ['landscape', 'portrait', 'squarish'].includes(req.query.orientation) ? req.query.orientation : '';
    const page = Math.min(100, Math.max(1, parseInt(req.query.page, 10) || 1));
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    let path;
    if (query) {
      params.set('query', query);
      params.set('order_by', order);
      if (orientation) params.set('orientation', orientation);
      path = `/search/photos?${params}`;
    } else {
      params.set('order_by', 'latest');
      path = `/photos?${params}`;
    }
    const data = await cached(path, () => fromUnsplash(path));
    res.json(query ? { results: data.results, totalPages: data.total_pages, total: data.total } : { results: data, totalPages: data.length === 20 ? page + 1 : page, total: null });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
});

app.get('/api/photos/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return res.status(400).json({ message: 'Invalid photo ID' });
    const photo = await fromUnsplash(`/photos/${encodeURIComponent(id)}`);
    const location = new URL(photo.links.download_location);
    if (location.protocol !== 'https:' || location.hostname !== 'api.unsplash.com') throw new Error('Unexpected tracking URL');
    const tracked = await fetch(location, { headers: headers() });
    if (!tracked.ok) { const error = new Error('Unable to register download'); error.status = 502; throw error; }
    const imageUrl = new URL(photo.urls.full);
    if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'images.unsplash.com') throw new Error('Unexpected image URL');
    const image = await fetch(imageUrl);
    if (!image.ok || !image.body) { const error = new Error('Unable to fetch image'); error.status = 502; throw error; }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="unsplash-${id}.jpg"`);
    res.setHeader('Cache-Control', 'no-store');
    await pipeline(Readable.fromWeb(image.body), res);
  } catch (error) {
    if (res.headersSent) res.destroy(error);
    else res.status(error.status || 500).json({ message: error.message });
  }
});

app.get("/api/photos/:id/download", async (req, res) => {
  try {
    const { id } = req.params;
    const widthParam = req.query.width;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ error: "Invalid photo ID" });
    }

    const width = widthParam === undefined ? null : Number(widthParam);

    if (width !== null && (!Number.isSafeInteger(width) || width < 1)) {
      return res.status(400).json({ error: "Invalid width" });
    }

    const headers = {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      "Accept-Version": "v1",
    };

    // Fetch the original photo metadata.
    const photoRes = await fetch(
      `https://api.unsplash.com/photos/${encodeURIComponent(id)}`,
      { headers },
    );

    if (!photoRes.ok) {
      return res.status(photoRes.status).json({
        error: "Could not retrieve photo",
      });
    }

    const photo = await photoRes.json();

    if (width && width > photo.width) {
      return res.status(400).json({
        error: `Width cannot exceed ${photo.width}px`,
      });
    }

    // Register download with Unsplash.
    const trackingUrl = new URL(photo.links.download_location);

    if (
      trackingUrl.protocol !== "https:" ||
      trackingUrl.hostname !== "api.unsplash.com"
    ) {
      throw new Error("Invalid tracking URL");
    }

    const tracked = await fetch(trackingUrl, { headers });

    if (!tracked.ok) {
      throw new Error("Download tracking failed");
    }

    // Build requested resolution.
    const imageUrl = new URL(photo.urls.raw);

    if (
      imageUrl.protocol !== "https:" ||
      imageUrl.hostname !== "images.unsplash.com"
    ) {
      throw new Error("Invalid image URL");
    }

    imageUrl.searchParams.set("fm", "jpg");
    imageUrl.searchParams.set("q", "90");

    if (width) {
      imageUrl.searchParams.set("w", String(width));
      imageUrl.searchParams.set("fit", "max");
    }

    const image = await fetch(imageUrl);

    if (!image.ok || !image.body) {
      throw new Error("Image download failed");
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="unsplash-${id}-${width || "original"}.jpg"`,
    );

    await pipeline(Readable.fromWeb(image.body), res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.destroy(error);
    }
  }
});

app.listen(process.env.PORT || 5000, () => console.log(`API on http://localhost:${process.env.PORT || 5000}`));
