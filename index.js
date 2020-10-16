const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs').promises

const ANNOTATION_LEVELS = ['notice', 'warning', 'failure']

class GitHubApiError extends Error {
  constructor (message) {
    super(message)
    this.name = "GitHubApiError"
  }
}

const batch = (size, inputs) => inputs.reduce((batches, input) => {
  const current = batches[batches.length - 1]

  current.push(input)

  if (current.length === size) {
    batches.push([])
  }

  return batches
}, [[]])

const createCheck = async function (octokit, owner, repo, title, ref) {
  try {
    const { data: { id: checkRunId } } = await octokit.checks.create({
      owner,
      repo,
      name: title,
      head_sha: ref,
      status: 'in_progress',
    })
    return checkRunId
  } catch (err) {
    throw new GitHubApiError(`Unable to create a check, please make sure that the provided 'repo-token' has write permissions to ${owner}/${repo} - cause: ${err}`)
  }
}

const updateCheck = async function (octokit, owner, repo, checkRunId, conclusion, title, summary, annotations) {
  try {
    await octokit.checks.update({
      owner,
      repo,
      check_run_id: checkRunId,
      status: 'completed',
      conclusion,
      output: {
        title,
        summary,
        annotations
      }
    })
  } catch (err) {
    throw new GitHubApiError(`Unable to update check {owner: "${owner}", repo: "${repo}", check_run_id: ${checkRunId}} - cause: ${err}`)
  }
}

const stats = function (annotations) {
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
  return { failureCount, warningCount, noticeCount }
}

const summary = function (failureCount, warningCount, noticeCount) {
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
  return messages.join('\n')
}

const conclusion = function (failureCount, warningCount, noticeCount) {
  let conclusion = 'success'
  if (failureCount > 0) {
    conclusion = 'failure'
  } else if (warningCount > 0 || noticeCount > 0) {
    conclusion = 'neutral'
  }
  return conclusion
}

async function run () {
  try {
    const repoToken = core.getInput('repo-token', { required: true })
    const inputPath = core.getInput('input', { required: true })
    const title = core.getInput('title', { required: false })

    const octokit = new github.getOctokit(repoToken)
    const ref = github.context.sha
    const owner = github.context.payload.repository.owner.name
    const repo = github.context.payload.repository.name

    const inputContent = await fs.readFile(inputPath, 'utf8')
    const annotations = JSON.parse(inputContent)
    const checkRunId = await createCheck(octokit, owner, repo, title, ref)
    const { failureCount, warningCount, noticeCount } = stats(annotations)
    const summary = summary(failureCount, warningCount, noticeCount)
    const conclusion = conclusion(failureCount, warningCount, noticeCount)

    // The GitHub API requires that annotations are submitted in batches of 50 elements maximum
    const batchedAnnotations = batch(50, annotations)
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
      await updateCheck(octokit, owner, repo, checkRunId, conclusion, title, summary, annotations)
    }
  } catch (error) {
    core.setFailed(error)
  }
}

run()
