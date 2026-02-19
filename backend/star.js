export function detectStarSchema(tables) {
  const byName = new Map(tables.map(t => [t.name, t]));
  const isFact = (n) => n.startsWith('fact.') || n.startsWith('fact_');
  const isDim = (n) => n.startsWith('dim.') || n.startsWith('dim_');
  const isBridge = (n) => n.startsWith('bridge.') || n.startsWith('bridge_');

  const dims = tables.filter(t => isDim(t.name) || isBridge(t.name));
  const facts = tables.filter(t => isFact(t.name));

  const relationships = [];
  for (const f of facts) {
    for (const fk of f.foreignKeys || []) {
      if (byName.has(fk.toTable)) {
        relationships.push({ fromTable: f.name, fromColumn: fk.from, toTable: fk.toTable, toColumn: fk.to });
      }
    }
  }

  const suggestedFact = facts[0]?.name || tables.sort((a,b)=> (b.columns?.length||0)-(a.columns?.length||0))[0]?.name || null;
  return {
    facts: facts.map(f => f.name),
    dimensions: dims.map(d => d.name),
    relationships,
    suggestedFact,
  };
}
