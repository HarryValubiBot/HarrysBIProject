export function detectStarSchema(tables) {
  const byName = new Map(tables.map(t => [t.name, t]));
  const dims = tables.filter(t => t.name.startsWith('dim_'));
  const facts = tables.filter(t => t.name.startsWith('fact_'));

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
