import 'dotenv/config';
import http from 'http';
import bodyParser from 'body-parser';
import { handleLlmRoutes } from './routes/llm-routes.mjs';
import { loadServerConfig } from './config/env.mjs';

const config = loadServerConfig();

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
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

server.listen(config.port, () => {
    console.log(`Local stub server listening on http://localhost:${config.port}`);
});
