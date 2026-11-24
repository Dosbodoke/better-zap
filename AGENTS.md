# Agent notes

## GitHub account

Use the `Dosbodoke` GitHub account for this repository: pushes, pull requests,
reviews and any other `gh` command. Other accounts logged in to `gh` (such as a
work account) are not collaborators here, so GitHub rejects their requests.

If `Dosbodoke` is not the active `gh` account, pass its token for the command
instead of switching the active account:

```sh
GH_TOKEN="$(gh auth token --user Dosbodoke)" gh pr create ...
```

## Code comments

Source files have no comments. `pnpm lint:comments` fails CI on new ones.
Record a non-obvious decision in `docs/adr` instead (see
`docs/adr/0001-no-code-comments.md`), and use the `/delete-comment` skill to
clear comments that are left.
