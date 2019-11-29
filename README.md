<p align="center">
  <a href="https://github.com/ssboisen/test-annotations-action"><img alt="GitHub Actions status" src="https://github.com/ssboisen/test-annotations-action/workflows/test-local/badge.svg"></a>
</p>

# Test Failure Annotation Creator

This action adds annotations based on a input json file which contains tests that have failed.

In order to use this action you need a test reporter for your test framework that reports test failures on the format:

```
[{
	file: "path/to/file.js",
	line: 5,
	message: "my test error message",
	title: "title for my annotation"
}]
```
