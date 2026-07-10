// QoL toggle definitions for Remastered / Legacy mode selection.
// All false = Legacy: bit-for-bit identical to the pre-Remastered build.
// All true  = Remastered: every QoL feature active.
// Locked toggles cannot be changed after game creation; they affect
// character balance or item-state models that would corrupt a mid-game flip.

export const TOGGLES = [
  {
    id: 'automap',
    label: 'Automap',
    desc: 'Reveals visited cells on a parchment map.  M cycles overlay/full.',
    shortDesc: 'reveals the map',
    lockedAtCreation: false
  },
  {
    id: 'saveAnywhere',
    label: 'Save Anywhere',
    desc: '3 manual slots + autosave on transitions, usable mid-dungeon.',
    shortDesc: 'slots + autosave',
    lockedAtCreation: false
  },
  {
    id: 'sharedInventory',
    label: 'Shared Inventory',
    desc: '40-slot party pool instead of individual packs.',
    shortDesc: 'one party bag',
    lockedAtCreation: true
  },
  {
    id: 'reducedXp',
    label: 'Reduced XP Curve',
    desc: '~40% lower XP requirements, balanced for full dungeon clears.',
    shortDesc: '~40% lower',
    lockedAtCreation: true
  },
  {
    id: 'charges',
    label: 'Item Charges',
    desc: 'Limited-use items show exact charges instead of random consumption.',
    shortDesc: 'show uses left',
    lockedAtCreation: false
  },
  {
    id: 'seventhSlot',
    label: 'Summons: 7th Slot',
    desc: 'Summons occupy a dedicated slot above the roster, not a party slot.',
    shortDesc: 'own slot',
    lockedAtCreation: false
  }
];

export const REMASTERED = Object.fromEntries(TOGGLES.map(t => [t.id, true]));
export const LEGACY     = Object.fromEntries(TOGGLES.map(t => [t.id, false]));

export function newSettings(mode = 'legacy') {
  return mode === 'remastered' ? { ...REMASTERED } : { ...LEGACY };
}
