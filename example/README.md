
# @volumegraphics/license-info-printer-example

Example for @volumegraphics/license-info-printer. It reads and prints the dependencies of the example itself.

![example](https://raw.githubusercontent.com/VolumeGraphics/license-info-printer/master/example/example.gif)

# Run example
Navigate to the installation directory and call:

    .\node_modules\.bin\license-info-printer --productPackageJsonFile node_modules/@volumegraphics/license-info-printer-example/package.json --productNodeModulesPaths ./node_modules --licenseFilesPath node_modules/@volumegraphics/license-info-printer-example/license_files --configFilePath node_modules/@volumegraphics/license-info-printer-example/config.json --mustacheHtmlTemplate node_modules/@volumegraphics/license-info-printer-example/template.html --errorLogFile license_error.txt --documentFile licenses.html

A `licenses.html` will be generated for your in the installation directory.

Look into the `package.json` if you want to see how the license-info-printer-example was setuped. We added some abritrary `optionalDependencies` modules that have incomplete license and/or copyright information. You can see how this is fixed in the `config.json`.