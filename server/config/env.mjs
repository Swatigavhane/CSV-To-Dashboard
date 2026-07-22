const requiredEnvVars = ['PORT', 'CORS_ORIGIN'];

function getEnvValue(name) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
        return value;
    }

    return null;
}

export function loadServerConfig() {
    const missing = requiredEnvVars.filter((name) => !getEnvValue(name));

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
        port: Number(getEnvValue('PORT')),
        corsOrigin: getEnvValue('CORS_ORIGIN'),
        huggingFaceToken: getEnvValue('HUGGINGFACE_TOKEN') || '',
    };
}
