"""
A股每日复盘数据采集脚本
用法: python data_fetch.py
输出: public/data/latest/*.json  + daily归档
"""
import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

DATA_DIR = Path("public/data")
LATEST_DIR = DATA_DIR / "latest"
DAILY_DIR = DATA_DIR / "daily"

# 体温计默认值 (AKShare拉不到涨停数据时的fallback)
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


def calc_thermometer(limit_up_total, limit_down_total, max_consecutive, up_count, down_count):
    """计算市场体温"""
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


def fetch_dashboard():
    """拉取大盘概况数据"""
    try:
        import akshare as ak

        # 指数行情
        idx_codes = {"上证指数": "sh000001", "深证成指": "sz399001", "创业板指": "sz399006", "科创50": "sh000688"}
        today = date.today().strftime("%Y%m%d")

        indices = []
        yesterday = None
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
                    yesterday = prev_close
                else:
                    indices.append({"name": name, "code": code, "price": 0, "change": 0, "change_pct": 0})
            except Exception:
                indices.append({"name": name, "code": code, "price": 0, "change": 0, "change_pct": 0})

        # 市场总览 (两市成交额、涨跌家数)
        total_turnover = 0
        turnover_change_pct = 0
        up_count = 0
        down_count = 0
        try:
            df_sh = ak.stock_sse_summary()
            if df_sh is not None:
                total_turnover += float(df_sh.iloc[0].get("totalAmount", 0)) / 1e8
        except Exception:
            pass

        try:
            df_sz = ak.stock_szse_summary()
            if df_sz is not None and not df_sz.empty:
                row = df_sz.iloc[-1]
                total_turnover += float(row.get("交易金额", 0)) / 1e8
        except Exception:
            pass

        # 涨跌家数 (通过个股涨跌统计近似)
        try:
            df_market = ak.stock_zh_index_daily(symbol="sh000001")
            if df_market is not None and not df_market.empty:
                # AKShare部分接口有涨跌家数字段, 尝试读取
                pass
        except Exception:
            pass

        # 北向资金
        northbound = 0
        try:
            df_nb = ak.stock_hsgt_north_net_flow_in_em(symbol="北上")
            if df_nb is not None and not df_nb.empty:
                northbound = float(df_nb.iloc[-1].get("value", 0))
        except Exception:
            pass

        return {
            "indices": indices,
            "market_summary": {
                "total_turnover": round(total_turnover, 2),
                "turnover_change_pct": round(turnover_change_pct, 2),
                "up_count": up_count,
                "down_count": down_count,
                "northbound_net": round(northbound, 2)
            }
        }
    except ImportError:
        print("[WARN] akshare 未安装, 使用示例数据")
        return None
    except Exception as e:
        print(f"[ERROR] fetch_dashboard: {e}")
        return None


def fetch_limit_up_down():
    """拉取涨停跌停列表"""
    try:
        import akshare as ak
        today = date.today().strftime("%Y%m%d")

        # 涨停板
        limit_up = {"total_count": 0, "sectors": []}
        try:
            df_up = ak.stock_zt_pool_em(date=today)
            if df_up is not None and not df_up.empty:
                limit_up["total_count"] = len(df_up)
                # 按板块聚合
                sectors = {}
                for _, row in df_up.iterrows():
                    sector = row.get("所属行业", "其他")
                    name = row.get("名称", "")
                    code = row.get("代码", "")
                    pct = float(row.get("涨跌幅", 0))
                    consecutive = int(row.get("连板数", 1))
                    is_st = str(code).startswith("ST") or str(code).startswith("*ST")
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
            print(f"[WARN] 涨停数据获取失败: {e}")

        # 跌停板
        limit_down = {"total_count": 0, "sectors": []}
        try:
            df_down = ak.stock_zt_pool_dtgc_em(date=today)
            if df_down is not None and not df_down.empty:
                limit_down["total_count"] = len(df_down)
                sectors = {}
                for _, row in df_down.iterrows():
                    sector = row.get("所属行业", "其他")
                    name = row.get("名称", "")
                    code = row.get("代码", "")
                    pct = float(row.get("涨跌幅", 0))
                    is_st = str(code).startswith("ST") or str(code).startswith("*ST")
                    reason = "ST风险" if is_st else "待分析"
                    stock = {"name": name, "code": code, "change_pct": pct,
                             "consecutive_down": int(row.get("连续跌停", 1)), "reason": reason}
                    if sector not in sectors:
                        sectors[sector] = {"stocks": []}
                    sectors[sector]["stocks"].append(stock)

                for name, sec in sectors.items():
                    limit_down["sectors"].append({
                        "sector": name, "count": len(sec["stocks"]), "stocks": sec["stocks"]
                    })
                limit_down["sectors"].sort(key=lambda x: x["count"], reverse=True)
        except Exception as e:
            print(f"[WARN] 跌停数据获取失败: {e}")

        return limit_up, limit_down
    except ImportError:
        return {"total_count": 0, "sectors": []}, {"total_count": 0, "sectors": []}
    except Exception as e:
        print(f"[ERROR] fetch_limit_up_down: {e}")
        return {"total_count": 0, "sectors": []}, {"total_count": 0, "sectors": []}


def fetch_turnover_top():
    """拉取成交额排行榜"""
    try:
        import akshare as ak
        today = date.today().strftime("%Y%m%d")
        items = []
        try:
            df = ak.stock_zh_a_spot_em()
            if df is not None and not df.empty:
                df_sorted = df.nlargest(50, "成交额")
                for _, row in df_sorted.iterrows():
                    turnover = float(row["成交额"]) / 1e8
                    if turnover < 10:
                        continue
                    items.append({
                        "name": row.get("名称", ""),
                        "code": row.get("代码", ""),
                        "turnover": round(turnover, 2),
                        "change_pct": round(float(row.get("涨跌幅", 0)), 2),
                        "sector": row.get("所属行业", "其他"),
                        "turnover_percentile": 0
                    })
        except Exception as e:
            print(f"[WARN] 成交额数据获取失败: {e}")

        return {
            "items": items,
            "total_eligible": len(items)
        }
    except ImportError:
        return {"items": [], "total_eligible": 0}
    except Exception as e:
        print(f"[ERROR] fetch_turnover_top: {e}")
        return {"items": [], "total_eligible": 0}


def save_json(data, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")
    generated_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+08:00")
    missing = []

    print(f"=== A股复盘数据采集 {today_str} ===")

    # 1. Dashboard
    print("[1/4] 大盘概况...")
    dash_raw = fetch_dashboard()
    if dash_raw is None:
        dash_raw = {
            "indices": [],
            "market_summary": {"total_turnover": 0, "turnover_change_pct": 0,
                               "up_count": 0, "down_count": 0, "northbound_net": 0}
        }
        missing.append("dashboard")
    # fallback to saved later

    # 2. Limit up/down
    print("[2/4] 涨停跌停...")
    limit_up, limit_down = fetch_limit_up_down()
    if not limit_up.get("sectors"):
        missing.append("limit_up")
    if not limit_down.get("sectors"):
        missing.append("limit_down")

    # 3. Turnover
    print("[3/4] 成交额榜...")
    turnover = fetch_turnover_top()
    if not turnover.get("items"):
        missing.append("turnover")

    # 4. Thermometer
    lu_total = limit_up.get("total_count", 0)
    ld_total = limit_down.get("total_count", 0)
    ms = dash_raw.get("market_summary", {})
    up_count = ms.get("up_count", 0)
    down_count = ms.get("down_count", 0)

    # 从涨停数据里找最高连板
    max_lh = 0
    for sec in limit_up.get("sectors", []):
        if sec.get("max_consecutive", 0) > max_lh:
            max_lh = sec["max_consecutive"]

    if lu_total > 0 or up_count > 0:
        thermometer = calc_thermometer(lu_total, ld_total, max_lh, up_count, down_count)
    else:
        thermometer = FALLBACK_THERMOMETER

    dashboard = {
        "date": today_str,
        "indices": dash_raw.get("indices", []),
        "market_summary": dash_raw.get("market_summary", {}),
        "thermometer": thermometer
    }

    turnover["date"] = today_str
    limit_up["date"] = today_str
    limit_down["date"] = today_str

    # Determine status
    if len(missing) >= 3:
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

    # Write
    print("[4/4] 写入文件...")
    save_json(dashboard, LATEST_DIR / "dashboard.json")
    save_json(turnover, LATEST_DIR / "turnover_top.json")
    save_json(limit_up, LATEST_DIR / "limit_up.json")
    save_json(limit_down, LATEST_DIR / "limit_down.json")
    save_json(meta, LATEST_DIR / "meta.json")

    # Archive to daily
    archive_dir = DAILY_DIR / str(today.year) / f"{today.month:02d}" / f"{today.day:02d}"
    for fname in ["dashboard.json", "turnover_top.json", "limit_up.json", "limit_down.json", "meta.json"]:
        src = LATEST_DIR / fname
        dst = archive_dir / fname
        if src.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy(src, dst)

    # Trends append
    trend_file = DATA_DIR / "trends.json"
    trends = []
    if trend_file.exists():
        with open(trend_file, "r", encoding="utf-8") as f:
            trends = json.load(f)
    # Remove existing entry for same date
    trends = [t for t in trends if t.get("date") != today_str]
    trends.append({
        "date": today_str,
        "limit_up_count": lu_total,
        "limit_down_count": ld_total,
        "up_count": up_count,
        "down_count": down_count,
        "total_turnover": ms.get("total_turnover", 0)
    })
    # Keep last 180
    trends = trends[-180:]
    with open(trend_file, "w", encoding="utf-8") as f:
        json.dump(trends, f, ensure_ascii=False, indent=2)

    print(f"✓ 采集完成 | 状态: {status} | 缺失: {missing if missing else '无'}")


if __name__ == "__main__":
    main()
