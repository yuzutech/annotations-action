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

    const checks = await octokit.checks.listForRef({
        owner,
        repo,
        ref,
        status: "in_progress"
    });

    console.log("CHECKS", checks);

    //reports.forEach(async (report) => {
    //  console.log(report);
    //});

  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
