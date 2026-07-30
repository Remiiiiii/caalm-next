import fs from "node:fs";
import path from "node:path";

const agentTools =
	"C:/Users/victo/.cursor/projects/c-Users-victo-Development-caalm-next/agent-tools";

function parseCollection(text) {
	const parsed = JSON.parse(JSON.parse(text).find((x) => x.type === "text").text);
	const attrs = parsed.attributes || parsed.columns || [];
	return attrs.map((a) => ({
		key: a.key,
		type: a.type,
		size: a.size,
		elements: a.elements,
		required: a.required,
		format: a.format,
	}));
}

const files = fs.readdirSync(agentTools).filter((f) => f.endsWith(".txt"));
let demo = null;
let prod = null;

for (const f of files) {
	const t = fs.readFileSync(path.join(agentTools, f), "utf8");
	if (!t.includes('"name": "Contracts"')) continue;
	if (t.includes('"databaseId": "caalm-demo"')) demo = parseCollection(t);
	if (t.includes('"databaseId": "685ed87c0009d8189fc7"')) prod = parseCollection(t);
}

if (!demo || !prod) {
	console.error("missing schema", { demo: !!demo, prod: !!prod });
	process.exit(1);
}

const prodMap = Object.fromEntries(prod.map((a) => [a.key, a]));
const diffs = [];

for (const d of demo) {
	const p = prodMap[d.key];
	if (!p) {
		diffs.push({ key: d.key, issue: "only-in-demo", demo: d });
		continue;
	}
	if (d.size && p.size && d.size !== p.size) {
		diffs.push({ key: d.key, issue: "size", demo: d.size, prod: p.size });
	}
	if (
		d.elements &&
		p.elements &&
		JSON.stringify(d.elements) !== JSON.stringify(p.elements)
	) {
		diffs.push({
			key: d.key,
			issue: "enum",
			demo: d.elements,
			prod: p.elements,
		});
	}
	if (d.required !== p.required) {
		diffs.push({
			key: d.key,
			issue: "required",
			demo: d.required,
			prod: p.required,
		});
	}
}

for (const p of prod) {
	if (!demo.find((d) => d.key === p.key)) {
		diffs.push({ key: p.key, issue: "only-in-prod", prod: p });
	}
}

console.log(JSON.stringify(diffs, null, 2));
