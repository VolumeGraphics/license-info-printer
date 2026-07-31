

# @volumegraphics/license-info-printer
Collects license information of all third-party dependencies of your module and prints it to a nice html document, and optionally to a CycloneDX SBOM.
# Install
`npm install --save "@volumegraphics/license-info-printer"`

Requires Node.js 20.18.0 or newer.
# Example
An example can be found here: [@volumegraphics/license-info-printer-example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example)
# Command Line Interface
You can run the `license-info-printer` command from the `node_modules/.bin` directory.
The CLI can be integrated into your product build chain. The process will return an error code and error message if it fails and interrupt your build process.

The following arguments are available to the license-info-printer CLI:

## Arguments ##

|Argument|Required|Description|
|:-------|:-------|:----------|
|productPackageJsonFile | X | File path to your package.json file of your product. The `dependencies`, `devDependencies` and `optionalDependencies` fields in your `package.json` are all considered to be valid dependencies of your product |
|productNodeModulesPaths | X | Directory paths to all `node_modules` folder that your product depends on. **Multiple** &ndash; see **Multiple values** section. |
|downloadCmd|| A commandline that will be executed before license generation to download files for license generation. The placeholder \<downloadDir\> defines the directory where the command should download its files|
|licenseFilesPath | X | Directory folder path containing all your license files. The path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|configFilePath | X | File path location of the config file. It is used to validate licenses, complete missing license information or overwrite incorrect license information of some modules. See **config.json Structure** section. The path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|handlebarsTemplate | X | A document template file based on "handlebars" template engine that is used to print your license file. See **Document template** section. **Multiple** &ndash; pass one template per output document; the n-th `handlebarsTemplate` is rendered into the n-th `documentFile`. Each path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|documentFile | X | File path location to a generated document. **Multiple** &ndash; must be given exactly as many values as `handlebarsTemplate`, and the values must be distinct. See **Generating several documents in one run** section. |
|sbomFile |   | File path location to a generated CycloneDX JSON SBOM. See **CycloneDX SBOM** section. Either this or a `handlebarsTemplate`/`documentFile` pair is required. |
|sbomSpecVersion |   | CycloneDX specification version of the `sbomFile`. Allowed values are "1.6", "1.5" and "1.4". Default is "1.6". |
|errorLogFile |   | File path location to the error log file. |
|disableNpmVersionCheck |    | By default, the license printer insits on a correct npm license string (see spdx for more information). If it is incorrect, it will give you an error. If you set the "disableNpmVersionCheck" flag, it will not do this. |
|errorLevelRedundantHomepageOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a hompage override for a license in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |
|errorLevelRedundantLicenseOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a license override in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |

Console printings will notify you if an error occured.

## Multiple values ##
Arguments marked **Multiple** accept more than one value. Write the values separated by spaces after the argument, or repeat the argument:

    --productNodeModulesPaths ./node_modules ../shared/node_modules
    --productNodeModulesPaths ./node_modules --productNodeModulesPaths ../shared/node_modules

Both forms are equivalent. A value that starts with `-` has to use the `--argument=value` form.

## Generating several documents in one run ##
The dependency tree is collected and validated once, and every `handlebarsTemplate` is rendered from that same data. So instead of running the printer several times, you can produce a license page, a summary and a CycloneDX SBOM in a single run:

    license-info-printer \
      --productPackageJsonFile package.json \
      --productNodeModulesPaths ./node_modules \
      --licenseFilesPath ./license_files \
      --configFilePath config.json \
      --handlebarsTemplate template.html summary.hbs \
      --documentFile licenses.html summary.txt \
      --sbomFile my-product-1.2.3-sbom.json \
      --errorLogFile license_error.txt

All outputs are produced before the first file is written, so a broken template or an invalid SBOM leaves no output files behind at all. Note that files from an earlier successful run are not deleted when a run fails, unlike the `errorLogFile`.

For a CycloneDX SBOM use `--sbomFile` rather than a template: see **CycloneDX SBOM**.

# Use as library
Instead of using the Command Line Interface, you can invoke the license-info-printer from your code.

## Breaking changes in 6.0.0 ##
`toDocument` now takes a single options object instead of positional arguments, `handlebarsTemplate: string` became `handlebarsTemplates: string[]`, and `DocumentResult.document: string` became `documents: string[]` (one entry per template, in the same order). To migrate, name your arguments, wrap your template in an array and read `documents[0]`. The Command Line Interface is unchanged for single document invocations.

Example:
```jsx
import * as lip from "@volumegraphics/license-info-printer";

... // see CLI section for what the options mean.

const doc = await lip.toDocument({
  productPackageJsonFile,
  productNodeModulesPaths, // array type
  downloadCmd,             // optional
  licenseFilesPath,
  configFilePath,
  handlebarsTemplates,     // array type, optional
  disableNpmVersionCheck,  // optional, default false
  errorLevel: {            // optional, both default to "error"
    redundantHomepageOverrides,
    redundantLicenseOverrides
  },
  excludeMissingPackages,  // array type, optional
  sbom: {                  // omit to skip SBOM generation
    specVersion: "1.6",    // optional, default "1.6"
    includeLicenseText: false // optional, default false
  }
});
	
if (doc.type === "Error") {
  for(let m of doc.message) {
    console.log(m);
  }
  return;
}

// one entry per template, in the same order
doc.documents.forEach(document => console.log(document));

// only present if the sbom option was given
console.log(doc.sbom);

```
# config.json Structure
You can use the `config.json` from the [Example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example) as template.
```js
{
  "licenses" : [ // set of allowed licenses
    {
      "name": "<Name of a valid NPM license>",
      "file": "<Path to license file>"
    }
  ],
  "overrides" : { // overrides invalid licenses information of third-party modules
    "homepage" : [ // if "homepage" or "author" is not set, you need to overwrite it here.
      {
        "name": "<Exact Name of library>",
        "version": "<Version string>",
        "new" : "<Actual hompage / author>"
      }
    ],
    "license" : [ // if "license" is incorrect, you need to overwrite it here
      {
        "name": "<Name of the library>",
        "version": "<Version string>",
        "new": "<Valid new license>",
        "comment": "<fyi>"
      }
    ]
  }
}
```
# Document template
The documents Template uses the template engine "handlebars". See https://handlebarsjs.com/ on how to configure it.
If you pass several templates, every one of them receives the same data, and `index` restarts at 1 in each document.
Data layout for the handlebars template:
```js
{
  licenses: [
  {
    index: "<Array index of license>",
    name: "<Name of license>",
    licenseText: "<The license text>",
      libraries: [
        name: "<Library name>",
        version: "<Library version>",
        copyright: "<Copyright holder of the library>"
      ]
    }
  ]
}
```
You can use the `template.html` file from the [Example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example) as template.
## Handlebars helpers
When your template produces JSON (e.g. an SBOM / CycloneDX document), values such as an author or copyright holder may contain characters that are not valid inside a JSON string, for example the double quotes in `"BB" Bob Bingo`. Handlebars' default `{{ }}` output performs *HTML* escaping (which is invalid for JSON), and `{{{ }}}` performs *no* escaping at all, so both produce broken JSON.

Two helpers are registered to encode any value correctly using `JSON.stringify` (handling quotes, backslashes, newlines, control characters and unicode). If what you want is a CycloneDX SBOM, prefer the built-in `sbomFile` option over a template: a template can produce any text, so nothing checks that the result is a valid SBOM. See **CycloneDX SBOM**.

|Helper|Renders|Use it like|
|:-----|:------|:----------|
|`{{json value}}`|A complete JSON literal, **including** the surrounding quotes.|`"author": {{json copyright}}`|
|`{{jsonEscape value}}`|Only the escaped string contents, **without** surrounding quotes, so you keep your own.|`"author": "{{jsonEscape copyright}}"`|

A missing value (`undefined`) is rendered as an empty string. Example SBOM template snippet:
```hbs
{{#licenses}}
{{#libraries}}
{
  "name": {{json name}},
  "version": {{json version}},
  "author": {{json copyright}},
  "copyright": {{json copyright}},
  "licenseText": {{json licenseText}}
}
{{/libraries}}
{{/licenses}}
```
# CycloneDX SBOM
`--sbomFile` writes a [CycloneDX](https://cyclonedx.org/) JSON SBOM from the same dependency data as the handlebars documents, so one run can produce both:

    license-info-printer \
      --productPackageJsonFile package.json \
      --productNodeModulesPaths ./node_modules \
      --licenseFilesPath ./license_files \
      --configFilePath config.json \
      --handlebarsTemplate template.html \
      --documentFile licenses.html \
      --sbomFile my-product-1.2.3-sbom.json \
      --errorLogFile license_error.txt

Unlike a handlebars template, the SBOM is generated by the CycloneDX library and **validated against the CycloneDX JSON schema before anything is written**. If the collected data is unusable or the resulting document does not validate, the run fails with an error message and **no** files are written at all, not even the handlebars documents. Validation is never skipped: if the validator itself is unavailable, that is an error too.

Emitted per component: `type`, `name`, `group` for scoped packages, `version`, a `purl` such as `pkg:npm/%40scope/name@1.2.3`, a unique `bom-ref`, the `licenses` entry, and the homepage as an external reference. The document carries a `serialNumber`, `metadata.timestamp`, `metadata.tools`, `metadata.component` for your product, and a `dependencies` graph.

Licenses follow the CycloneDX convention: a valid SPDX identifier is written as `license.id`, a valid SPDX expression as `expression`, and anything else as free text in `license.name`. So a `config.json` entry like `"Public Domain"`, which is not an SPDX identifier, still produces a valid document.

Two notes on the contents:
* The SBOM lists **every** package the collector found, while the handlebars documents only show licenses that have a license text file configured in your `config.json`. The two outputs can therefore legitimately differ.
* Only the product's own `devDependencies` appear as `dependencies` edges. npm never installs the devDependencies of a dependency, so such an edge could only be resolved against some unrelated package that happens to satisfy the version range.
* `serialNumber` and `metadata.timestamp` differ on every run, so the file is not byte-for-byte reproducible even though all lists are sorted.

## Importing into Black Duck
The default `sbomSpecVersion` of 1.6 needs **Black Duck 2025.1.0 or newer**. Pass `--sbomSpecVersion 1.4` for older installations. Upload the file under Scans &rarr; Upload File as type SBOM-CycloneDX, then map the scan to a project and version.

Be aware of how Black Duck treats the document:
* **Component licenses are not persisted for components Black Duck matches** against its own KnowledgeBase; it only reads them when auto-creating components it cannot match. Use the handlebars document, not the SBOM, as your license attribution artifact.
* A component without a `name` makes Black Duck reject the whole SBOM. That is why generation fails if any package is missing one.
* `purl` is what Black Duck matches on, and auto-creation of unmatched components requires it.
* Uploading a file whose **name** matches an earlier upload overwrites it, so put your product name and version in the file name.
* `dependencies` and `scope` are ignored on import, so build-time-only packages cannot be flagged as such. Every component is imported as a prerequisite.

# More control required
If you want to have more control over your license evaluations, have a look at
[@volumegraphics/license-info-collector](https://www.npmjs.com/package/@volumegraphics/license-info-collector)
The license-info-printer uses this library under the hood.