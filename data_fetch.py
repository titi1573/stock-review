"""
A股每日复盘数据采集脚本
用法: python data_fetch.py
输出: public/data/latest/*.json + daily归档
"""
import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

DATA_DIR = Path("public/data")
LATEST_DIR = DATA_DIR / "latest"
DAILY_DIR = DATA_DIR / "daily"

FALLBACK_THERMOMETER = {
    "label": "数据暂缺",
    "description": "今日无法计算体温",
    "factors": {
        "limit_up_down_ratio": 0,
        "limit_up_down_signal": "neutral",
        "max_consecutive": 0,
        "max_consecutive_signal": "neutral",
        "up_down_ratio": 0,
        "up_down_signal": "neutral"
    }
}


def load_existing(filename):
    """加载已有数据作为fallback"""
    path = LATEST_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def calc_thermometer(limit_up_total, limit_down_total, max_consecutive, up_count, down_count):
    if limit_down_total == 0:
        return {
            "label": "强热",
            "description": "今日无跌停股票，市场情绪极高",
            "factors": {
                "limit_up_down_ratio": float(limit_up_total),
                "limit_up_down_signal": "hot",
                "max_consecutive": max_consecutive,
                "max_consecutive_signal": "hot" if max_consecutive >= 5 else "neutral" if max_consecutive >= 3 else "cold",
                "up_down_ratio": round(up_count / max(down_count, 1), 2),
                "up_down_signal": "hot" if up_count / max(down_count, 1) > 2 else "neutral" if up_count / max(down_count, 1) >= 0.5 else "cold"
            }
        }

    dl_ratio = limit_up_total / max(limit_down_total, 1)
    dl_signal = "hot" if dl_ratio > 3 else "cold" if dl_ratio < 1 else "neutral"
    lh_signal = "hot" if max_consecutive >= 5 else "cold" if max_consecutive <= 2 else "neutral"
    ud_ratio = up_count / max(down_count, 1)
    ud_signal = "hot" if ud_ratio > 2 else "cold" if ud_ratio < 0.5 else "neutral"

    signals = [dl_signal, lh_signal, ud_signal]
    hot_count = signals.count("hot")
    cold_count = signals.count("cold")

    if hot_count >= 2:
        label, desc = "偏热", "涨停家数远超跌停，赚钱效应较强"
    elif cold_count >= 2:
        label, desc = "偏冷", "跌停家数偏多，市场情绪低迷"
    else:
        label, desc = "中性", "市场多空力量均衡"

    return {
        "label": label,
        "description": desc,
        "factors": {
            "limit_up_down_ratio": round(dl_ratio, 2),
            "limit_up_down_signal": dl_signal,
            "max_consecutive": max_consecutive,
            "max_consecutive_signal": lh_signal,
            "up_down_ratio": round(ud_ratio, 2),
            "up_down_signal": ud_signal
        }
    }


def fetch_all_data():
    """一次性拉取全市场数据，从中提取各个模块所需数据"""
    try:
        import akshare as ak
    except ImportError:
        print("[WARN] akshare 未安装")
        return None, None, None, None

    today_str = date.today().strftime("%Y-%m-%d")

    # 1. 全市场个股数据 (用于成交额榜、涨跌家数)
    print("[1] 获取全市场个股数据...")
    spot_items = []
    up_count = 0
    down_count = 0
    total_turnover = 0
    try:
        df_spot = ak.stock_zh_a_spot_em()
        if df_spot is not None and not df_spot.empty:
            for _, row in df_spot.iterrows():
                try:
                    chg = float(row.get("涨跌幅", 0) or 0)
                    vol = float(row.get("成交额", 0) or 0) / 1e8  # 转为亿
                except (ValueError, TypeError):
                    continue

                if vol > 0:
                    total_turnover += vol
                    spot_items.append({
                        "name": str(row.get("名称", "")),
                        "code": str(row.get("代码", "")),
                        "turnover": round(vol, 2),
                        "change_pct": round(chg, 2),
                        "sector": str(row.get("所属行业", "其他")),
                        "turnover_percentile": 0
                    })
                if chg > 0:
                    up_count += 1
                elif chg < 0:
                    down_count += 1
            print(f"  获取 {len(spot_items)} 只个股, 成交额 {total_turnover:.0f}亿")
    except Exception as e:
        print(f"[WARN] 全市场数据获取失败: {e}")

    # 2. 指数行情
    print("[2] 获取指数行情...")
    indices = []
    idx_codes = {"上证指数": "sh000001", "深证成指": "sz399001", "创业板指": "sz399006", "科创50": "sh000688"}
    for name, code in idx_codes.items():
        try:
            df = ak.stock_zh_index_daily(symbol=code)
            if df is not None and not df.empty:
                row = df.iloc[-1]
                prev = df.iloc[-2] if len(df) > 1 else row
                price = float(row["close"])
                prev_close = float(prev["close"])
                change = round(price - prev_close, 2)
                change_pct = round((price - prev_close) / prev_close * 100, 2)
                indices.append({"name": name, "code": code, "price": price, "change": change, "change_pct": change_pct})
            else:
                indices.append({"name": name, "code": code, "price": 0, "change": 0, "change_pct": 0})
        except Exception as e:
            print(f"  [WARN] {name}: {e}")
            indices.append({"name": name, "code": code, "price": 0, "change": 0, "change_pct": 0})

    # 3. 北向资金
    print("[3] 获取北向资金...")
    northbound = 0
    try:
        df_nb = ak.stock_hsgt_north_net_flow_in_em(symbol="北上")
        if df_nb is not None and not df_nb.empty:
            val = df_nb.iloc[-1].get("value", 0) or df_nb.iloc[-1].get("净流入", 0) or 0
            northbound = round(float(val), 2)
    except Exception as e:
        print(f"  [WARN] 北向资金: {e}")

    # 4. 涨停跌停
    print("[4] 获取涨停跌停...")
    limit_up = {"total_count": 0, "sectors": []}
    limit_down = {"total_count": 0, "sectors": []}
    today_fmt = date.today().strftime("%Y%m%d")
    try:
        df_up = ak.stock_zt_pool_em(date=today_fmt)
        if df_up is not None and not df_up.empty:
            limit_up["total_count"] = len(df_up)
            sectors = {}
            for _, row in df_up.iterrows():
                sector = str(row.get("所属行业", "其他"))
                name = str(row.get("名称", ""))
                code = str(row.get("代码", ""))
                pct = float(row.get("涨跌幅", 0) or 0)
                consecutive = int(row.get("连板数", 1) or 1)
                is_st = "ST" in str(code)
                stock = {"name": name, "code": code, "consecutive": consecutive,
                         "change_pct": pct, "is_st": is_st, "is_new_stock_locked": False}
                if sector not in sectors:
                    sectors[sector] = {"stocks": [], "max_consecutive": 0, "leader": None}
                sectors[sector]["stocks"].append(stock)
                if consecutive > sectors[sector]["max_consecutive"]:
                    sectors[sector]["max_consecutive"] = consecutive
                    sectors[sector]["leader"] = {"name": name, "code": code, "consecutive": consecutive}
            for name, sec in sectors.items():
                limit_up["sectors"].append({
                    "sector": name, "count": len(sec["stocks"]),
                    "max_consecutive": sec["max_consecutive"],
                    "leader": sec["leader"], "stocks": sec["stocks"]
                })
            limit_up["sectors"].sort(key=lambda x: x["count"], reverse=True)
    except Exception as e:
        print(f"  [WARN] 涨停: {e}")

    try:
        df_down = ak.stock_zt_pool_dtgc_em(date=today_fmt)
        if df_down is not None and not df_down.empty:
            limit_down["total_count"] = len(df_down)
            sectors = {}
            for _, row in df_down.iterrows():
                sector = str(row.get("所属行业", "其他"))
                name = str(row.get("名称", ""))
                code = str(row.get("代码", ""))
                pct = float(row.get("涨跌幅", 0) or 0)
                is_st = "ST" in str(code)
                stock = {"name": name, "code": code, "change_pct": pct,
                         "consecutive_down": int(row.get("连续跌停", 1) or 1),
                         "reason": "ST风险" if is_st else "待分析"}
                if sector not in sectors:
                    sectors[sector] = {"stocks": []}
                sectors[sector]["stocks"].append(stock)
            for name, sec in sectors.items():
                limit_down["sectors"].append({
                    "sector": name, "count": len(sec["stocks"]), "stocks": sec["stocks"]
                })
            limit_down["sectors"].sort(key=lambda x: x["count"], reverse=True)
    except Exception as e:
        print(f"  [WARN] 跌停: {e}")

    # 构建成交额榜 (Top 50)
    spot_items.sort(key=lambda x: x["turnover"], reverse=True)
    turnover_data = {
        "date": today_str,
        "total_eligible": len(spot_items),
        "items": spot_items[:50]
    }

    # 构建dashboard
    dashboard = {
        "date": today_str,
        "indices": indices,
        "market_summary": {
            "total_turnover": round(total_turnover, 2),
            "turnover_change_pct": 0,
            "up_count": up_count,
            "down_count": down_count,
            "northbound_net": northbound
        }
    }

    limit_up["date"] = today_str
    limit_down["date"] = today_str

    return dashboard, turnover_data, limit_up, limit_down


def save_json(data, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")
    generated_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")
    missing = []

    print(f"=== A股复盘数据采集 {today_str} ===\n")

    dashboard, turnover, limit_up, limit_down = fetch_all_data()

    # 合并已有数据作为fallback
    old_dash = load_existing("dashboard.json")
    old_turnover = load_existing("turnover_top.json")
    old_up = load_existing("limit_up.json")
    old_down = load_existing("limit_down.json")

    if dashboard is None:
        dashboard = old_dash or {"indices": [], "market_summary": {"total_turnover": 0, "turnover_change_pct": 0, "up_count": 0, "down_count": 0, "northbound_net": 0}}
        missing.append("dashboard")
    else:
        ms = dashboard["market_summary"]
        if ms.get("total_turnover", 0) == 0 and old_dash and old_dash.get("market_summary", {}).get("total_turnover", 0) > 0:
            print("[fallback] 成交额数据使用上期数据")
            ms["total_turnover"] = old_dash["market_summary"]["total_turnover"]
        if ms.get("up_count", 0) == 0 and ms.get("down_count", 0) == 0:
            if old_dash:
                ms["up_count"] = old_dash["market_summary"].get("up_count", 0)
                ms["down_count"] = old_dash["market_summary"].get("down_count", 0)
                print("[fallback] 涨跌家数使用上期数据")

    if turnover is None or len(turnover.get("items", [])) == 0:
        if old_turnover and old_turnover.get("items"):
            turnover = old_turnover
            print("[fallback] 成交额榜使用上期数据")
        else:
            turnover = turnover or {"items": [], "total_eligible": 0, "date": today_str}
            missing.append("turnover")

    if limit_up is None or not limit_up.get("sectors"):
        limit_up = old_up or {"total_count": 0, "sectors": [], "date": today_str}
        if limit_up.get("total_count", 0) == 0:
            missing.append("limit_up")
    if limit_down is None or not limit_down.get("sectors"):
        limit_down = old_down or {"total_count": 0, "sectors": [], "date": today_str}
        if limit_down.get("total_count", 0) == 0:
            missing.append("limit_down")

    # Thermometer
    lu_total = limit_up.get("total_count", 0)
    ld_total = limit_down.get("total_count", 0)
    ms = dashboard.get("market_summary", {})
    up_count = ms.get("up_count", 0)
    down_count = ms.get("down_count", 0)
    max_lh = 0
    for sec in limit_up.get("sectors", []):
        if sec.get("max_consecutive", 0) > max_lh:
            max_lh = sec["max_consecutive"]

    if lu_total > 0 or up_count > 0:
        thermometer = calc_thermometer(lu_total, ld_total, max_lh, up_count, down_count)
    else:
        thermometer = FALLBACK_THERMOMETER

    dashboard["thermometer"] = thermometer
    turnover["date"] = today_str
    limit_up["date"] = today_str
    limit_down["date"] = today_str

    if len(missing) >= 4:
        status = "stale"
    elif len(missing) > 0:
        status = "partial"
    else:
        status = "success"

    meta = {
        "data_date": today_str,
        "generated_at": generated_at,
        "status": status,
        "missing_fields": missing,
        "notes": ""
    }

    print("\n[写入] 保存数据文件...")
    save_json(dashboard, LATEST_DIR / "dashboard.json")
    save_json(turnover, LATEST_DIR / "turnover_top.json")
    save_json(limit_up, LATEST_DIR / "limit_up.json")
    save_json(limit_down, LATEST_DIR / "limit_down.json")
    save_json(meta, LATEST_DIR / "meta.json")

    # Archive
    archive_dir = DAILY_DIR / str(today.year) / f"{today.month:02d}" / f"{today.day:02d}"
    for fname in ["dashboard.json", "turnover_top.json", "limit_up.json", "limit_down.json", "meta.json"]:
        src = LATEST_DIR / fname
        if src.exists():
            dst = archive_dir / fname
            dst.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(src, dst)

    # Trends append
    trend_file = DATA_DIR / "trends.json"
    trends = []
    if trend_file.exists():
        with open(trend_file, "r", encoding="utf-8") as f:
            trends = json.load(f)
    trends = [t for t in trends if t.get("date") != today_str]
    trends.append({
        "date": today_str,
        "limit_up_count": lu_total,
        "limit_down_count": ld_total,
        "up_count": up_count,
        "down_count": down_count,
        "total_turnover": ms.get("total_turnover", 0)
    })
    trends = trends[-180:]
    with open(trend_file, "w", encoding="utf-8") as f:
        json.dump(trends, f, ensure_ascii=False, indent=2)

    print(f"\n采集完成 | 状态: {status} | 缺失: {missing if missing else '无'}")


if __name__ == "__main__":
    main()
