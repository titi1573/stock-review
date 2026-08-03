function IndexCard({ idx }) {
  const isUp = idx.change >= 0;
  return (
    <div className="glass-card p-4">
      <div className="text-xs text-slate-500 mb-1">{idx.name}</div>
      <div className="text-2xl font-bold tabular-nums text-slate-100">{idx.price.toFixed(2)}</div>
      <div className={`text-sm mt-1.5 tabular-nums font-medium ${isUp ? "num-up" : "num-down"}`}>
        {isUp ? "+" : ""}{idx.change.toFixed(2)} ({isUp ? "+" : ""}{idx.change_pct.toFixed(2)}%)
      </div>
    </div>
  );
}

export default function Dashboard({ data }) {
  const { indices, market_summary, thermometer: th } = data;
  const isHot = th.label.includes("热") || th.label.includes("强");
  const isCold = th.label.includes("冷");
  const upRatio = market_summary.up_count / Math.max(market_summary.up_count + market_summary.down_count, 1) * 100;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-100">大盘概况</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {indices.map((idx) => (
          <IndexCard key={idx.code} idx={idx} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">两市成交额</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-slate-100">
            {market_summary.total_turnover.toFixed(0)}
            <span className="text-sm font-normal text-slate-500 ml-1">亿</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            较昨日{market_summary.turnover_change_pct >= 0 ? "↑" : "↓"}{Math.abs(market_summary.turnover_change_pct).toFixed(1)}%
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">涨跌家数</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            <span className="num-up">{market_summary.up_count}</span>
            <span className="text-slate-600 mx-1.5">/</span>
            <span className="num-down">{market_summary.down_count}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-500/60 to-red-500/60"
              style={{ width: `${Math.max(upRatio, 5)}%` }} />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">北向资金</div>
          <div className={`text-xl font-bold tabular-nums mt-1 ${market_summary.northbound_net >= 0 ? "num-up" : "num-down"}`}>
            {market_summary.northbound_net >= 0 ? "+" : ""}{market_summary.northbound_net.toFixed(2)}
            <span className="text-sm font-normal text-slate-500 ml-1">亿</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">北向净流入</div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${
              isHot ? "bg-red-500/15 text-red-400" : isCold ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-400"
            }`}>{th.label}</span>
            <span className="text-xs text-slate-500">{th.description}</span>
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>涨停比 {th.factors.limit_up_down_ratio.toFixed(1)}</span>
            <span>最高 {th.factors.max_consecutive}连板</span>
            <span>家数比 {th.factors.up_down_ratio.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400">偏冷</span>
          <div className="flex-1 h-2 rounded-full"
            style={{ background: "linear-gradient(90deg, #4ade80, #94a3b8, #f87171)" }} />
          <span className="text-xs text-red-400">偏热</span>
        </div>
      </div>
    </section>
  );
}
