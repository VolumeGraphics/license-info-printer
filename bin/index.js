#!/usr/bin/env node
const ltd = require("@volumegraphics/license-info-printer");
const fs = require("fs");
const path = require("path");
const commandLineArgs = require('command-line-args');
const process = require("process");

function printErrors(errorObj, cli) {
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
    name: 'downloadCmd', 
    summary: 'A commandline that will be executed before license generation to download files for license generation. The placeholder <downloadDir> defines the directory where the command should download its files.'
  },
  {
    name: 'licenseFilesPath', 
    summary: 'Directory with your license files. The path can be prefixed with <download> to access downloaded files (see downloadCmd option).',
  },
  {
    name: 'configFilePath', 
    summary: 'Configuration file of license-to-document file. The path can be prefixed with <download> to access downloaded files (see downloadCmd option).',
  },
  {
    name: 'handlebarsTemplate',
    summary: 'A template file based on "handlebars (mustache)" template engine that is used to print your license file. Pass several templates to render several documents in a single run: the n-th handlebarsTemplate is rendered into the n-th documentFile. Each path can be prefixed with <download> to access downloaded files (see downloadCmd option).',
    multiple: true
  },
  {
    name: 'errorLogFile',
    summary: 'File location of the error log file'
  },
  {
    name: 'documentFile',
    summary: 'File location of the generated document. The number of values must match the number of handlebarsTemplate values.',
    multiple: true
  },
  {
    name: 'sbomFile',
    summary: 'File location of a generated CycloneDX JSON SBOM. Pass several to generate several SBOMs from the same dependency tree in a single run, and choose what each covers with sbomDependencyTypes. Every SBOM is validated against the CycloneDX schema before anything is written; if one is invalid, the run fails and no files are written at all.',
    multiple: true
  },
  {
    name: 'sbomDependencyTypes',
    summary: "Which of the product's dependency fields an SBOM covers, as a comma-separated list of dependencies, devDependencies and optionalDependencies. Give one value per sbomFile: the n-th sbomDependencyTypes applies to the n-th sbomFile. Left out, every SBOM lists every collected package.",
    multiple: true
  },
  {
    name: 'sbomSpecVersion',
    summary: 'CycloneDX specification version of every sbomFile. Possible values are: 1.6 | 1.5 | 1.4. Default is 1.6.',
    type: String,
    defaultValue: '1.6'
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
  },
  {
    name: 'excludeMissingPackages',
    summary: 'A list of package names to exclude from the missing packages check.',
    multiple: true,
    type: String,
    defaultValue: []
  }
];

async function main() {
  const cli = commandLineArgs(options);

  if(fs.existsSync(cli.errorLogFile))
  {
    fs.unlinkSync(cli.errorLogFile);
  }

  // An omitted "multiple" option is undefined, not an empty array.
  const templates = cli.handlebarsTemplate || [];
  const documentFiles = cli.documentFile || [];
  const sbomFiles = cli.sbomFile || [];
  const sbomDependencyTypes = cli.sbomDependencyTypes || [];

  const sbomSpecVersions = ['1.6', '1.5', '1.4'];

  const argErrors = [];
  if(templates.length === 0 && documentFiles.length === 0 && sbomFiles.length === 0)
    argErrors.push("No output was requested. Give a handlebarsTemplate together with a documentFile, or an sbomFile, or both.\n");
  else if(templates.length !== documentFiles.length)
    argErrors.push("handlebarsTemplate and documentFile must be given the same number of values ("
      + templates.length + " handlebarsTemplate vs. " + documentFiles.length + " documentFile). "
      + "Each handlebarsTemplate is rendered into the documentFile at the same position.\n");

  if(sbomDependencyTypes.length !== 0 && sbomDependencyTypes.length !== sbomFiles.length)
    argErrors.push("sbomDependencyTypes must be given once per sbomFile ("
      + sbomDependencyTypes.length + " sbomDependencyTypes vs. " + sbomFiles.length + " sbomFile). "
      + "The n-th sbomDependencyTypes applies to the n-th sbomFile; leave it out for SBOMs of every collected package.\n");

  // One comma-separated list per SBOM, such as "dependencies,optionalDependencies".
  const dependencyTypesPerSbom = sbomDependencyTypes.map(value => (value || "").split(",").map(t => t.trim()).filter(t => t !== ""));
  dependencyTypesPerSbom.forEach((types, i) => {
    if(types.length === 0 || types.some(t => !ltd.DEPENDENCY_TYPES.includes(t)))
      argErrors.push('Invalid sbomDependencyTypes "' + sbomDependencyTypes[i] + '". Give a comma-separated list of '
        + ltd.DEPENDENCY_TYPES.join(", ") + ".\n");
  });

  if(sbomFiles.length !== 0 && !sbomSpecVersions.includes(cli.sbomSpecVersion))
    argErrors.push('Unsupported sbomSpecVersion "' + cli.sbomSpecVersion + '". Possible values are: '
      + sbomSpecVersions.join(" | ") + ".\n");

  const outputFiles = documentFiles.concat(sbomFiles);
  const resolvedFiles = outputFiles.map(f => path.resolve(f));
  const duplicates = [...new Set(resolvedFiles.filter((f, i) => resolvedFiles.indexOf(f) !== i))];
  if(duplicates.length !== 0)
    argErrors.push("documentFile and sbomFile values must be unique, otherwise the outputs would overwrite each other: "
      + duplicates.join(", ") + "\n");

  if(argErrors.length !== 0) {
    printErrors({ message: argErrors }, cli);
    process.exit(1);
  }

  const doc = await ltd.toDocument({
    productPackageJsonFile: cli.productPackageJsonFile,
    productNodeModulesPaths: cli.productNodeModulesPaths,
    downloadCmd: cli.downloadCmd,
    licenseFilesPath: cli.licenseFilesPath,
    configFilePath: cli.configFilePath,
    handlebarsTemplates: templates,
    disableNpmVersionCheck: cli.disableNpmVersionCheck,
    errorLevel: {
      redundantHomepageOverrides: cli.errorLevelRedundantHomepageOverrides,
      redundantLicenseOverrides: cli.errorLevelRedundantLicenseOverrides,
    },
    excludeMissingPackages: cli.excludeMissingPackages,
    sboms: sbomFiles.map((file, i) => ({
      specVersion: cli.sbomSpecVersion,
      dependencyTypes: dependencyTypesPerSbom.length !== 0 ? dependencyTypesPerSbom[i] : undefined
    }))
  });

  if (doc.type === "Error") {
    printErrors(doc, cli);
    process.exit(1);
  }

  doc.warnings.forEach(warning => console.warn(warning));

  for(let i = 0; i < documentFiles.length; ++i) {
    fs.writeFileSync(documentFiles[i], doc.documents[i]);
  }

  for(let i = 0; i < sbomFiles.length; ++i) {
    fs.writeFileSync(sbomFiles[i], doc.sboms[i]);
  }
}

main();