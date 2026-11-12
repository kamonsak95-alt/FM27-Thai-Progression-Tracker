// Keep this order stable. Snapshots store one character per attribute.
const ATTRIBUTE_KEYS = [
  'Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading',
  'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique',
  'Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions',
  'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate',
  'Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength',
  'AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'Handling', 'Kicking',
  'OneOnOnes', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'
];

function encodeSnapshotAttributes(attrs) {
  if (!attrs) return undefined;
  const values = ATTRIBUTE_KEYS.map(key => {
    const value = attrs[key];
    return Number.isInteger(value) && value >= 0 && value <= 20
      ? String.fromCharCode(65 + value)
      : '-';
  }).join('');
  return /[A-U]/.test(values) ? values : undefined;
}

function decodeSnapshotAttributes(values) {
  if (typeof values !== 'string' || values.length !== ATTRIBUTE_KEYS.length) return null;
  const attrs = {};
  for (const [index, key] of ATTRIBUTE_KEYS.entries()) {
    const value = values.charCodeAt(index) - 65;
    if (value >= 0 && value <= 20) attrs[key] = value;
  }
  return attrs;
}

module.exports = { encodeSnapshotAttributes, decodeSnapshotAttributes };
