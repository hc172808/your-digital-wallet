import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;

const generateData = (timeframe: string) => {
  const points: { label: string; value: number }[] = [];
  let count = 24;
  let base = 22000;

  switch (timeframe) {
    case "1D":
      count = 24;
      base = 24000;
      for (let i = 0; i < count; i++) {
        points.push({ label: `${i}:00`, value: base + Math.sin(i * 0.5) * 800 + Math.random() * 300 });
      }
      break;
    case "1W":
      count = 7;
      base = 23000;
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < count; i++) {
        points.push({ label: days[i], value: base + i * 200 + Math.random() * 500 });
      }
      break;
    case "1M":
      count = 30;
      base = 20000;
      for (let i = 1; i <= count; i++) {
        points.push({ label: `${i}`, value: base + i * 120 + Math.random() * 600 });
      }
      break;
    case "3M":
      count = 12;
      base = 18000;
      for (let i = 0; i < count; i++) {
        points.push({ label: `W${i + 1}`, value: base + i * 500 + Math.random() * 800 });
      }
      break;
    case "1Y":
      count = 12;
      base = 14000;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 0; i < count; i++) {
        points.push({ label: months[i], value: base + i * 900 + Math.random() * 1000 });
      }
      break;
    case "ALL":
      count = 8;
      base = 5000;
      for (let i = 0; i < count; i++) {
        points.push({ label: `${2017 + i}`, value: base + i * 2500 + Math.random() * 2000 });
      }
      break;
  }
  return points;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

const PortfolioChart = () => {
  const [timeframe, setTimeframe] = useState<string>("1M");
  const data = generateData(timeframe);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Portfolio</h2>
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl p-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(160, 84%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(220, 10%, 55%)" }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(160, 84%, 50%)"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default PortfolioChart;
