import * as core from "@actions/core";
import * as github from "@actions/github";
import {validateSubscription} from "./subscription";

type DeploymentState =
  | "error"
  | "failure"
  | "inactive"
  | "in_progress"
  | "queued"
  | "pending"
  | "success";

async function run() {
  try {
    await validateSubscription();
    const context = github.context;

    const prStringInput = core.getInput("pr", {
      required: false
    });
    const pr: boolean = prStringInput === "true";

    const pr_id = core.getInput("pr_id", {required: false}) || 0;

    const logUrl = pr ? `https://github.com/${context.repo.owner}/${context.repo.repo}/pull/${pr_id}/checks` : `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${context.sha}/checks`;

    const token = core.getInput("token", { required: true });
    const ref = core.getInput("ref", { required: false }) || context.ref;
    const url = core.getInput("target_url", { required: false }) || logUrl;
    const payload = { web_url: url };
    const environment = core.getInput("environment", { required: false }) || "production";
    const description = core.getInput("description", { required: false });
    const initialStatusInput = core.getInput("initial_status", { required: false }) || "pending";
    const validStates: DeploymentState[] = ["error", "failure", "inactive", "in_progress", "queued", "pending", "success"];
    if (!validStates.includes(initialStatusInput as DeploymentState)) {
      throw new Error(`Invalid initial_status: "${initialStatusInput}". Must be one of: ${validStates.join(", ")}`);
    }
    const initialStatus = initialStatusInput as DeploymentState;
    const autoMergeStringInput = core.getInput("auto_merge", {
      required: false
    });
    const transientEnvironmentStringInput = core.getInput("transient_environment", {
      required: false
    });

    const auto_merge: boolean = autoMergeStringInput === "true";
    const transient_environment: boolean = transientEnvironmentStringInput === "true";

    const client = github.getOctokit(token);

    const deployment = await client.rest.repos.createDeployment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: ref,
      payload,
      required_contexts: [],
      environment,
      transient_environment,
      auto_merge,
      description
    });

    if (!('id' in deployment.data)) {
      throw new Error(`Deployment not created: ${deployment.data.message}`);
    }

    await client.rest.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deployment.data.id,
      state: initialStatus,
      log_url: logUrl,
      environment_url: url,
      description
    });

    core.setOutput("deployment_id", deployment.data.id.toString());
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    core.error(err);
    core.setFailed(err.message);
  }
}

run();
