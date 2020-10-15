# Annotations Action

[![GitHub Action badge](https://github.com/yuzutech/annotations-action/workflows/test-local/badge.svg)](https://github.com/yuzutech/annotations-action/actions?query=workflow%3Atest-local)

This action creates annotations from a JSON file.

In order to use this action, you will need to generate a JSON file using the following format:

```js
[
  {
    file: "path/to/file.js",
    line: 5,
    message: "my message",
    title: "title for my annotation",
    annotation_level: "failure"
  }
]
```

## Inputs

### `repo-token`

**Required** Path to a JSON file which contains a list of annotations
  
  
### `input`

**Required** Path to a JSON file which contains a list of annotations
  
## Example usage

```yml
- name: Annotate
uses: yuzutech/annotations-action@v0.1.0
with:
  repo-token: "${{ secrets.GITHUB_TOKEN }}"
  input: './annotations.json'
```

