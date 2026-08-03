import { useState } from "react";
import { formatPct, TYPE } from "../utils/format";

function ContrastCard({ data, borderColor, label, isUp }) {
  const top = data?.sectors?.[0];
  return (
    <div className="glass-card p-4" style={{ borderLeft: `2px solid ${borderColor}` }}>
      <div className={`text-xs font-semibold mb-1 ${isUp ? "text-red-400" : "text-green-400"}`}>{label}</div>
      {top ? (
        <>
          <div className="text-lg font-bold text-slate-100">
            {top.sector}
            <span className={`text-sm ml-2 ${isUp ? "text-red-400" : "text-green-400"}`}>({top.count}家)</span>
          </div>
          {isUp && top.leader && (
            <div className="text-xs text-slate-500 mt-1.5">
              龙头：<span className="text-slate-300">{top.leader.name}</span>
              <span className="text-amber-400 ml-1">({top.leader.consecutive}连板)</span>
            </div>
          )}
          {!isUp && (
            <div className="text-xs text-slate-500 mt-1.5">
              主因：{[...new Set(top.stocks?.map(s => s.reason))].join("、") || "待分析"}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-slate-600 mt-1">今日无{isUp ? "涨" : "跌"}停</div>
      )}
    </div>
  );
}

function SectorList({ title, sectors, type }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (sector) => setExpanded(prev => ({ ...prev, [sector]: !prev[sector] }));
  const isUp = type === TYPE.UP;

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
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs w-5 h-5 rounded flex items-center justify-center font-mono font-bold ${expanded[s.sector] ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-slate-500"}`}>
                  {expanded[s.sector] ? "−" : "+"}
                </span>
                <span className="font-medium text-sm text-slate-200">{s.sector}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isUp ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400"}`}>
                  {s.count}家
                </span>
                {isUp && s.max_consecutive > 0 && <span className="text-xs text-amber-400">{s.max_consecutive}连板</span>}
                {isUp && s.leader && <span className="text-xs text-slate-500">{s.leader.name}</span>}
              </div>
              <span className="text-xs text-slate-600">{expanded[s.sector] ? "收起" : "展开"}</span>
            </button>

            {expanded[s.sector] && (
              <div className="border-t border-white/5">
                {s.stocks.map((st) => (
                  <div key={st.code} className="flex items-center justify-between px-4 py-2 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm text-slate-300">{st.name}</span>
                      <span className="text-xs text-slate-600">{st.code}</span>
                      {st.is_st && <span className="text-[10px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded font-medium">ST</span>}
                      {st.is_new_stock_locked && <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded font-medium">新股</span>}
                      {isUp && st.consecutive > 0 && <span className="text-xs text-amber-400 font-medium">{st.consecutive}连板</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      {!isUp && st.reason && <span className="text-xs text-slate-600">{st.reason}</span>}
                      <span className={`font-mono text-sm tabular-nums font-medium ${isUp ? "num-up" : "num-down"}`}>{formatPct(st.change_pct)}</span>
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
      <h2 className="text-lg font-bold text-slate-100">涨停跌停分析</h2>

      <div className="grid grid-cols-2 gap-3">
        <ContrastCard data={upData} borderColor="rgba(248,113,113,0.4)" label="涨停最多板块" isUp />
        <ContrastCard data={downData} borderColor="rgba(74,222,128,0.4)" label="跌停最多板块" isUp={false} />
      </div>

      <div className="space-y-4">
        <SectorList title={`涨停板块 (共${upData.total_count}家)`} sectors={upData.sectors} type={TYPE.UP} />
        <SectorList title={`跌停板块 (共${downData.total_count}家)`} sectors={downData.sectors} type={TYPE.DOWN} />
      </div>
    </section>
  );
}
