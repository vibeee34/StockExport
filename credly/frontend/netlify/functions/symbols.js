export const handler = async (event) => {
    try {
        const apiKey = process.env.FINNHUB_KEY;
        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing FINNHUB_KEY" })
            };
        }

        const response = await fetch(
            `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`
        );

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: "Finnhub API error" }),
            };
        }

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};