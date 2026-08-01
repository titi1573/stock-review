import { useState, useMemo } from "react";

const PRESETS = [null, 15, 20, 50];

export default function TurnoverRanking({ data }) {
  const [threshold, setThreshold] = useState(null); // null = all
  const [customVal, setCustomVal] = useState("");
  const [sortBy, setSortBy] = useState("turnover");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState(false);

  const minDisplay = 10; // 低于10亿不展示

  const effectiveThreshold = threshold !== null ? threshold : customVal ? parseFloat(customVal) || 0 : 0;

  const filtered = useMemo(() => {
    let list = data.items.filter(i => i.turnover >= minDisplay);
    if (effectiveThreshold > 0) list = list.filter(i => i.turnover >= effectiveThreshold);
    list = [...list].sort((a, b) => {
      const aVal = sortBy === "turnover" ? a.turnover : sortBy === "change_pct" ? a.change_pct : a.sector;
      const bVal = sortBy === "turnover" ? b.turnover : sortBy === "change_pct" ? b.change_pct : b.sector;
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [data.items, effectiveThreshold, sortBy, sortDir]);

  const display = expanded ? filtered.slice(0, 50) : filtered.slice(0, 20);
  const totalEligible = filtered.length;

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">成交额龙虎榜</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map(p => (
          <button
            key={p ?? "all"}
            onClick={() => { setThreshold(p); setCustomVal(""); }}
            className={`px-3 py-1 text-xs rounded-full border ${threshold === p ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
          >
            {p === null ? "全部" : `≥${p}亿`}
          </button>
        ))}
        <input
          type="number"
          placeholder="自定义(亿)"
          value={customVal}
          onChange={e => { setCustomVal(e.target.value); setThreshold(null); }}
          className="w-24 px-2 py-1 text-xs border border-gray-300 rounded"
        />
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="text-left px-4 py-2">股票</th>
              <th className="text-right px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("turnover")}>
                成交额(亿)<SortIcon field="turnover" />
              </th>
              <th className="text-right px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("change_pct")}>
                涨跌幅<SortIcon field="change_pct" />
              </th>
              <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => handleSort("sector")}>
                板块<SortIcon field="sector" />
              </th>
            </tr>
          </thead>
          <tbody>
            {display.map((item) => (
              <tr key={item.code} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-400 ml-2 text-xs">{item.code}</span>
                </td>
                <td className="text-right px-4 py-2 font-mono">{item.turnover.toFixed(2)}</td>
                <td className={`text-right px-4 py-2 font-mono ${item.change_pct >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
                </td>
                <td className="px-4 py-2 text-gray-500">{item.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {display.map((item) => (
          <div key={item.code} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-400 ml-2 text-xs">{item.code}</span>
              </div>
              <span className={`font-mono font-bold ${item.change_pct >= 0 ? "text-red-600" : "text-green-600"}`}>
                {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>成交额: {item.turnover.toFixed(2)}亿</span>
              <span>{item.sector}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Boundary messages */}
      {totalEligible < 10 && (
        <p className="text-xs text-gray-400 text-center">当前市场整体缩量，成交额集中度较低，暂无更多个股入选</p>
      )}
      {totalEligible > 50 && !expanded && (
        <p className="text-xs text-gray-400 text-center">满足条件共 {totalEligible} 只，仅展示前 20</p>
      )}
      {totalEligible === 0 && (
        <p className="text-xs text-gray-400 text-center">当前筛选条件下暂无个股入选，可尝试降低金额阈值</p>
      )}

      {/* Expand/collapse */}
      {totalEligible > 20 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="block mx-auto text-sm text-blue-600"
        >
          {expanded ? "收起" : `展开全部 (${totalEligible}只)`}
        </button>
      )}
    </section>
  );
}
