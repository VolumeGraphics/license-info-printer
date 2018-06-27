

# @volumegraphics/license-info-printer
Collects license information of all third-party dependencies of your module and prints it to a nice html.
# Install
`npm install --save "@volumegraphics/license-info-printer"`
# Example
An example can be found here: [@volumegraphics/license-info-printer-example](https://www.npmjs.com/package/@volumegraphics/license-info-printer-example)
# Command Line Interface
You can run the `license-info-printer` command from the `node_modules/.bin` directory.
The following arguments are required in order to run the license-info-printer CLI:

 - **productPackageJsonFile**: Path to your package.json file of your product. The `dependencies`, `devDependencies` and `optionalDependencies` fields in your `package.json` are all considered to be valid dependencies of your product.
 - **productNodeModulesPaths**: Path to all `node_modules` folder that your product depends on. Separate multiple folders with `;`
 - **licenseFilesPath**: Directory with your license files
 - **configFilePath**: Configuration file of license-to-document file. The config file is used to set valid licenses, set missing information or overwrite incorrect information of some modules. See **Config File** section.
 - **mustacheHtmlTemplate**: A html template file based on "mustache" template engine that is used to print your html-license file. See **Template** section.
 - **errorLogFile**: File location of the error log file.
 - **documentFile**: File location of generated document.

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
# Config File Structure
See the **Example** for a real world usage.
```json
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
# HTML Template
The HTML Template is written setuped with the template engine "mustache". See https://www.npmjs.com/package/mustache on how to use it.
Data layout for the template
```json
{
	licenses: [
		{
			index: <Array index of license>,
			name: <Name of license>,
			licenseText: <The license text>,
			libraries: [
				name: <Library name>,
				version: <Library version>,
				copyright: <Copyright holder of the library>
			]
		}
	]
}
```
See the **Example** for a real world usage.
# More Control needed
If you want to have more control over your license evaluations, have a look at the following library:
https://www.npmjs.com/package/@volumegraphics/license-info-collector
The license-info-printer uses this library under the hood.