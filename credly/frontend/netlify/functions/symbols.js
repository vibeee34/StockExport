const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    try {
        const FINNHUB_KEY = process.env.FINNHUB_KEY;
        const response = await fetch(`https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${FINNHUB_KEY}`);
        const allSymbols = await response.json();

        const cleanSymbols = allSymbols
            .filter(s => s.type === "Common Stock" && !s.symbol.includes("."))
            .sort(() => 0.5 - Math.random())
            .slice(0, 100);

        return {
            statusCode: 200,
            body: JSON.stringify(cleanSymbols),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};