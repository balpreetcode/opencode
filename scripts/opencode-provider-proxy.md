# OpenCode Provider Proxy Tunnel

Run a local provider proxy and expose it through VS Code Dev Tunnels:

```bash
PORT=8787 node scripts/opencode-provider-proxy.mjs
devtunnel host opencode-provider-proxy -p 8787 --protocol http --allow-anonymous
```

The tunnel prints an HTTPS URL like:

```text
https://opencode-provider-proxy-8787.<region>.use.devtunnels.ms
```

Use provider-specific base URLs with opencode:

```bash
OPENROUTER_BASE_URL=https://opencode-provider-proxy-8787.<region>.use.devtunnels.ms/openrouter opencode
OPENAI_BASE_URL=https://opencode-provider-proxy-8787.<region>.use.devtunnels.ms/openai opencode
ANTHROPIC_BASE_URL=https://opencode-provider-proxy-8787.<region>.use.devtunnels.ms/anthropic opencode
COPILOT_BASE_URL=https://opencode-provider-proxy-8787.<region>.use.devtunnels.ms/copilot opencode
```

Default routes:

```text
/anthropic  -> https://api.anthropic.com
/copilot    -> https://api.githubcopilot.com
/gemini     -> https://generativelanguage.googleapis.com
/groq       -> https://api.groq.com/openai/v1
/openai     -> https://api.openai.com/v1
/openrouter -> https://openrouter.ai/api/v1
/xai        -> https://api.x.ai/v1
```

Override routes with `OPENCODE_PROXY_ROUTES`:

```bash
OPENCODE_PROXY_ROUTES="openrouter=https://your-upstream.example.com/api/v1" \
  node scripts/opencode-provider-proxy.mjs
```
