import { loadAndRenderPrompt } from '../services/utils/prompt-loader.mjs';
import {
    SUGGEST_CHART_PROMPT_TEMPLATE,
    SUGGEST_CHART_TABLE_NAME,
    SUGGEST_CHART_TYPES,
} from '../services/constants/suggest-chart-constants.mjs';

async function run() {
    const rendered = await loadAndRenderPrompt(SUGGEST_CHART_PROMPT_TEMPLATE, {
        chart_types: SUGGEST_CHART_TYPES,
        table_name: SUGGEST_CHART_TABLE_NAME,
    });

    if (!rendered.includes(SUGGEST_CHART_TABLE_NAME)) {
        throw new Error('Prompt validation failed: table_name was not rendered.');
    }

    if (!rendered.includes('Recommend exactly 4 chart types')) {
        throw new Error('Prompt validation failed: expected core instruction missing.');
    }

    console.log(`Prompt validation passed for ${SUGGEST_CHART_PROMPT_TEMPLATE}`);
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
