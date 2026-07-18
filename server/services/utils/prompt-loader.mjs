import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_ROOT = resolve(__dirname, '../..');
const PROMPTS_ROOT = resolve(SERVER_ROOT, 'prompts');

const promptCache = new Map();

function resolvePromptPath(templateName) {
    const fullPath = resolve(PROMPTS_ROOT, templateName);

    if (!fullPath.startsWith(PROMPTS_ROOT)) {
        throw new Error(`Invalid prompt template path: ${templateName}`);
    }

    return fullPath;
}

export async function loadPromptTemplate(templateName) {
    const fullPath = resolvePromptPath(templateName);

    if (promptCache.has(fullPath)) {
        return promptCache.get(fullPath);
    }

    const content = await readFile(fullPath, 'utf8');
    promptCache.set(fullPath, content);
    return content;
}

export function renderPromptTemplate(template, variables = {}) {
    return template.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_, key) => {
        if (!(key in variables)) {
            throw new Error(`Missing prompt variable: ${key}`);
        }

        return String(variables[key]);
    });
}

export async function loadAndRenderPrompt(templateName, variables = {}) {
    const template = await loadPromptTemplate(templateName);
    return renderPromptTemplate(template, variables);
}
