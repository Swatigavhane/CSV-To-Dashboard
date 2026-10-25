import { suggestChart } from '../../../../server/services/suggest_chart.mjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const suggestion = await suggestChart(req.body);
        return res.status(200).json({
            data: suggestion?.json ?? null,
            query: suggestion?.query ?? null,
        });
    } catch (error) {
        console.error('Error in suggestChart:', error);
        return res.status(500).json({ error: 'Failed to generate suggestion' });
    }
}
