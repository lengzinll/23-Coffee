const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

// Diagnostic logging to stdout (captured by iisnode)
console.log('--- iisnode diagnostic info ---');
console.log('Current __dirname:', __dirname);
console.log('Working directory:', process.cwd());

let next;
try {
  // Try finding next in the local node_modules
  const nextModulePath = path.resolve(__dirname, 'node_modules', 'next');
  console.log('Attempting to require next from:', nextModulePath);
  next = require(nextModulePath);
  console.log('Successfully loaded "next" module');
} catch (e) {
  console.error('CRITICAL ERROR: Could not find "next" module.');
  console.error('Search path tried:', path.resolve(__dirname, 'node_modules', 'next'));
  console.error('Make sure "next" is in your node_modules folder and you have run npm install or bun install on the server.');
  throw e;
}

const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
