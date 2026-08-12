export interface ValidationIssue {
  file: string;
  field: string;
  message: string;
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) return "";
  const byFile = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const list = byFile.get(issue.file) ?? [];
    list.push(issue);
    byFile.set(issue.file, list);
  }
  const lines: string[] = [];
  for (const [file, fileIssues] of byFile) {
    lines.push(file);
    for (const issue of fileIssues) {
      lines.push(`  ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}

export function zodIssuesToValidationIssues(
  file: string,
  error: { issues: Array<{ path: PropertyKey[]; message: string }> },
): ValidationIssue[] {
  return error.issues.map((issue) => ({
    file,
    field: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}
