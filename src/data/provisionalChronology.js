import lettersData from '@data/letters.json';

const PROVISIONAL_GROUPS = Object.freeze([
  Object.freeze({
    zone: 1,
    ambientLabel: '1988-1990',
    focusedLabel: '11/10/1988 - 01/01/1990',
    letterIds: Object.freeze([1]),
  }),
  Object.freeze({
    zone: 2,
    ambientLabel: '1990-1991',
    focusedLabel: '01/01/1990 - 05/01/1991',
    letterIds: Object.freeze([2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    zone: 3,
    ambientLabel: '1991-1992',
    focusedLabel: '12/02/1991 - 01/01/1992',
    letterIds: Object.freeze([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
  }),
  Object.freeze({
    zone: 4,
    ambientLabel: '1992',
    focusedLabel: '01/01/1992 - 21/07/1992',
    letterIds: Object.freeze([19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46]),
  }),
]);

const LETTER_COUNT = 46;
const TIMELINE_LOG_PREFIX = '[ground-timeline]';

let validationLogged = false;

function logValidationFailure(message) {
  if (validationLogged) {
    return;
  }

  validationLogged = true;
  console.error(`${TIMELINE_LOG_PREFIX} Disabled provisional chronology: ${message}`);
}

function validateProvisionalGroups(groups, letters) {
  if (!Array.isArray(groups) || groups.length === 0) {
    logValidationFailure('no chronology groups were defined.');
    return null;
  }

  const lettersById = new Map(letters.map((letter) => [letter.id, letter]));
  const coveredIds = new Set();

  for (const group of groups) {
    if (!group || typeof group !== 'object') {
      logValidationFailure('chronology groups must be objects.');
      return null;
    }

    if (!Number.isInteger(group.zone)) {
      logValidationFailure('every chronology group must declare a numeric zone.');
      return null;
    }

    if (!Array.isArray(group.letterIds) || group.letterIds.length === 0) {
      logValidationFailure(`zone ${group.zone} has no covered letter IDs.`);
      return null;
    }

    for (const letterId of group.letterIds) {
      if (coveredIds.has(letterId)) {
        logValidationFailure(`letter ${letterId} is covered more than once.`);
        return null;
      }

      coveredIds.add(letterId);

      const letter = lettersById.get(letterId);

      if (!letter) {
        logValidationFailure(`letter ${letterId} is missing from letters.json.`);
        return null;
      }

      if (letter.zone !== group.zone) {
        logValidationFailure(`letter ${letterId} belongs to zone ${letter.zone}, not zone ${group.zone}.`);
        return null;
      }
    }
  }

  if (coveredIds.size !== LETTER_COUNT) {
    logValidationFailure(`expected ${LETTER_COUNT} covered letters, received ${coveredIds.size}.`);
    return null;
  }

  if (letters.length !== LETTER_COUNT) {
    logValidationFailure(`letters.json currently has ${letters.length} letters, expected ${LETTER_COUNT}.`);
    return null;
  }

  for (const letter of letters) {
    if (!coveredIds.has(letter.id)) {
      logValidationFailure(`letter ${letter.id} is not covered by provisional chronology.`);
      return null;
    }
  }

  return Object.freeze(groups.map((group) => Object.freeze({
    zone: group.zone,
    ambientLabel: group.ambientLabel,
    focusedLabel: group.focusedLabel,
    letterIds: Object.freeze([...group.letterIds]),
  })));
}

export const provisionalChronology = PROVISIONAL_GROUPS;

export const validatedProvisionalChronology = validateProvisionalGroups(PROVISIONAL_GROUPS, lettersData);

export const hasValidProvisionalChronology = Boolean(validatedProvisionalChronology);
