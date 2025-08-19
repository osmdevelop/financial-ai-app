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
        
        # Check if this is an intraday request
        if input_data.get("type") == "intraday":
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
