from __future__ import annotations
from collections import Counter
from threading import Lock


class ApiHitCountMiddleware:
    """Logs per-endpoint API hit counts to the Django runserver terminal.

    Notes:
    - Counts are in-memory and reset on server restart.
    - In multi-process deployments, each process maintains its own counts.
    """

    _lock = Lock()
    _counts: Counter[str] = Counter()

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        
        path = request.path_info or ""
        if "/api/" not in path:
            return self.get_response(request)

        response = None
        try:
            response = self.get_response(request)
            return response
        finally:
            key = f"{request.method} {path}"

            with self._lock:
                self._counts[key] += 1
                count = self._counts[key]

            print("=== API HIT COUNT ===", flush=True)
            print(f"{key} -> {count}", flush=True)
            print("=" * 30, flush=True)
