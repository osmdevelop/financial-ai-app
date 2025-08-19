import json
import sys
import yfinance as yf
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any
import os

def fetch_equity_price(symbol: str) -> Dict[str, Any]:
    """Fetch equity/ETF price using yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d")
        
        if hist.empty:
            raise ValueError(f"No data found for {symbol}")
        
        latest_price = hist['Close'].iloc[-1]
        latest_date = hist.index[-1].strftime('%Y-%m-%d')
        
        return {
            "symbol": symbol,
            "assetType": "equity",  # Will be corrected by calling code
            "close": float(latest_price),
            "date": latest_date,
            "source": "yfinance"
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}", file=sys.stderr)
        return None

def fetch_crypto_price(coingecko_id: str, symbol_map: Dict[str, str]) -> Dict[str, Any]:
    """Fetch crypto price using CoinGecko API"""
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coingecko_id,
            "vs_currencies": "usd"
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        if coingecko_id not in data:
            raise ValueError(f"No data found for {coingecko_id}")
        
        price = data[coingecko_id]["usd"]
        
        # Map back to symbol
        symbol = None
        for k, v in symbol_map.items():
            if v == coingecko_id:
                symbol = k
                break
        
        if not symbol:
            symbol = f"{coingecko_id.upper()}-USD"
        
        return {
            "symbol": symbol,
            "assetType": "crypto",
            "close": float(price),
            "date": datetime.now().strftime('%Y-%m-%d'),
            "source": "coingecko"
        }
    except Exception as e:
        print(f"Error fetching {coingecko_id}: {e}", file=sys.stderr)
        return None

def search_equity_symbols(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search for equity/ETF symbols using yfinance"""
    try:
        # Mock search implementation - in production, would use proper search API
        # For now, return a static list filtered by query
        mock_securities = [
            {"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "type": "equity"},
            {"symbol": "MSFT", "name": "Microsoft Corporation", "exchange": "NASDAQ", "type": "equity"},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "exchange": "NASDAQ", "type": "equity"},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "exchange": "NASDAQ", "type": "equity"},
            {"symbol": "TSLA", "name": "Tesla Inc.", "exchange": "NASDAQ", "type": "equity"},
            {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "exchange": "NYSE", "type": "etf"},
            {"symbol": "QQQ", "name": "Invesco QQQ Trust", "exchange": "NASDAQ", "type": "etf"},
            {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "exchange": "NYSE", "type": "etf"},
            {"symbol": "IVV", "name": "iShares Core S&P 500 ETF", "exchange": "NYSE", "type": "etf"},
            {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "exchange": "NYSE", "type": "etf"},
        ]
        
        # Filter by query (case insensitive)
        query_lower = query.lower()
        filtered = [
            sec for sec in mock_securities 
            if query_lower in sec["symbol"].lower() or query_lower in sec["name"].lower()
        ]
        
        return filtered[:limit]
    except Exception as e:
        print(f"Error searching symbols for {query}: {e}", file=sys.stderr)
        return []

def fetch_price_summary(symbol: str) -> Dict[str, Any]:
    """Fetch comprehensive price summary with 7-day mini chart"""
    try:
        ticker = yf.Ticker(symbol)
        
        # Get current price
        hist_1d = ticker.history(period="1d")
        if hist_1d.empty:
            raise ValueError(f"No current data found for {symbol}")
        
        current_price = float(hist_1d['Close'].iloc[-1])
        
        # Get 7-day history for mini chart
        hist_7d = ticker.history(period="7d")
        if hist_7d.empty:
            raise ValueError(f"No historical data found for {symbol}")
        
        # Calculate 24h change
        change_24h = 0
        change_percent_24h = 0
        if len(hist_7d) >= 2:
            prev_close = float(hist_7d['Close'].iloc[-2])
            change_24h = current_price - prev_close
            change_percent_24h = (change_24h / prev_close) * 100 if prev_close > 0 else 0
        
        # Create mini chart data
        mini_chart = []
        for index, row in hist_7d.iterrows():
            mini_chart.append({
                "ts": int(index.timestamp() * 1000),
                "close": float(row["Close"])
            })
        
        # Get basic info
        info = ticker.info or {}
        
        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "price": current_price,
            "change24h": change_24h,
            "changePercent24h": change_percent_24h,
            "marketCap": info.get("marketCap"),
            "miniChart": mini_chart,
            "asOf": datetime.now().isoformat(),
            "source": "yfinance"
        }
    except Exception as e:
        print(f"Error fetching price summary for {symbol}: {e}", file=sys.stderr)
        return None

def fetch_intraday_data(symbol: str, interval: str = "1m", lookback: str = "1d") -> Dict[str, Any]:
    """Fetch intraday data with Polygon.io fallback to yfinance"""
    try:
        polygon_key = os.getenv("POLYGON_API_KEY")
        
        if polygon_key:
            # Try Polygon.io first
            try:
                from_date = datetime.now() - timedelta(days=1)
                to_date = datetime.now()
                
                url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/minute/{from_date.strftime('%Y-%m-%d')}/{to_date.strftime('%Y-%m-%d')}"
                params = {
                    "apikey": polygon_key,
                    "sort": "asc",
                    "limit": 50000
                }
                
                response = requests.get(url, params=params)
                response.raise_for_status()
                
                data = response.json()
                if data.get("status") == "OK" and data.get("results"):
                    candles = []
                    for result in data["results"][-100:]:  # Last 100 data points
                        candles.append({
                            "ts": result["t"],
                            "open": result["o"],
                            "high": result["h"],
                            "low": result["l"],
                            "close": result["c"],
                            "volume": result["v"]
                        })
                    
                    return {
                        "symbol": symbol,
                        "interval": interval,
                        "candles": candles,
                        "source": "polygon"
                    }
            except Exception as e:
                print(f"Polygon.io failed for {symbol}: {e}", file=sys.stderr)
        
        # Fallback to yfinance
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="1d", interval="1m")
        
        if hist.empty:
            # If no intraday, get latest daily
            hist = ticker.history(period="1d")
        
        candles = []
        for index, row in hist.iterrows():
            candles.append({
                "ts": int(index.timestamp() * 1000),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return {
            "symbol": symbol,
            "interval": interval,
            "candles": candles,
            "source": "yfinance"
        }
        
    except Exception as e:
        print(f"Error fetching intraday data for {symbol}: {e}", file=sys.stderr)
        return None

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        request_type = input_data.get("type")
        
        # Handle search request
        if request_type == "search":
            query = input_data.get("query", "")
            limit = input_data.get("limit", 10)
            
            results = search_equity_symbols(query, limit)
            print(json.dumps(results))
            return
        
        # Handle price summary request
        if request_type == "price_summary":
            symbol = input_data.get("symbol")
            if not symbol:
                print(json.dumps({"error": "Symbol required for price summary"}))
                return
            
            result = fetch_price_summary(symbol)
            if result:
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Failed to fetch price summary for {symbol}"}))
            return
        
        # Check if this is an intraday request
        if request_type == "intraday":
            symbol = input_data.get("symbol")
            interval = input_data.get("interval", "1m")
            lookback = input_data.get("lookback", "1d")
            
            result = fetch_intraday_data(symbol, interval, lookback)
            if result:
                print(json.dumps(result))
            else:
                print(json.dumps({"error": f"Failed to fetch intraday data for {symbol}"}))
            return
        
        # Original batch price fetching logic
        equities = input_data.get("equities", [])
        cryptos = input_data.get("cryptos", [])
        
        results = []
        
        # Symbol mapping for crypto
        crypto_symbol_map = {
            "BTC-USD": "bitcoin",
            "ETH-USD": "ethereum",
            "ADA-USD": "cardano",
            "SOL-USD": "solana"
        }
        
        # Reverse mapping for lookup
        reverse_crypto_map = {v: k for k, v in crypto_symbol_map.items()}
        
        # Fetch equity prices
        for symbol in equities:
            price_data = fetch_equity_price(symbol)
            if price_data:
                results.append(price_data)
        
        # Fetch crypto prices
        for crypto_id in cryptos:
            price_data = fetch_crypto_price(crypto_id, reverse_crypto_map)
            if price_data:
                results.append(price_data)
        
        # Output results as JSON
        print(json.dumps(results))
        
    except Exception as e:
        print(f"Error in main: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
