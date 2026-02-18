export const handler = async (event) => {
    const { symbol, from, to } = event.queryStringParameters;

    try {
        const response = await fetch(
            `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=15&from=${from}&to=${to}&token=${process.env.FINNHUB_KEY}`
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
