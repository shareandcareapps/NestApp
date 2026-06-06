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
    body: 'NestApp is a platform connecting community members and does not facilitate or guarantee any transactions. Any exchange of goods, services, or money between users is solely between those users. We are not responsible for disputes, fraud, or losses arising from user interactions.',
  },
  {
    title: '6. Carpooling & Rides',
    body: 'The carpool feature connects drivers and passengers. NestApp does not verify driving licenses, vehicle insurance, or the safety of any vehicle. Users participate in carpooling at their own risk. We strongly recommend verifying the identity of other users before sharing rides.',
  },
  {
    title: '7. Account Termination',
    body: 'We reserve the right to suspend or terminate accounts that violate these terms, engage in harmful behavior, or for any other reason at our discretion. You may delete your account at any time from the Settings screen.',
  },
  {
    title: '8. Disclaimer of Warranties',
    body: 'NestApp is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any damages resulting from your use of the app.',
  },
  {
    title: '9. Changes to Terms',
    body: 'We may update these Terms at any time. Continued use of NestApp after changes constitutes acceptance. We will notify users of significant changes via in-app notice.',
  },
  {
    title: '10. Contact',
    body: 'For questions about these Terms, contact us at:\n\nShare & Care Labs\nEmail: support@shareandcareapps.com',
  },
];

export default function TermsScreen() {
  const colors = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.lastUpdated, { color: colors.textLight }]}>Last updated: June 2025</Text>
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
