const core = require("@actions/core");
const github = require("@actions/github");
const { Issue, IssueComment } = require("./singleton")
const { verifyTriageTeam } = require("./utils")

/**
 * This function will be only run if
 * - Event is `issue_comment` and action is `created`
 * - The messgae is `/assign`
 * - The issue is not closed
 *
 * This function will:
 * - `/unassign @user1` : Can only be used by core-members of the organization. Unassigns the issue to user1 
 * - `/unassign` : Assign the issue to the commenter
 * - prevent new assignees, if the MAX_ASSIGNEE has been reached
 * 
 *
 * @export
 * @typedef {import('@octokit/core').Octokit & import("@octokit/plugin-rest-endpoint-methods/dist-types/types").Api & { paginate: import("@octokit/plugin-paginate-rest").PaginateInterface; }} octokit
 * @param {octokit} octokit - Octokit instance
 * @returns {Promise<void>}
 */

async function slash_assign( octokit ) {

    const issue = await Issue.getInstance();
    if (issue.actions_payload.state == "closed") {
        core.info("Issue is closed, no action needed");
        return;
    }
    if (github.context.eventName === "issue_comment" && github.context.payload.action === "created") {
        const issue_comment = await IssueComment.getInstance();
        const issue_comment_body = (issue_comment.details.body ?? "").trim();
        if((issue_comment_body).trim().startsWith("/unassign")) {
            // const max_assignee_count = core.getInput("max-assignee-count", { required: true });
            const issue_labels = issue.details.labels;
            let max_assignee_count = 1;
            for(let i=0; i<issue_labels.length; i++) {
                const label_name = issue_labels[i].name;
                if(label_name.startsWith("max-assignee")) {
                    max_assignee_count = parseInt(label_name.split("max-assignee-")[1]);
                    max_assignee_count = (max_assignee_count === NaN) ? 1 : max_assignee_count;
                    break;
                }
            }

            if(issue_comment_body === "/unassign") {
                // self-unassign --done
                try {
                    const res = await octokit.rest.issues.removeAssignees({
                        owner: github.context.payload.repository.owner.login,
                        repo: github.context.payload.repository.name,
                        issue_number: issue.actions_payload.number,
                        assignees: [github.context.actor]
                    });

                    if(res.status === 200) {
                        core.info("User unassigned(self) to the issue");
                    } else {
                        core.setFailed("Failed to unassign(self) user to the issue");
                    }                                    
                } catch (error) {
                    core.setFailed(error.message);
                }
                return;
            }
            if(verifyTriageTeam()) {
                // unassign to other contributors
                let assignees_to_remove = issue_comment_body.substring(9).split("@").map(e => e.trim())
                assignees_to_remove.shift()

                try {
                    const res = await octokit.rest.issues.removeAssignees({
                        owner: github.context.payload.repository.owner.login,
                        repo: github.context.payload.repository.name,
                        issue_number: issue.actions_payload.number,
                        assignees: assignees_to_remove
                    });

                    if(res.status === 200) {
                        // TODO: issue.assignees - res.assignees -> success
                        core.info("Users unassigned to the issue");
                    } else {
                        core.setFailed("Failed to unassign user to the issue");
                    }                                
                } catch (error) {
                    core.setFailed(error.message);
                }
            }    
        }
    }
}

module.exports = slash_assign;