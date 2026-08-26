#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const html = readFileSync(join(root, "apps", "web", "public.html"), "utf8");
const js = readFileSync(join(root, "apps", "web", "public.js"), "utf8");

assert.match(html, /id="publicName"/);
assert.match(html, /id="publicExperiences"/);
assert.match(html, /id="publicSkills"/);
assert.match(html, /id="btnCopyPublicLink"/);
assert.match(html, /返回工作台/);
assert.match(js, /fetch\(`\/api\/profiles\/public\/\$\{encodeURIComponent\(slug\)\}`\)/);
assert.match(js, /公开主页不存在/);
assert.match(js, /renderRoles/);

console.log("public profile smoke passed");
