#!/usr/bin/env node
const ltd = require("@volumegraphics/license-info-printer");
const fs = require("fs");
const commandLineArgs = require('command-line-args');
const process = require("process");

function printErrors(errorObj) {
  let content = "";
  for(let m of errorObj.message) {
    content += m;
  }
  console.error(content);
  if(cli.errorLogFile)
    fs.writeFileSync(cli.errorLogFile, content);
}

const options = [
  {
    name: 'productPackageJsonFile', 
    summary: 'Path to your package.json file of your product',
  },
  {
    name: 'productNodeModulesPaths', 
    summary: 'Path to all node_modules folder that your product depends on',
    multiple: true
  },
  {
    name: 'licenseFilesPath', 
    summary: 'Directory with your license files',
  },
  {
    name: 'configFilePath', 
    summary: 'Configuration file of license-to-document file',
  },
  {
    name: 'handlebarsTemplate', 
    summary: 'A template file based on "handlebars (mustache)" template engine that is used to print your license file'
  },
  {
    name: 'errorLogFile',
    summary: 'File location of the error log file'
  },
  {
    name: 'documentFile',
    summary: 'File location of generated document'
  },
  {
    name: 'disableNpmVersionCheck',
    summary: 'Disables the npm version check. It simply compares two version strings instead.',
    type: Boolean,
    defaultValue: false
  },
  {
    name: 'licenseTextModifier',
    summary: 'Modify the license content before applying it to the template. Valid options are "None" and "JsonString". "JsonString" will encode double quotes.',
    type: String,
    defaultValue: 'None'
  },
  {
    name: 'errorLevelRedundantHomepageOverrides',
    summary: 'Treatment of redundant hompage overrides. Possible values are: error | suppress.',
    type: String,
    defaultValue: 'error'
  },
  {
    name: 'errorLevelRedundantLicenseOverrides',
    summary: 'Treatment of redundant license overrides. Possible values are: error | suppress.',
    type: String,
    defaultValue: 'error'
  }
];

const cli = commandLineArgs(options);

if(fs.existsSync(cli.errorLogFile))
{
  fs.unlinkSync(cli.errorLogFile);
}

const doc = ltd.toDocument(
  cli.productPackageJsonFile,
  cli.productNodeModulesPaths,
  cli.licenseFilesPath,
  cli.configFilePath,
  cli.handlebarsTemplate,
  cli.disableNpmVersionCheck,
  cli.licenseTextModifier,
  {
    redundantHomepageOverrides: cli.errorLevelRedundantHomepageOverrides,
    redundantLicenseOverrides: cli.errorLevelRedundantLicenseOverrides,
  }
);

if (doc.type === "Error") {
  printErrors(doc);
  process.exit(1);
}

doc.warnings.forEach(warning => console.warn(warning));

fs.writeFileSync(cli.documentFile, doc.document);