import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  {
    key: 'Home',
    icon: 'home',
    iconOutline: 'home-outline',
    gradient: ['#F4A833', '#FFCA6A'],
  },
  {
    key: 'Classifieds',
    icon: 'bag',
    iconOutline: 'bag-outline',
    gradient: ['#FF6B6B', '#FF9A9A'],
  },
  {
    key: 'Carpool',
    icon: 'car',
    iconOutline: 'car-outline',
    gradient: ['#00C48C', '#00E5A8'],
  },
  {
    key: 'News',
    icon: 'flash',
    iconOutline: 'flash-outline',
    gradient: ['#0099FF', '#33AAFF'],
  },
  {
    key: 'Messages',
    icon: 'chatbubble-ellipses',
    iconOutline: 'chatbubble-ellipses-outline',
    gradient: ['#9B59B6', '#B87FCC'],
  },
];

function TabItem({ tab, isActive, onPress, unreadCount }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.12 : 1,
      useNativeDriver: true,
      tension: 140,
      friction: 8,
    }).start();
  }, [isActive]);

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <TouchableOpacity onPress={handlePress} style={styles.tabItem} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {isActive ? (
          <LinearGradient
            colors={tab.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeWrap}
          >
            <Ionicons name={tab.icon} size={22} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={styles.inactiveWrap}>
            <Ionicons name={tab.iconOutline} size={22} color="rgba(255,255,255,0.55)" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation, unreadMessages = 0 }) {
  const insets = useSafeAreaInsets();

  // Hide tab bar when any active tab's stack has navigated deeper than the root screen
  const activeRoute = state.routes[state.index];
  const nestedState = activeRoute?.state;
  const isSubScreen = nestedState != null && nestedState.index > 0;
  if (isSubScreen) return null;

  return (
    <View style={[styles.outerContainer, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.pillContainer}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 60}
          tint={Platform.OS === 'ios' ? 'systemUltraThinMaterialDark' : 'dark'}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.pillBorder} />

        {state.routes.map((route, index) => {
          const tab = TABS.find((t) => t.key === route.name);
          if (!tab) return null;

          const isActive = state.index === index;
          const unread = route.name === 'Messages' ? unreadMessages : 0;

          return (
            <TabItem
              key={route.key}
              tab={tab}
              isActive={isActive}
              unreadCount={unread}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 40,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  pillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeWrap: {
    width: 48,
    height: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveWrap: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
