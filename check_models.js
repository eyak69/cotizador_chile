require('dotenv').config();
const axios = require('axios');

async function listModels() {
    try {
        const key = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

        console.log("Querying:", url.replace(key, "HIDDEN_KEY"));

        const response = await axios.get(url);
        const data = response.data;

        if (data.models) {
            console.log("\n--- AVAILABLE MODELS ---");
            data.models.forEach(m => {
                console.log(`Name: ${m.name} | Methods: ${m.supportedGenerationMethods}`);
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

listModels();
