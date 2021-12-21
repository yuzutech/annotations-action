import { getInput, info, setFailed } from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { promises as fs } from 'fs'

const ANNOTATION_LEVELS = ['notice', 'warning', 'failure']

class GitHubApiUnauthorizedError extends Error {
  constructor (message) {
    super(message)
    this.name = 'GitHubApiUnauthorizedError'
  }
}

class GitHubApiError extends Error {
  constructor (message) {
    super(message)
    this.name = 'GitHubApiError'
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
  info(`Creating check {owner: '${owner}', repo: '${repo}', name: ${title}}`)
  try {
    const { data: { id: checkRunId } } = await octokit.rest.checks.create({
      owner,
      repo,
      name: title,
      head_sha: ref,
      status: 'in_progress'
    })
    return checkRunId
  } catch (err) {
    if (err.message === 'Resource not accessible by integration') {
      throw new GitHubApiUnauthorizedError(`Unable to create a check, please make sure that the provided 'repo-token' has write permissions to '${owner}/${repo}' - cause: ${err}`)
    }
    throw new GitHubApiError(`Unable to create a check to '${owner}/${repo}' - cause: ${err}`)
  }
}

const updateCheck = async function (octokit, owner, repo, checkRunId, conclusion, title, summary, annotations) {
  info(`Updating check {owner: '${owner}', repo: '${repo}', check_run_id: ${checkRunId}}`)
  try {
    await octokit.rest.checks.update({
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
    throw new GitHubApiError(`Unable to update check {owner: '${owner}', repo: '${repo}', check_run_id: ${checkRunId}} - cause: ${err}`)
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
  const failureCount = (annotationsPerLevel.failure || []).length || 0
  const warningCount = (annotationsPerLevel.warning || []).length || 0
  const noticeCount = (annotationsPerLevel.notice || []).length || 0
  return { failureCount, warningCount, noticeCount }
}

const generateSummary = function (failureCount, warningCount, noticeCount) {
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

const generateConclusion = function (failureCount, warningCount, noticeCount) {
  let conclusion = 'success'
  if (failureCount > 0) {
    conclusion = 'failure'
  } else if (warningCount > 0 || noticeCount > 0) {
    conclusion = 'neutral'
  }
  return conclusion
}

const booleanValue = function (input) {
  return /^\s*(true|1)\s*$/i.test(input)
}

const readAnnotationsFile = async function (inputPath) {
  const ignoreMissingFileValue = getInput('ignore-missing-file', { required: false }) || 'true'
  const ignoreMissingFile = booleanValue(ignoreMissingFileValue)
  try {
    const inputContent = await fs.readFile(inputPath, { encoding: 'utf8' })
    return JSON.parse(inputContent)
  } catch (err) {
    if (err.code === 'ENOENT' && ignoreMissingFile) {
      info(`Ignoring missing file at '${inputPath}' because 'ignore-missing-file' is true`)
      return null
    } else {
      throw err
    }
  }
}

async function run () {
  try {
    const repoToken = getInput('repo-token', { required: true })
    const inputPath = getInput('input', { required: true })
    const title = getInput('title', { required: false })

    const octokit = getOctokit(repoToken)
    const pullRequest = context.payload.pull_request
    let ref
    if (pullRequest) {
      ref = pullRequest.head.sha
    } else {
      ref = context.sha
    }
    const owner = context.repo.owner
    const repo = context.repo.repo

    const annotations = await readAnnotationsFile(inputPath)
    if (annotations === null) {
      return
    }
    const checkRunId = await createCheck(octokit, owner, repo, title, ref)
    const { failureCount, warningCount, noticeCount } = stats(annotations)
    info(`Found ${failureCount} failure(s), ${warningCount} warning(s) and ${noticeCount} notice(s)`)
    const summary = generateSummary(failureCount, warningCount, noticeCount)
    const conclusion = generateConclusion(failureCount, warningCount, noticeCount)

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
          ...annotation,
          annotation_level: annotationLevel
        }
      })
      await updateCheck(octokit, owner, repo, checkRunId, conclusion, title, summary, annotations)
    }
  } catch (error) {
    const ignoreUnauthorizedErrorValue = getInput('ignore-unauthorized-error', { required: false }) || 'false'
    const ignoreUnauthorizedError = booleanValue(ignoreUnauthorizedErrorValue)
    if (error.name === 'GitHubApiUnauthorizedError' && ignoreUnauthorizedError) {
      info(`Ignoring the following unauthorized error because 'ignore-unauthorized-error' is true: ${error}`)
      return
    }
    setFailed(error)
  }
}

run()
