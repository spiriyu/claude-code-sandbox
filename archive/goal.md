in this workspace we have 2 repositories
1. claude-code-sandbox-docker-hub
2. claude-code-sandbox-docker-cli

the goal is to create an image (run claude-code on sandbox container) 
and upload it to docker-hub so everyone could use it
and the second part is to create a CLI that will be deployed into npm as cli helper for this image
including all the information and scripts that will help the usage of the sandbox and made it more easy to understand and manage
(for example how to generate the ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN for using claude-code as needed)

lets create a plan directory that will have all the plan separated to multiple phases in different files
for example: plan/1_init_infra, plan/2_creating_dockerfile, etc...
and to maintain control on the progress i want you to make sure you keep a file called progress.md 
that will save the progress and summerize all phases that have been done and reference for the next phase need to be done

Before starting any task, ask clarifying questions to confirm you understand the intent correctly. 
Format questions as a numbered list (1, 2, 3, …). Each question must include four suggested answers labeled [A, B, C, D]. 
The user may select one or more answers, provide their own response, or combine both.


----