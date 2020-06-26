import * as fs from 'fs'
import {Dependency, findMissingPackages, findInvalidPackageContent, collectPackageInfos, PackageContent, Repository, Author} from '@volumegraphics/license-info-collector'
import {applyOverrides, findUnusedOverrides, Override, Overrides} from '@volumegraphics/license-info-collector'
import {gatherLicenseSections, License, LicenseSection} from '@volumegraphics/license-info-collector'
import * as mustache from 'mustache'
// import {toHtml} from './html'

interface Config {
  overrides: Overrides;
  licenses: License[];
}

interface LibraryTemplate {
  name: string,
  copyright: string,
  data: PackageContent
}

interface HtmlTemplate {
  index: number,
  name: string,
  licenseText: string,
  libraries: LibraryTemplate []
}

export interface ErrorMessages {
  message: string[]
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

function _toHtml(licenseSections: LicenseSection[], mustacheHtmlTemplate: string) {
  let i:number = 0;
  const mustacheData = licenseSections.filter((l: LicenseSection) => {
    return l.licenseText !== undefined;
  }).map((l:LicenseSection) => {
    const template: HtmlTemplate = {
      index: ++i,
      name: l.license,
      licenseText: l.licenseText,
      libraries: l.libraries.map((p: PackageContent) => {
        return {
          name: p.name,
          version: p.version,
          copyright: copyrightInfo(p),
          data: p
        }
      })
    }
    return template;
  });

  return mustache.render(fs.readFileSync(mustacheHtmlTemplate).toString(), {licenses: mustacheData});
}

type ErrorLevel = "error" | "suppress";

export function toHtml(
  productPackageJsonFile: string, 
  productNodeModulesPaths: string[], 
  licenseFilesPath: string, 
  configFilePath: string,
  mustacheHtmlTemplate: string,
  disableNpmVersionCheck: boolean,
  errorLevel: {
    redundantHomepageOverrides: ErrorLevel,
    redundantLicenseOverrides: ErrorLevel
  }
  ) {

    let packageInfos = collectPackageInfos(productPackageJsonFile, productNodeModulesPaths, disableNpmVersionCheck);

    const config:Config = JSON.parse(fs.readFileSync(configFilePath).toString());
    applyOverrides(packageInfos, config.overrides);
    const invalidOverrides = findUnusedOverrides(packageInfos, config.overrides);
    const invalidInfo = findInvalidPackageContent(packageInfos, config.licenses, evaluateCopyRightInfo);
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
        error("\nThe following licenses are not allowed:");
        for(let l of invalidInfo.license) {
          error(libId(l) + " | license: " + l.license + " | " + l.packageJson[0]);
        }
      }
    
      if(invalidInfo.copyright.length != 0) {
        error("\nThe following copyrights are incorrect:");
        for(let l of invalidInfo.copyright) {
          error(libId(l) + " | copyright: " + copyrightInfo(l) + " | " + l.packageJson[0]);
        }
      }
    
      if(invalidOverrides.homepage.length != 0 && errorLevel.redundantHomepageOverrides === "error") {
        error("\nThe following hompage overrides are redundant:");
        for(let o of invalidOverrides.homepage) {
          error(libId(o));
        }
      }
    
      if(invalidOverrides.license.length != 0 && errorLevel.redundantLicenseOverrides === "error") {
        error("\nThe following license overrides are redundant:");
        for(let o of invalidOverrides.license) {
          error(libId(o));
        }
      }

      if (missingPackages.length != 0) {
        error("\nThe following packages are missing:");
        for (let m of missingPackages) {
          printMissingDependencyErrors(m.missingDependencies);
        }
      }
    
      return e;
    }

    packageInfos.pop();
    const licenseSections = gatherLicenseSections(packageInfos, config.licenses, licenseFilesPath);
    return _toHtml(licenseSections, mustacheHtmlTemplate);
}