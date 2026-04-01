# Annotations Action

[![GitHub Action badge](https://github.com/yuzutech/annotations-action/workflows/test-local/badge.svg)](https://github.com/yuzutech/annotations-action/actions?query=workflow%3Atest-local)

This action creates annotations from a JSON file.

In order to use this action, you will need to generate a JSON file using the following format (all options from https://docs.github.com/en/free-pro-team@latest/rest/reference/checks#annotations-items are also supported and it's recommended to use them):

```js
[
  {
    file: "path/to/file.js",
    line: 5,
    title: "title for my annotation",
    message: "my message",
    annotation_level: "failure"
  }
]
```

## Permissions

It is possible you have a `GITHUB_TOKEN` with restricted access by default, in which case you might get the following error:

```
Error: GitHubApiUnauthorizedError: Unable to create a check, please make sure that the provided 'repo-token' has write permissions to 'your/repo' - cause: HttpError: Resource not accessible by integration
```

You need to provide the `checks` write permission:

```yaml
permissions:
  checks: write
```

You can use `permissions` either as a top-level key, to apply to all jobs in the workflow, or within specific jobs.
When you add the permissions key within a specific job, all actions and run commands within that job that use the `GITHUB_TOKEN` gain the access rights you specify.

**IMPORTANT**: Setting a `permissions` field will disable all omitted permissions, like the `contents: read`, which is needed to clone and read your repository.

You can learn more about `GITHUB_TOKEN` permissions at: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token

## Inputs

### `repo-token`

**Required** Token used to interact with the GitHub API.

### `input`

**Required** Path to a JSON file which contains a list of annotations.

### `title`

**Optional** Title of the check. Default: "check".

### `ignore-unauthorized-error`

**Optional** Ignore errors when the provided repo-token does not have write permissions. Default: "false".

### `ignore-missing-file`

**Optional** Ignore if the file which contains annotations is missing. Default: "true".

### `commit`

**Optional** Commit SHA to which annotations are published.

## Example usage

```yml
- name: Annotate
  uses: yuzutech/annotations-action@v0.4.0
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
    title: 'lint'
    input: './annotations.json'
```

