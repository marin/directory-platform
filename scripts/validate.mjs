#!/usr/bin/env node
import { validateDataset } from "../src/lib/data/load-dataset.ts";
import { formatValidationIssues } from "../src/lib/validation/errors.ts";

const issues = validateDataset();
if (issues.length > 0) {
  console.error(formatValidationIssues(issues));
  process.exit(1);
}
console.log("Validation passed.");
