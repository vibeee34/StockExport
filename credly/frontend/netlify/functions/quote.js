export const handler = async (event) => {
    const symbol = event.queryStringParameters.symbol;

    try {
        const response = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY}`
        );

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (err) {
        return { statusCode: 500, body: "Server error" };
    }
};
