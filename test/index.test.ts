import { toDocument } from '../src/index';

const baseP = "C:/work/vg/vgs/components/vgs.reportingtool/reporteditor/";

toDocument({
  productPackageJsonFile: baseP + "package.json",
  productNodeModulesPaths: [baseP + "node_modules"],
  licenseFilesPath: baseP + "../../vgs.webenvironment/npm_license_config/license_files",
  configFilePath: baseP + "../../vgs.webenvironment/npm_license_config/config.json",
  handlebarsTemplates: [baseP + "../../vgs.webenvironment/npm_license_config/template.html"],
  errorLevel: {
    redundantHomepageOverrides: "suppress",
    redundantLicenseOverrides: "suppress"
  },
  sbom: {}
}).then(result => console.log(JSON.stringify(result, null, 2)));
