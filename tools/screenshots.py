"""Capture README screenshots of the static demo.

Usage: python tools/screenshots.py [base_url]
Serve the site first, e.g. `python -m http.server 8765 -d site`.
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765/"
OUT = Path(__file__).resolve().parent.parent / "docs" / "images" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

DESKTOP = [
    ("dashboard", "#/dashboard"),
    ("search", "#/search"),
    ("product", "#/product/1011"),
    ("bookmarks", "#/bookmarks"),
    ("calendar", "#/calendar"),
    ("model", "#/insights"),
    ("pipeline", "#/pipeline"),
]
MOBILE = [("mobile-dashboard", "#/dashboard"), ("mobile-product", "#/product/1011")]

errors = []
with sync_playwright() as p:
    import os
    exe = os.environ.get("PP_CHROME")
    browser = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
    for name, route, opts in [(n, r, dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1)) for n, r in DESKTOP] + \
            [(n, r, dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)) for n, r in MOBILE]:
        ctx = browser.new_context(**opts)
        page = ctx.new_page()
        page.on("pageerror", lambda e, n=name: errors.append(f"{n}: {e}"))
        page.on("console", lambda m, n=name: m.type == "error" and errors.append(f"{n}: {m.text}"))
        page.goto(BASE + route)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1200)
        overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        if overflow:
            errors.append(f"{name}: horizontal overflow")
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=name.startswith("mobile") is False and name in ("dashboard", "product", "model"))
        ctx.close()
    browser.close()

print("saved to", OUT)
print("\n".join(errors) if errors else "no console errors")
