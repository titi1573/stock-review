export default function Dashboard({ data, meta }) {
  const { indices, market_summary, thermometer } = data;
  const upColor = "text-red-600";
  const downColor = "text-green-600";

  const th = thermometer;
  const isHot = th.label.includes("热") || th.label.includes("强");
  const isCold = th.label.includes("冷");

  const thBorder = isHot
    ? "border-2 border-red-500"
    : isCold
    ? "border-2 border-dashed border-green-500"
    : "border border-gray-300";

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">大盘概况</h2>

      {/* 2x2 index grid */}
      <div className="grid grid-cols-2 gap-3">
        {indices.map((idx) => (
          <div key={idx.code} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-500">{idx.name}</div>
            <div className="text-xl font-bold mt-1">{idx.price.toFixed(2)}</div>
            <div className={`text-sm mt-0.5 ${idx.change >= 0 ? upColor : downColor}`}>
              {idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)} ({idx.change_pct >= 0 ? "+" : ""}{idx.change_pct.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

      {/* Market summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">两市成交额</div>
          <div className="text-lg font-bold">{market_summary.total_turnover.toFixed(0)}<span className="text-sm font-normal text-gray-500">亿</span></div>
          <div className={`text-xs ${market_summary.turnover_change_pct >= 0 ? upColor : downColor}`}>
            较昨日{market_summary.turnover_change_pct >= 0 ? "↑" : "↓"}{Math.abs(market_summary.turnover_change_pct).toFixed(1)}%
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">上涨 / 下跌</div>
          <div className="text-lg font-bold">
            <span className={upColor}>{market_summary.up_count}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className={downColor}>{market_summary.down_count}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-red-500 h-1.5 rounded-full"
              style={{ width: `${(market_summary.up_count / (market_summary.up_count + market_summary.down_count)) * 100}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm">
          <div className="text-xs text-gray-500">北向资金</div>
          <div className={`text-lg font-bold ${market_summary.northbound_net >= 0 ? upColor : downColor}`}>
            {market_summary.northbound_net >= 0 ? "+" : ""}{market_summary.northbound_net.toFixed(2)}<span className="text-sm font-normal text-gray-500">亿</span>
          </div>
        </div>
      </div>

      {/* Thermometer */}
      <div className={`bg-white rounded-lg p-3 shadow-sm ${thBorder}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold px-2 py-0.5 rounded ${
            isHot ? "bg-red-100 text-red-700" : isCold ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
          }`}>
            {isHot ? "🔥" : isCold ? "❄️" : "⚖️"} {th.label}
          </span>
          <span className="text-xs text-gray-400">{th.description}</span>

          {/* Tooltip trigger */}
          <div className="relative group ml-auto">
            <span className="text-gray-400 cursor-help text-xs border border-gray-300 rounded-full w-5 h-5 inline-flex items-center justify-center">?</span>
            <div className="absolute right-0 top-6 w-56 bg-gray-800 text-white text-xs rounded-lg p-3 hidden group-hover:block z-10">
              <div>涨跌停比: {th.factors.limit_up_down_ratio.toFixed(1)} {th.factors.limit_up_down_signal === "hot" ? "🔥" : th.factors.limit_up_down_signal === "cold" ? "❄️" : "⚖️"}</div>
              <div>最高连板: {th.factors.max_consecutive}板 {th.factors.max_consecutive_signal === "hot" ? "🔥" : th.factors.max_consecutive_signal === "cold" ? "❄️" : "⚖️"}</div>
              <div>涨跌家数比: {th.factors.up_down_ratio.toFixed(2)} {th.factors.up_down_signal === "hot" ? "🔥" : th.factors.up_down_signal === "cold" ? "❄️" : "⚖️"}</div>
              <div className="mt-1 text-gray-400">偏热 &gt;3 | 偏冷 &lt;1</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
