const core = require("@actions/core");
const github = require("@actions/github");

// verifies if the current commenter is a member of the triage-team
function verifyTriageTeam(){
    const triageTeamUsernames = core.getInput("triage-team-usernames").split(",");
    const actor = github.context.actor;
    return triageTeamUsernames.includes(actor);
}

module.exports = verifyTriageTeam