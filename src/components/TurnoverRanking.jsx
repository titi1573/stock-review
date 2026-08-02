import { useState, useMemo } from "react";

const PRESETS = [null, 15, 20, 50];

function SortIcon({ field, current }) {
  if (current.field !== field) return <span className="text-slate-700 ml-1.5">↕</span>;
  return <span className="text-blue-400 ml-1.5">{current.dir === "asc" ? "↑" : "↓"}</span>;
}

export default function TurnoverRanking({ data }) {
  const [threshold, setThreshold] = useState(null);
  const [customVal, setCustomVal] = useState("");
  const [sort, setSort] = useState({ field: "turnover", dir: "desc" });
  const [expanded, setExpanded] = useState(false);

  const minDisplay = 10;
  const effectiveThreshold = threshold !== null ? threshold : customVal ? parseFloat(customVal) || 0 : 0;

  const filtered = useMemo(() => {
    let list = data.items.filter(i => i.turnover >= minDisplay);
    if (effectiveThreshold > 0) list = list.filter(i => i.turnover >= effectiveThreshold);
    list = [...list].sort((a, b) => {
      const av = sort.field === "sector" ? a.sector : a[sort.field];
      const bv = sort.field === "sector" ? b.sector : b[sort.field];
      if (typeof av === "string") return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [data.items, effectiveThreshold, sort]);

  const display = expanded ? filtered.slice(0, 50) : filtered.slice(0, 20);
  const totalEligible = filtered.length;

  const handleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: "desc" });
  };

  return (
    <section className="space-y-4">
      <h2 className="section-title text-slate-100">成交额龙虎榜</h2>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map(p => (
          <button
            key={p ?? "all"}
            onClick={() => { setThreshold(p); setCustomVal(""); }}
            className={`btn-pill ${threshold === p ? "active" : ""}`}
          >
            {p === null ? "全部" : `≥${p}亿`}
          </button>
        ))}
        <input
          type="number"
          placeholder="自定义(亿)"
          value={customVal}
          onChange={e => { setCustomVal(e.target.value); setThreshold(null); }}
          className="w-24 px-3 py-1 text-xs bg-white/5 border border-white/10 rounded-full text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-400/50"
        />
        <span className="text-xs text-slate-600 ml-auto">{totalEligible}只符合</span>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">股票</th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort("turnover")}>
                  成交额(亿)<SortIcon field="turnover" current={sort} />
                </th>
                <th className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort("change_pct")}>
                  涨跌幅<SortIcon field="change_pct" current={sort} />
                </th>
                <th className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => handleSort("sector")}>
                  板块<SortIcon field="sector" current={sort} />
                </th>
              </tr>
            </thead>
            <tbody>
              {display.map((item, i) => (
                <tr key={item.code} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-mono tabular-nums ${
                      i < 3 ? "text-amber-400" : "text-slate-600"
                    }`}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-slate-200">{item.name}</span>
                    <span className="text-slate-600 ml-2 text-xs">{item.code}</span>
                  </td>
                  <td className="text-right px-4 py-2.5 font-mono tabular-nums text-slate-300">{item.turnover.toFixed(2)}</td>
                  <td className={`text-right px-4 py-2.5 font-mono tabular-nums font-medium ${item.change_pct >= 0 ? "num-up" : "num-down"}`}>
                    {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">{item.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {display.map((item, i) => (
          <div key={item.code} className="glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono w-5 ${i < 3 ? "text-amber-400" : "text-slate-600"}`}>{i + 1}</span>
              <div>
                <div className="font-medium text-sm text-slate-200">{item.name}</div>
                <div className="text-xs text-slate-600">{item.code} · {item.turnover.toFixed(2)}亿</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono font-bold text-sm ${item.change_pct >= 0 ? "num-up" : "num-down"}`}>
                {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-600">{item.sector}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      {totalEligible < 10 && (
        <p className="text-xs text-slate-600 text-center">当前市场整体缩量，成交额集中度较低</p>
      )}
      {totalEligible > 50 && !expanded && (
        <p className="text-xs text-slate-600 text-center">满足条件共 {totalEligible} 只，仅展示前 20</p>
      )}
      {totalEligible === 0 && (
        <p className="text-xs text-slate-600 text-center">暂无满足条件的个股，可尝试降低阈值</p>
      )}

      {totalEligible > 20 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="block mx-auto text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? "收起" : `展开全部 (${totalEligible}只)`}
        </button>
      )}
    </section>
  );
}
