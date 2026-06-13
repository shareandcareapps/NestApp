// Replaces all Toast.show() calls with Alert.alert() across the codebase.
// Removes react-native-toast-message imports. Adds Alert to RN imports if missing.
// Run: node scripts/toast_to_alert.js

const fs = require('fs');
const path = require('path');

const FILES = [
  'core/auth/screens/SignupScreen.js',
  'core/auth/screens/LoginScreen.js',
  'core/auth/screens/ForgotPasswordScreen.js',
  'core/screens/FeedbackScreen.js',
  'core/screens/SettingsScreen.js',
  'core/components/UserProfileModal.js',
  'core/components/ReportModal.js',
  'features/rides/screens/PostRideScreen.js',
  'features/rides/screens/RideDetailScreen.js',
  'features/rides/screens/EditRideScreen.js',
  'features/news/screens/AdminEditNewsScreen.js',
  'features/news/screens/PostNewsScreen.js',
  'features/classifieds/screens/ListingDetailScreen.js',
  'features/classifieds/screens/PostListingScreen.js',
  'features/classifieds/screens/EditListingScreen.js',
];

const ROOT = path.join(__dirname, '..');

function convertToast(src) {
  // Collapse multiline Toast.show({...}) into single lines first
  // Match Toast.show({ ... }) spanning up to 6 lines
  let s = src;

  // Iteratively collapse multiline Toast.show blocks
  let prev;
  do {
    prev = s;
    s = s.replace(/Toast\.show\((\{[^}]*)\n([^}]*)\}/g, (m, a, b) =>
      'Toast.show(' + a + ' ' + b.trim() + '}'
    );
  } while (s !== prev);

  // Now replace single-line Toast.show({ type, text1, text2, ... })
  s = s.replace(
    /Toast\.show\(\{\s*type:\s*['"][^'"]*['"]\s*,\s*text1:\s*(['"`])((?:[^\\]|\\.)*?)\1\s*,\s*text2:\s*(['"`])((?:[^\\]|\\.)*?)\3(?:\s*,[^}]*)?\}\)/g,
    (_, q1, title, q2, msg) => `Alert.alert(${q1}${title}${q1}, ${q2}${msg}${q2})`
  );

  // Toast.show({ type, text1 }) — no text2
  s = s.replace(
    /Toast\.show\(\{\s*type:\s*['"][^'"]*['"]\s*,\s*text1:\s*(['"`])((?:[^\\]|\\.)*?)\1(?:\s*,[^}]*)?\}\)/g,
    (_, q, title) => `Alert.alert(${q}${title}${q})`
  );

  // Remove toast-message import lines
  s = s.replace(/^import Toast from ['"]react-native-toast-message['"];\n?/m, '');
  s = s.replace(/^import \{ showMessage[^}]*\} from ['"][^'"]*['"];\n?/m, '');

  // Add Alert to existing React Native import if not already there
  s = s.replace(
    /(import\s*\{)([^}]*)(}\s*from\s*['"]react-native['"])/g,
    (match, open, imports, close) => {
      if (/\bAlert\b/.test(imports)) return match;
      const trimmed = imports.trimEnd();
      const sep = trimmed.endsWith(',') ? ' ' : ', ';
      return `${open}${trimmed}${sep}Alert,${close}`;
    }
  );

  return s;
}

let changed = 0;
for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP (not found): ${rel}`); continue; }
  const original = fs.readFileSync(file, 'utf8');
  const updated = convertToast(original);
  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    const count = (original.match(/Toast\.show/g) || []).length;
    console.log(`✓ ${rel}  (${count} call${count !== 1 ? 's' : ''})`);
    changed++;
  } else {
    console.log(`- ${rel}  (no changes)`);
  }
}
console.log(`\nDone. ${changed} file${changed !== 1 ? 's' : ''} updated.`);
