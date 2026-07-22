export const LLM_ENDPOINT = 'http://localhost:8080/v1/models/llama-2-7b/generate';

export const chartTypeMapping: Record<string, string> = {
    "Bar Chart": "BarChart",
    "Line Chart": "LineChart",
    "Area Chart": "AreaChart",
    "Pie Chart": "PieChart",
};


export const DUCK_DB_TABLE_NAME = 'uploaded_csv';

export const DEFAULT_CSV_REPORT_PROMPT =
    'Analyze this uploaded CSV and create a comprehensive dashboard report. Identify key metrics, trends, segment comparisons, and notable outliers. Recommend the most suitable chart types and provide clear chart titles and subtitles so the final dashboard is easy to interpret for business decisions.';