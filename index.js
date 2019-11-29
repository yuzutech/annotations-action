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

    const reportContent = await fs.readFile(reportPath, 'utf8');
    const reports = JSON.parse(reportContent);

    const { data: { check_runs: [check_run] } } = await octokit.checks.listForRef({
        owner,
        repo,
        ref,
        status: "in_progress"
    });
    console.log(check_run);
    const check_run_id = check_run.id;

    //The Github Checks API requires that Annotations are not submitted in batches of more than 50
    const batchedReports = batchIt(50, reports);

    batchedReports.forEach(async (reports) => {
      reports.forEach(r => r.file = "index.js");

      const annotations = reports.map(r => ({ 
        path: r.file, 
        start_line: r.line, 
        end_line: r.line, 
        annotation_level: "failure", 
        message: r.message,
        title: r.title
      }));

      const res = await octokit.checks.update({
        owner,
        repo,
        check_run_id,
        output: { ...check_run.output, annotations }
      });

      console.log("response", res);

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
