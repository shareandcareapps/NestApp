import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating an account or using NestApp, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the app.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 13 years old to use NestApp. By using the app, you represent that you meet this requirement. The app is intended for members of the Indian community in St. Louis, Missouri.',
  },
  {
    title: '3. User Conduct',
    body: 'You agree not to post false, misleading, or fraudulent listings. You agree not to harass, threaten, or harm other users. You agree not to use the platform for any illegal activity. Violations may result in immediate account suspension.',
  },
  {
    title: '4. Listings & Content',
    body: 'You are solely responsible for the accuracy of any listings or content you post. NestApp does not verify the accuracy of user-generated content. We reserve the right to remove any content that violates these terms or community guidelines.',
  },
  {
    title: '5. Transactions & Disputes',
    body: 'NestApp is an advertising and community platform. It does not facilitate, process, or guarantee any transaction, and does not handle payments. Any exchange of goods, services, food, or money between users happens off-app and is solely between those users. We are not a party to, and are not responsible for, any dispute, fraud, injury, or loss arising from user interactions.',
  },
  {
    title: '6. Food, Tiffin & Catering Listings',
    body: 'Food listings are advertisements posted by independent users and businesses. NestApp does not cook, prepare, inspect, license, store, deliver, or sell any food, and does not verify that any poster holds the licenses or permits required by law. Anyone posting food is solely responsible for complying with all applicable local, state, and federal food-safety, licensing, permitting, and labeling laws, and for accurately disclosing ingredients and allergens. By posting food you represent that you accept this responsibility. Users who obtain food do so at their own risk and should confirm ingredients, allergens, and food handling directly with the poster. NestApp accepts no liability for any illness, injury, allergic reaction, or loss arising from food advertised on the platform.',
  },
  {
    title: '7. Carpooling & Rides',
    body: 'The carpool feature is a community cost-sharing tool that connects drivers and passengers. It is not a taxi, livery, or transportation network (rideshare) service, and drivers may not use it to operate a for-hire business or earn a profit; only voluntary sharing of trip costs (such as fuel and tolls) is contemplated. NestApp does not verify driving licenses, vehicle insurance, vehicle condition, or the safety of any driver, passenger, or vehicle. Drivers are responsible for holding a valid license and appropriate insurance; a personal auto policy may not cover for-hire driving. Users participate in carpooling entirely at their own risk and should verify the identity of other users before sharing rides.',
  },
  {
    title: '8. Account Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in harmful behavior, or for any other reason at our discretion. You may delete your account at any time from the Settings screen.',
  },
  {
    title: '9. Disclaimer of Warranties',
    body: 'NestApp is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any damages resulting from your use of the app.',
  },
  {
    title: '10. Copyright & DMCA',
    body: 'NestApp respects intellectual property rights. If you believe content on our platform infringes your copyright, please send a written notice to support@shareandcareapps.com with: (a) identification of the copyrighted work; (b) identification of the infringing material and its location in the app; (c) your contact information; (d) a statement of good-faith belief that the use is not authorised; and (e) a statement, under penalty of perjury, that the information is accurate and you are the copyright owner or authorised to act on their behalf. We will respond to valid notices promptly and remove infringing content in accordance with the Digital Millennium Copyright Act (DMCA). Repeat infringers will have their accounts terminated.',
  },
  {
    title: '11. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of NestApp after changes constitutes acceptance. We will notify users of significant changes via in-app notice.',
  },
  {
    title: '12. Contact',
    body: 'For questions about these Terms, contact us at:\n\nShare & Care Labs\nEmail: support@shareandcareapps.com',
  },
];

export default function TermsScreen() {
  const colors = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.lastUpdated, { color: colors.textLight }]}>Last updated: June 2026</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        These Terms & Conditions govern your use of NestApp, operated by Share & Care Labs. Please read them carefully before using the app.
      </Text>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{s.title}</Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48 },
  lastUpdated: { fontSize: 12, marginBottom: 12 },
  intro: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
