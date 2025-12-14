#!/bin/bash

# Test MCP Backlog Server

echo "Testing MCP Backlog Server..."
echo ""

# Test list tools
echo "Request: List Tools"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/index.js

echo ""
echo "If you see tool definitions above, the server is working!"
