import { GithubApiClient } from './github/GithubApiClient';
import { GithubApiManager } from './github/GithubApiManager';
import { logger, setLoggerLevel } from './utils/logger';

/**
 * FIXME good description
 */
interface GitHubActionsRunnerOptions {
    token: string;
    owner: string;
    repo: string;
    verbose?: boolean;
}

/**
 * FIXME good description
 */
export class GitHubActionsRunner {
    private githubApiManager: GithubApiManager;

    private readonly owner: string;

    private readonly repo: string;

    /**
     *
     * @param token
     * @param owner
     * @param repo
     * @param verbose
     */
    constructor({
        token,
        owner,
        repo,
        verbose,
    }: GitHubActionsRunnerOptions) {
        this.owner = owner;
        this.repo = repo;
        this.githubApiManager = new GithubApiManager(new GithubApiClient(token, owner, repo));
        if (verbose) {
            setLoggerLevel('debug');
        }
    }

    /**
     *
     * @param owner
     * @param branch
     */
    async runAction({
        branch,
        workflow,
        rev,
        artifactsPath,
        commitTimeoutMs,
        branchTimeoutMs,
    }: {
        // FIXME extract this type to the interfaces
        branch: string;
        workflow: string;
        rev: string,
        commitTimeoutMs: number,
        branchTimeoutMs: number,
        artifactsPath?: string,
    }): Promise<void> {
        logger.info(`Starting action for repository "${this.owner}/${this.repo}"`);
        logger.info(`Workflow: "${workflow}"`);
        logger.info(`Revision: "${rev}"`);
        logger.info(`Branch: "${branch}"`);
        logger.info(`Artifacts path: "${artifactsPath}"`);

        // TODO wait for the tag, not sure if we need this
        await this.githubApiManager.waitForCommit(rev, commitTimeoutMs);
        await this.githubApiManager.waitForBranch(branch, branchTimeoutMs);

        const customWorkflowRunId = await this.githubApiManager.triggerWorkflow(workflow, branch);
        await this.githubApiManager.waitForWorkflowRunCreation(branch, customWorkflowRunId);
        const workflowRun = await this.githubApiManager.waitForWorkflowRunCompletion(branch, customWorkflowRunId);

        if (!workflowRun) {
            throw new Error('Workflow run not found.');
        }

        if (artifactsPath) {
            await this.githubApiManager.downloadArtifacts(workflowRun, artifactsPath);
        }
    }
}
