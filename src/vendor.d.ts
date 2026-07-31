// Minimal ambient declaration for a runtime dependency that ships no type definitions
// of its own. Only the member actually used here is declared.

declare module 'spdx-expression-parse' {
  /**
   * Throws if the value is not a valid SPDX license expression. This throw-on-invalid
   * contract is exactly what the CycloneDX LicenseFactory expects to be injected.
   */
  function parse(expression: string): unknown;
  export = parse;
}
