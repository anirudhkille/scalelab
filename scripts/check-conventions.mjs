/**
 * oxlint does not expose the ESLint type-definition rule or import-boundary
 * rules. This script keeps both checks enforceable in `bun run lint`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const FEATURES = new Set([
  "architecture",
  "challenges",
  "simulation",
  "playback",
  "diagnosis",
  "progress",
  "interview",
  "workspace",
  "learn",
  "settings",
]);
const RANK = {
  architecture: 0,
  challenges: 1,
  simulation: 2,
  diagnosis: 3,
  progress: 4,
  interview: 4.5,
  workspace: 5,
  learn: 6,
};
const FEATURE_ALIAS = "@/features/";
const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Remove comments without touching string contents (import specifiers matter). */
function stripComments(source) {
  let out = "";
  let index = 0;
  let mode = "code";
  let quote = "";

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (mode === "code") {
      if (char === "/" && next === "/") {
        mode = "line";
        index += 2;
        out += "  ";
        continue;
      }
      if (char === "/" && next === "*") {
        mode = "block";
        index += 2;
        out += "  ";
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        mode = "string";
        quote = char;
      }
      out += char;
      index += 1;
      continue;
    }

    if (mode === "line") {
      if (char === "\n") {
        mode = "code";
        out += "\n";
      } else {
        out += " ";
      }
      index += 1;
      continue;
    }

    if (mode === "block") {
      if (char === "*" && next === "/") {
        mode = "code";
        index += 2;
        out += "  ";
      } else {
        out += char === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    if (char === "\\") {
      out += char;
      out += next ?? "";
      index += 2;
      continue;
    }

    if (char === quote) {
      mode = "code";
    }
    out += char;
    index += 1;
  }

  return out;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function featureOf(file) {
  const rel = relative(SRC, file).split(sep);
  return rel[0] === "features" ? rel[1] : null;
}

function isAppFile(file) {
  const rel = relative(SRC, file).split(sep);
  return rel[0] === "app" || rel[0] === "test";
}

function fail(file, line, message) {
  errors.push(`${relative(ROOT, file)}:${line} ${message}`);
}

function checkTypeSyntax(file, source) {
  const clean = stripComments(source);
  const pattern =
    /^\s*(?:export\s+)?(?:declare\s+)?(?:default\s+)?(interface|enum)\s+([A-Za-z_$][\w$]*)/gm;

  for (const match of clean.matchAll(pattern)) {
    fail(
      file,
      lineAt(clean, match.index ?? 0),
      `use "type" instead of "${match[1]}" (found "${match[2]}")`,
    );
  }
}

function checkImports(file, source) {
  const clean = stripComments(source);
  const pattern = /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g;
  const currentFeature = featureOf(file);
  const appFile = isAppFile(file);
  const isMain = relative(SRC, file) === "main.tsx";
  const engineFile =
    currentFeature === "simulation" &&
    relative(SRC, file).split(sep).slice(0, 3).join(sep) ===
      join("features", "simulation", "engine");

  for (const match of clean.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    const line = lineAt(clean, match.index ?? 0);

    if (engineFile) {
      if (
        specifier === "react" ||
        specifier === "react-dom" ||
        specifier === "zustand" ||
        specifier.startsWith("@/app") ||
        specifier.startsWith("@/features/simulation/store") ||
        specifier.startsWith("@/shared/ui")
      ) {
        fail(file, line, `simulation/engine must stay pure TypeScript (imported "${specifier}")`);
      }
    }

    if (!specifier.startsWith(FEATURE_ALIAS)) continue;

    const rest = specifier.slice(FEATURE_ALIAS.length);
    const [targetFeature, ...deepPath] = rest.split("/");
    if (!targetFeature || !FEATURES.has(targetFeature)) continue;

    if (currentFeature === "shared") {
      fail(file, line, `shared code must not import feature "${targetFeature}"`);
      continue;
    }

    const isArchitectureModel =
      targetFeature === "architecture" && deepPath.length === 1 && deepPath[0] === "model";

    if (
      currentFeature &&
      currentFeature !== targetFeature &&
      deepPath.length > 0 &&
      !isArchitectureModel
    ) {
      fail(
        file,
        line,
        `deep import into "${targetFeature}"; import from "@/features/${targetFeature}" instead`,
      );
    }

    if (isMain) {
      if (!["app", "shared"].includes(targetFeature)) {
        fail(file, line, `src/main.tsx should compose through src/app`);
      }
      continue;
    }

    if (appFile) continue;
    if (targetFeature === "settings" || targetFeature === "shared") continue;

    if (currentFeature === "playback") {
      if (!["architecture", "simulation"].includes(targetFeature)) {
        fail(
          file,
          line,
          `playback may only import architecture/simulation/settings (imported "${targetFeature}")`,
        );
      }
      continue;
    }

    if (!currentFeature) continue;

    if (RANK[targetFeature] > RANK[currentFeature]) {
      fail(file, line, `dependency direction violation: ${currentFeature} -> ${targetFeature}`);
    }
  }
}

const files = walk(SRC).filter((file) => /\.(ts|tsx)$/.test(file));

for (const file of files) {
  const source = readFileSync(file, "utf8");
  checkTypeSyntax(file, source);
  checkImports(file, source);
}

if (errors.length > 0) {
  process.stderr.write(`convention check failed:\n${errors.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`convention check passed (${files.length} files)\n`);
}
