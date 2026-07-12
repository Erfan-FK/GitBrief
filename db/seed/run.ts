/**
 * Seed technologies + detection_rules from the canonical registry — 03 §4.
 * Usage: pnpm db:seed (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { TECHNOLOGIES } from "../../src/lib/detect/registry";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required — see .env.example",
    );
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });

  for (const tech of TECHNOLOGIES) {
    const { data, error } = await db
      .from("technologies")
      .upsert(
        {
          slug: tech.slug,
          name: tech.name,
          category: tech.category,
          icon_ref: tech.iconRef ?? null,
          homepage: tech.homepage ?? null,
          llms_txt_url: tech.llmsTxtUrl ?? null,
          mcp_server_json: tech.mcpServerJson ?? null,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error || !data) {
      console.error(`✗ ${tech.slug}: ${error?.message}`);
      continue;
    }

    // Replace rules wholesale — registry is the source of truth.
    await db.from("detection_rules").delete().eq("technology_id", data.id);
    const rows = tech.rules.map((rule) => ({
      technology_id: data.id,
      rule_type: rule.type,
      ecosystem: rule.type === "dependency" ? rule.ecosystem : null,
      pattern: rule.pattern,
      target_file_glob: rule.type === "config-pattern" ? rule.targetFileGlob : null,
      version_hint:
        rule.type === "config-pattern" ? (rule.versionHint ?? null) : null,
    }));
    const { error: rulesError } = await db.from("detection_rules").insert(rows);
    if (rulesError) console.error(`✗ rules ${tech.slug}: ${rulesError.message}`);
    else console.log(`✓ ${tech.slug} (${rows.length} rules)`);
  }
  console.log(`Seeded ${TECHNOLOGIES.length} technologies.`);
}

void main();
