/** Generates db/seed/seed.sql from the registry (for MCP/psql seeding). */
import { writeFileSync } from "node:fs";
import { TECHNOLOGIES } from "../../src/lib/detect/registry";

const esc = (value: string | null | undefined): string =>
  value === null || value === undefined
    ? "null"
    : `'${String(value).replace(/'/g, "''")}'`;

let sql = "";
for (const tech of TECHNOLOGIES) {
  const mcp = tech.mcpServerJson
    ? `${esc(JSON.stringify(tech.mcpServerJson))}::jsonb`
    : "null";
  sql += `insert into technologies (slug,name,category,icon_ref,homepage,llms_txt_url,mcp_server_json) values (${esc(tech.slug)},${esc(tech.name)},${esc(tech.category)},${esc(tech.iconRef)},${esc(tech.homepage)},${esc(tech.llmsTxtUrl)},${mcp}) on conflict (slug) do nothing;\n`;
  for (const rule of tech.rules) {
    const ecosystem = rule.type === "dependency" ? rule.ecosystem : null;
    const target = rule.type === "config-pattern" ? rule.targetFileGlob : null;
    const hint =
      rule.type === "config-pattern" ? (rule.versionHint ?? null) : null;
    sql += `insert into detection_rules (technology_id,rule_type,ecosystem,pattern,target_file_glob,version_hint) select id,${esc(rule.type)},${esc(ecosystem)},${esc(rule.pattern)},${esc(target)},${esc(hint)} from technologies where slug=${esc(tech.slug)};\n`;
  }
}
writeFileSync("db/seed/seed.sql", sql);
console.log(`seed.sql written — ${TECHNOLOGIES.length} technologies`);
