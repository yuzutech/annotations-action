const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs').promises;


async function run() {
  try { 
    const ghToken = core.getInput("githubToken");
    console.log(github.context);
    const octokit = github.GitHub(ghToken);
    const reportPath = core.getInput('reportPath');

    const reportContent = await fs.readFile(reportPath, 'utf8');
    const reports = JSON.parse(reportContent);

    reports.forEach(async (report) => {
      console.log(report);
    });

  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
