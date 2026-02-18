const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
    try {
        const { prompt, history, systemInstruction } = JSON.parse(event.body);

        if (!process.env.GEMINI_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing GEMINI_KEY environment variable" })
            };
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        // Using 1.5-flash as it is the most stable for instructions
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction
        });

        const chat = model.startChat({
            history: history || [],
            generationConfig: {
                maxOutputTokens: 5000
            },
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" },
            body: JSON.stringify({ text }),
        };
    } catch (err) {
        console.error("AI Error:", err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: err.message }),
        };
    }
};