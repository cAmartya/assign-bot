const core = require('@actions/core');
const github = require('@actions/github');

const slash_assign = require("./slash_assign")
const slash_unassign = require("./slash_unassign")

const run = async () => {
    const token = core.getInput('token', { required: true });
    const octokit = github.getOctokit(token);

    // Set some global variables
    globalThis.octokit = octokit;

    // List all the triggers here
    await Promise.all([
        slash_assign(octokit),
        slash_unassign(octokit)
    ]);
}

// Run the main function
async function main() {
    try {
        await run();
    } catch (error) {
        core.setFailed(error.message);
    }
}

// Run the script
main();