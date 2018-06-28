

# @volumegraphics/license-info-printer
Collects license information of all third-party dependencies of your module and prints it to a nice html document.
# Install
`npm install --save "@volumegraphics/license-info-printer"`
# Example
An example can be found here: [@volumegraphics/license-info-printer-example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example)
# Command Line Interface
You can run the `license-info-printer` command from the `node_modules/.bin` directory.
The following arguments are required in order to run the license-info-printer CLI:

 - **productPackageJsonFile**: Path to your package.json file of your product. The `dependencies`, `devDependencies` and `optionalDependencies` fields in your `package.json` are all considered to be valid dependencies of your product.
 - **productNodeModulesPaths**: Path to all `node_modules` folder that your product depends on. Separate multiple folder paths with `;`
 - **licenseFilesPath**: Directory containing all your license files
 - **configFilePath**: Location of the config file. It is used to set valid licenses, set missing information or overwrite incorrect information of some modules. See **config.json Structure** section.
 - **mustacheHtmlTemplate**: A html template file based on "mustache" template engine that is used to print your html-license file. See **HTML template** section.
 - **errorLogFile**: File location of the error log file.
 - **documentFile**: File location of the generated html document.

Console printings will notify you if an error occured.
# Use as library
Instead of using the Command Line Interface, you can invoke the license-info-printer from your code.
Example:
```jsx
import * as lip from "@volumegraphics/license-info-printer";

... // set toHtml arguments here. See CLI section for arguments.

lip.toHtml(
	productPackageJsonFile, 
	productNodeModulesPaths, 
	licenseFilesPath,
	configFilePath,
	mustacheHtmlTemplate);
	
if(typeof  html  !==  "string") {
	doSomethingWithErrors(html); // html object as error object.
	return;
}

```
# config.json Structure
You can use the `config.json` from the [Example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example) as a template.
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
# HTML template
The HTML Template is written setuped with the template engine "mustache". See https://www.npmjs.com/package/mustache on how to configure it.
Data layout for the template:
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
You can use the `template.html` file from the [Example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example) as a template.
# More control required
If you want to have more control over your license evaluations, have a look at the following library:
https://www.npmjs.com/package/@volumegraphics/license-info-collector
The license-info-printer uses this library under the hood.