import { formatPct, formatChange, numClass } from "../utils/format";

function IndexCard({ idx }) {
  return (
    <div className="glass-card p-4">
      <div className="text-xs text-slate-500 mb-1">{idx.name}</div>
      <div className="text-2xl font-bold tabular-nums text-slate-100">{idx.price.toFixed(2)}</div>
      <div className={`text-sm mt-1.5 tabular-nums font-medium ${numClass(idx.change)}`}>
        {formatChange(idx.change)} ({formatPct(idx.change_pct)})
      </div>
    </div>
  );
}

export default function Dashboard({ data }) {
  const { indices, market_summary: ms, thermometer: th } = data;

  const f = th.factors;
  const isHot = f.limit_up_down_signal === "hot" && f.max_consecutive_signal === "hot";
  const isCold = f.limit_up_down_signal === "cold" && f.max_consecutive_signal === "cold";
  const total = ms.up_count + ms.down_count;
  const upRatio = total > 0 ? (ms.up_count / total * 100) : 50;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-slate-100">大盘概况</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {indices.map((idx) => <IndexCard key={idx.code} idx={idx} />)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">两市成交额</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-slate-100">
            {ms.total_turnover.toFixed(0)}
            <span className="text-sm font-normal text-slate-500 ml-1">亿</span>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            较昨日{ms.turnover_change_pct >= 0 ? "↑" : "↓"}{Math.abs(ms.turnover_change_pct).toFixed(1)}%
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">涨跌家数</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            <span className="num-up">{ms.up_count}</span>
            <span className="text-slate-600 mx-1.5">/</span>
            <span className="num-down">{ms.down_count}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-500/60 to-red-500/60"
              style={{ width: `${Math.max(upRatio, 5)}%` }} />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-xs text-slate-500">北向资金</div>
          <div className={`text-xl font-bold tabular-nums mt-1 ${numClass(ms.northbound_net)}`}>
            {formatChange(ms.northbound_net)}
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
            <span>涨停比 {f.limit_up_down_ratio.toFixed(1)}</span>
            <span>最高 {f.max_consecutive}连板</span>
            <span>家数比 {f.up_down_ratio.toFixed(2)}</span>
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
