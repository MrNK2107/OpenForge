interface TemplateData {
  title: string;
  description: string;
  slug?: string;
  owner?: string;
  license: string;
  repoUrl?: string;
}

type FileGenerator = (data: TemplateData) => string;

interface Template {
  name: string;
  files: Record<string, FileGenerator>;
  starterIssues: Array<{ title: string; labels: string[] }>;
}

export const TEMPLATES: Record<string, Template> = {
  'web-app': {
    name: 'Web Application',
    files: {
      'README.md': (data) => `# ${data.title}

> ${data.description}

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

\`\`\`bash
git clone ${data.repoUrl || 'https://github.com/owner/repo.git'}
cd ${data.slug || 'project'}
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
\`\`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the ${data.license} License - see [LICENSE](LICENSE) for details.

---

*Built with [OpenForge](https://openforge.dev)*`,
      'CONTRIBUTING.md': (data) => `# Contributing to ${data.title}

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## How to Contribute

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## Development Setup

\`\`\`bash
# Install dependencies
npm install

# Run tests
npm test

# Lint
npm run lint
\`\`

## Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) format.`,
      'LICENSE': (data) => data.license === 'MIT' ? `MIT License

Copyright (c) ${new Date().getFullYear()} ${data.owner || 'Owner'}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.` : `Copyright (c) ${new Date().getFullYear()} ${data.owner || 'Owner'}

Licensed under the ${data.license} License.
See https://spdx.org/licenses/${encodeURIComponent(data.license)}.html for the full text.`,
      '.gitignore': () => `node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
coverage/
.vscode/
.idea/
*.swp
*.swo
~`,
      '.github/ISSUE_TEMPLATE/bug_report.md': () => `---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g., macOS]
 - Node version: [e.g., 18.0.0]

**Additional context**
Add any other context about the problem here.`,
      '.github/ISSUE_TEMPLATE/feature_request.md': () => `---
name: Feature request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.`,
      '.github/ISSUE_TEMPLATE/good_first_issue.md': () => `---
name: Good first issue
about: Suggest a beginner-friendly task
title: '[GOOD FIRST ISSUE] '
labels: good first issue
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the task is.

**Suggested solution**
Describe what needs to be done.

**Additional context**
Add any other context about the task here.`,
      '.github/PULL_REQUEST_TEMPLATE.md': () => `## Description

Please include a summary of the changes and the related issue.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes`,
      '.github/workflows/ci.yml': () => `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm test`,
    },
    starterIssues: [
      { title: 'Set up development environment', labels: ['good first issue'] },
      { title: 'Create basic project structure', labels: ['good first issue'] },
      { title: 'Write initial documentation', labels: ['docs'] },
    ],
  },
  cli: {
    name: 'CLI Tool',
    files: {
      'README.md': (data) => `# ${data.title}

> ${data.description}

## Installation

\`\`\`bash
npm install -g ${data.slug || 'cli-tool'}
\`\`\`

## Usage

\`\`\`bash
${data.slug || 'cli-tool'} --help
\`\`\`

## Development

\`\`\`bash
npm install
npm link
npm test
\`\`\`

## License

${data.license} License`,
      'CONTRIBUTING.md': (data) => `# Contributing to ${data.title}

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR`,
      '.gitignore': () => `node_modules/
*.log
.DS_Store
dist/
lib/
build/`,
    },
    starterIssues: [
      { title: 'Implement CLI entry point', labels: ['good first issue'] },
      { title: 'Add help command', labels: ['good first issue'] },
    ],
  },
  library: {
    name: 'Library/Package',
    files: {
      'README.md': (data) => `# ${data.title}

> ${data.description}

## Install

\`\`\`bash
npm install ${data.slug || 'library'}
\`\`\`

## Usage

\`\`\`javascript
import { something } from '${data.slug || 'library'}';
\`\`\`

## License

${data.license} License`,
      '.gitignore': () => `node_modules/
dist/
coverage/
*.log`,
    },
    starterIssues: [
      { title: 'Set up package structure', labels: ['good first issue'] },
      { title: 'Export main functionality', labels: ['good first issue'] },
    ],
  },
  data: {
    name: 'Data Project',
    files: {
      'README.md': (data) => `# ${data.title}

> ${data.description}

## Setup

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Run

\`\`\`bash
python src/main.py
\`\`\`

## License

${data.license} License`,
      '.gitignore': () => `__pycache__/
*.pyc
.env
data/raw/
*.ipynb_checkpoints/`,
    },
    starterIssues: [
      { title: 'Load and explore data', labels: ['good first issue'] },
      { title: 'Create initial analysis', labels: ['good first issue'] },
    ],
  },
};

export function generateRepoFiles(template: string, projectData: Record<string, string>) {
  const templateData = TEMPLATES[template] || TEMPLATES['web-app'];
  const files: Record<string, string> = {};
  
  for (const [filename, generator] of Object.entries(templateData.files)) {
    const data: TemplateData = {
      title: projectData.title || 'Untitled',
      description: projectData.description || '',
      slug: projectData.slug,
      owner: projectData.owner,
      license: projectData.license || 'MIT',
      repoUrl: projectData.repoUrl,
    };
    files[filename] = generator(data);
  }
  
  return { files, starterIssues: templateData.starterIssues };
}