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
