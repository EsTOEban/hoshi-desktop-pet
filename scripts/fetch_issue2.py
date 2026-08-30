#!/usr/bin/env python3
"""Fetch GitHub token from git credential fill and call API."""
import json
import subprocess
import sys
import urllib.request

# Get token from git credential manager
result = subprocess.run(
    ['git', 'credential', 'fill'],
    input=b'protocol=https\nhost=github.com\n',
    capture_output=True
)
cred = {}
for line in result.stdout.decode().strip().split('\n'):
    if '=' in line:
        k, v = line.split('=', 1)
        cred[k] = v

token = cred.get('password', '')
if not token:
    print("ERROR: No token found")
    sys.exit(1)

print(f"Token length: {len(token)}")

# Fetch issue #2
url = "https://api.github.com/repos/EsTOEban/hoshi-desktop-pet/issues/2"
req = urllib.request.Request(url, headers={
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json"
})
with urllib.request.urlopen(req) as resp:
    issue = json.loads(resp.read().decode())
    print(f'#{issue["number"]}: {issue["title"]}')
    body = issue.get('body', '')
    print(f'Body length: {len(body)}')
    print(body[:500])
