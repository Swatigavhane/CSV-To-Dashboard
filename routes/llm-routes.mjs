import { suggestChart } from './suggest_chart.mjs';

export const handleLlmRoutes = (req, res) => {
    console.log('Handling LLM route:', req.body, req.url, req.method);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [] }));
        return true;
    }

    if (pathname.match(/^\/v1\/models\/[^/]+\/generate$/)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const model = pathname.split('/')[3];

        suggestChart(req.body)
            .then((suggestion) => {
                res.end(JSON.stringify({
                    data: JSON.stringify(suggestion),
                }));
            })
            .catch((error) => {
                console.error('Error in suggestChart:', error);
                res.end(JSON.stringify({ error: 'Failed to generate suggestion' }));
            });

        return true;
    }

    return false;
};
