import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/**
 * Route to serve the standalone single-file wellness profile HTML
 */
app.get('/wellness-profile.html', (req, res) => {
  const filePaths = [
    resolve(process.cwd(), 'public/wellness-profile.html'),
    join(browserDistFolder, 'wellness-profile.html'),
  ];
  for (const p of filePaths) {
    if (existsSync(p)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(readFileSync(p, 'utf8'));
      return;
    }
  }
  res.status(404).send('File not found');
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
