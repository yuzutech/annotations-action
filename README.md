<p align="center">
  <a href="https://github.com/ssboisen/test-annotations-action"><img alt="GitHub Actions status" src="https://github.com/Mogztter/annotations-action/workflows/test-local/badge.svg"></a>
</p>

# Annotations Action

This action creates annotations from a JSON file.

In order to use this action, you will need to generate a JSON file using the following format:

```js
[
  {
    file: "path/to/file.js",
    line: 5,
    message: "my message",
    title: "title for my annotation"
  }
]
```

## Inputs

### `input`

**Required** Path to a JSON file which contains a list of annotations
  
## Example usage

```yml
name: workflow
on: [push]
jobs:
  job:
    runs-on: ubuntu-18.04
    steps:
      - uses: actions/checkout@v1
      - name: Annotate
        uses: yuzutech/annotations-action@v0.1.0
        with:
          input: './annotations.json'
```

