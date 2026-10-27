import { suggestChart } from '../../../../server/services/suggest_chart.mjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (typeof req.body?.prompt !== 'string' || !req.body.prompt.trim()) {
        return res.status(400).json({ error: 'Request body must include a non-empty prompt' });
    }

    try {
        const suggestion = await suggestChart(req.body);
        if (!suggestion || !Array.isArray(suggestion.json)) {
            throw new Error('Chart generation returned an invalid result');
        }

        return res.status(200).json({
            data: suggestion.json,
            query: suggestion.query ?? '',
        });
    } catch (error) {
        console.error('Error in suggestChart:', error);
        return res.status(502).json({ error: 'Chart generation failed. Check the Vercel function logs.' });
    }
}
