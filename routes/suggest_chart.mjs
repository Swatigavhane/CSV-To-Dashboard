import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';
import { safeParse } from './utils/utils.js';

const token = process.env.HUGGINGFACE_TOKEN;
console.log('Hugging Face Token:', token);
const client = token ? new InferenceClient(token) : new InferenceClient();

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
                                    `
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });

        console.log('Received suggestion:', result.choices[0].message.content);

        return safeParse(result.choices[0].message.content);
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

