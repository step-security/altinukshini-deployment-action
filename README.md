[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# altinukshini-deployment-action

A GitHub action to create [Deployments](https://developer.github.com/v3/repos/deployments/) as part of your GitHub CI workflows.

## Action inputs

| name             | description                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr`             | (optional - default is `false`) If Deployment is being created from a PR |
| `pr_id`          | (optional) Pass the PR ID to this param if `pr` is set to "true"         |
| `transient_environment` | (optional - default is `false`) Set this deployment as transient  |
| `initial_status` | (Optional) Initial status for the deployment. Must be one of the [accepted strings](https://developer.github.com/v3/repos/deployments/#create-a-deployment-status)                                                                                                                                                                                                                                            |
| `token`          | GitHub token                                                                                                                                                                                                                                                                                                                                                                                                  |
| `target_url`     | (Optional) The target URL. This should be the URL of the app once deployed                                                                                                                                                                                                                                                                                                                                    |
| `description`    | (Optional) A description to give the environment                                                                                                                                                                                                                                                                                                                                                              |
| `auto_merge`     | (Optional - default is `false`) Whether to attempt to auto-merge the default branch into the branch that the action is running on if set to `"true"`. More details in the [GitHub deployments API](https://developer.github.com/v3/repos/deployments/#parameters-1). Warning - setting this to `"true"` has caused this action to fail in some cases |
| `ref`            | (Optional) The ref to deploy. This can be a branch, tag, or SHA. More details in the [GitHub deployments API](https://developer.github.com/v3/repos/deployments/#parameters-1). |

## Action outputs

| name            | description                                            |
| --------------- | ------------------------------------------------------ |
| `deployment_id` | The ID of the deployment as returned by the GitHub API |

## Example usage

```yaml
name: Deploy

on: [push]

jobs:
  deploy:
    name: Deploy my app

    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7

      - uses: step-security/altinukshini-deployment-action@v1
        name: Create GitHub deployment
        id: deployment
        with:
          token: "${{ github.token }}"
          target_url: http://my-app-url.com
          environment: production
        # more steps below where you run your deployment scripts inside the same action
```

## Notes

Heads up! Currently, there is a GitHub Actions limitation where events fired _inside_ an action will not trigger further workflows. If you use this action in your workflow, it will **not trigger** any "Deployment" workflows. Thanks to @rclayton-the-terrible for finding a workaround for this:

> While not ideal, if you use a token that is not the Action's GITHUB_TOKEN, this will work. I define a secret called GITHUB_DEPLOY_TOKEN and use that for API calls.

A workaround for this is to create the Deployment, perform the deployment steps, and then trigger an action to create a Deployment Status using [step-security/deployment-status](https://github.com/step-security/deployment-status) action.

For example:

```yaml
name: Deploy

on: [push]

jobs:
  deploy:
    name: Deploy my app

    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v7

      - uses: step-security/altinukshini-deployment-action@v1
        name: Create GitHub deployment
        id: deployment
        with:
          token: "${{ github.token }}"
          target_url: http://my-app-url.com
          environment: production

      - name: Deploy my app
        run: |
          # add your deployment code here

      - name: Update deployment status (success)
        if: success()
        uses: step-security/deployment-status@v2
        with:
          token: "${{ github.token }}"
          target_url: http://my-app-url.com
          state: "success"
          deployment_id: ${{ steps.deployment.outputs.deployment_id }}

      - name: Update deployment status (failure)
        if: failure()
        uses: step-security/deployment-status@v2
        with:
          token: "${{ github.token }}"
          target_url: http://my-app-url.com
          state: "failure"
          deployment_id: ${{ steps.deployment.outputs.deployment_id }}
```
