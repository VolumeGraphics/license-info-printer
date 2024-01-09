

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
|licenseFilesPath | X | Directory folder path containing all your license files |
|configFilePath | X | File path location of the config file. It is used to validate licenses, complete missing license information or overwrite incorrect license information of some modules. See **config.json Structure** section. |
|handlebarsTemplate | X | A document template file based on "handlebars" template engine that is used to print your license file. See **Document template** section. |
|documentFile | X | File path location to the generated html document. |
|errorLogFile |   | File path location to the error log file. |
|disableNpmVersionCheck |    | By default, the license printer insits on a correct npm license string (see spdx for more information). If it is incorrect, it will give you an error. If you set the "disableNpmVersionCheck" flag, it will not do this. |
|licenseTextModifier|| Modify the license content before applying it to the template. Valid options are "None" and "JsonString". "JsonString" will encode double quotes.
|errorLevelRedundantHomepageOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a hompage override for a license in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |
|errorLevelRedundantLicenseOverrides |   | Allowed values are "error" and "suppress". Default is "error". if "error" is set, the license printer will give you an error if you have put a license override in your config.json but this license is not used by your product. If you set it to "suppress", nothing will happen. |

Console printings will notify you if an error occured.
# Use as library
Instead of using the Command Line Interface, you can invoke the license-info-printer from your code.
Example:
```jsx
import * as lip from "@volumegraphics/license-info-printer";

... // set toHtml arguments here. See CLI section for arguments.

const doc = lip.toHtml(
  productPackageJsonFile,
  productNodeModulesPaths, // array type
  licenseFilesPath,
  configFilePath,
  handlebarsTemplate,
  disableNpmVersionCheck,
  licenseTextModifier,
  {
    redundantHomepageOverrides,
    redundantLicenseOverrides
  }
);
	
if (doc.type === "Error") {
  for(let m of errorObj.message) {
    console.log(m));
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
# More control required
If you want to have more control over your license evaluations, have a look at
[@volumegraphics/license-info-collector](https://www.npmjs.com/package/@volumegraphics/license-info-collector)
The license-info-printer uses this library under the hood.