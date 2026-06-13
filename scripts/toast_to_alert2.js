// Second pass: manually fix all remaining/mangled Toast.show calls.
// Run: node scripts/toast_to_alert2.js

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function fix(relPath, replacements) {
  const file = path.join(ROOT, relPath);
  let s = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    if (!s.includes(from)) {
      console.warn(`  MISS in ${relPath}:\n    "${from.slice(0,80)}"`);
      continue;
    }
    s = s.replace(from, to);
  }
  fs.writeFileSync(file, s, 'utf8');
  console.log(`✓ ${relPath}`);
}

// ─── SignupScreen.js ──────────────────────────────────────────────────────────
fix('core/auth/screens/SignupScreen.js', [
  // email validation — script left broken shell
  [`return Toast.show({ type: 'error');`,
   `return Alert.alert('Invalid email', 'Please enter a valid email address.')`],
  // passwords don't match
  [`return Toast.show({ type: 'error')\n    }`,
   `return Alert.alert('Passwords don\\'t match', 'Please re-enter your password.')\n    }`],
  // welcome success (no session path already handled separately)
  [`Toast.show({ type: 'success');`,
   `Alert.alert('Welcome to NestApp! 🎉', 'Your community awaits.')`],
  // signup failed
  [`return Alert.alert('Signup failed', text2: error.message });`,
   `return Alert.alert('Signup failed', error.message)`],
  // malformed Alert calls with extra })
  [`return Alert.alert('Name required', 'Please enter your full name.' });`,
   `return Alert.alert('Name required', 'Please enter your full name.')`],
  [`return Alert.alert('Password too short', 'Use at least 8 characters.' });`,
   `return Alert.alert('Password too short', 'Use at least 8 characters.')`],
  [`return Alert.alert('Zip code required', 'Enter your 5-digit zip code.' });`,
   `return Alert.alert('Zip code required', 'Enter your 5-digit zip code.')`],
  // check_service_area call had p_zip stripped
  [`supabase.rpc('check_service_area');`,
   `supabase.rpc('check_service_area', { p_zip: zip });`],
  // check your email — add body text
  [`Alert.alert('Check your email 📬');`,
   `Alert.alert('Check your email 📬', 'Confirm your address, then sign in.')`],
]);

// ─── LoginScreen.js ───────────────────────────────────────────────────────────
fix('core/auth/screens/LoginScreen.js', [
  [`        Toast.show({ type: 'error');`,
   `        Alert.alert('Login failed', error.message)`],
  // template literal biometric enabled — still unresolved
  [`    Toast.show({ type: 'success', text1: \`\${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐\`,`,
   `    Alert.alert(\`\${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐\`, 'You can now sign in with biometrics.')`],
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Session expired', 'Please sign in with your password.')`],
  [`    if (!isAvailable) return Toast.show({ type: 'info');`,
   `    if (!isAvailable) return Alert.alert('Not available', 'Apple Sign-In requires iOS 13+.')`],
  // malformed Alert calls with extra })
  [`return Alert.alert('Missing fields', 'Please enter your email and password.' });`,
   `return Alert.alert('Missing fields', 'Please enter your email and password.')`],
  [`return Alert.alert('Could not enable', 'Make sure your device has a passcode set.' });`,
   `return Alert.alert('Could not enable', 'Make sure your device has a passcode set.')`],
  [`Alert.alert('Welcome back! 👋', 'You are now signed in.' });`,
   `Alert.alert('Welcome back! 👋', 'You are now signed in.')`],
  [`Alert.alert('Something went wrong', 'Please try again.' });`,
   `Alert.alert('Something went wrong', 'Please try again.')`],
  [`return Alert.alert('Not available in Expo Go', 'Google sign-in requires a dev build.' });`,
   `return Alert.alert('Not available in Expo Go', 'Google sign-in requires a dev build.')`],
  [`Alert.alert('Google sign-in failed', 'Please try again.' });`,
   `Alert.alert('Google sign-in failed', 'Please try again.')`],
  [`return Alert.alert('Not available', 'Apple Sign-In is only available on iOS.' });`,
   `return Alert.alert('Not available', 'Apple Sign-In is only available on iOS.')`],
  [`Alert.alert('Apple sign-in failed', 'Please try again.' });`,
   `Alert.alert('Apple sign-in failed', 'Please try again.')`],
  [`return Alert.alert('Biometric error', 'Please sign in with your password.' });`,
   `return Alert.alert('Biometric error', 'Please sign in with your password.')`],
]);

// ─── ForgotPasswordScreen.js ──────────────────────────────────────────────────
fix('core/auth/screens/ForgotPasswordScreen.js', [
  // failed to send OTP — dynamic error.message
  [`      return Toast.show({ type: 'error');`,
   `      return Alert.alert('Failed to send OTP', error.message)`],
  // password too short (warning stripped)
  [`      return Toast.show({ type: 'warning');`,
   `      return Alert.alert('Password too short', 'Use at least 8 characters.')`],
  // failed to update password
  [`      return Toast.show({ type: 'error');\n    Toast`,
   `      return Alert.alert('Failed to update password', error.message)\n    Alert`],
  // template literal code sent
  [`    Toast.show({ type: 'success', text1: 'Code sent!', text2: \`Check your inbox at \${email.trim()}\` });`,
   `    Alert.alert('Code sent!', \`Check your inbox at \${email.trim()}\`)`],
  // malformed Alert calls with extra })
  [`return Alert.alert('Invalid email', 'Enter a valid email address.' });`,
   `return Alert.alert('Invalid email', 'Enter a valid email address.')`],
  [`return Alert.alert('Enter 6-digit code', 'Check your email for the code.' });`,
   `return Alert.alert('Enter 6-digit code', 'Check your email for the code.')`],
  [`return Alert.alert('Invalid code', 'The code is wrong or expired. Try resending.' });`,
   `return Alert.alert('Invalid code', 'The code is wrong or expired. Try resending.')`],
  [`return Alert.alert('Passwords don\\'t match', 'Please re-enter your new password.' });`,
   `return Alert.alert('Passwords don\\'t match', 'Please re-enter your new password.')`],
  [`Alert.alert('Password updated! 🎉', 'You can now sign in with your new password.' });`,
   `Alert.alert('Password updated! 🎉', 'You can now sign in with your new password.')`],
]);

// ─── SettingsScreen.js ────────────────────────────────────────────────────────
fix('core/screens/SettingsScreen.js', [
  [`        return Toast.show({ type: 'error');`,
   `        return Alert.alert('Could not enable', 'Make sure your device has a passcode set.')`],
  // template literal biometric enabled
  [`      Toast.show({ type: 'success', text1: \`\${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐\`, text2: 'You can now sign in with biometrics.' });`,
   `      Alert.alert(\`\${biometricType === 'faceid' ? 'Face ID' : 'Fingerprint'} enabled 🔐\`, 'You can now sign in with biometrics.')`],
  [`      Toast.show({ type: 'info');`,
   `      Alert.alert('Biometric sign-in disabled', 'Use your password to sign in.')`],
  // malformed Alert with extra })
  [`return Alert.alert('Could not enable', 'Please sign out and sign in again.' });`,
   `return Alert.alert('Could not enable', 'Please sign out and sign in again.')`],
  [`Alert.alert('Could not delete account', 'Please try again or contact support.' });`,
   `Alert.alert('Could not delete account', 'Please try again or contact support.')`],
]);

// ─── UserProfileModal.js ──────────────────────────────────────────────────────
fix('core/components/UserProfileModal.js', [
  [`              Toast.show({ type: 'error');`,
   `              Alert.alert('Could not update block', e?.message || 'Please try again.')`],
  // malformed Alert with extra })
  [`Toast.show({ type: 'info', text1: 'User unblocked' });`,
   `Alert.alert('User unblocked')`],
  [`Alert.alert('User blocked', 'You will no longer see their content.' });`,
   `Alert.alert('User blocked', 'You will no longer see their content.')`],
]);

// ─── ReportModal.js ───────────────────────────────────────────────────────────
fix('core/components/ReportModal.js', [
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Report failed', e?.message || 'Please try again.')`],
  [`Alert.alert('Select a reason' });`,
   `Alert.alert('Select a reason')`],
]);

// ─── RideDetailScreen.js ──────────────────────────────────────────────────────
fix('features/rides/screens/RideDetailScreen.js', [
  // template literal confirmed
  [`      Toast.show({ type: 'success', text1: \`\${formatDisplayName(booking.riderProfile?.username)} confirmed!\` });`,
   `      Alert.alert(\`\${formatDisplayName(booking.riderProfile?.username)} confirmed!\`)`],
  // malformed Alert with extra })
  [`Alert.alert('Could not open chat', err.message });`,
   `Alert.alert('Could not open chat', err.message)`],
  [`Alert.alert('Could not confirm', err.message });`,
   `Alert.alert('Could not confirm', err.message)`],
  [`Alert.alert('Check-in failed — try again' });`,
   `Alert.alert('Check-in failed — try again')`],
  [`Alert.alert('Ride deleted' });`,
   `Alert.alert('Ride deleted')`],
  [`Alert.alert('Could not delete ride' });`,
   `Alert.alert('Could not delete ride')`],
]);

// ─── EditRideScreen.js ────────────────────────────────────────────────────────
fix('features/rides/screens/EditRideScreen.js', [
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Could Not Save', 'Something went wrong. Please try again.')`],
  [`Alert.alert('Ride updated! ✅', 'Your changes are now live.' });`,
   `Alert.alert('Ride updated! ✅', 'Your changes are now live.')`],
]);

// ─── AdminEditNewsScreen.js ───────────────────────────────────────────────────
fix('features/news/screens/AdminEditNewsScreen.js', [
  [`    if (!body.trim())  { Toast.show({ type: 'warning'); return; }`,
   `    if (!body.trim())  { Alert.alert('Body is required'); return; }`],
  [`      Toast.show({ type: 'error');`,  // save failed
   `      Alert.alert('Save failed', e?.message || 'Please try again.')`],
  // second instance — delete failed
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Delete failed', e?.message || 'Please try again.')`],
  // malformed Alert with extra })
  [`Alert.alert('Title is required' });`,
   `Alert.alert('Title is required')`],
  [`Alert.alert('Article updated' });`,
   `Alert.alert('Article updated')`],
  [`Alert.alert('Article deleted' });`,
   `Alert.alert('Article deleted')`],
]);

// ─── PostNewsScreen.js ────────────────────────────────────────────────────────
fix('features/news/screens/PostNewsScreen.js', [
  [`    if (!title.trim()) { Toast.show({ type: 'warning'); return; }`,
   `    if (!title.trim()) { Alert.alert('Add a title'); return; }`],
  [`      Toast.show({ type: 'success');`,
   `      Alert.alert(draft ? 'Saved as draft 📝' : 'Published! 🎉', draft ? 'You can edit and publish it later.' : 'Your news article is now live.')`],
  // malformed Alert with extra })
  [`Alert.alert('Image upload failed', e?.message });`,
   `Alert.alert('Image upload failed', e?.message)`],
  [`Alert.alert('Select a category' });`,
   `Alert.alert('Select a category')`],
  [`Alert.alert('Add the article body' });`,
   `Alert.alert('Add the article body')`],
  [`Alert.alert('Failed to publish', 'Please try again.' });`,
   `Alert.alert('Failed to publish', 'Please try again.')`],
]);

// ─── ListingDetailScreen.js ───────────────────────────────────────────────────
fix('features/classifieds/screens/ListingDetailScreen.js', [
  [`      Toast.show({ type: 'error');\n    } catch`,
   `      Alert.alert('Error', e?.message || 'Could not archive.')\n    } catch`],
  [`      Toast.show({ type: 'error');\n    }\n  }\n\n  async function handleRelist`,
   `      Alert.alert('Error', e?.message || 'Could not relist.')\n    }\n  }\n\n  async function handleRelist`],
  // template literal out of stock toggle
  [`      Toast.show({ type: 'success', text1: goingOut ? 'Marked out of stock' : 'Back in stock!', text2: goingOut ? 'Hidden from the top of search. Auto-removed after 30 days if not restocked.' : 'Your listing is live again for another 60 days.',});`,
   `      Alert.alert(goingOut ? 'Marked out of stock' : 'Back in stock!', goingOut ? 'Hidden from the top of search. Auto-removed after 30 days if not restocked.' : 'Your listing is live again for another 60 days.')`],
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Error', e?.message || 'Could not update stock status.')`],
  [`          Toast.show({ type: 'error');`,
   `          Alert.alert('Error', 'Could not delete. Try again.')`],
  // malformed Alert with extra })
  [`Alert.alert('Archived', 'Listing moved to your archive.' });`,
   `Alert.alert('Archived', 'Listing moved to your archive.')`],
  [`Alert.alert('Relisted!', 'Your listing is live again.' });`,
   `Alert.alert('Relisted!', 'Your listing is live again.')`],
  [`Alert.alert('Deleted', 'Your listing has been removed.' });`,
   `Alert.alert('Deleted', 'Your listing has been removed.')`],
  [`else Alert.alert('Email us to report', 'support@shareandcareapps.com' });`,
   `else Alert.alert('Email us to report', 'support@shareandcareapps.com')`],
]);

// ─── PostListingScreen.js ─────────────────────────────────────────────────────
fix('features/classifieds/screens/PostListingScreen.js', [
  [`    if (category === 'accommodation' && !acTitle) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'accommodation' && !acTitle) { Alert.alert('Add a title'); return false; }`],
  [`    if (category === 'buysell' && !bsProductName) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'buysell' && !bsProductName) { Alert.alert('Add product name'); return false; }`],
  [`    if (category === 'food' && !foodAllergens.trim()) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'food' && !foodAllergens.trim()) { Alert.alert('Allergen info required', 'List any allergens or write "No known allergens".'); return false; }`],
  [`    if (category === 'food' && !foodAttested) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'food' && !foodAttested) { Alert.alert('Confirmation required', 'Please confirm the food responsibility agreement to post.'); return false; }`],
  [`    if (category === 'events' && !evtDate.trim()) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'events' && !evtDate.trim()) { Alert.alert('Add the event date'); return false; }`],
  [`      Toast.show({ type: 'error');`,
   `      Alert.alert('Error', error?.message || 'Failed to post listing.')`],
  // malformed Alert with extra })
  [`Alert.alert('Max 4 photos' });`,
   `Alert.alert('Max 4 photos')`],
  [`return Alert.alert('Permission needed', 'Allow camera access.' });`,
   `return Alert.alert('Permission needed', 'Allow camera access.')`],
  [`return Alert.alert('Permission needed', 'Allow photo access.' });`,
   `return Alert.alert('Permission needed', 'Allow photo access.')`],
  [`Alert.alert('Upload failed', error.message });`,
   `Alert.alert('Upload failed', error.message)`],
  [`Alert.alert('Select a category' });`,
   `Alert.alert('Select a category')`],
  [`Alert.alert('Add job role and company' });`,
   `Alert.alert('Add job role and company')`],
  [`Alert.alert('Add a title' });`,
   `Alert.alert('Add a title')`],
  [`Alert.alert('Add an event title' });`,
   `Alert.alert('Add an event title')`],
  [`Alert.alert('Add a venue or location' });`,
   `Alert.alert('Add a venue or location')`],
]);

// ─── EditListingScreen.js ─────────────────────────────────────────────────────
fix('features/classifieds/screens/EditListingScreen.js', [
  [`    if (category === 'jobs' && (!jobRole || !jobCompany)) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'jobs' && (!jobRole || !jobCompany)) { Alert.alert('Add job role and company'); return false; }`],
  [`    if (category === 'food' && !foodTitle) { Toast.show({ type: 'warning'); return false; }`,
   `    if (category === 'food' && !foodTitle) { Alert.alert('Add a title'); return false; }`],
  [`      Toast.show({ type: 'success');`,
   `      Alert.alert('Listing updated! ✅', 'Your changes are now live.')`],
  // malformed Alert with extra })
  [`Alert.alert('Max 4 photos' });`,
   `Alert.alert('Max 4 photos')`],
  [`return Alert.alert('Permission needed' });`,
   `return Alert.alert('Permission needed')`],
  [`Alert.alert('Upload failed', error.message });`,
   `Alert.alert('Upload failed', error.message)`],
  [`Alert.alert('Add a title' });`,
   `Alert.alert('Add a title')`],
  [`Alert.alert('Confirmation required', 'Please confirm the food responsibility agreement to save.' });`,
   `Alert.alert('Confirmation required', 'Please confirm the food responsibility agreement to save.')`],
  [`Alert.alert('Listing updated! ✅', 'Your changes are now live.' });`,
   `Alert.alert('Listing updated! ✅', 'Your changes are now live.')`],
  [`Alert.alert('Update failed', 'Please try again.' });`,
   `Alert.alert('Update failed', 'Please try again.')`],
]);

// ─── FeedbackScreen.js ────────────────────────────────────────────────────────
fix('core/screens/FeedbackScreen.js', [
  [`Alert.alert('Could not submit', 'Please try again.' });`,
   `Alert.alert('Could not submit', 'Please try again.')`],
]);

// ─── PostRideScreen.js ────────────────────────────────────────────────────────
fix('features/rides/screens/PostRideScreen.js', [
  [`Alert.alert('Something went wrong', 'Failed to post your ride. Please try again.' });`,
   `Alert.alert('Something went wrong', 'Failed to post your ride. Please try again.')`],
]);

console.log('\nDone. Verify with: grep -rn "Toast.show" core features --include="*.js"');
