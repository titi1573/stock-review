function IndexCard({ idx, delay }) {
  const isUp = idx.change >= 0;
  return (
    <div className="glass-card p-4 animate-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-xs text-slate-500 mb-1">{idx.name}</div>
      <div className="text-2xl font-bold tabular-nums text-slate-100">{idx.price.toFixed(2)}</div>
      <div className={`text-sm mt-1.5 tabular-nums font-medium ${isUp ? "num-up" : "num-down"}`}>
        {isUp ? "+" : ""}{idx.change.toFixed(2)}
        <span className="ml-1.5">({isUp ? "+" : ""}{idx.change_pct.toFixed(2)}%)</span>
      </div>
      {/* Mini bar */}
      <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${isUp ? "bg-red-500/60" : "bg-green-500/60"}`}
          style={{ width: `${Math.min(Math.abs(idx.change_pct) * 8, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard({ data }) {
  const { indices, market_summary, thermometer: th } = data;

  const isHot = th.label.includes("热") || th.label.includes("强");
  const isCold = th.label.includes("冷");
  const upRatio = market_summary.up_count / Math.max(market_summary.up_count + market_summary.down_count, 1) * 100;

  const thermoColor = isHot ? "#f87171" : isCold ? "#4ade80" : "#94a3b8";
  const thermoWidth = isHot ? 75 : isCold ? 25 : 50;

  return (
    <section className="space-y-4">
      <h2 className="section-title text-slate-100">大盘概况</h2>

      {/* 4 index cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {indices.map((idx, i) => (
          <IndexCard key={idx.code} idx={idx} delay={i * 60} />
        ))}
      </div>

      {/* Market summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">两市成交额</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-slate-100">
            {(market_summary.total_turnover / 10000).toFixed(2)}
            <span className="text-sm font-normal text-slate-500 ml-1">万亿</span>
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
            <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-green-500/60 to-red-500/60"
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

      {/* Thermometer */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-bold px-2.5 py-1 rounded-md ${
              isHot ? "bg-red-500/15 text-red-400" : isCold ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-400"
            }`}>
              {th.label}
            </span>
            <span className="text-xs text-slate-500">{th.description}</span>
          </div>

          {/* Tooltip */}
          <div className="relative group">
            <span className="text-slate-600 cursor-help text-xs border border-white/10 rounded-full w-5 h-5 inline-flex items-center justify-center hover:border-white/20 hover:text-slate-400 transition-colors">?</span>
            <div className="absolute right-0 top-7 w-60 bg-slate-800 border border-white/10 text-xs rounded-xl p-3.5 hidden group-hover:block z-10 shadow-xl">
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">涨跌停比</span><span className="tabular-nums">{th.factors.limit_up_down_ratio.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">最高连板</span><span className="tabular-nums">{th.factors.max_consecutive}板</span></div>
                <div className="flex justify-between"><span className="text-slate-400">涨跌家数比</span><span className="tabular-nums">{th.factors.up_down_ratio.toFixed(2)}</span></div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/5 text-slate-600">偏热 &gt;3 | 偏冷 &lt;1</div>
            </div>
          </div>
        </div>

        {/* Thermo bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400 w-8 text-right">偏冷</span>
          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden relative">
            <div className="absolute inset-0 rounded-full" style={{
              background: "linear-gradient(90deg, #4ade80 0%, #94a3b8 50%, #f87171 100%)", opacity: 0.3
            }} />
            <div className="absolute top-0 h-full w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)] transition-all duration-700"
              style={{ left: `${thermoWidth}%`, transform: "translateX(-50%)" }} />
          </div>
          <span className="text-xs text-red-400 w-8">偏热</span>
        </div>
      </div>
    </section>
  );
}
