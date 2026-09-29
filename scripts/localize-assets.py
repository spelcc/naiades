from pathlib import Path
from urllib.parse import urlparse, unquote
import hashlib, re, time, subprocess

ROOT = Path.cwd()
PUBLIC = ROOT / "public" / "assets" / "vendor"
PUBLIC.mkdir(parents=True, exist_ok=True)
HOSTS = {
    "cdn.prod.website-files.com",
    "d3e54v103j8qbb.cloudfront.net",
    "ajax.googleapis.com",
}
TEXT_EXT = {".html", ".json", ".astro", ".ts", ".js", ".css", ".mdoc"}
FILES = []
for base in (ROOT / "src", ROOT / "public"):
    for p in base.rglob("*"):
        if p.is_file() and p.suffix.lower() in TEXT_EXT and "assets/vendor" not in str(p):
            FILES.append(p)

url_re = re.compile(r'https?://[^\s"\'<>]+')
refs = {}
for p in FILES:
    try:
        text = p.read_text("utf8")
    except UnicodeDecodeError:
        continue
    for raw in url_re.findall(text):
        url = raw.rstrip("),;")
        host = urlparse(url).netloc
        parsed = urlparse(url)
        if host in HOSTS and parsed.path not in ("", "/"):
            refs[url] = None

print(f"{len(refs)} unique vendor assets")

def filename_for(url):
    parsed = urlparse(url)
    base = unquote(Path(parsed.path).name) or "asset"
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base).strip("-") or "asset"
    digest = hashlib.sha1(url.encode()).hexdigest()[:10]
    host = parsed.netloc.replace(".", "-")
    return PUBLIC / host / f"{digest}-{base}"

for i, url in enumerate(sorted(refs), 1):
    out = filename_for(url)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists() or out.stat().st_size == 0:
        result = subprocess.run([
            "curl", "-fsSL", "--retry", "3", "--retry-delay", "1",
            "-A", "Mozilla/5.0", url, "-o", str(out)
        ], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"download failed {url}: {result.stderr.strip()}")
    refs[url] = "/" + out.relative_to(ROOT / "public").as_posix()
    print(f"[{i}/{len(refs)}] {urlparse(url).netloc}{urlparse(url).path} -> {refs[url]}")

for p in FILES:
    try:
        text = p.read_text("utf8")
    except UnicodeDecodeError:
        continue
    original = text
    for url, local in refs.items():
        text = text.replace(url, local)
    if text != original:
        p.write_text(text, "utf8")

manifest = ROOT / "reference" / "localized-assets.tsv"
manifest.parent.mkdir(parents=True, exist_ok=True)
manifest.write_text("\n".join(f"{u}\t{refs[u]}" for u in sorted(refs)) + "\n", "utf8")
print(f"manifest: {manifest}")
