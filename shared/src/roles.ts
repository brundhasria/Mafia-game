import { Role, RoleAlignment, GameSettings } from './types.js';

export interface RoleInfo {
  role: Role;
  name: string;
  nameTa: string;
  alignment: RoleAlignment;
  description: string;
  descriptionTa: string;
  nightActionDescription?: string;
  nightActionDescriptionTa?: string;
  color: string;
}

export const ROLE_DEFINITIONS: Record<Role, RoleInfo> = {
  MAFIA: {
    role: 'MAFIA',
    name: 'Mafia',
    nameTa: 'மாஃபியா (Mafia)',
    alignment: 'MAFIA',
    description: 'Eliminate villagers each night without getting caught.',
    descriptionTa: 'ஒவ்வொரு இரவும் கிராமத்தினரை இரகசியமாக நீக்குங்கள்.',
    nightActionDescription: 'Vote with other Mafia members to eliminate a villager.',
    nightActionDescriptionTa: 'ஒருவரை நீக்க சக மாஃபியாவுடன் இணைந்து வாக்களியுங்கள்.',
    color: '#ef4444',
  },
  DOCTOR: {
    role: 'DOCTOR',
    name: 'Doctor',
    nameTa: 'மருத்துவர் (Doctor)',
    alignment: 'VILLAGE',
    description: 'Save one person each night from death. Can protect self only once.',
    descriptionTa: 'ஒவ்வொரு இரவும் ஒருவரைக் காப்பாற்றுங்கள். உங்களை ஒருமுறை மட்டுமே காக்க முடியும்.',
    nightActionDescription: 'Choose a player to protect tonight.',
    nightActionDescriptionTa: 'இன்றிரவு காப்பாற்ற ஒரு வீரரைத் தேர்ந்தெடுங்கள்.',
    color: '#22c55e',
  },
  DETECTIVE: {
    role: 'DETECTIVE',
    name: 'Detective',
    nameTa: 'துப்பறிவாளர் (Detective)',
    alignment: 'VILLAGE',
    description: 'Investigate one person each night to discover if they are Mafia.',
    descriptionTa: 'ஒவ்வொரு இரவும் ஒருவரை விசாரித்து அவர் மாஃபியாவா என்பதைக் கண்டறியுங்கள்.',
    nightActionDescription: 'Choose a player to secretly investigate.',
    nightActionDescriptionTa: 'ரகசியமாக விசாரிக்க ஒரு வீரரைத் தேர்ந்தெடுங்கள்.',
    color: '#3b82f6',
  },
  VILLAGER: {
    role: 'VILLAGER',
    name: 'Villager',
    nameTa: 'கிராமத்தினர் (Villager)',
    alignment: 'VILLAGE',
    description: 'Find and eliminate the Mafia through discussion and voting.',
    descriptionTa: 'விவாதம் மற்றும் வாக்குப்பதிவு மூலம் மாஃபியாவைக் கண்டுபிடித்து வெளியேற்றுங்கள்.',
    color: '#eab308',
  },
  JESTER: {
    role: 'JESTER',
    name: 'Jester',
    nameTa: 'கோமாளி (Jester)',
    alignment: 'NEUTRAL',
    description: 'Trick the village into voting you out to win the game alone.',
    descriptionTa: 'கிராமத்தினரை ஏமாற்றி அவர்கள் வாக்குகளால் நீங்கள் வெளியேற்றப்பட்டால் வெற்றி பெறுவீர்கள்.',
    color: '#a855f7',
  },
  MAYOR: {
    role: 'MAYOR',
    name: 'Mayor',
    nameTa: 'மேயர் (Mayor)',
    alignment: 'VILLAGE',
    description: 'Your vote counts as 2 votes during the day voting phase.',
    descriptionTa: 'வாக்களிப்பின் போது உங்கள் வாக்கு 2 வாக்குகளாகக் கணக்கிடப்படும்.',
    color: '#06b6d4',
  },
};

/**
 * Calculates role distribution for a given player count.
 * 5-6: 1 Mafia, 1 Doctor, 1 Detective, rest Villagers
 * 7-9: 2 Mafia, 1 Doctor, 1 Detective, rest Villagers
 * 10-12: 3 Mafia, 1 Doctor, 1 Detective, rest Villagers
 * If optional roles are enabled, they replace regular villagers (if enough spots exist).
 */
export function getRoleDistribution(playerCount: number, settings?: Partial<GameSettings>): Role[] {
  if (playerCount < 5 || playerCount > 12) {
    throw new Error(`Player count must be between 5 and 12 (received ${playerCount})`);
  }

  let mafiaCount = 1;
  if (playerCount >= 7 && playerCount <= 9) {
    mafiaCount = 2;
  } else if (playerCount >= 10) {
    mafiaCount = 3;
  }

  const roles: Role[] = [];
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('MAFIA');
  }
  roles.push('DOCTOR');
  roles.push('DETECTIVE');

  // Handle optional roles (replace Villager slots)
  let remainingSlots = playerCount - roles.length;

  if (settings?.enableMayor && remainingSlots > 1) {
    roles.push('MAYOR');
    remainingSlots--;
  }

  if (settings?.enableJester && remainingSlots > 1) {
    roles.push('JESTER');
    remainingSlots--;
  }

  while (roles.length < playerCount) {
    roles.push('VILLAGER');
  }

  return roles;
}
