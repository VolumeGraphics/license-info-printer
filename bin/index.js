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
    name: 'mustacheHtmlTemplate', 
    summary: 'A html template file based on "mustache" template engine that is used to print your html-license file'
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

const html = ltd.toHtml(
  cli.productPackageJsonFile,
  cli.productNodeModulesPaths,
  cli.licenseFilesPath,
  cli.configFilePath,
  cli.mustacheHtmlTemplate,
  cli.disableNpmVersionCheck,
  {
    redundantHomepageOverrides: cli.errorLevelRedundantHomepageOverrides,
    redundantLicenseOverrides: cli.errorLevelRedundantLicenseOverrides,
  }
);

if(typeof html !== "string") {
  printErrors(html);
  process.exit(1);
}

fs.writeFileSync(cli.documentFile, html);