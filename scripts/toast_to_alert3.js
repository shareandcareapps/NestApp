// Final cleanup pass — fixes malformed Alert.alert calls left by pass 1 & 2.
// Patterns to fix:
//   Alert.alert('X', text2: 'Y' })  →  Alert.alert('X', 'Y')
//   Alert.alert('X' })              →  Alert.alert('X')
//   Toast.show({ type: 'error');    →  needs manual lookup from context

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const FILES = [
  'core/auth/screens/SignupScreen.js',
  'core/auth/screens/LoginScreen.js',
  'core/auth/screens/ForgotPasswordScreen.js',
  'core/screens/SettingsScreen.js',
  'core/components/UserProfileModal.js',
  'core/screens/FeedbackScreen.js',
  'features/rides/screens/RideDetailScreen.js',
  'features/news/screens/PostNewsScreen.js',
  'features/classifieds/screens/ListingDetailScreen.js',
  'features/classifieds/screens/PostListingScreen.js',
  'features/classifieds/screens/EditListingScreen.js',
  'features/rides/screens/PostRideScreen.js',
];

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  let s = fs.readFileSync(file, 'utf8');
  const before = s;

  // 1. Remove stray "text2: " label inside Alert.alert() second argument
  //    Handles: Alert.alert('X', text2: 'Y' })  →  Alert.alert('X', 'Y')
  s = s.replace(/Alert\.alert\(([^,)]+),\s*text2:\s*([^)]+)\s*\}\)/g, (_, a, b) =>
    `Alert.alert(${a}, ${b.trim()})`
  );

  // 2. Remove trailing }) that should just be )
  //    Handles: Alert.alert('X', 'Y' })  →  Alert.alert('X', 'Y')
  //    and:     Alert.alert('X' })       →  Alert.alert('X')
  s = s.replace(/Alert\.alert\(([^)]*)\s*\}\)/g, (_, inner) =>
    `Alert.alert(${inner.trimEnd()})`
  );

  // 3. Also fix: Alert.alert('X' }); (semicolon variant already caught above but just in case)
  s = s.replace(/Alert\.alert\(([^)]*)\s*\}\s*\)/g, (_, inner) =>
    `Alert.alert(${inner.trimEnd()})`
  );

  if (s !== before) {
    fs.writeFileSync(file, s, 'utf8');
    console.log(`✓ ${rel}`);
  }
}

// Remaining Toast.show({type:'X'); — these need known text. Fix by file+line.
const manual = [
  // SignupScreen: passwords don't match
  { file: 'core/auth/screens/SignupScreen.js',
    from: `return Toast.show({ type: 'error');`,
    to:   `return Alert.alert("Passwords don't match", 'Please re-enter your password.')` },
  // ForgotPasswordScreen: failed to update password
  { file: 'core/auth/screens/ForgotPasswordScreen.js',
    from: `      return Toast.show({ type: 'error');`,
    to:   `      return Alert.alert('Failed to update password', error.message)` },
  // SettingsScreen: could not enable biometric (2nd error variant)
  { file: 'core/screens/SettingsScreen.js',
    from: `        return Toast.show({ type: 'error');`,
    to:   `        return Alert.alert('Could not enable', 'Make sure your device has a passcode set.')` },
];

for (const { file, from, to } of manual) {
  const fp = path.join(ROOT, file);
  let s = fs.readFileSync(fp, 'utf8');
  if (s.includes(from)) {
    // Only replace first occurrence
    s = s.replace(from, to);
    fs.writeFileSync(fp, s, 'utf8');
    console.log(`✓ manual: ${file}`);
  } else {
    console.warn(`  MISS: ${file} — "${from.slice(0,60)}"`);
  }
}

console.log('\nFinal verification:');
const { execSync } = require('child_process');
try {
  const out = execSync(
    `grep -rn "Toast\\.show" ${ROOT}/core ${ROOT}/features --include="*.js"`,
    { encoding: 'utf8' }
  );
  console.log('Still remaining:\n' + out);
} catch {
  console.log('No Toast.show calls remain. ✅');
}
