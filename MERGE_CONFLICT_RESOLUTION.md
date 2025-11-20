# Merge Conflict Resolution Guide

This document provides step-by-step instructions for resolving the merge conflicts in PRs #14 and #9.

## Overview

Two pull requests have merge conflicts (mergeable_state: "dirty"):
- **PR #14:** Fix stability issues (`copilot/fix-stability-issues` branch)
- **PR #9:** Add language options (`copilot/add-language-options` branch)

Both PRs are based on older versions of the `main` branch and need to be updated.

## Resolution Steps

### For PR #14: Fix stability issues

This PR is based on commit `29d8fbcd` but main is now at `1f65d9d`.

```bash
# 1. Checkout the branch
git checkout copilot/fix-stability-issues

# 2. Fetch latest main
git fetch origin main

# 3. Merge main into the branch (or rebase if preferred)
git merge origin/main

# 4. If conflicts occur, resolve them manually
# The changes are primarily in script.js, focusing on error handling

# 5. After resolving conflicts
git add .
git commit -m "Merge main into fix-stability-issues"

# 6. Push the updated branch
git push origin copilot/fix-stability-issues
```

**Expected Conflicts:** Likely minimal since PR #14 only modifies `script.js` with error handling improvements.

### For PR #9: Add language options

This PR is based on a much older commit `2065ae28` and modifies both `index.html` and `script.js`.

```bash
# 1. Checkout the branch
git checkout copilot/add-language-options

# 2. Fetch latest main
git fetch origin main

# 3. Rebase onto main (recommended for cleaner history)
git rebase origin/main

# OR use merge if rebase is too complex
# git merge origin/main

# 4. Resolve conflicts in index.html and script.js
# Focus on:
# - Translation system additions
# - Language selector UI
# - Day name normalization

# 5. After resolving conflicts
git add .
git rebase --continue  # if rebasing
# OR
# git commit -m "Merge main into add-language-options"  # if merging

# 6. Push the updated branch
git push origin copilot/add-language-options --force-with-lease  # if rebased
# OR
# git push origin copilot/add-language-options  # if merged
```

**Expected Conflicts:** More substantial since this PR is older and modifies multiple files.

## Conflict Resolution Tips

### For script.js conflicts:
- PR #14 adds extensive error handling (try-catch blocks)
- PR #9 adds translation system (`t()` function, language management)
- When merging, ensure both sets of changes are preserved
- Error handling should wrap translation calls too

### For index.html conflicts:
- PR #9 adds language selector UI and data-i18n attributes
- Ensure new UI elements are properly integrated
- Check that all translated text has appropriate data-i18n attributes

## Testing After Resolution

After resolving conflicts, test that:

1. **For PR #14:**
   - Application loads without console errors
   - localStorage operations handle errors gracefully
   - Theme switching works correctly
   - No memory leaks in confetti animation

2. **For PR #9:**
   - Language switching works (German and English)
   - All UI text is properly translated
   - Existing rules work with both languages
   - Language preference persists across reloads

## Alternative: Use GitHub UI

If command-line conflict resolution is complex:

1. Navigate to the PR on GitHub
2. Click the "Resolve conflicts" button (if available)
3. Use GitHub's web editor to resolve conflicts
4. Commit the resolution directly through GitHub

## Questions?

If you encounter issues during resolution, check:
- The diff view for each PR to understand the changes
- Recent commits on main to see what changed
- This guide for specific resolution strategies

---
*Generated to assist with resolving merge conflicts in PR #14 and PR #9*
