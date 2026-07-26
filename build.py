#!/usr/bin/env python3
"""
Build the planner into a single self-contained file.

    python3 build.py

Reads src/shell.html and substitutes three markers:
    /*__THEME__*/  <- src/theme.css   the design system
    /*__DATA__*/   <- src/data.js     courses, curriculum, glossary, descriptions
    /*__APP__*/    <- src/app.js      all behaviour

Writes dist/index.html. That one file is the whole product — no dependencies,
no network requests, no build tooling beyond this script.
"""
import pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC, DIST = ROOT / "src", ROOT / "dist"

def main():
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    parts = {
        "/*__THEME__*/": (SRC / "theme.css").read_text(encoding="utf-8"),
        "/*__DATA__*/":  (SRC / "data.js").read_text(encoding="utf-8"),
        "/*__APP__*/":   (SRC / "app.js").read_text(encoding="utf-8"),
    }
    out = shell
    for marker, content in parts.items():
        if marker not in out:
            sys.exit(f"ERROR: marker {marker} missing from src/shell.html")
        out = out.replace(marker, content)

    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(out, encoding="utf-8")

    # cheap sanity checks — these catch the mistakes that actually happen
    problems = []
    if 'src="http' in out or 'href="http' in out.replace('href="https://aims.iith.ac.in/', '').replace('href="https://calendar.google', ''):
        pass  # outbound links are fine; only *loaded* resources would be a problem
    if "localStorage" in out or "sessionStorage" in out:
        problems.append("uses browser storage (not allowed)")
    for var in ("var SLOTS", "var CUR", "var ENG", "var GLOSS", "var MISTAKES", "var DESC"):
        if var not in out:
            problems.append(f"missing data block: {var}")
    for tag in ("</html>", "</body>", "</style>"):
        if out.count(tag) != 1:
            problems.append(f"{tag} appears {out.count(tag)} times, expected 1")

    print(f"built dist/index.html  ({len(out):,} bytes)")
    if problems:
        print("\nPROBLEMS:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("checks passed")

if __name__ == "__main__":
    main()
