/** Domain positions from the builder or lab shape tables. */
export async function shapeScene(source, id) {
  if (source === 'lab') {
    const { shapeSpec, vseprById } = await import('../lab/chem.js');
    const shape = vseprById(id);
    const spec = shapeSpec(shape);
    return {
      id: shape.id,
      center: shape.center,
      outer: shape.outer || 'X',
      atoms: spec.atoms,
      lonePairs: spec.lonePairs,
      label: shape.mg,
    };
  }
  const { shapeById, shapeSpec } = await import('../builders/vsepr.js');
  const shape = shapeById(id);
  const spec = shapeSpec(shape);
  return {
    id: shape.id,
    center: shape.center,
    outer: shape.outer || 'X',
    atoms: spec.atoms,
    lonePairs: spec.lonePairs,
    label: shape.mg,
  };
}
