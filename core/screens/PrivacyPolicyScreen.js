import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide when creating an account (name, email, phone number) and content you post (listings, messages, ride details). We also collect usage data such as screens visited and actions taken within the app.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to operate the app, display your listings and profile to other community members, enable messaging between users, and improve app functionality. We do not sell your personal data to third parties.',
  },
  {
    title: '3. Data Sharing',
    body: 'Your public profile (name, username) and listings are visible to other signed-in users of NestApp. Private messages are only visible to the participants of each conversation. We use Supabase as our backend provider, which stores data securely on servers in the United States.',
  },
  {
    title: '4. Data Retention',
    body: 'Your account data is retained as long as your account is active. You may request deletion of your account and associated data by contacting us at support@shareandcareaapps.com. Deleted data may remain in backups for up to 30 days.',
  },
  {
    title: '5. Security',
    body: 'We use industry-standard security measures including encrypted connections (HTTPS/TLS) and Supabase Row-Level Security policies to protect your data. However, no method of transmission over the internet is 100% secure.',
  },
  {
    title: '6. Children\'s Privacy',
    body: 'NestApp is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.',
  },
  {
    title: '7. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes via a notice in the app. Continued use of NestApp after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '8. Contact Us',
    body: 'If you have questions about this Privacy Policy, please contact us at:\n\nShare & Care Labs\nEmail: support@shareandcareapps.com',
  },
];

export default function PrivacyPolicyScreen() {
  const colors = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.lastUpdated, { color: colors.textLight }]}>Last updated: June 2025</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        NestApp ("we", "our", or "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our app.
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
