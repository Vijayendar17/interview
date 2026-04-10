import json
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
from threading import Lock


class InMemoryCache:
    """In-memory cache manager (replacement for Redis)."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self._lock:
            if key in self._cache:
                item = self._cache[key]
                # Check if expired
                if item['expires_at'] and datetime.utcnow() > item['expires_at']:
                    del self._cache[key]
                    return None
                return item['value']
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache with TTL (seconds)."""
        with self._lock:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl) if ttl else None
            self._cache[key] = {
                'value': value,
                'expires_at': expires_at
            }
    
    def delete(self, key: str):
        """Delete key from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def exists(self, key: str) -> bool:
        """Check if key exists."""
        return self.get(key) is not None
    
    def increment(self, key: str, amount: int = 1) -> int:
        """Increment value."""
        with self._lock:
            current = self.get(key) or 0
            new_value = int(current) + amount
            self.set(key, new_value)
            return new_value
    
    def get_hash(self, key: str) -> dict:
        """Get hash value."""
        value = self.get(key)
        return value if isinstance(value, dict) else {}
    
    def set_hash(self, key: str, mapping: dict, ttl: Optional[int] = None):
        """Set hash value."""
        self.set(key, mapping, ttl or 3600)
    
    def add_to_sorted_set(self, key: str, score: float, member: str):
        """Add to sorted set (simplified)."""
        with self._lock:
            sorted_set = self.get(key) or []
            sorted_set.append((member, score))
            sorted_set.sort(key=lambda x: x[1])
            self.set(key, sorted_set)
    
    def get_sorted_set(self, key: str, start: int = 0, end: int = -1):
        """Get sorted set members."""
        sorted_set = self.get(key) or []
        if end == -1:
            return sorted_set[start:]
        return sorted_set[start:end+1]


# Global cache instance
cache = InMemoryCache()

