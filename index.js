const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs').promises

const batchIt = (size, inputs) => inputs.reduce((batches, input) => {
  const current = batches[batches.length - 1]

  current.push(input)

  if (current.length === size) {
    batches.push([])
  }

  return batches
}, [[]])

const ANNOTATION_LEVELS = ['notice', 'warning', 'failure']

async function run () {
  try {
    const repoToken = core.getInput('repo-token')
    const octokit = new github.GitHub(repoToken)

    const inputPath = core.getInput('input')
    const ref = github.context.sha
    const owner = github.context.payload.repository.owner.name
    const repo = github.context.payload.repository.name
    const workflow = github.context.workflow
    const checkRun = process.env.GITHUB_WORKFLOW

    const inputContent = await fs.readFile(inputPath, 'utf8')
    const annotations = JSON.parse(inputContent)

    const { data: { check_runs: [{ id: checkRunId }] } } = await octokit.checks.listForRef({
      owner,
      repo,
      ref,
      check_run: checkRun,
      status: 'in_progress'
    })

    // The GitHub API requires that annotations are submitted in batches of 50 elements maximum
    const batchedAnnotations = batchIt(50, annotations)

    for (const batch of batchedAnnotations) {
      const annotations = batch.map(annotation => {
        let annotationLevel
        if (ANNOTATION_LEVELS.includes(annotation.annotation_level)) {
          annotationLevel = annotation.annotation_level
        } else {
          annotationLevel = 'failure'
        }
        return {
          path: annotation.file,
          start_line: annotation.line,
          end_line: annotation.line,
          annotation_level: annotationLevel,
          message: annotation.message,
          title: annotation.title
        }
      })

      await octokit.checks.update({
        owner,
        repo,
        check_run_id: checkRunId,
        output: { title: `${workflow} Check Run`, summary: `${annotations.length} errors(s) found`, annotations }
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
