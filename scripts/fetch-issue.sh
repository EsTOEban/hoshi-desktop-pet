#!/bin/bash
# Fetch GitHub token and call API
export GITHUB_TOKEN=$(echo -e "protocol=https\nhost=github.com\n" | git credential fill | grep "^password=" | cut -d= -f2)

if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: No token found"
    exit 1
fi

echo "Token length: ${#GITHUB_TOKEN}"

# Fetch issue #1
curl -s -H "Authorization: token $GITHUB_TOKEN" \
    "https://api.github.com/repos/EsTOEban/hoshi-desktop-pet/issues/1" | \
    python3 -c "import sys,json; i=json.load(sys.stdin); print(f'#{i[\"number\"]}: {i[\"title\"]}'); print(f'Body: {i.get(\"body\", \"\")[:500]}')"
