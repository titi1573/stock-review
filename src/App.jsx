import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import TurnoverRanking from "./components/TurnoverRanking";
import LimitAnalysis from "./components/LimitAnalysis";

const DATA_BASE = "/stock-review/data";

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

  // Determine status banner
  let statusBanner = null;
  if (!allLoading && meta.data) {
    if (meta.data.status === "stale") {
      statusBanner = `⚠️ 数据更新于 ${meta.data.data_date}，今日采集失败`;
    } else if (meta.data.status === "partial") {
      statusBanner = `⚠️ 部分数据缺失，更新于 ${meta.data.data_date}`;
    } else if (!meta.data.data_date) {
      statusBanner = `今日数据暂未更新，展示最近可用数据`;
    }
  }

  if (allLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (anyError && !dashboard.data) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-3">
        <div className="text-gray-500">数据加载失败，请检查网络</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">重试</button>
      </div>
    );
  }

  const dateStr = meta.data?.data_date || dashboard.data?.date || "--";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Nav */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">A股每日复盘</h1>
          <div className="flex items-center gap-3">
            <input
              type="date"
              defaultValue={dateStr}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              onChange={(e) => {
                if (e.target.value) window.location.href = `/history/${e.target.value}`;
              }}
            />
            {statusBanner && (
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">{statusBanner}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {dashboard.data && <Dashboard data={dashboard.data} meta={meta.data} />}
        {turnover.data && <TurnoverRanking data={turnover.data} />}
        {limitUp.data && limitDown.data && <LimitAnalysis upData={limitUp.data} downData={limitDown.data} />}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-6 text-xs text-gray-400 space-y-1">
        <div>数据更新时间：{meta.data?.generated_at || "--"}</div>
        <div>分类来源：东方财富行业分类</div>
        <div>本网站仅提供数据复盘，不构成投资建议</div>
      </footer>
    </div>
  );
}
