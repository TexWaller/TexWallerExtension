export const CONFIG = Object.freeze({
    // Replace this with the exact origin of the web app that starts the flow.
    appOrigin: "http://localhost:5173",

    // Replace or narrow these if your OpenAI OAuth authorize endpoint differs.
    authOrigins: ["https://auth.openai.com"],

    // Only redirects to these local hosts over HTTP are eligible for capture.
    redirectHosts: ["localhost", "127.0.0.1"],

    // Reject stale redirects even if a matching state value appears later.
    flowTtlMs: 10 * 60 * 1000,
});
