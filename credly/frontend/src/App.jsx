import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ComposedChart, Bar, PieChart, Pie, Cell } from 'recharts';
import {
  ScanFace,
  LayoutList,
  Eye,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Loader2,
  Activity,
  Wallet,
  Briefcase,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  Zap,
  Bot,
  User,
  Send
} from 'lucide-react';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// --- Random Graph Data (Fallback) ---
const generateFallbackData = (basePrice) => {
  const data = [];
  let currentPrice = basePrice || 150;
  for (let i = 0; i < 50; i++) {
    currentPrice = currentPrice + (Math.random() - 0.5) * 2.5;
    data.push({
      time: new Date(Date.now() - (50 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 5000)
    });
  }
  return data;
};

// --- RSI CALCULATION ---
const calculateRSI = (closes, period = 14) => {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};


// --- Ticker ---
const StockTicker = ({ stocks, onSelect }) => {
  const dataToShow = stocks.length > 0 ? stocks : [];
  if (dataToShow.length === 0) return null;
  const tickerItems = [...dataToShow, ...dataToShow];
  return (
    <div className="w-full bg-white/5 border-y border-white/5 py-3 overflow-hidden relative z-40 backdrop-blur-sm">
      <div className="flex flex-nowrap whitespace-nowrap animate-ticker w-max">
        {tickerItems.map((s, i) => (
          <div key={`${s.symbol}-${i}`} onClick={() => onSelect(s)} className="flex items-center px-12 shrink-0 border-r border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mr-3">{s.symbol}</span>
            <span className="text-xs font-mono font-bold mr-3 text-white">${s.price.toFixed(2)}</span>
            <span className={`text-[10px] font-bold ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  console.log("Component Rendered");
  const [view, setView] = useState('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- MARKET DATA ---
  const [liveStream, setLiveStream] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartData, setChartData] = useState([]);

  // --- PORTFOLIO STATE ---
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});

  // track the current portfolio during async fetch cycles
  const portfolioRef = useRef(portfolio);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);

  // --- ANALYTICS CALCULATIONS ---
  const portfolioValue = useMemo(() => {
    return Object.entries(portfolio).reduce((acc, [symbol, qty]) => {
      const stock = liveStream.find(s => s.symbol === symbol);
      return acc + (stock ? stock.price * qty : 0);
    }, 0);
  }, [portfolio, liveStream]);

  // --- UPDATED GLOBAL AI CHAT LOGIC ---
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Global Market Prediction Engine Online. I am analyzing worldwide trends to find the absolute best stock bets for you. Ask me for a prediction." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [chatMessages, isAiTyping]);

  const runAiAnalysis = async (userPrompt) => {
    if (isAiTyping) return;
    setIsAiTyping(true);

    try {
      const validHistory = chatMessages
        .filter((msg, index) => !(index === 0 && msg.role === 'assistant'))
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await fetch("/.netlify/functions/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          history: validHistory,
          systemInstruction: `You are a Senior Wall Street Strategist.
          CORE LOGIC:
          1. IF the user says "Hi", "Hello", or asks who you are: 
            - Reply with a brief, professional greeting. 
            - Example: "Greetings. I am your Institutional Strategist. Ready for market analysis?"
            - Do NOT show stock data yet.

          2. IF the user asks for stocks, analysis, or market updates:
            - Combine internal knowledge with live data: ${JSON.stringify(liveStream.slice(0, 10))}.
            - FORMAT: [Ticker] | [Sentiment] | [Margin/Rate] | Why: [Catalyst].
            - RULES: No intros, exactly 5 lines, be aggressive and data-driven.

          3. DATA SOURCE:
            - Treat the 'Live Market Stream' as the primary source for current tickers.`
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setChatMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      console.error("AI Error:", error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `AI Error: ${error.message}` }]);
    } finally {
      setIsAiTyping(false);
    }
  };


  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userText }]);
    await runAiAnalysis(userText);
  };

  // ---- AI INSIGHTS ENGINE ---
  const aiInsights = useMemo(() => {
    const logs = [];
    const held = Object.entries(portfolio).filter(([_, q]) => q > 0);
    if (held.length === 0) return [{ text: "Portfolio empty. Start trading to generate AI insights.", type: 'info' }];

    // Risk Check
    if (held.length > 0 && held.length < 3) {
      logs.push({ text: "High Concentration: Your capital is tied to very few assets. High risk detected.", type: 'warn' });
    }

    // Performance Check
    const topPerformer = [...liveStream]
      .filter(s => portfolio[s.symbol] > 0)
      .sort((a, b) => b.change - a.change)[0];

    if (topPerformer && topPerformer.change > 5) {
      logs.push({ text: `Bullish Momentum: ${topPerformer.symbol} is outperforming the market. Consider trailing stop-losses.`, type: 'success' });
    }

    // Volatility Check
    const marketDrop = liveStream.filter(s => s.change < -3).length;
    if (marketDrop > liveStream.length * 0.4) {
      logs.push({ text: "Market Volatility: High sell-side pressure detected globally. Watch liquidity.", type: 'warn' });
    }

    return logs.length > 0 ? logs : [{ text: "Portfolio stable. No immediate threats detected by AI.", type: 'success' }];
  }, [portfolio, liveStream]);

  const pieData = useMemo(() => {
    const data = Object.entries(portfolio)
      .map(([symbol, qty]) => {
        const stock = liveStream.find(s => s.symbol === symbol);
        return { name: symbol, value: stock ? stock.price * qty : 0 };
      })
      .filter(item => item.value > 0);
    return data.length > 0 ? data : [{ name: 'Cash Only', value: balance }];
  }, [portfolio, liveStream, balance]);

  // DYNAMIC MARKET SCANNER (PRIORITIZED FOR 19+ STOCKS)
  const scanMarket = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    console.log("Terminal: Manual Market Refresh Started...");

    try {
      const res = await fetch(`/.netlify/functions/symbols?t=${Date.now()}`);

      if (!res.ok) {
        throw new Error("Server responded with an error");
      }

      const allStocks = await res.json();

      if (!Array.isArray(allStocks)) {
        console.error("Expected array but got:", allStocks);
        return;
      }

      const heldSymbols = Object.keys(portfolioRef.current)
        .filter(sym => portfolioRef.current[sym] > 0);

      const randomPool = allStocks
        .filter(s =>
          s.symbol &&
          !s.symbol.includes(".") &&
          s.type === "Common Stock" &&
          !heldSymbols.includes(s.symbol)
        )
        .sort(() => 0.5 - Math.random())
        .slice(0, 20)
        .map(s => s.symbol);

      const symbolsToFetch = [...heldSymbols, ...randomPool];
      const BATCH_SIZE = 5;
      const updatedQuotes = [];

      for (let i = 0; i < symbolsToFetch.length; i += BATCH_SIZE) {
        const batch = symbolsToFetch.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(sym =>
          fetch(`/.netlify/functions/quote?symbol=${sym}&t=${Date.now()}`)
            .then(res => res.json())
            .then(q => {
              if (q?.c > 0) {
                return {
                  symbol: sym,
                  price: q.c,
                  change: q.dp || 0
                };
              }
              return null;
            })
            .catch(() => null)
        );

        const results = await Promise.all(batchPromises);
        updatedQuotes.push(...results.filter(Boolean));
        await new Promise(r => setTimeout(r, 600));
      }

      // Clearing current state for a millisecond forces the UI to re render fresh
      setLiveStream([]);
      setLiveStream(updatedQuotes);

      if (!selectedStock && updatedQuotes.length > 0) {
        setSelectedStock(updatedQuotes[0]);
      }

    } catch (e) {
      console.error("Market scan failed:", e);
    } finally {
      // Ensure these states are reset so button becomes clickable again
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { scanMarket(); }, []);

  // hourly REFRESH of the LIVE data
  useEffect(() => {
    scanMarket();
    const hourlyInterval = setInterval(() => {
      console.log("Auto refreshing market data...");
      scanMarket();
    }, 3600000);

    return () => clearInterval(hourlyInterval);
  }, []);

  // MARKET ANALYTICS DATA derivates
  const topGainers = useMemo(() => [...liveStream].sort((a, b) => b.change - a.change).slice(0, 5), [liveStream]);
  const topLosers = useMemo(() => [...liveStream].sort((a, b) => a.change - b.change).slice(0, 5), [liveStream]);

  // --- EMA CALCULATION ---
  const calculateEMA = (prices, period = 50) => {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  };

  // --- INDICATOR ENGINE ---
  const indicators = useMemo(() => {
    if (chartData.length < 50) return null;

    const prices = chartData.map(d => d.price);
    const rsi = calculateRSI(prices);
    const ema50 = calculateEMA(prices, 50);
    const lastPrice = prices[prices.length - 1];

    return { rsi, ema50, lastPrice };
  }, [chartData]);

  const rsiValue = indicators?.rsi ?? 50;

  const signal = useMemo(() => {
    if (!indicators) return "HOLD";

    const { rsi, ema50, lastPrice } = indicators;
    if (!rsi || !ema50) return "HOLD";

    if (rsi < 30) return "BUY(Oversold)";
    if (rsi > 70) return "SELL(Overbought)";
    if (lastPrice > ema50 && rsi > 50) return "BUY(Trend)";
    if (lastPrice < ema50 && rsi < 50) return "SELL(Downtrend)";

    return "HOLD";
  }, [indicators]);

  // --- CHART FETCHER ---
  const fetchChart = async (symbol) => {
    const to = Math.floor(Date.now() / 1000);
    const from = to - (24 * 60 * 60);
    try {
      const res = await fetch(`/.netlify/functions/candles?symbol=${symbol}&from=${from}&to=${to}`);
      const data = await res.json();
      if (data.s === "ok") {
        setChartData(data.c.map((p, i) => ({
          time: new Date(data.t[i] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price: p,
          volume: data.v[i]
        })));
      } else { setChartData(generateFallbackData(selectedStock?.price)); }
    } catch (e) { setChartData(generateFallbackData(selectedStock?.price)); }
  };

  useEffect(() => { if (selectedStock) fetchChart(selectedStock.symbol); }, [selectedStock?.symbol]);

  // --- MARKET ANALYTICS LOGIC ---
  const stats = useMemo(() => {
    if (liveStream.length === 0) return { mood: { label: 'NEUTRAL', color: 'text-gray-400', bar: 'bg-gray-400', val: 50 }, vol: 'Low', node: 'UTC' };
    const greenCount = liveStream.filter(s => s.change > 0).length;
    const ratio = (greenCount / liveStream.length) * 100;
    let mood = { label: 'NEUTRAL', color: 'text-gray-400', bar: 'bg-gray-400', val: 50 };
    if (ratio >= 80) mood = { label: 'EXTREME GREED', color: 'text-green-400', bar: 'bg-green-400', val: 90 };
    else if (ratio >= 60) mood = { label: 'GREED', color: 'text-emerald-400', bar: 'bg-emerald-400', val: 70 };
    else if (ratio >= 40) mood = { label: 'NEUTRAL', color: 'text-yellow-400', bar: 'bg-yellow-400', val: 50 };
    else if (ratio >= 20) mood = { label: 'FEAR', color: 'text-orange-400', bar: 'bg-orange-400', val: 30 };
    else mood = { label: 'EXTREME FEAR', color: 'text-red-500', bar: 'bg-red-500', val: 10 };
    return { mood, vol: 'Medium', node: 'GLOBAL' };
  }, [liveStream]);

  // --- TRADING LOGIC ---
  const handleBuy = () => {
    if (balance >= selectedStock.price) {
      setBalance(prev => prev - selectedStock.price);
      setPortfolio(prev => ({ ...prev, [selectedStock.symbol]: (prev[selectedStock.symbol] || 0) + 1 }));
    } else { alert("Insufficient Funds"); }
  };

  const handleSell = () => {
    const qty = portfolio[selectedStock.symbol] || 0;
    if (qty > 0) {
      setBalance(prev => prev + selectedStock.price);
      setPortfolio(prev => ({ ...prev, [selectedStock.symbol]: qty - 1 }));
    } else { alert("No shares to sell"); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="text-indigo-500 animate-spin mx-auto mb-4" size={32} />
        <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">Scanning Global Exchanges</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full -z-10" />

      {/* NAV */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto relative z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-yellow-400 to-indigo-500" />
          <span className="text-2xl font-bold tracking-tighter uppercase italic">StockExport</span>
        </div>
        <div className="flex gap-8">
          <button onClick={() => setView('market')} className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${view === 'market' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}>Market</button>
          <button className="glass-card px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5">Add to Wallet</button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* --- VIEW 1: LANDING --- */}
        {view === 'landing' && (
          <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StockTicker stocks={liveStream} onSelect={(s) => { setSelectedStock(s); setView('market'); }} />
            <div className="pt-24 pb-32 flex flex-col items-center max-w-7xl mx-auto px-6 text-center">
              <h1 className="text-5xl md:text-8xl font-semibold tracking-tighter mb-8 text-white">Direct Market <br /> Access</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-12">
                <div onClick={() => setView('aiinsight')} className="glass-card p-10 border border-white/5 rounded-3xl hover:bg-white/5 cursor-pointer transition-all relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="mx-auto mb-4 text-indigo-400" size={54} />
                  <h3 className="font-bold text-xl mb-2">AI Insights</h3>
                </div>
                <div onClick={() => setView('terminal')} className="glass-card p-10 border border-white/5 rounded-3xl hover:bg-white/5 cursor-pointer transition-all"><LayoutList className="mx-auto mb-4 text-indigo-400" size={54} /><h3 className="font-bold text-xl mb-2 text-white">Terminal</h3></div>
                <div onClick={() => setView('analytics')} className="glass-card p-10 border border-white/5 rounded-3xl hover:bg-white/5 cursor-pointer transition-all"><Eye className="mx-auto mb-4 text-indigo-400" size={54} /><h3 className="font-bold text-xl mb-2">Analytics</h3></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- VIEW 2: AI INSIGHTS --- */}
        {view === 'aiinsight' && (
          <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto p-6">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 text-[10px] uppercase tracking-widest font-bold transition-colors">
              <ArrowLeft size={16} /> Exit AI Insights
            </button>

            <div className="glass-card flex flex-col h-[75vh] border border-indigo-500/20 rounded-[40px] bg-indigo-500/[0.03] overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.05)]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <Bot className="text-indigo-400" size={24} />
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Global Prediction Engine</span>
                    <h2 className="text-lg font-bold">Market Intelligence Chat</h2>
                  </div>
                </div>
                {isAiTyping && <Loader2 className="animate-spin text-indigo-400" size={18} />}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-5 rounded-3xl text-[13px] leading-relaxed border ${msg.role === 'user'
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-white rounded-tr-none'
                      : 'bg-white/5 border-white/10 text-gray-300 rounded-tl-none'
                      }`}>
                      <div className="flex items-center gap-2 mb-2 opacity-50">
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                        <span className="font-bold uppercase tracking-widest text-[10px]">{msg.role === 'user' ? 'You' : 'AI-Assistant'}</span>
                      </div>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="p-6 bg-white/5 border-t border-white/5">
                <div className="relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask for global predictions or betting advice..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-indigo-500 hover:bg-indigo-600 p-2 rounded-xl text-white transition-all">
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* --- VIEW 3: ANALYTICS DASHBOARD --- */}
        {view === 'analytics' && (
          <motion.div key="a" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto p-6">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 text-[10px] uppercase tracking-widest font-bold transition-colors">
              <ArrowLeft size={16} /> Exit Analytics
            </button>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* AI INSIGHTS BOX */}
                <div className="glass-card p-6 border border-indigo-500/20 rounded-[32px] bg-indigo-500/[0.03] shadow-[0_0_50px_rgba(99,102,241,0.05)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="text-indigo-400" size={16} />
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Strategy Advisor</span>
                  </div>
                  <div className="space-y-3">
                    {aiInsights.map((insight, idx) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className={`text-xs font-medium leading-relaxed ${insight.type === 'warn' ? 'text-orange-300' : 'text-gray-300'}`}>
                          {insight.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-8 border border-white/5 rounded-[32px] bg-white/[0.02] backdrop-blur-xl">
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Total Net Worth</p>
                  <h2 className="text-4xl font-mono font-bold">${(balance + portfolioValue).toFixed(2)}</h2>
                  <div className="mt-6 flex justify-between text-[10px] font-bold uppercase tracking-tighter border-t border-white/5 pt-4">
                    <span className="text-gray-500">Cash: <span className="text-white">${balance.toFixed(2)}</span></span>
                    <span className="text-indigo-400">Assets: <span className="text-white">${portfolioValue.toFixed(2)}</span></span>
                  </div>
                </div>

                <div className="glass-card p-8 border border-white/5 rounded-[32px] bg-white/[0.02] h-[350px] flex flex-col items-center">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-8">Asset Allocation</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-8">
                <div className="glass-card p-8 border border-white/5 rounded-[32px] bg-white/[0.02] h-full">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-bold flex items-center gap-3"><BarChart3 className="text-indigo-400" size={24} /> Asset Exposure</h3>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Positions</p>
                      <p className="font-mono text-xl">{Object.keys(portfolio).filter(k => portfolio[k] > 0).length}</p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {Object.entries(portfolio).filter(([_, qty]) => qty > 0).length > 0 ? (
                      Object.entries(portfolio).map(([symbol, qty]) => {
                        const stock = liveStream.find(s => s.symbol === symbol);
                        if (qty <= 0) return null;
                        return (
                          <div key={symbol} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all">
                            <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/20">{symbol[0]}</div>
                              <div>
                                <p className="font-bold text-lg tracking-tight">{symbol}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{qty} Units Held</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-lg">{stock ? `$${(stock.price * qty).toFixed(2)}` : 'Updating...'}</p>
                              <p className={`text-[10px] font-bold ${stock?.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stock ? `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}% Performance` : 'Live Link Pending'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/5 rounded-3xl">
                        <PieIcon size={48} className="mb-4 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No active positions detected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- VIEW 4: MARKET ANALYTICS --- */}
        {view === 'market' && (
          <motion.div key="m" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto p-6">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 text-[10px] uppercase tracking-widest font-bold transition-colors">
              <ArrowLeft size={16} /> Exit Market View
            </button>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-9 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card p-5 border border-white/5 rounded-3xl bg-white/[0.03]">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">RSI (14)</p>
                    <span className={`text-xl font-mono font-bold block mt-1 ${rsiValue > 70 ? 'text-red-400' : rsiValue < 30 ? 'text-green-400' : 'text-white'}`}>{rsiValue.toFixed(2)}</span>
                  </div>
                  {[{ n: 'Scanned Assets', v: liveStream.length }, { n: 'Vol Score', v: stats.vol }, { n: 'Data Node', v: stats.node }, { n: 'Signal', v: signal }].map((item) => (
                    <div key={item.n} className="glass-card p-5 border border-white/5 rounded-3xl bg-white/[0.03]">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{item.n}</p>
                      <span className="text-xl font-mono font-bold text-white block mt-1">{item.v}</span>
                    </div>
                  ))}
                </div>
                <div className="glass-card p-10 border border-white/5 rounded-[40px] bg-white/[0.02] backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-12">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-7xl font-bold font-mono tracking-tighter">{selectedStock?.symbol}</h2>
                        {rsiValue > 70 && <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-full border border-red-500/30 flex items-center gap-1"><AlertCircle size={10} /> OVERBOUGHT</span>}
                        {rsiValue < 30 && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full border border-green-500/30 flex items-center gap-1"><TrendingUp size={10} /> OVERSOLD</span>}
                      </div>
                      <p className="text-6xl font-mono font-bold">${selectedStock?.price.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${selectedStock?.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{selectedStock?.change.toFixed(2)}% Today</p>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Market Mood: <span className={stats.mood.color}>{stats.mood.label}</span></p>
                    </div>
                  </div>
                  <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <defs>
                          <linearGradient id="marketGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '12px' }} />
                        <XAxis dataKey="time" hide />
                        <YAxis yAxisId="price" hide domain={['auto', 'auto']} />
                        <YAxis yAxisId="vol" hide domain={[0, data => Math.max(...chartData.map(d => d.volume)) * 4]} />
                        <Bar yAxisId="vol" dataKey="volume" fill="rgba(255,255,255,0.05)" radius={[4, 4, 0, 0]} />
                        <Area yAxisId="price" type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={4} fill="url(#marketGlow)" isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-3">
                <div className="glass-card p-6 border border-white/5 rounded-3xl bg-white/[0.01] h-full overflow-y-auto max-h-[700px] space-y-8">
                  <section>
                    <h3 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14} /> Top Gainers</h3>
                    <div className="space-y-2">
                      {topGainers.map(s => (
                        <div key={`gainer-${s.symbol}`} onClick={() => setSelectedStock(s)} className="flex justify-between items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                          <span className="font-bold text-xs">{s.symbol}</span>
                          <span className="text-green-400 font-mono text-xs">+{s.change.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingDown size={14} /> Top Losers</h3>
                    <div className="space-y-2">
                      {topLosers.map(s => (
                        <div key={`loser-${s.symbol}`} onClick={() => setSelectedStock(s)} className="flex justify-between items-center p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                          <span className="font-bold text-xs">{s.symbol}</span>
                          <span className="text-red-400 font-mono text-xs">{s.change.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <div className="h-px bg-white/5" />
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Market Depth</h3>
                    <div className="space-y-3">
                      {liveStream.map(s => (
                        <div key={`full-${s.symbol}`} onClick={() => setSelectedStock(s)} className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer border transition-all ${selectedStock?.symbol === s.symbol ? 'bg-indigo-500/20 border-indigo-500/50' : 'hover:bg-white/5 border-transparent'}`}>
                          <span className="font-bold text-sm tracking-tighter">{s.symbol}</span>
                          <span className={`font-mono text-xs ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.change.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- VIEW 5: TRADING TERMINAL --- */}
        {view === 'terminal' && (
          <motion.div key="t" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto p-6 h-[calc(100vh-100px)]">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setView('landing')} className="flex items-center gap-2 text-gray-500 hover:text-white text-[10px] uppercase tracking-widest font-bold transition-colors">
                <ArrowLeft size={16} /> Exit Terminal
              </button>
              <div className="flex items-center gap-6 bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3"><Wallet className="text-indigo-400" size={16} /><div><p className="text-[10px] text-gray-400 font-bold uppercase">Cash</p><p className="font-mono text-lg font-bold">${balance.toFixed(2)}</p></div></div>
                <div className="flex items-center gap-3"><Briefcase className="text-green-400" size={16} /><div><p className="text-[10px] text-gray-400 font-bold uppercase">Holdings</p><p className="font-mono text-lg font-bold">{portfolio[selectedStock?.symbol] || 0}</p></div></div>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-6 h-[90%]">
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="glass-card p-8 border border-white/5 rounded-3xl bg-white/[0.02] backdrop-blur-xl h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div><h1 className="text-5xl font-bold font-mono tracking-tighter">{selectedStock?.symbol}</h1><p className="text-4xl font-mono font-bold">${selectedStock?.price.toFixed(2)}</p></div>
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold ${selectedStock?.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{selectedStock?.change.toFixed(2)}%</div>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <defs>
                          <linearGradient id="terminalGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="rgba(255,255,255,0.05)"
                        />

                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#888", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="price"
                          domain={["auto", "auto"]}
                          tick={{ fill: "#888", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          yAxisId="vol"
                          orientation="right"
                          hide
                          domain={[0, Math.max(...chartData.map(d => d.volume || 0)) * 4 || 100]}
                        />

                        <Tooltip
                          cursor={{ stroke: "#6366f1", strokeWidth: 1 }}
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            border: "1px solid rgba(99,102,241,0.3)",
                            borderRadius: "12px",
                            fontSize: "12px"
                          }}
                          formatter={(value, name) =>
                            name === "price"
                              ? [`$${Number(value).toFixed(2)}`, "Price"]
                              : [value, "Volume"]
                          }
                        />

                        <Bar
                          yAxisId="vol"
                          dataKey="volume"
                          fill="rgba(255,255,255,0.05)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />

                        <Area
                          yAxisId="price"
                          type="monotone"
                          dataKey="price"
                          stroke="#6366f1"
                          strokeWidth={3}
                          fill="url(#terminalGlow)"
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button onClick={handleSell} className="py-4 rounded-xl bg-red-500/10 text-red-400 font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">Sell</button>
                    <button onClick={handleBuy} className="py-4 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/20 hover:bg-green-500 hover:text-white transition-all uppercase tracking-widest">Buy</button>
                  </div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-0">
                <div className="glass-card flex flex-col h-full border border-white/5 rounded-3xl bg-white/[0.02]">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-gray-300 uppercase tracking-widest text-xs flex items-center gap-2"><Activity size={14} /> Live Market</h3>
                    <button onClick={scanMarket} disabled={isRefreshing} className="p-2 rounded-full hover:bg-white/10 transition-colors text-indigo-400">
                      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {liveStream.map(stock => (
                      <div key={stock.symbol} onClick={() => setSelectedStock(stock)} className={`p-4 rounded-xl cursor-pointer border transition-all flex justify-between items-center mb-2 ${selectedStock?.symbol === stock.symbol ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                        <div><p className="font-bold text-sm">{stock.symbol}</p></div>
                        <div className="text-right"><p className="font-mono font-bold text-sm">${stock.price.toFixed(2)}</p><p className={`text-xs font-bold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stock.change.toFixed(2)}%</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}