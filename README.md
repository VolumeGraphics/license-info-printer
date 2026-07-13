

# @volumegraphics/license-info-printer
Collects license information of all third-party dependencies of your module and prints it to a nice html document.
# Install
`npm install --save "@volumegraphics/license-info-printer"`
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
|productNodeModulesPaths | X | Directory paths to all `node_modules` folder that your product depends on. Separate multiple folder paths with `;` |
|downloadCmd|| A commandline that will be executed before license generation to download files for license generation. The placeholder \<downloadDir\> defines the directory where the command should download its files|
|licenseFilesPath | X | Directory folder path containing all your license files. The path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|configFilePath | X | File path location of the config file. It is used to validate licenses, complete missing license information or overwrite incorrect license information of some modules. See **config.json Structure** section. The path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|handlebarsTemplate | X | A document template file based on "handlebars" template engine that is used to print your license file. See **Document template** section. The path can be prefixed with \<download\> to access downloaded files (see downloadCmd option). |
|documentFile | X | File path location to the generated html document. |
|errorLogFile |   | File path location to the error log file. |
|disableNpmVersionCheck |    | By default, the license printer insits on a correct npm license string (see spdx for more information). If it is incorrect, it will give you an error. If you set the "disableNpmVersionCheck" flag, it will not do this. |
|errorLevelRedundantHomepageOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a hompage override for a license in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |
|errorLevelRedundantLicenseOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a license override in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |

Console printings will notify you if an error occured.
# Use as library
Instead of using the Command Line Interface, you can invoke the license-info-printer from your code.
Example:
```jsx
import * as lip from "@volumegraphics/license-info-printer";

... // set toDocument arguments here. See CLI section for arguments.

const doc = await lip.toDocument(
  productPackageJsonFile,
  productNodeModulesPaths, // array type
  downloadCmd,
  licenseFilesPath,
  configFilePath,
  handlebarsTemplate,
  disableNpmVersionCheck,
  {
    redundantHomepageOverrides,
    redundantLicenseOverrides
  },
  excludeMissingPackages // array type
);
	
if (doc.type === "Error") {
  for(let m of errorObj.message) {
    console.log(m);
  }
  return;
}

console.log(doc.document);

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

Two helpers are registered to encode any value correctly using `JSON.stringify` (handling quotes, backslashes, newlines, control characters and unicode):

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
# More control required
If you want to have more control over your license evaluations, have a look at
[@volumegraphics/license-info-collector](https://www.npmjs.com/package/@volumegraphics/license-info-collector)
The license-info-printer uses this library under the hood.