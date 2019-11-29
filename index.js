const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs').promises;


// most @actions toolkit packages have async methods
async function run() {
  try { 
    const reportPath = core.getInput('reportPath');

    const reportContent = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportContent);

    console.log(report);

  } 
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
