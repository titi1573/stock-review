import { useState } from "react";

function ContrastCards({ upData, downData }) {
  const topUp = upData.sectors?.[0];
  const topDown = downData.sectors?.[0];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glass-card p-4" style={{ borderLeft: "2px solid rgba(248,113,113,0.4)" }}>
        <div className="text-xs text-red-400 font-semibold mb-1">涨停最多板块</div>
        {topUp ? (
          <>
            <div className="text-lg font-bold text-slate-100">
              {topUp.sector}
              <span className="text-sm text-red-400 ml-2">({topUp.count}家)</span>
            </div>
            {topUp.leader && (
              <div className="text-xs text-slate-500 mt-1.5">
                龙头：<span className="text-slate-300">{topUp.leader.name}</span>
                <span className="text-amber-400 ml-1">({topUp.leader.consecutive}连板)</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-600 mt-1">今日无涨停</div>
        )}
      </div>

      <div className="glass-card p-4" style={{ borderLeft: "2px solid rgba(74,222,128,0.4)" }}>
        <div className="text-xs text-green-400 font-semibold mb-1">跌停最多板块</div>
        {topDown ? (
          <>
            <div className="text-lg font-bold text-slate-100">
              {topDown.sector}
              <span className="text-sm text-green-400 ml-2">({topDown.count}家)</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              主因：{topDown.stocks?.map(s => s.reason).filter((v, i, a) => a.indexOf(v) === i).join("、") || "待分析"}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600 mt-1">今日无跌停</div>
        )}
      </div>
    </div>
  );
}

function SectorList({ title, sectors, type }) {
  const [expandedSectors, setExpandedSectors] = useState({});
  const toggle = (sector) => setExpandedSectors(prev => ({ ...prev, [sector]: !prev[sector] }));

  if (!sectors || sectors.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>
        <div className="glass-card p-4 text-center">
          <p className="text-sm text-slate-600">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>
      <div className="space-y-1.5">
        {sectors.map((s) => (
          <div key={s.sector} className="glass-card overflow-hidden">
            <button
              onClick={() => toggle(s.sector)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs w-5 h-5 rounded flex items-center justify-center font-mono font-bold ${
                  expandedSectors[s.sector] ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-slate-500"
                }`}>
                  {expandedSectors[s.sector] ? "−" : "+"}
                </span>
                <span className="font-medium text-sm text-slate-200">{s.sector}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  type === "up" ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"
                }`}>{s.count}家</span>
                {type === "up" && s.max_consecutive > 0 && (
                  <span className="text-xs text-amber-400">{s.max_consecutive}连板</span>
                )}
                {type === "up" && s.leader && (
                  <span className="text-xs text-slate-500">{s.leader.name}</span>
                )}
              </div>
              <span className="text-xs text-slate-600">{expandedSectors[s.sector] ? "收起" : "展开"}</span>
            </button>

            {expandedSectors[s.sector] && (
              <div className="border-t border-white/5">
                {s.stocks.map((st) => (
                  <div key={st.code} className="flex items-center justify-between px-4 py-2 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-slate-300">{st.name}</span>
                      <span className="text-xs text-slate-600">{st.code}</span>
                      {st.is_st && <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded font-medium">ST</span>}
                      {st.is_new_stock_locked && <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-medium">新股</span>}
                      {type === "up" && st.consecutive > 0 && (
                        <span className="text-xs text-amber-400 font-medium">{st.consecutive}连板</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {type === "down" && st.reason && (
                        <span className="text-xs text-slate-600">{st.reason}</span>
                      )}
                      <span className={`font-mono text-sm tabular-nums font-medium ${type === "up" ? "num-up" : "num-down"}`}>
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
      <h2 className="section-title text-slate-100">涨停跌停分析</h2>
      <ContrastCards upData={upData} downData={downData} />

      <div className="space-y-4">
        <SectorList title={`涨停板块 (共${upData.total_count}家)`} sectors={upData.sectors} type="up" />
        <SectorList title={`跌停板块 (共${downData.total_count}家)`} sectors={downData.sectors} type="down" />
      </div>
    </section>
  );
}
