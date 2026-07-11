const http = require('http');

const port = 8080;

const server = http.createServer((req, res) => {
    if (req.url.startsWith('/v1/models/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            results: [{ generated_text: 'Local fallback response from Node server.\nModel endpoint is working on port 8080.' }]
        }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Node local LLM stub is running on port 8080' }));
});

server.listen(port, () => {
    console.log(`Local stub server listening on http://localhost:${port}`);
});
