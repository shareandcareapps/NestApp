// features/rides/utils/longRideUtils.js
// Encodes/decodes long-ride structured metadata stored inside the notes field.
// Format (prepended to user notes, newline-separated):
//   __STOPS__City A, ST; City B, ST
//   __LUGGAGE__none | limited | plenty   (driver: space available)
//   __BAGS__1                             (passenger: bags they're bringing)
//   __RETURN__YYYY-MM-DD
//   (rest of lines = user's free-text notes)

export function encodeLongRideNotes({ stops, luggage, bags, returnDate, userNotes }) {
  const lines = [];
  if (stops?.trim())      lines.push(`__STOPS__${stops.trim()}`);
  if (luggage)            lines.push(`__LUGGAGE__${luggage}`);
  if (bags)               lines.push(`__BAGS__${bags}`);
  if (returnDate)         lines.push(`__RETURN__${returnDate}`);
  if (userNotes?.trim())  lines.push(userNotes.trim());
  return lines.join('\n');
}

export function decodeLongRideNotes(notesStr) {
  const result = { stops: null, luggage: null, bags: null, returnDate: null, userNotes: '' };
  if (!notesStr) return result;
  const remaining = [];
  for (const line of notesStr.split('\n')) {
    if      (line.startsWith('__STOPS__'))   result.stops      = line.slice(9).trim();
    else if (line.startsWith('__LUGGAGE__')) result.luggage    = line.slice(11).trim();
    else if (line.startsWith('__BAGS__'))    result.bags       = line.slice(8).trim();
    else if (line.startsWith('__RETURN__'))  result.returnDate = line.slice(10).trim();
    else                                     remaining.push(line);
  }
  result.userNotes = remaining.join('\n').trim();
  return result;
}

export const PASSENGER_BAGS_OPTIONS = [
  { id: '0',  label: 'No bags',  icon: 'person-outline',    desc: 'Travelling light' },
  { id: '1',  label: '1 bag',    icon: 'bag-handle-outline', desc: 'One carry-on or backpack' },
  { id: '2',  label: '2 bags',   icon: 'briefcase-outline',  desc: 'Two bags or suitcases' },
  { id: '3+', label: '3+ bags',  icon: 'cube-outline',       desc: 'Multiple large bags' },
];

export const LUGGAGE_OPTIONS = [
  { id: 'plenty',  label: 'Plenty',  icon: 'briefcase',         desc: 'Large bags welcome' },
  { id: 'limited', label: 'Limited', icon: 'briefcase-outline', desc: 'Small bags only' },
  { id: 'none',    label: 'None',    icon: 'close-circle-outline', desc: 'No luggage space' },
];

export function luggageLabel(id) {
  return LUGGAGE_OPTIONS.find(o => o.id === id)?.label ?? id;
}

export function formatReturnDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}
