import { LicenseEncoding, toHtml } from '../src/index';

const baseP = "C:/work/vg/vgs/components/vgs.reportingtool/reporteditor/";

console.log(JSON.stringify(toHtml(
  baseP + "package.json",
  [baseP + "node_modules"],
  baseP + "../../vgs.webenvironment/npm_license_config/license_files",
  baseP + "../../vgs.webenvironment/npm_license_config/config.json",
  baseP + "../../vgs.webenvironment/npm_license_config/template.html",
  false,
  LicenseEncoding.None,
  {
    redundantHomepageOverrides: "suppress",
    redundantLicenseOverrides: "suppress"
  }
), null, 2));