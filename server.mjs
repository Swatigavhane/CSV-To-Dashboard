import http from 'http';
import bodyParser from 'body-parser';
import { handleLlmRoutes } from './routes/llm-routes.mjs';

const port = 8080;

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const jsonParser = bodyParser.json();

const server = http.createServer((req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    jsonParser(req, res, () => {
        handleLlmRoutes(req, res);
    });
});

server.listen(port, () => {
    console.log(`Local stub server listening on http://localhost:${port}`);
});
