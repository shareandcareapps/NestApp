from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

OUTPUT = "/Users/raamsmacbookpro/Projects/NestApp/NestApp_Revamp_Plan.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    rightMargin=0.75*inch,
    leftMargin=0.75*inch,
    topMargin=0.85*inch,
    bottomMargin=0.85*inch,
    title="NestApp — Full UI/UX Revamp Plan",
    author="NestApp Dev"
)

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle("DocTitle", parent=styles["Title"], fontSize=26,
    textColor=colors.HexColor("#2D1B69"), spaceAfter=6, alignment=TA_CENTER)
subtitle_style = ParagraphStyle("DocSubtitle", parent=styles["Normal"], fontSize=13,
    textColor=colors.HexColor("#F4A833"), spaceAfter=20, alignment=TA_CENTER)
h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=16,
    textColor=colors.HexColor("#2D1B69"), spaceBefore=18, spaceAfter=6,
    borderPad=4)
h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13,
    textColor=colors.HexColor("#F4A833"), spaceBefore=12, spaceAfter=4)
h3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=11,
    textColor=colors.HexColor("#FF6B6B"), spaceBefore=8, spaceAfter=3)
body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10,
    textColor=colors.HexColor("#1A1A1A"), leading=15, spaceAfter=4)
bullet = ParagraphStyle("Bullet", parent=body, leftIndent=16, bulletIndent=6,
    spaceAfter=3)
note = ParagraphStyle("Note", parent=body, fontSize=9,
    textColor=colors.HexColor("#666666"), leftIndent=12)
session_label = ParagraphStyle("Session", parent=body, fontSize=11,
    textColor=colors.white, backColor=colors.HexColor("#2D1B69"),
    borderPad=6, spaceAfter=4)

def hr():
    return HRFlowable(width="100%", thickness=1,
                      color=colors.HexColor("#F4A833"), spaceAfter=8, spaceBefore=4)

def b(text): return f"<b>{text}</b>"
def gold(text): return f'<font color="#F4A833">{text}</font>'
def indigo(text): return f'<font color="#2D1B69">{text}</font>'

story = []

# ── COVER ─────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 0.6*inch))
story.append(Paragraph("NestApp", title_style))
story.append(Paragraph("Full UI/UX Revamp Plan — All Sessions", subtitle_style))
story.append(hr())
story.append(Paragraph(
    "A complete redesign of every screen, shared component, and design system "
    "for a Gen-Z-attractive, culturally resonant community app serving "
    "Indian, Pakistani, Nepalese, and Arab communities in the USA.",
    ParagraphStyle("Intro", parent=body, alignment=TA_CENTER, fontSize=11,
                   textColor=colors.HexColor("#444444"))
))
story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("Prepared: June 2026  |  Stack: Expo · React Native · Supabase · Zustand",
    ParagraphStyle("Meta", parent=note, alignment=TA_CENTER)))
story.append(PageBreak())

# ── 1. DESIGN IDENTITY ────────────────────────────────────────────────────────
story.append(Paragraph("1. Design Identity", h1))
story.append(hr())
story.append(Paragraph(b("Tagline:") + "  Where culture meets community", body))
story.append(Paragraph(
    b("Design Language:") +
    "  \"South Asian Luxe\" — warm saffron gold + deep jewel tones + glassmorphism "
    "+ soft gradients. Think Airbnb warmth meets Revolut elegance meets BeReal playfulness.",
    body))
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("Color Palette", h2))
color_data = [
    [b("Role"), b("Name"), b("Hex")],
    ["Primary", "Saffron Gold", "#F4A833"],
    ["Secondary", "Deep Indigo", "#2D1B69"],
    ["Accent", "Rose Coral", "#FF6B6B"],
    ["Surface", "Warm White", "#FEFAF4"],
    ["Card BG", "Soft Cream", "#FFF8EE"],
    ["Dark BG", "Midnight Indigo", "#0F0A1E"],
    ["Dark Card", "Deep Purple", "#1A1035"],
    ["Success", "Jade", "#00C48C"],
    ["Info", "Sky", "#0099FF"],
]
ct = Table(color_data, colWidths=[1.5*inch, 2*inch, 1.5*inch])
ct.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#2D1B69")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#FFF8EE"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#DDDDDD")),
    ("ALIGN", (0,0), (-1,-1), "LEFT"),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story.append(ct)
story.append(Spacer(1, 0.1*inch))

story.append(Paragraph("Typography", h2))
story.append(Paragraph(b("Display:") + "  Nunito (rounded, friendly, Gen-Z)", body))
story.append(Paragraph(b("Body:") + "  Inter (clean, legible)", body))
story.append(Paragraph(b("Accent:") + "  Playfair Display (for cultural/elegant headings)", body))
story.append(Spacer(1, 0.05*inch))

story.append(Paragraph("Visual Language", h2))
for item in [
    "Cards: Floating with soft shadow + 16–20px radius",
    "Gradients: Saffron→Coral, Indigo→Purple on headers and CTAs",
    "Glassmorphism: Frosted glass nav bar and modal backgrounds",
    "Micro-animations: Reanimated spring/bounce on every interaction",
    "Haptics: expo-haptics on key taps",
    "Icons: @expo/vector-icons + custom SVG emoji-style icons per section",
]:
    story.append(Paragraph(f"• {item}", bullet))

# ── 2. BOTTOM NAVIGATION ──────────────────────────────────────────────────────
story.append(Paragraph("2. New Bottom Navigation", h1))
story.append(hr())
story.append(Paragraph(
    "Floating pill-shaped glassmorphic nav bar (not full-width). "
    "Active tab: color fill + label appears + scale bounce. "
    "Unread badge on Messages: pulsing red dot.", body))
story.append(Spacer(1, 0.08*inch))
nav_data = [
    [b("Tab"), b("Icon"), b("Label"), b("Accent Color")],
    ["Home", "Flame / Home", "Feed", "#F4A833 Gold"],
    ["Market", "Shopping Bag", "Classifieds", "#FF6B6B Coral"],
    ["Carpool", "Car", "Rides", "#00C48C Jade"],
    ["News", "Spark / Lightning", "Stories", "#0099FF Sky"],
    ["Inbox", "Chat Bubble", "Messages", "#9B59B6 Purple"],
]
nt = Table(nav_data, colWidths=[1.1*inch, 1.6*inch, 1.2*inch, 2*inch])
nt.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#F4A833")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#FFF8EE"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#DDDDDD")),
    ("ALIGN", (0,0), (-1,-1), "LEFT"),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story.append(nt)

# ── 3. SCREEN-BY-SCREEN ───────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("3. Screen-by-Screen Revamp (24 Screens)", h1))
story.append(hr())

screens = [
    ("Auth Screens (Login & Signup)", [
        "Full-screen gradient hero (saffron → coral → indigo) with animated geometric/mandala background",
        "Large centered logo with glow effect",
        "Floating glassmorphic card input fields",
        "Social sign-in buttons (Google, Apple) with pill shape",
        "Smooth slide-up keyboard animation",
        "\"Continue as Guest\" ghost button",
    ]),
    ("Home Screen", [
        "Sticky Header: Greeting + city selector pill + notification bell + avatar",
        "\"What's happening in [City]\" — horizontal 3D-tilting event cards with gradient overlays",
        "Quick Actions Row — pill buttons: Post Listing · Share Ride · Write Story · Start Chat",
        "Featured Listings — horizontal cards with image, price badge, heart button",
        "Nearby Rides — map-style card with pickup/dropoff visual",
        "Community Pulse — latest news cards with category chips",
        "New Members — horizontal avatar scroll (like Twitter Spaces)",
        "Points & Reputation — gamified progress bar card",
    ]),
    ("Classifieds — Browse", [
        "Sticky rounded search bar with filter icon",
        "Category chips row (scrollable): Electronics · Furniture · Cars · Jobs · Services · Food · Events · Housing",
        "Grid/List toggle — Pinterest masonry OR clean list",
        "Each card: image, title, price badge, location dot, time ago, heart + share",
        "Pull-to-refresh with custom lotus spinner animation",
    ]),
    ("Classifieds — Listing Detail", [
        "Full-bleed image carousel with dots + pinch-to-zoom",
        "Floating bottom sheet with price, title, seller card",
        "Animated \"Contact Seller\" CTA button with shimmer effect",
        "Share sheet with custom preview",
        "Related listings horizontal scroll",
    ]),
    ("Classifieds — Post & Edit Listing", [
        "Step-by-step wizard: Photos → Details → Preview",
        "Drag-and-drop photo reorder",
        "Smart category suggestions",
        "Preview card before publish",
    ]),
    ("Carpool — Browse Rides", [
        "Map-first layout with mini static map on each card",
        "Route visualization: FROM → TO with animated dotted line",
        "Filter bar: Today · This Week · Long Distance",
        "Ride card: avatar, name, route, seats, price, rating stars",
    ]),
    ("Carpool — Ride Detail", [
        "Full route map view",
        "Driver profile card (rating, trips, member since)",
        "Interactive seat selector dots",
        "Real-time seat availability counter",
    ]),
    ("Carpool — Post & Edit Ride", [
        "Map-based from/to picker",
        "Animated seat count selector",
        "Price per seat calculator",
        "Custom styled scheduled departure time picker",
    ]),
    ("News — Feed", [
        "Instagram Stories-style horizontal circles at top (community highlights)",
        "Card feed: large hero image, category chip, title, author avatar, read time",
        "Category filter chips: All · India · Pakistan · Nepal · Arab · Local · Events",
        "Trending hashtags row",
        "Bookmark + share on each card",
    ]),
    ("News — Detail & Post", [
        "Full-bleed header image",
        "Author card with follow button",
        "Rich text content with related articles",
        "Comment section (threaded)",
        "Rich text editor with photo upload, crop, category, tags, publish/draft",
    ]),
    ("Messages — Conversations", [
        "Large avatar with online indicator dot",
        "Last message preview + unread count badge",
        "Swipe actions: Archive · Delete · Mute",
        "Fuzzy search bar",
        "Empty state with warm illustration + \"Start connecting\" CTA",
    ]),
    ("Messages — Chat", [
        "Gradient bubbles for sent messages",
        "Long-press emoji reactions",
        "Inline image sharing",
        "Animated typing indicator (three dots)",
        "Voice message button",
        "Read receipts (double tick)",
    ]),
    ("Profile", [
        "Gradient hero with editable avatar",
        "Stats row: Listings · Rides · Stories · Rating",
        "Reputation badge: Bronze / Silver / Gold / Diamond (points-based)",
        "Tabs: Activity · Listings · Reviews",
    ]),
    ("Settings", [
        "Grouped sections with icons and chevrons",
        "Animated Dark/Light/Auto theme toggle (sun/moon)",
        "Notification preferences per feature",
        "Language preference: English, Hindi, Urdu, Nepali, Arabic",
        "Privacy controls + logout with confirmation sheet",
    ]),
]

for title, points in screens:
    story.append(Paragraph(title, h2))
    for p in points:
        story.append(Paragraph(f"• {p}", bullet))
    story.append(Spacer(1, 0.05*inch))

# ── 4. NEW FEATURES ────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("4. New Features & UX Improvements", h1))
story.append(hr())
features_data = [
    [b("Feature"), b("Inspired By")],
    ["Onboarding flow (3 animated slides)", "Duolingo"],
    ["Skeleton loading screens", "LinkedIn"],
    ["Pull-to-refresh custom animation", "Twitter"],
    ["Empty states with illustrations", "Slack"],
    ["Toast notifications (slide-up)", "iOS native"],
    ["Haptic feedback on key actions", "iPhone"],
    ["Search with filters (classifieds + rides)", "Airbnb"],
    ["Image lazy loading with blur placeholder", "Medium"],
    ["Offline banner", "Gmail"],
    ["Points/Gamification progress on Home", "Duolingo"],
    ["Verified badge for active members", "Twitter"],
    ["Report/Flag content (safety)", "Reddit"],
    ["Share listing to external apps", "Marketplace"],
    ["Community category filter everywhere", "Nextdoor"],
    ["Deep linking support", "Airbnb"],
]
ft = Table(features_data, colWidths=[4*inch, 2*inch])
ft.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#FF6B6B")),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#FFF8EE"), colors.white]),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#DDDDDD")),
    ("ALIGN", (0,0), (-1,-1), "LEFT"),
    ("LEFTPADDING", (0,0), (-1,-1), 8),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
story.append(ft)

# ── 5. SHARED COMPONENTS ──────────────────────────────────────────────────────
story.append(Spacer(1, 0.15*inch))
story.append(Paragraph("5. New Shared Components to Build", h1))
story.append(hr())
components = [
    ("GradientHeader", "Reusable gradient top section with title, back button, avatar"),
    ("FloatingTabBar", "Custom glassmorphic bottom navigation pill"),
    ("FeatureCard", "Reusable card with image, title, meta, actions"),
    ("CategoryChips", "Horizontal scrollable filter chips"),
    ("AvatarStack", "Overlapping avatar group (New Members, etc.)"),
    ("SkeletonLoader", "Animated shimmer loading placeholder"),
    ("ToastNotification", "Slide-up toast for success/error/info"),
    ("EmptyState", "Illustration + headline + CTA button"),
    ("SearchBar", "Rounded search input with filter button"),
    ("StepProgress", "Wizard step indicator for multi-step forms"),
    ("BadgeChip", "Colored label chips (category, status)"),
    ("PulsingDot", "Animated online/unread indicator"),
]
for name, desc in components:
    story.append(Paragraph(f"<b>{name}</b> — {desc}", bullet))

# ── 6. NEW PACKAGES ────────────────────────────────────────────────────────────
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph("6. New Packages to Install", h1))
story.append(hr())
packages = [
    ("expo-font", "Nunito + Inter custom fonts"),
    ("expo-haptics", "Haptic feedback on interactions"),
    ("expo-linear-gradient", "Gradients throughout the app"),
    ("expo-blur", "Glassmorphism effects"),
    ("lottie-react-native", "Lottie animations (loading, empty states, onboarding)"),
    ("react-native-toast-message", "Slide-up toast notifications"),
]
for pkg, purpose in packages:
    story.append(Paragraph(f"<b>{pkg}</b> — {purpose}", bullet))

# ── 7. SESSION PLAN ────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("7. Implementation Session Plan", h1))
story.append(hr())
story.append(Paragraph(
    "Each session is a separate Claude Code conversation. "
    "Start a new chat, say \"start session N\" and Claude will pick up exactly here.",
    note))
story.append(Spacer(1, 0.1*inch))

sessions = [
    ("Session 1", "Theme + Foundation", [
        "Install new packages: expo-font, expo-haptics, expo-linear-gradient, expo-blur, lottie-react-native, react-native-toast-message",
        "Rewrite core/theme/index.js — new color palette, typography scale, spacing, shadows",
        "Load custom fonts (Nunito, Inter) in App.js",
        "Build FloatingTabBar component (glassmorphic pill, animated active state)",
        "Build GradientHeader shared component",
        "Build SkeletonLoader, ToastNotification, EmptyState, BadgeChip, CategoryChips, SearchBar, PulsingDot, AvatarStack, StepProgress",
        "Update core/navigation/index.js to use new FloatingTabBar",
    ]),
    ("Session 2", "Auth Screens + Home Screen", [
        "Rebuild LoginScreen — gradient hero, mandala background, glassmorphic inputs, Google/Apple sign-in",
        "Rebuild SignupScreen — same design language, step validation",
        "Rebuild HomeScreen — sticky header, quick actions, featured listings, nearby rides, community pulse, members scroll, points card",
    ]),
    ("Session 3", "Classifieds (All 4 Screens)", [
        "Rebuild BrowseListingsScreen — search bar, category chips, masonry grid, card design",
        "Rebuild ListingDetailScreen — image carousel, bottom sheet, seller card, related listings",
        "Rebuild PostListingScreen — 3-step wizard, drag-drop photos, preview",
        "Rebuild EditListingScreen — same wizard pattern pre-filled",
    ]),
    ("Session 4", "Carpool (All 4 Screens)", [
        "Rebuild BrowseRidesScreen — route cards, map previews, filters",
        "Rebuild RideDetailScreen — map view, driver profile, seat selector",
        "Rebuild PostRideScreen — map picker, seat selector, price calculator",
        "Rebuild EditRideScreen — pre-filled version of PostRide",
    ]),
    ("Session 5", "News + Messages", [
        "Rebuild NewsFeedScreen — stories circles, card feed, category chips, trending",
        "Rebuild NewsDetailScreen — full bleed image, author card, comments",
        "Rebuild PostNewsScreen — rich text editor, photo upload, tags",
        "Rebuild ConversationsScreen — avatars, swipe actions, search, empty state",
        "Rebuild ChatScreen — gradient bubbles, reactions, typing indicator, voice, read receipts",
    ]),
    ("Session 6", "Profile, Settings & Polish", [
        "Rebuild EditProfileScreen — gradient hero, avatar upload, stats row",
        "Rebuild SettingsScreen — grouped sections, theme toggle, language, notifications",
        "Rebuild MyListingsScreen and MyRidesScreen",
        "Add onboarding flow (3 animated slides shown on first launch)",
        "Add haptic feedback throughout the app",
        "Add skeleton loaders to all list/feed screens",
        "Final polish: animations, transitions, empty states, toast notifications",
    ]),
]

for session_id, session_title, tasks in sessions:
    bg = colors.HexColor("#2D1B69") if "1" in session_id else \
         colors.HexColor("#F4A833") if "2" in session_id else \
         colors.HexColor("#FF6B6B") if "3" in session_id else \
         colors.HexColor("#00C48C") if "4" in session_id else \
         colors.HexColor("#0099FF") if "5" in session_id else \
         colors.HexColor("#9B59B6")
    header_style = ParagraphStyle(f"SH{session_id}", parent=body, fontSize=12,
        textColor=colors.white, backColor=bg, borderPad=8, spaceAfter=5)
    story.append(Paragraph(f"{session_id}: {session_title}", header_style))
    for t in tasks:
        story.append(Paragraph(f"• {t}", bullet))
    story.append(Spacer(1, 0.1*inch))

# ── FOOTER NOTE ────────────────────────────────────────────────────────────────
story.append(hr())
story.append(Paragraph(
    "To resume in a new chat: say \"start session N\" or \"let's do session N\" — "
    "Claude will have this plan saved in memory and will begin immediately without asking for context.",
    ParagraphStyle("Footer", parent=note, alignment=TA_CENTER, fontSize=9,
                   textColor=colors.HexColor("#888888"))
))

doc.build(story)
print(f"PDF saved to: {OUTPUT}")
