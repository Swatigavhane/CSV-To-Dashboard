import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';
import { safeParse } from './utils/utils.js';

const token = process.env.HUGGINGFACE_TOKEN;
console.log('Hugging Face Token:', token);
const client = token ? new InferenceClient(token) : new InferenceClient();

function extractQueryFromResponse(text) {
    if (typeof text !== 'string' || !text.trim()) {
        return null;
    }

    // Normalize both variants: **Query:** ... and **Query**: ... to Query: ...
    const normalizedText = text
        .replace(/\*\*\s*query\s*:\s*\*\*/ig, 'query:')
        .replace(/\*\*\s*query\s*\*\*\s*:/ig, 'query:');

    // Matches: Query: `SELECT ...;`
    const backtickMatch = normalizedText.match(/(?:^|\n)\s*query\s*:\s*`([^`]+)`/i);
    console.log('Extracted query from response (backticks):', backtickMatch);
    if (backtickMatch?.[1]) {
        return backtickMatch[1].trim();
    }

    // Matches: Query: SELECT ...; or Query: sample query
    const plainMatch = normalizedText.match(/(?:^|\n)\s*query\s*:\s*([^\n\r]+)/i);
    console.log('Extracted query from response (plain):', plainMatch);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim();
    }

    return null;
}

export async function suggestChart(reqBody) {
    console.log('Received reqBody:', reqBody);
    const prompt = reqBody;

    try {
        const result = await client.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-7B-Instruct", // or 14B if you have access
            messages: [
                {
                    role: "system",
                    content: `You are an expert Data Visualization Analyst.
                                    1. Analyze the CSV schema provided.
                                    2. For all chart types (including Pie Charts), you MUST return these EXACT keys:
                                    - "chart_type"
                                    - "title"
                                    - "subtitle"
                                    - "x_axis" (The categorical/dimension key)
                                    - "value_axis" (The numerical/measure key)
                                    - "reasoning"

                                    3. For 'x_axis' and 'value_axis', YOU MUST USE ONLY THE EXACT KEYS provided in the schema: 
                                    - Date, Region, Product, Channel, Units, Revenue.
                                    4. Recommend exactly 4 chart types from: 'Bar Chart', 'Line Chart', 'Pie Chart', 'Area Chart'.
                                    5. RETURN ONLY A VALID JSON ARRAY. No markdown, no conversational text.
                                    6. Also return one SQL query based on the user prompt.
                                    7. The query line MUST be returned in this exact format every time (lowercase key): **query**: sample query
                                    8. Do not use any other query label formats such as Query:, **Query:**, or backticks around the query.

                                    Example of expected output structure:
                                    [
                                        {
                                            "chart_type": "Pie Chart",
                                            "title": "Revenue by Product",
                                            "subtitle" : "Site visits over time",
                                            "x_axis": "Product",
                                            "value_axis": "Revenue",
                                            "reasoning": "..."
                                        }
                                    ]
                                    **query**: sample query
                                    `
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });


        const responseText = result.choices[0].message.content;
        const extractedQuery = extractQueryFromResponse(responseText);
        const parsedJson = safeParse(responseText);
        console.log('Received suggestion:', responseText);
        console.log('Extracted query:', extractedQuery);

        return {
            json: parsedJson,
            query: extractedQuery,
        };
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

