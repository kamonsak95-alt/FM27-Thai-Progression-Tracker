// In-possession role lists follow the supplied game screens.
// The attributes are Tracker's scoring criteria.
const playerRoles = (() => {
  const attributes = {
    'Deep Lying Forward': 'FirstTouch Passing Technique Vision Strength Teamwork',
    'Centre-Forward': 'Finishing FirstTouch OffTheBall Composure Strength Acceleration',
    'Target Forward': 'Heading JumpingReach Strength Balance Bravery FirstTouch',
    'Poacher': 'Finishing Anticipation OffTheBall Composure Acceleration',
    'Channel Forward': 'OffTheBall Acceleration Pace WorkRate Dribbling Finishing',
    'False Nine': 'FirstTouch Passing Vision Technique Decisions OffTheBall',
    'Winger': 'Crossing Dribbling Acceleration Pace Technique',
    'Inside Forward': 'Dribbling Finishing OffTheBall Acceleration Composure',
    'Playmaking Winger': 'Passing Vision Technique FirstTouch Decisions Dribbling',
    'Wide Forward': 'Acceleration Pace OffTheBall Dribbling Finishing',
    'Inside Winger': 'Dribbling Technique Passing OffTheBall Agility',
    'Attacking Midfielder': 'FirstTouch Technique Passing OffTheBall Decisions Finishing',
    'Advanced Playmaker': 'Vision Passing Technique FirstTouch Flair Decisions',
    'Free Role': 'Flair Vision Technique Dribbling Decisions OffTheBall',
    'Second Striker': 'Finishing OffTheBall Anticipation FirstTouch Acceleration',
    'Channel Midfielder': 'OffTheBall WorkRate Stamina Acceleration Passing',
    'Wide Midfielder': 'Crossing Passing WorkRate Teamwork Stamina',
    'Central Midfielder': 'Passing FirstTouch Decisions Teamwork Positioning Stamina',
    'Wide Central Midfielder': 'Passing Crossing OffTheBall WorkRate Stamina',
    'Midfield Playmaker': 'Vision Passing FirstTouch Technique Composure Decisions',
    'Wing-Back': 'Crossing Acceleration Stamina WorkRate Dribbling Tackling',
    'Advanced Wing-Back': 'Crossing Dribbling OffTheBall Acceleration Pace Stamina',
    'Inside Wing-Back': 'Passing FirstTouch Decisions Positioning Teamwork Stamina',
    'Playmaking Wing-Back': 'Vision Passing Technique FirstTouch Decisions Stamina',
    'Defensive Midfielder': 'Positioning Tackling Anticipation Teamwork Decisions Passing',
    'Deep Lying Playmaker': 'Passing Vision Composure Technique Decisions Positioning',
    'Box To Box Midfielder': 'Stamina WorkRate OffTheBall Teamwork Tackling Passing',
    'Half Back': 'Positioning Tackling Marking Anticipation Decisions Strength',
    'Box To Box Playmaker': 'Stamina WorkRate Vision Passing Technique OffTheBall',
    'Full-Back': 'Tackling Marking Positioning Acceleration Stamina Crossing',
    'Inside Full-Back': 'Positioning Tackling Marking Anticipation Decisions Passing',
    'Centre-Back': 'Marking Tackling Heading Positioning Anticipation JumpingReach',
    'Advanced Centre-Back': 'Passing Technique FirstTouch Decisions Positioning Tackling',
    'Ball-Playing Centre-Back': 'Passing Vision Composure Technique Positioning Tackling',
    'No-Nonsense Centre-Back': 'Heading Tackling Marking Positioning Strength Bravery',
    'Wide Centre-Back': 'Positioning Tackling Marking Pace Passing Stamina',
    'Overlapping Centre-Back': 'OffTheBall Stamina Crossing Pace Tackling WorkRate',
    'Goalkeeper': 'Reflexes Handling Positioning CommandOfArea Agility OneOnOnes',
    'Ball-Playing Goalkeeper': 'Passing FirstTouch Kicking Decisions Composure Reflexes Handling',
    'No Nonsense Goalkeeper': 'Handling Reflexes Positioning AerialReach CommandOfArea'
  };
  const roles = {
    ST: ['Deep Lying Forward', 'Centre-Forward', 'Target Forward', 'Poacher', 'Channel Forward', 'False Nine'],
    AML: ['Winger', 'Inside Forward', 'Playmaking Winger', 'Wide Forward', 'Inside Winger'],
    AMC: ['Attacking Midfielder', 'Advanced Playmaker', 'Free Role', 'Second Striker', 'Channel Midfielder'],
    ML: ['Wide Midfielder', 'Winger', 'Playmaking Winger', 'Inside Winger'],
    MC: ['Central Midfielder', 'Attacking Midfielder', 'Advanced Playmaker', 'Wide Central Midfielder', 'Channel Midfielder', 'Midfield Playmaker'],
    WBL: ['Wing-Back', 'Advanced Wing-Back', 'Inside Wing-Back', 'Playmaking Wing-Back'],
    DM: ['Defensive Midfielder', 'Deep Lying Playmaker', 'Box To Box Midfielder', 'Half Back', 'Box To Box Playmaker'],
    DL: ['Full-Back', 'Wing-Back', 'Inside Wing-Back', 'Inside Full-Back', 'Playmaking Wing-Back'],
    DC: ['Centre-Back', 'Advanced Centre-Back', 'Ball-Playing Centre-Back', 'No-Nonsense Centre-Back', 'Wide Centre-Back', 'Overlapping Centre-Back'],
    GK: ['Goalkeeper', 'Ball-Playing Goalkeeper', 'No Nonsense Goalkeeper']
  };
  const aliases = { AMR: 'AML', MR: 'ML', WBR: 'WBL', DR: 'DL' };
  return {
    options(position) {
      const key = aliases[position] ?? position;
      return Object.hasOwn(roles, key) ? roles[key] : [];
    },
    optionsForSelection(positions) {
      return [...new Set(positions.split(',').flatMap(position => this.options(position)))];
    },
    keys(role) {
      return Object.hasOwn(attributes, role) ? attributes[role].split(' ') : [];
    }
  };
})();

if (typeof module !== 'undefined') module.exports = playerRoles;
