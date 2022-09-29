const { execSync } = require('child_process');
const { chmodSync } = require('fs');
const { readFileSync, writeFileSync } = require('fs');
const os = require('os');

exports.pre = () => {
  try {
    if (os.platform() === 'win32') {
      execSync('where poetry')
    }
    else {
      execSync('which poetry')
    }
  } catch {
    console.error(`Unable to find "poetry". Install from https://python-poetry.org/docs/#installation`)
    process.exit(1);
  }
};

exports.post = options => {
  // Terraform Cloud configuration settings if the organization name and workspace is set.
  if (options.OrganizationName != '') {
    console.log(`\nGenerating Terraform Cloud configuration for '${options.OrganizationName}' organization and '${options.WorkspaceName}' workspace.....`)
    terraformCloudConfig(options.$base, options.OrganizationName, options.WorkspaceName)
  }

  const pypi_cdktf = options.pypi_cdktf;
  if (!pypi_cdktf) {
    throw new Error(`missing context "pypi_cdktf"`);
  }

  execSync('poetry install', { stdio: 'inherit' });
  execSync(`poetry add ${pypi_cdktf}`, { stdio: 'inherit' });
  execSync(`poetry add pytest --group dev`, { stdio: 'inherit' });
  chmodSync('main.py', '700');

  console.log(readFileSync('./help', 'utf-8'));
};

function terraformCloudConfig(baseName, organizationName, workspaceName) {
  template = readFileSync('./main.py', 'utf-8');

  const templateWithImports = template.replace(`from cdktf import App, TerraformStack`,
    `from cdktf import App, TerraformStack, CloudBackend, NamedCloudWorkspace`)

  const result = templateWithImports.replace(`MyStack(app, "${baseName}")`, `stack = MyStack(app, "${baseName}")
CloudBackend(stack,
  hostname='app.terraform.io',
  organization='${organizationName}',
  workspaces=NamedCloudWorkspace('${workspaceName}')
)`);

  writeFileSync('./main.py', result, 'utf-8');
}
