# Installing APEX

## Prerequisites

- [OpenCode CLI](https://opencode.ai) installed

## Installation

Add APEX to the `plugin` array in your `opencode.json`:

```json
{
  "plugin": ["apex@git+https://github.com/your-org/apex.git"]
}
```

Restart OpenCode.

## Manual Installation (Local Path)

```bash
git clone https://github.com/your-org/apex.git
cd apex
pnpm install
pnpm build
```

Then in `opencode.json`:

```json
{
  "plugin": ["./path/to/apex/apps/cli"]
}
```

## Verify Installation

Ask OpenCode:

```
What are my superpowers?
```

It should describe the APEX state machine and available commands.

## Updating

```bash
cd apex
git pull
pnpm install
pnpm build
```

Or update the plugin reference and restart OpenCode.

## Troubleshooting

1. Check plugin loading: `opencode run --print-logs "hello" 2>&1 | grep -i apex`
2. Verify opencode.json plugin entry is correct
3. Make sure you're running a recent version of OpenCode