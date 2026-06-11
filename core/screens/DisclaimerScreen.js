import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const SECTIONS = [
  {
    title: 'Community Platform',
    body: 'NestApp is a community platform that connects members of the Indian community in St. Louis. We provide tools for members to post listings, find rides, and communicate — but we do not verify, endorse, or guarantee any content posted by users.',
  },
  {
    title: 'Listings & Transactions',
    body: 'We are not responsible for the accuracy, completeness, or legality of any listing posted on NestApp. Any transaction, agreement, or exchange between users is solely between those parties. NestApp is not a party to any such transaction and accepts no liability for disputes, losses, or damages arising from them.',
  },
  {
    title: 'Food & Catering',
    body: 'Food, tiffin, and catering listings are advertisements posted by independent users and businesses. NestApp does not cook, prepare, inspect, license, deliver, or sell food, and does not verify that any poster holds the permits or licenses required by law. Each poster is solely responsible for food safety, licensing, and allergen disclosure. Anyone obtaining food does so at their own risk and should confirm ingredients and allergens directly with the poster. We accept no liability for any illness, allergic reaction, or loss arising from food advertised on NestApp.',
  },
  {
    title: 'Carpool & Rides',
    body: 'The carpool feature is a community cost-sharing tool only — it is not a taxi or rideshare service, and is not intended for for-hire or profit-making driving. We do not verify driving licences, vehicle conditions, or insurance. Drivers are responsible for holding a valid licence and suitable insurance, and a personal policy may not cover for-hire driving. Users participate in carpooling entirely at their own risk. Always exercise caution and good judgement when sharing rides with others.',
  },
  {
    title: 'User-Generated Content',
    body: 'Content posted by users (listings, messages, news articles) reflects the views of the individual user and not NestApp or Share & Care Labs. We make no representations about the accuracy or reliability of user-generated content.',
  },
  {
    title: 'No Professional Advice',
    body: 'Nothing on NestApp constitutes legal, financial, medical, or professional advice of any kind. Always consult a qualified professional for matters requiring expert guidance.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, Share & Care Labs shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of NestApp, even if we have been advised of the possibility of such damages.',
  },
  {
    title: 'Use at Your Own Discretion',
    body: 'By using NestApp you acknowledge that you understand these limitations and agree to use the platform responsibly and at your own discretion.',
  },
];

export default function DisclaimerScreen() {
  const colors = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.lastUpdated, { color: colors.textLight }]}>Last updated: June 2026</Text>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Please read this disclaimer carefully before using NestApp.
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
