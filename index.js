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
    const repoToken = core.getInput('repo-token', { required: true })
    const octokit = new github.getOctokit(repoToken)

    const inputPath = core.getInput('input', { required: true })
    const ref = github.context.sha
    const owner = github.context.payload.repository.owner.name
    const repo = github.context.payload.repository.name
    const title = 'annotations'

    const inputContent = await fs.readFile(inputPath, 'utf8')
    const annotations = JSON.parse(inputContent)

    const { data: { id: checkRunId } } = await octokit.checks.create({
      owner,
      repo,
      name: title,
      head_sha: ref,
      status: 'in_progress',
    })

    const annotationsPerLevel = annotations.reduce((acc, annotation) => {
      const level = annotation.annotation_level
      let annotations
      if (level in acc) {
        annotations = acc[level]
      } else {
        annotations = []
        acc[level] = annotations
      }
      annotations.push(annotation)
      return acc
    }, {})
    const failureCount = (annotationsPerLevel['failure'] || []).length || 0
    const warningCount = (annotationsPerLevel['warning'] || []).length || 0
    const noticeCount = (annotationsPerLevel['notice'] || []).length || 0
    const messages = []
    if (failureCount > 0) {
      messages.push(`${failureCount} failure(s) found`)
    }
    if (warningCount > 0) {
      messages.push(`${warningCount} warning(s) found`)
    }
    if (noticeCount > 0) {
      messages.push(`${noticeCount} notice(s) found`)
    }
    let conclusion = 'success'
    if (failureCount > 0) {
      conclusion = 'failure'
    } else if (warningCount > 0 || noticeCount > 0) {
      conclusion = 'neutral'
    }

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
        output: {
          title,
          status: 'completed',
          conclusion,
          summary: messages.join('\n'),
          annotations
        }
      })
    }
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
