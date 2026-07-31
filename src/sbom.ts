import * as CDX from '@cyclonedx/cyclonedx-library'
import { PackageURL } from 'packageurl-js'
import spdxExpressionParse = require('spdx-expression-parse')

export type SbomSpecVersion = "1.6" | "1.5" | "1.4";

export type SbomOptions = {
  /**
   * CycloneDX specification version of the generated document. Defaults to "1.6".
   * Black Duck only gained CycloneDX 1.6 support in release 2025.1.0 - use "1.4"
   * for older installations.
   */
  specVersion?: SbomSpecVersion;
  /**
   * Embed the license texts as base64 attachments. Defaults to false: it multiplies
   * the file size and Black Duck does not read them.
   */
  includeLicenseText?: boolean;
}

/**
 * The subset of the collected package data the SBOM needs. Declared structurally so
 * this module does not depend on which of the collector's types are re-exported.
 */
export type SbomPackage = {
  name: string;
  version: string;
  license?: string;
  description?: string;
  homepage?: string;
  packageJson?: string[];
  packageDependencies?: SbomPackage[];
  packageDevDependencies?: SbomPackage[];
  packageOptionalDependencies?: SbomPackage[];
}

export type SbomInput = {
  /** The product itself, used for metadata.component. */
  product: SbomPackage;
  /** Every dependency to list as a component. */
  packages: SbomPackage[];
  /** License texts keyed by license name. Only consulted when includeLicenseText is set. */
  licenseTextByName: Map<string, string>;
  /** This tool, recorded in metadata.tools. */
  tool: { name: string, version: string };
  options: SbomOptions;
}

// A string discriminant, matching the ResultType style used for toDocument's result. A
// boolean discriminant would not narrow here, because this project compiles without
// strictNullChecks.
export type SbomResult =
  | { type: "Sbom", json: string }
  | { type: "Error", errors: string[] };

function specFor(version: SbomSpecVersion) {
  switch (version) {
    case "1.6": return CDX.Spec.Spec1dot6;
    case "1.5": return CDX.Spec.Spec1dot5;
    case "1.4": return CDX.Spec.Spec1dot4;
  }
}

/**
 * "@scope/name" -> { group: "@scope", name: "name" }. The group keeps the "@" so that
 * packageurl-js percent-encodes it into the purl namespace as "%40scope".
 */
function splitScopedName(fullName: string) {
  if (fullName.startsWith("@")) {
    const slash = fullName.indexOf("/");
    if (slash > 0)
      return { group: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
  }
  return { group: undefined, name: fullName };
}

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function origin(p: SbomPackage): string {
  return p.packageJson !== undefined && p.packageJson.length > 0 ? ` (${p.packageJson[0]})` : "";
}

/**
 * Renders the validator's findings one per line. The raw error array is an ajv
 * structure that is unreadable when dumped into a build log verbatim.
 */
function formatSchemaErrors(errors: unknown): string {
  const list: any[] = Array.isArray(errors) ? errors : [errors];
  const lines = list.map((e: any) => {
    if (typeof e !== "object" || e === null)
      return "  " + String(e);
    const at = isNonEmpty(e.instancePath) ? e.instancePath : "/";
    const params = e.params !== undefined && Object.keys(e.params).length > 0
      ? " " + JSON.stringify(e.params)
      : "";
    return "  " + at + ": " + (e.message !== undefined ? e.message : "invalid") + params;
  });
  return "The generated SBOM does not validate against the CycloneDX schema:\n" + lines.join("\n");
}

/**
 * Builds a CycloneDX SBOM from the collected package data and validates it against the
 * CycloneDX JSON schema. Returns the errors instead of a document if either the input
 * data or the resulting document is not valid, so that the caller can abort before
 * anything is written to disk.
 */
export async function buildSbom(input: SbomInput): Promise<SbomResult> {
  const specVersion = input.options.specVersion !== undefined ? input.options.specVersion : "1.6";
  const spec = specFor(specVersion);
  if (spec === undefined)
    return { type: "Error", errors: [`Unsupported CycloneDX specification version "${specVersion}". Supported versions are 1.6, 1.5 and 1.4.`] };

  // Check the input data first, and report every problem rather than only the first one.
  // A component without a name makes Black Duck reject the entire SBOM, and a component
  // without a version yields an incomplete package URL, which degrades matching.
  const errors: string[] = [];
  const checkPackage = (p: SbomPackage, role: string) => {
    if (!isNonEmpty(p.name))
      errors.push(`${role} has no name${origin(p)}. A CycloneDX component requires a name, and Black Duck rejects the whole SBOM if a single component is missing one.`);
    if (!isNonEmpty(p.version))
      errors.push(`${role} "${p.name}" has no version${origin(p)}. Without a version the package URL is incomplete and component matching degrades.`);
  };
  checkPackage(input.product, "The product");
  for (const p of input.packages)
    checkPackage(p, "Dependency");
  if (errors.length !== 0)
    return { type: "Error", errors };

  const licenseFactory = new CDX.Contrib.License.Factories.LicenseFactory(spdxExpressionParse);

  // bom-refs are derived from name@version so that repeated runs produce the same
  // document. Duplicates would otherwise be replaced by random values during
  // serialization, silently, so make them unique here instead.
  const usedRefs = new Set<string>();
  const uniqueRef = (base: string) => {
    let ref = base;
    for (let i = 2; usedRefs.has(ref); ++i)
      ref = base + "#" + i;
    usedRefs.add(ref);
    return ref;
  };

  const addLicense = (component: CDX.Models.Component, license: string | undefined) => {
    if (!isNonEmpty(license))
      return;
    // The collector yields exactly one license string per package, so a component never
    // holds more than one license. That matters: a set mixing an expression with other
    // licenses loses all but the first expression during normalization.
    const model = licenseFactory.makeFromString(license as string);
    if (input.options.includeLicenseText === true && !(model instanceof CDX.Models.LicenseExpression)) {
      const text = input.licenseTextByName.get(license as string);
      if (text !== undefined)
        model.text = new CDX.Models.Attachment(Buffer.from(text, "utf-8").toString("base64"), {
          contentType: "text/plain",
          encoding: CDX.Enums.AttachmentEncoding.Base64
        });
    }
    component.licenses.add(model);
  };

  const makeComponent = (p: SbomPackage, type: CDX.Enums.ComponentType) => {
    const split = splitScopedName(p.name);
    const component = new CDX.Models.Component(type, split.name, {
      group: split.group,
      version: p.version,
      description: isNonEmpty(p.description) ? p.description : undefined,
      bomRef: uniqueRef(p.name + "@" + p.version)
    });
    try {
      component.purl = new PackageURL("npm", split.group, split.name, p.version, undefined, undefined).toString();
    } catch (e) {
      errors.push(`Could not build a package URL for "${p.name}@${p.version}"${origin(p)}: ${e.message}`);
    }
    if (isNonEmpty(p.homepage))
      component.externalReferences.add(new CDX.Models.ExternalReference(
        p.homepage as string, CDX.Enums.ExternalReferenceType.Website));
    addLicense(component, p.license);
    return component;
  };

  const bom = new CDX.Models.Bom();
  bom.version = 1;
  bom.serialNumber = CDX.Contrib.Bom.Utils.randomSerialNumber();
  bom.metadata.timestamp = new Date();

  // Record this tool under metadata.tools.components. Anything placed in
  // metadata.tools.tools collapses the whole block to the deprecated flat form.
  const toolSplit = splitScopedName(input.tool.name);
  bom.metadata.tools.components.add(new CDX.Models.Component(
    CDX.Enums.ComponentType.Application, toolSplit.name, {
      group: toolSplit.group,
      version: input.tool.version,
      bomRef: uniqueRef("tool:" + input.tool.name)
    }));

  // The product is the root component. Black Duck derives the scan / code location name
  // from it; the project and version are mapped by hand after the upload.
  const rootComponent = makeComponent(input.product, CDX.Enums.ComponentType.Application);
  bom.metadata.component = rootComponent;

  const componentOf = new Map<SbomPackage, CDX.Models.Component>();
  for (const p of input.packages) {
    const component = makeComponent(p, CDX.Enums.ComponentType.Library);
    bom.components.add(component);
    componentOf.set(p, component);
  }

  if (errors.length !== 0)
    return { type: "Error", errors };

  // Dependency edges. The collector's resolved dependency arrays hold the very same
  // objects that are in `packages`, so the map lookup works by identity.
  //
  // Development edges are taken from the product only. npm never installs the
  // devDependencies of a dependency, so a development edge on a third-party package can
  // only have been resolved against some unrelated package that happens to satisfy the
  // version range - the collector resolves by searching the flat package list, not by
  // walking node_modules. Following those would claim edges that do not exist.
  const edgesOf = (p: SbomPackage, includeDevelopment: boolean) => ([] as SbomPackage[]).concat(
    p.packageDependencies !== undefined ? p.packageDependencies : [],
    p.packageOptionalDependencies !== undefined ? p.packageOptionalDependencies : [],
    includeDevelopment && p.packageDevDependencies !== undefined ? p.packageDevDependencies : []
  );
  const addEdges = (from: CDX.Models.Component, p: SbomPackage, includeDevelopment: boolean) => {
    for (const dependency of edgesOf(p, includeDevelopment)) {
      const to = componentOf.get(dependency);
      if (to !== undefined && to !== from)
        from.dependencies.add(to.bomRef);
    }
  };
  addEdges(rootComponent, input.product, true);
  for (const p of input.packages) {
    const from = componentOf.get(p);
    if (from !== undefined)
      addEdges(from, p, false);
  }

  const serializer = new CDX.Serialize.JsonSerializer(new CDX.Serialize.JSON.Normalize.Factory(spec));
  const json = serializer.serialize(bom, { sortLists: true, space: 2 });

  // Validate before handing the document back, so the caller can abort before writing.
  let validationErrors: unknown;
  try {
    validationErrors = await new CDX.Validation.JsonValidator(spec.version).validate(json);
  } catch (e) {
    // MissingOptionalDependencyError or NotImplementedError: validation is unavailable.
    // Treat that as a failure - "validated" must never silently degrade into "not
    // validated", which is the whole point of generating the document here.
    return { type: "Error", errors: [`Could not validate the generated SBOM against the CycloneDX ${specVersion} schema: ${e.message}`] };
  }
  // A failed validation resolves with the findings; it does not throw.
  if (validationErrors !== null)
    return { type: "Error", errors: [formatSchemaErrors(validationErrors)] };

  return { type: "Sbom", json };
}
