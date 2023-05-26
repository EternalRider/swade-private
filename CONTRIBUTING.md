# Contributing to Savage Worlds Adventure Edition

[[_TOC_]]

Code and content contributions are accepted. Please feel free to submit issues to the issue tracker or submit merge requests for code/content changes. Approval for such requests involves code and (if necessary) design review by the Maintainers of this repo. If you have any questions or concerns feel free to reach out to us on the following channels:

- The `#swade` channel on the [Foundry VTT Discord server](https://discord.gg/foundryvtt)
- The `#swade-dev` channel on the [League of Extraordinary FVTT Developers](https://discord.gg/fvttdevleague)

Please ensure there is an open issue about whatever contribution you are submitting. Please also ensure your contribution does not duplicate an existing one.

## Issues

Before submitting an issue, please check your issue isn't a duplicate of an existing issue (please make sure to also check closed issues, as work which handles an issue can close it, even if it is not yet released). Issues which are assigned to a milestone are considered a higher priority for implementation, however milestones are not permanent and issues may be reassigned or pushed out of milestones at any time.

### Bugs

Before submitting a bug report please make sure you fulfill the following guidelines:

- Make sure bugs are reproducible without any active modules. If a bug only occurs with active modules we ask you to talk to the module author first. If it is something we can help with the module author can contact us via the channels mentioned above.
- Provide hosting details as they may be relevant.
- Provide clear instructions on how to reproduce the issue as well as Expected vs Actual outcome.

## Tooling and setup

SWADE is built on a foundation of [TypeScript](https://www.typescriptlang.org/) and leverages [rollup.js](https://rollupjs.org/) to handle all relevant build tasks.

### Prerequisite Software

- [Git](https://git-scm.com/)
- [Node.js LTS](https://nodejs.org)
- A code editor of your choice, we recommend [Visual Studio Code](https://code.visualstudio.com/)

### Setup

From inside the cloned repository folder run the following command to install the necessary dependencies.

```
npm ci
```

#### Linking the build artifacts to your Foundry install

To link your foundry install with the build output follow these steps:

- Copy the `example-foundryconfig.json` and rename it `foundryconfig.json`
- Set the `dataPath` property in the `foundryconfig.json` to the absolute path of your foundry user data.
  - Windows paths need to be escaped, which is easily done by doubling up the backslashes so `C:\Users\MyUser` becomes `C:\\Users\\MyUser`
- Run `npm run link-project` to link the build output directory to your foundry install.
  - The symlinking process may require admin privileges on windows.

### Building from source

Once you have linked the project to your foundry install you can start the build process in watch mode by running either

```
npm run build:watch
```

or

```
nm run build:watch
```

for a one-time build

**Note:** For an improved developer experienceIt is recommended that you also enable the _Hot-Reload Package Files_ option in your Foundry application configuration, which can be found in the setup screen.

### Building Compendium Packs

To build compendium packs all that is needed is to run

```
npm run build:packs
```

Please make sure that foundry is **NOT** running when building packs or the process will fail.

## Issues

Before submitting an issue, please check your issue isn't a duplicate of an existing issue (please make sure to also check closed issues, as work which handles an issue can close it, even if it is not yet released). Issues which are assigned to a milestone are considered a higher priority for implementation, however milestones are not permanent and issues may be reassigned or pushed out of milestones at any time.

### Bugs

Before submitting a bug report please make sure you fulfill the following guidelines:

- Make sure bugs are reproducible without any active modules. If a bug only occurs with active modules we ask you to talk to the module author first. If it is something we can help with the module author can contact us via the channels mentioned above.
- Provide hosting details as they may be relevant.
- Provide clear instructions on how to reproduce the issue as well as Expected vs Actual outcome.

## Code

To contribute code to the repository please first [fork the repository](https://docs.gitlab.com/ee/user/project/repository/forking_workflow.html) and submit a [merge request](https://docs.gitlab.com/ee/user/project/repository/forking_workflow.html#merge-changes-back-upstream)

### Style

Please follow the code-style and linting guidelines set by the project. To this end the project provides extensive ESLint and prettier rules. All linting issues and warnings should be resolved before submitting an MR.

- `npm run lint` - Run the linter and display any found issues
- `npm run lint:fix` - Attempts to fix code style issues.

### Linked Issues

Before submitting an MR please open a feature request issue. This will let us discuss your approach, prioritization and whether the suggested change should come to the system in the first place.

In case you want to work on an existing issue, leave a comment indicating that you are going to work on that issue to let the maintainers and other contributors know and to avoid duplicate work. If an issue is already assigned to somebody then a team member has announced they are working on it.

When submitting your MR we request that you include a link to the open issue by putting something like ths into the description:

```
Closes #42
```

### Reviews

Please be aware of the fact that reviewing contributions is a significant amount of effort and that our resources are limited.

#### MR Size

Please understand that large MRs can be exceptionally difficult to review. If possible, please break larger feature contributions down into smaller MRs that build on top of each other, even if multiple MRs are required for a single issue. This will make it easier and more likely for your contributions to be reviewed and merged in a timely fashion.
