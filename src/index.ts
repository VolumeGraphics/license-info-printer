import * as fs from 'fs'
import * as path from 'path'
import {Dependency, findMissingPackages, findInvalidPackageContent, collectPackageInfos, PackageContent, Repository, Author, attachMeta, LicenseSectionWithMeta} from '@volumegraphics/license-info-collector'
import {applyOverrides, findUnusedOverrides, Override, Overrides} from '@volumegraphics/license-info-collector'
import {gatherLicenseSections} from '@volumegraphics/license-info-collector'
import * as handlebars from 'handlebars'

type License = {
  file?: string;
  name: string;
}

type Config = {
  overrides: Overrides;
  licenses: License[];
}

type LibraryTemplate = {
  name: string,
  copyright: string,
  data: PackageContent
}

type HandlebarsData = {
  index: number,
  name: string,
  licenseText: string,
  libraries: LibraryTemplate []
}

type LicenseText = {
  licenseText: string;
}

export enum ResultType {
  Error = "Error",
  Document = "Document"
}

export enum LicenseEncoding {
  None = "None",
  JsonString = "JsonString"
}

export type ErrorMessages = {
  type: ResultType.Error,
  message: string[]
}

export type DocumentResult = {
  type: ResultType.Document, 
  document: string;
  warnings: string[];
}

function authorToString(author: string | Author) {
  if(typeof author !== "string") {
    return (author as Author).name;
  }
  return (author as string);
}

function repositoryToString(repo: string | Repository) {
  if(typeof repo !== "string") {
    return (repo as Repository).url;
  }
  return (repo as string);
}

function copyrightInfo(p: PackageContent) {
  if(p.author) {
    return authorToString(p.author);
  } else if(p.homepage) {
    return p.homepage;
  } else if(p.repository) {
    return repositoryToString(p.repository);
  }
  return undefined;
}

function evaluateCopyRightInfo(p:PackageContent) {
  return copyrightInfo(p) !== undefined;
}

function _toDocument(licenseSections: LicenseSectionWithMeta<LicenseText>[], handlebarsTemplate: string) {
  let i:number = 0;
  const mustacheData = licenseSections
    .map(l => {
      if(l.meta === undefined)
        throw "License text is missing";

      const data: HandlebarsData = {
        index: ++i,
        name: l.licenseName,
        licenseText: l.meta.licenseText,
        libraries: l.libraries.map((p: PackageContent) => {
          return {
            name: p.name,
            version: p.version,
            copyright: copyrightInfo(p),
            data: p
          }
        })
      }
      return data;
    });

  const template = handlebars.compile(fs.readFileSync(handlebarsTemplate).toString());
  return template({licenses: mustacheData});
}

type ErrorLevel = "error" | "suppress";

export function toDocument(
  productPackageJsonFile: string, 
  productNodeModulesPaths: string[], 
  licenseFilesPath: string, 
  configFilePath: string,
  handlebarsTemplate: string,
  disableNpmVersionCheck: boolean,
  licenseEncoding: LicenseEncoding,
  errorLevel: {
    redundantHomepageOverrides: ErrorLevel,
    redundantLicenseOverrides: ErrorLevel
  }
): DocumentResult | ErrorMessages {

  const packageInfoResults = collectPackageInfos(productPackageJsonFile, productNodeModulesPaths, disableNpmVersionCheck);

  const packageInfos = packageInfoResults.result;

  const config:Config = JSON.parse(fs.readFileSync(configFilePath).toString());
  applyOverrides(packageInfos, config.overrides);
  const invalidOverrides = findUnusedOverrides(packageInfos, config.overrides);
  const invalidInfo = findInvalidPackageContent(packageInfos, config.licenses.map(l => l.name), evaluateCopyRightInfo);
  const missingPackages = findMissingPackages(packageInfos, disableNpmVersionCheck);
  
  const hasMissingDependenciesFn = () => {
    for (let m of missingPackages) {
      if (Object.keys(m.missingDependencies).length > 0)
        return true;
    }
    return false;
  }

  if(  invalidInfo.license.length != 0 
    || invalidInfo.copyright.length != 0 
    || (invalidOverrides.homepage.length != 0 && errorLevel.redundantHomepageOverrides === "error")
    || (invalidOverrides.license.length != 0 && errorLevel.redundantLicenseOverrides === "error")
    || hasMissingDependenciesFn() ) {
  
    const libId = (p: PackageContent | Override) => {
      return p.name + "@" + p.version;
    }

    let e: ErrorMessages = {
      type: ResultType.Error,
      message: []
    };
    const error = (s: string) => {
      e.message.push(s + "\n");
    }
    const printMissingDependencyErrors = (missing: Dependency) => {
      for (let productName in missing) {
        error(productName + "@" + missing[productName]);
      }
    }
  
    if(invalidInfo.license.length != 0) {
      error("\nThe following licenses are not allowed (define a license override in the config.json to solve this issue):");
      for(let l of invalidInfo.license) {
        error(libId(l) + " | license: " + l.license + " | " + l.packageJson[0]);
      }
    }
  
    if(invalidInfo.copyright.length != 0) {
      error("\nThe following copyrights/homepage are incorrect (define a hompage override in the config.json to solve this issue):");
      for(let l of invalidInfo.copyright) {
        error(libId(l) + " | copyright: " + copyrightInfo(l) + " | " + l.packageJson[0]);
      }
    }
  
    if(invalidOverrides.homepage.length != 0 && errorLevel.redundantHomepageOverrides === "error") {
      error("\nThe following copyrights/homepage overrides are redundant (remove these unused hompage override in the config.json to solve this issue):");
      for(let o of invalidOverrides.homepage) {
        error(libId(o));
      }
    }
  
    if(invalidOverrides.license.length != 0 && errorLevel.redundantLicenseOverrides === "error") {
      error("\nThe following license overrides are redundant (remove these unused license override in the config.json to solve this issue):");
      for(let o of invalidOverrides.license) {
        error(libId(o));
      }
    }

    if (missingPackages.length != 0) {
      error("\nThe following packages are missing (install missing dependencies with npm install/ci to solve this issue):");
      for (let m of missingPackages) {
        printMissingDependencyErrors(m.missingDependencies);
      }
    }
  
    return e;
  }

  const licenseTextModifier = licenseEncoding === LicenseEncoding.JsonString
    ? (s: string) => JSON.stringify(s)
    : (s: string) => s;

  packageInfos.pop();
  const licenseFilePath = (file: string) => path.join(licenseFilesPath, file);

  const meta = config.licenses
  .filter((l) => l.file !== undefined && fs.existsSync(licenseFilePath(l.file)))
  .map((l) => ({
    licenseName: l.name,
    meta: {
      licenseText: licenseTextModifier(
        fs.readFileSync(licenseFilePath(l.file)).toString()
      )
    },
  }));
  
  const licenseSections = gatherLicenseSections(packageInfos);
  const licenseWithMeta = attachMeta(licenseSections, meta)
    .filter(l => meta.find(m => m.licenseName === l.licenseName));

  return {
    type: ResultType.Document,
    document: _toDocument(licenseWithMeta, handlebarsTemplate),
    warnings: packageInfoResults.invalidPackages.map(invalidPackage => `Could not parse the following package: "${invalidPackage.packageFilePath}" (package is ignored)`)
  };
}