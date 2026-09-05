#!/usr/bin/env python3
"""Move GitHub Projects v2 cards via GraphQL.

Usage:
  python board-move.py move <issue_number> <status_name>
  python board-move.py find <issue_number>
  python board-move.py list

Status names: Grooming, Ready, In Progress, Blocked, Closed
"""
import json
import os
import sys
import urllib.request

# Auto-load .env from project root if GITHUB_TOKEN not set
def load_token():
    if 'GITHUB_TOKEN' in os.environ:
        return os.environ['GITHUB_TOKEN']
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(os.path.dirname(script_dir), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith('GITHUB_TOKEN='):
                    value = line.split('=', 1)[1]
                    # Remove surrounding quotes
                    if (value.startswith('"') and value.endswith('"')) or \
                       (value.startswith("'") and value.endswith("'")):
                        value = value[1:-1]
                    return value
    print('ERROR: Set GITHUB_TOKEN env var or create .env with GITHUB_TOKEN=...')
    sys.exit(1)


TOKEN = load_token()
PROJECT_ID = 'PVT_kwHOAHcsjs4Bhz7f'
STATUS_FIELD_ID = 'PVTSSF_lAHOAHcsjs4Bhz7fzhguTEk'

# Status option IDs
OPTIONS = {
    'Grooming': '23a92e56',
    'Ready': '93283e3d',
    'In Progress': '8dd4e03c',
    'Blocked': 'e2fd0473',
    'Closed': '116414d5',
}


def graphql(query):
    data = json.dumps({'query': query}).encode()
    req = urllib.request.Request(
        'https://api.github.com/graphql',
        data=data,
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json',
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def move_card(item_id, option_name):
    option_id = OPTIONS[option_name]
    query = f'''
mutation {{
  updateProjectV2ItemFieldValue(input: {{
    projectId: "{PROJECT_ID}",
    itemId: "{item_id}",
    fieldId: "{STATUS_FIELD_ID}",
    value: {{ singleSelectOptionId: "{option_id}" }}
  }}) {{
    projectV2Item {{ id }}
  }}
}}'''
    result = graphql(query)
    if 'errors' in result:
        print(f'ERROR: {result["errors"]}')
        sys.exit(1)
    print(f'Moved {item_id} to {option_name}')


def find_card(issue_number):
    query = f'''
query {{
  node(id: "{PROJECT_ID}") {{
    ... on ProjectV2 {{
      items(first: 30) {{
        nodes {{
          id
          fieldValueByName(name: "Status") {{
            ... on ProjectV2ItemFieldSingleSelectValue {{ name }}
          }}
          content {{
            ... on Issue {{ number title }}
          }}
        }}
      }}
    }}
  }}
}}'''
    result = graphql(query)
    for item in result['data']['node']['items']['nodes']:
        content = item.get('content', {})
        if content and content.get('number') == issue_number:
            fv = item.get('fieldValueByName')
            name = fv.get('name', 'No Status') if fv else 'No Status'
            return item['id'], name
    return None, None


def list_cards():
    query = f'''
query {{
  node(id: "{PROJECT_ID}") {{
    ... on ProjectV2 {{
      items(first: 30) {{
        nodes {{
          id
          fieldValueByName(name: "Status") {{
            ... on ProjectV2ItemFieldSingleSelectValue {{ name }}
          }}
          content {{
            ... on Issue {{ number title }}
          }}
        }}
      }}
    }}
  }}
}}'''
    result = graphql(query)
    for item in result['data']['node']['items']['nodes']:
        content = item.get('content', {})
        if content and content.get('number'):
            fv = item.get('fieldValueByName')
            status_name = fv.get('name', 'No Status') if fv else 'No Status'
            print(f'#{content["number"]:>2} [{status_name:>12}] {content["title"]}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python board-move.py move <issue_number> <status_name>')
        print('       python board-move.py find <issue_number>')
        print('       python board-move.py list')
        sys.exit(1)

    action = sys.argv[1]
    if action == 'move':
        issue_num = int(sys.argv[2])
        target_status = sys.argv[3] if len(sys.argv) > 3 else 'In Progress'
        item_id, current = find_card(issue_num)
        if item_id:
            print(f'#{issue_num} currently in {current}, moving to {target_status}...')
            move_card(item_id, target_status)
        else:
            print(f'Card #{issue_num} not found')
            sys.exit(1)
    elif action == 'find':
        issue_num = int(sys.argv[2])
        item_id, current = find_card(issue_num)
        if item_id:
            print(f'#{issue_num}: {item_id} (Status: {current})')
        else:
            print(f'Card #{issue_num} not found')
            sys.exit(1)
    elif action == 'list':
        list_cards()
    else:
        print(f'Unknown action: {action}')
        sys.exit(1)
