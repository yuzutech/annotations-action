const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs').promises;


async function run() {
  try { 
    const ghToken = core.getInput("githubToken");
    const octokit = new github.GitHub(ghToken);

    const reportPath = core.getInput('reportPath');
    const ref = github.context.sha;
    const owner = github.context.payload.repository.owner.name;
    const repo = github.context.payload.repository.name;
    const workflow = github.context.workflow;
    const check_run = process.env.GITHUB_WORKFLOW;

    const reportContent = await fs.readFile(reportPath, 'utf8');
    const reports = JSON.parse(reportContent);

    const { data: { check_runs: [{ id: check_run_id }] } } = await octokit.checks.listForRef({
        owner,
        repo,
        ref,
        check_run,
        status: "in_progress"
    });

    //The Github Checks API requires that Annotations are not submitted in batches of more than 50
    const batchedReports = batchIt(50, reports);

    batchedReports.forEach(async (reports) => {

      const annotations = reports.map(r => ({ 
        path: r.file, 
        start_line: r.line, 
        end_line: r.line, 
        annotation_level: "failure", 
        message: r.message,
        title: r.title
      }));

      await octokit.checks.update({
        owner,
        repo,
        check_run_id,
        output: { title: `${workflow} Check Run`, summary: `${annotations.length} errors(s) found`, annotations }
      });
    });
  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()


const batchIt = (size, inputs) => inputs.reduce((batches, input) => {
  const current = batches[batches.length - 1];

  current.push(input);

  if (current.length == size) {
    batches.push([]);
  }

  return batches;
}, [[]]);
