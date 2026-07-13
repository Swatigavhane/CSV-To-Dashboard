export function safeParse(llmOutput) {
    // 1. Remove everything before the first '[' or '{' and after the last ']' or '}'
    const startIndex = llmOutput.indexOf('['); // or '{'
    const endIndex = llmOutput.lastIndexOf(']'); // or '}'

    if (startIndex === -1 || endIndex === -1) {
        throw new Error("No JSON structure found in output");
    }

    const cleanJson = llmOutput.substring(startIndex, endIndex + 1);

    // 2. Parse
    return JSON.parse(cleanJson);
}