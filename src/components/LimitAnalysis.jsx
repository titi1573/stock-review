import { useState } from "react";

function ContrastCards({ upData, downData }) {
  const topUp = upData.sectors?.[0];
  const topDown = downData.sectors?.[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-red-50 rounded-lg p-3">
        <div className="text-xs text-red-600 font-semibold">🔥 涨停最多板块</div>
        {topUp ? (
          <>
            <div className="text-lg font-bold mt-1">{topUp.sector} <span className="text-sm text-red-500">({topUp.count}家)</span></div>
            <div className="text-xs text-gray-500 mt-1">龙头：{topUp.leader?.name} ({topUp.leader?.consecutive}连板)</div>
          </>
        ) : (
          <div className="text-sm text-gray-400 mt-1">今日无涨停</div>
        )}
      </div>
      <div className="bg-green-50 rounded-lg p-3">
        <div className="text-xs text-green-600 font-semibold">❄️ 跌停最多板块</div>
        {topDown ? (
          <>
            <div className="text-lg font-bold mt-1">{topDown.sector} <span className="text-sm text-green-500">({topDown.count}家)</span></div>
            <div className="text-xs text-gray-500 mt-1">
              主因：{topDown.stocks?.map(s => s.reason).filter((v, i, a) => a.indexOf(v) === i).join("、")}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-400 mt-1">今日无跌停</div>
        )}
      </div>
    </div>
  );
}

function SectorList({ title, sectors, type }) {
  const [expandedSectors, setExpandedSectors] = useState({});

  const toggle = (sector) => {
    setExpandedSectors(prev => ({ ...prev, [sector]: !prev[sector] }));
  };

  if (!sectors || sectors.length === 0) {
    return (
      <div>
        <h3 className="text-md font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-gray-400">暂无数据</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-md font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="space-y-2">
        {sectors.map((s) => (
          <div key={s.sector} className="bg-white rounded-lg shadow-sm">
            <button
              onClick={() => toggle(s.sector)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.sector}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${type === "up" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                  {s.count}家
                </span>
                {type === "up" && s.max_consecutive > 0 && (
                  <span className="text-xs text-gray-400">{s.max_consecutive}连板</span>
                )}
                {type === "up" && s.leader && (
                  <span className="text-xs text-gray-500">{s.leader.name}</span>
                )}
              </div>
              <span className="text-gray-400 text-xs">{expandedSectors[s.sector] ? "收起 ▲" : "展开 ▼"}</span>
            </button>
            {expandedSectors[s.sector] && (
              <div className="px-3 pb-2 border-t">
                {s.stocks.map((st) => (
                  <div key={st.code} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{st.name}</span>
                      <span className="text-gray-400 text-xs">{st.code}</span>
                      {st.is_st && <span className="text-xs bg-yellow-100 text-yellow-700 px-1 rounded">ST</span>}
                      {st.is_new_stock_locked && <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">新股未开板</span>}
                      {type === "up" && st.consecutive > 0 && (
                        <span className="text-xs text-orange-500">{st.consecutive}连板</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {type === "down" && (
                        <span className="text-xs text-gray-400">{st.reason}</span>
                      )}
                      <span className={`font-mono text-sm ${type === "up" ? "text-red-600" : "text-green-600"}`}>
                        {st.change_pct >= 0 ? "+" : ""}{st.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LimitAnalysis({ upData, downData }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">涨停跌停分析</h2>

      <ContrastCards upData={upData} downData={downData} />

      <SectorList title={`涨停板块 (共${upData.total_count}家)`} sectors={upData.sectors} type="up" />
      <SectorList title={`跌停板块 (共${downData.total_count}家)`} sectors={downData.sectors} type="down" />
    </section>
  );
}
