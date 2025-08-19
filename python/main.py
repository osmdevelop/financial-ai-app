import json
import sys
import yfinance as yf
import requests
from datetime import datetime
from typing import List, Dict, Any

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

def main():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
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
