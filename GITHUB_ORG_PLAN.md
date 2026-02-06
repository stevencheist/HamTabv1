# GitHub Org Setup for Private AI Workflow

## Overview

Create a GitHub organization to share private AI collaboration protocols between Francisco and Steven, while keeping HamTab's public CLAUDE.md generic.

**Cost: $0** (GitHub Free tier supports unlimited private repos with unlimited collaborators)

**Functionality: No loss.** Claude Code loads both `~/.claude/instructions.md` (private) and `project/CLAUDE.md` (public). Splitting content between them changes nothing — Claude sees both.

---

## Step-by-Step Setup

### Step 1: Create the GitHub Organization (5 min)

**Francisco or Steven does this manually:**

1. Go to: https://github.com/account/organizations/new
2. Choose **"Create a free organization"**
3. Pick a name (suggestions: `fp-studio`, `hamtab-dev`, `fpeeb-team`, or something generic you'd use for future projects)
4. Set it to **Personal account** (not business)
5. Skip the "Add members" step for now — we'll do it via CLI

### Step 2: Add Steven as Owner (2 min)

**Run from terminal (Francisco):**
```bash
# Replace ORG_NAME with your chosen org name
gh api orgs/ORG_NAME/memberships/stevencheist -X PUT -f role=admin
```

Steven will get an email invite. Once accepted, he's a full owner.

### Step 3: Create Private Repo for Workflow IP (2 min)

```bash
gh repo create ORG_NAME/claude-workflow --private --description "AI collaboration protocols - PRIVATE"
```

### Step 4: Push Private Instructions to Repo (5 min)

```bash
# Clone the new repo
git clone git@github.com:ORG_NAME/claude-workflow.git ~/.claude-workflow
cd ~/.claude-workflow

# Copy the private instructions draft (already created)
cp /path/to/HamTabV1/DRAFT_PRIVATE_INSTRUCTIONS.md instructions.md

# Also copy settings.json as backup
cp ~/.claude/settings.json settings.json

# Add README
cat > README.md << 'EOF'
# Claude Workflow

Private AI collaboration protocols. Do not share publicly.

## Setup

1. Clone this repo to `~/.claude-workflow/`
2. Create symlink: `~/.claude/instructions.md` → `~/.claude-workflow/instructions.md`
3. Restart Claude Code

## Files

- `instructions.md` — AI collaboration protocols (symlinked to ~/.claude/)
- `settings.json` — Shared permission settings
EOF

# Commit and push
git add -A
git commit -m "Initial private workflow setup"
git push
```

### Step 5: Create Symlink (2 min)

**Francisco (Windows):**
```cmd
# Run as Administrator
mklink C:\Users\fpeeb\.claude\instructions.md C:\Users\fpeeb\.claude-workflow\instructions.md
```

**Steven (Mac/Linux):**
```bash
ln -s ~/.claude-workflow/instructions.md ~/.claude/instructions.md
```

### Step 6: Update HamTab's Public CLAUDE.md (5 min)

Replace the current CLAUDE.md with the slimmed-down public version:

```bash
cd ~/coding/HamTabV1
cp DRAFT_PUBLIC_CLAUDE.md CLAUDE.md
git add CLAUDE.md
git commit -m "Slim down CLAUDE.md - move private protocols to ~/.claude/instructions.md"
git push
```

### Step 7: Steven Clones and Sets Up (5 min)

Steven runs:
```bash
# Clone the private workflow repo
git clone git@github.com:ORG_NAME/claude-workflow.git ~/.claude-workflow

# Create symlink
ln -s ~/.claude-workflow/instructions.md ~/.claude/instructions.md

# Pull latest HamTab to get the slimmed CLAUDE.md
cd ~/path/to/HamTabV1
git pull
```

### Step 8: Test (5 min)

1. Restart Claude Code
2. Ask: "Summarize your instructions about end-of-session protocol"
3. Claude should describe the protocol from the private instructions
4. Verify public CLAUDE.md still loads (ask about project structure)

---

## Ongoing Workflow

### When you update the private instructions:

```bash
cd ~/.claude-workflow
# Edit instructions.md
git add instructions.md
git commit -m "Update: <what changed>"
git push
```

Other dev pulls:
```bash
cd ~/.claude-workflow
git pull
```

### When you update public CLAUDE.md:

Normal git workflow in the project repo. Syncs with branches as usual.

---

## Checklist

- [ ] Create GitHub org
- [ ] Add Steven as owner
- [ ] Create `claude-workflow` private repo
- [ ] Push `DRAFT_PRIVATE_INSTRUCTIONS.md` as `instructions.md`
- [ ] Create symlink on Francisco's machine
- [ ] Replace HamTab's CLAUDE.md with public version
- [ ] Steven clones and creates symlink
- [ ] Test both layers load correctly
- [ ] Delete draft files from HamTab repo

---

## Files to Delete After Migration

Once everything works, remove from HamTab:

```bash
rm DRAFT_PUBLIC_CLAUDE.md
rm DRAFT_PRIVATE_INSTRUCTIONS.md
rm GITHUB_ORG_PLAN.md  # or keep for reference
git add -A
git commit -m "Clean up migration drafts"
```

---

## What's Where After Migration

| File | Location | Visibility |
|------|----------|------------|
| `instructions.md` | `~/.claude-workflow/` (symlinked to `~/.claude/`) | **Private** — in org's private repo |
| `settings.json` | `~/.claude/` | **Private** — local + backed up in private repo |
| `CLAUDE.md` | `HamTabV1/` | **Public** — generic project info only |
| `MEMORY.md` | `~/.claude/projects/HamTabV1/memory/` | **Private** — stays local, not in any repo |
