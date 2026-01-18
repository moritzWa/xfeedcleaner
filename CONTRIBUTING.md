# Contributing

Thanks for your interest in contributing to XFeedCleaner!

Please take a moment to review this document before submitting your first pull request. Also check for open issues and pull requests to see if someone else is working on something similar.

If you need any help, feel free to open an issue.

## Structure

This repository consists of two main parts:

```
.
├── landing          # The landing page website
│   ├── src
│   │   ├── app     # Next.js application
│   └── ...
└── extension       # The browser extension
    ├── src         # Extension source code
    └── ...
```

## Development

### Fork this repo

You can fork this repo by clicking the fork button in the top right corner of this page.

### Clone on your local machine

```bash
git clone https://github.com/your-username/xfeedcleaner.git
```

### Navigate to project directory

```bash
cd xfeedcleaner
```

### Create a new Branch

```bash
git checkout -b my-new-branch
```

### Landing Page Development

Navigate to the landing directory and install dependencies:

```bash
cd landing
npm install
```

Run the development server:

```bash
npm run dev
```

### Extension Development

Navigate to the extension directory and install dependencies:

```bash
cd extension
npm install
```

Build the extension:

```bash
npm run build
```

To load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` directory

## Commit Convention

Before you create a Pull Request, please check whether your commits comply with
the commit conventions used in this repository.

When you create a commit we kindly ask you to follow the convention
`category(scope or module): message` in your commit message while using one of
the following categories:

- `feat / feature`: all changes that introduce completely new code or new
  features
- `fix`: changes that fix a bug (ideally you will additionally reference an
  issue if present)
- `refactor`: any code related change that is not a fix nor a feature
- `docs`: changing existing or creating new documentation
- `build`: all changes regarding the build of the software, changes to
  dependencies or the addition of new dependencies
- `test`: all changes regarding tests
- `ci`: all changes regarding the configuration of continuous integration
- `chore`: all changes to the repository that do not fit into any of the above
  categories

  e.g. `feat(extension): add thread-aware filtering`
