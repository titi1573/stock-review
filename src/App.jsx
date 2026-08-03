import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import TurnoverRanking from "./components/TurnoverRanking";
import LimitAnalysis from "./components/LimitAnalysis";
import { STATUS } from "./utils/format";

const DATA_BASE = "/data";

function useData(filename) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${DATA_BASE}/latest/${filename}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { if (!cancelled) setData(json); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [filename]);

  return { data, loading: !data && !error, error };
}

export default function App() {
  const meta = useData("meta.json");
  const dashboard = useData("dashboard.json");
  const turnover = useData("turnover_top.json");
  const limitUp = useData("limit_up.json");
  const limitDown = useData("limit_down.json");

  const allLoading = meta.loading || dashboard.loading || turnover.loading || limitUp.loading || limitDown.loading;
  const anyError = meta.error || dashboard.error || turnover.error || limitUp.error || limitDown.error;

  if (allLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0b1120]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">加载中...</span>
      </div>
    );
  }

  if (anyError && !dashboard.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0b1120]">
        <p className="text-slate-400">数据加载失败，请检查网络</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-400">重试</button>
      </div>
    );
  }

  const dateStr = meta.data?.data_date || dashboard.data?.date || "--";
  const status = meta.data?.status;
  const bannerColor = "text-amber-400 bg-amber-400/10";
  const statusBanner = (status !== STATUS.SUCCESS && status)
    ? { text: status === STATUS.STALE ? `数据更新于 ${meta.data.data_date}，今日采集失败` : `部分数据缺失，更新于 ${meta.data.data_date}`, color: bannerColor }
    : null;

  return (
    <div className="min-h-screen bg-[#0b1120]">
      <header className="sticky top-0 z-20 glass-card rounded-none border-0 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-500 to-purple-500">复</div>
            <div>
              <h1 className="text-base font-bold text-slate-100">A股每日复盘</h1>
              <p className="text-xs text-slate-500">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusBanner && <span className={`text-xs px-2.5 py-1 rounded-full ${statusBanner.color}`}>{statusBanner.text}</span>}
            <input
              type="date"
              defaultValue={dateStr}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-400/50 [color-scheme:dark]"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {dashboard.data && <Dashboard data={dashboard.data} />}
        {turnover.data && <TurnoverRanking data={turnover.data} />}
        {limitUp.data && limitDown.data && <LimitAnalysis upData={limitUp.data} downData={limitDown.data} />}
      </main>

      <footer className="max-w-4xl mx-auto px-5 py-8 text-xs text-slate-600 space-y-1 border-t border-white/5">
        <div>数据更新时间：{meta.data?.generated_at || "--"}</div>
        <div>分类来源：东方财富行业分类  |  本网站仅提供数据复盘，不构成投资建议</div>
      </footer>
    </div>
  );
}
