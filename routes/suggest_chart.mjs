import { InferenceClient } from '@huggingface/inference';
import 'dotenv/config';

const client = new InferenceClient("huggingfaceToken");

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
                              Analyze the following CSV schema and recommend the best chart type
                              Available chart types: 'Bar Chart', 'Line Chart', 'Pie Chart', 'radial chart', 'Area Chart'.
                              give atleast 4 suggestions with reasoning for each chart type and columns to use for X and Y axes.
                              also return a good title for the chart.
                              Return the response in valid JSON format: 
                            {
                                "chart_type": "string",
                                "x_axis": "string",
                                "y_axis": "string",
                                "reasoning": "string"
                            }`
                },
                { role: "user", content: JSON.stringify(reqBody, 2, null) }
            ]
        });

        console.log('Received suggestion:', result.choices[0].message.content);

        return JSON.parse(result.choices[0].message.content);
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        return null;
    }
}

