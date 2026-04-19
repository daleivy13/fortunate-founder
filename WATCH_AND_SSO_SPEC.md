# PoolPal AI — Apple Watch App Specification

## Overview
A native watchOS companion to the PoolPal AI mobile app.
Built in Swift/SwiftUI — requires Xcode and Apple Developer account ($99/yr).

---

## Screens

### 1. Today's Route (main face complication)
- Number of stops remaining today
- Tap → opens route list on watch
- Color: green if on track, amber if behind, red if critical stops pending

### 2. Route List
```
Rivera Family       ✓ done
Johnson Residence  ⚠ EN ROUTE — 3 alerts
Park Estates HOA    ○ pending
Desert Oasis        ○ pending
```

### 3. Stop Detail (tap any stop)
- Pool name + address
- 3 chemistry action items max (truncated)
- Task reminders: "Filter overdue — 12 days"
- Buttons: Mark Done | Navigate | Call

### 4. Chemistry Quick Log
- Crown scroll to adjust: Cl / pH / Temp
- Tap Cl → scroll wheel → set value
- Tap "Log" → syncs to phone
- AI recommendation appears as haptic notification

### 5. Task Completion
- Swipe right on task → ✓ complete with haptic feedback
- Syncs to phone immediately via WatchConnectivity

### 6. GPS Mileage
- Active route indicator with current mileage
- Auto-tracks when in route mode on phone
- Tap to see today's mileage + tax deduction

---

## Complications (watch face widgets)

| Complication      | Shows                                    |
|-------------------|------------------------------------------|
| Circular small    | Stops remaining today (e.g. "3")         |
| Modular small     | Next stop name                           |
| Modular large     | Full route progress + next alert         |
| Graphic corner    | Miles today + $ deduction                |

---

## WatchConnectivity Integration
```swift
import WatchConnectivity

// Send route to watch
WCSession.default.sendMessage([
    "stops": encodedStops,
    "alerts": encodedAlerts,
    "currentMiles": totalMiles
], replyHandler: nil)

// Receive task completion from watch
func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    if let taskId = message["completeTask"] as? Int {
        completeTask(taskId)
    }
}
```

---

## Implementation Steps
1. Add Watch target to Xcode project (File → New → Target → Watch App)
2. Share model types between iOS and watchOS targets
3. Implement WCSession in both iOS and watchOS delegates
4. Build watchOS SwiftUI views for 4 screens above
5. Add complication providers for each complication type
6. Test on Apple Watch Series 4+ (required for complications API)
7. Submit as part of iOS app review — no separate Watch submission needed

---

# Enterprise SSO Configuration (Firebase SAML)

## Supported Providers
- Google Workspace (SAML 2.0)
- Microsoft Azure AD / Entra ID
- Okta
- OneLogin

## Setup in Firebase Console
1. Authentication → Sign-in method → Add new provider → SAML
2. Enter IdP (Identity Provider) Entity ID from your corporate SSO
3. Enter SSO URL from your corporate IdP
4. Upload your IdP's certificate (download from Google Workspace/Okta admin)
5. Copy your Firebase SP Entity ID and ACS URL back to your IdP

## Code (already works with Firebase Auth)
```typescript
import { signInWithPopup, SAMLAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

const provider = new SAMLAuthProvider("saml.your-company");
const result   = await signInWithPopup(auth, provider);
// result.user is now authenticated with corporate identity
```

## Who needs this
- HOA management companies with IT departments
- Resort/hotel chains with 50+ employees
- Franchise operators with corporate Google Workspace
- Any Enterprise plan customer at $399+/month
- Required for SOC 2 compliance

## Env vars needed
```
FIREBASE_SAML_ENTITY_ID=
FIREBASE_SAML_SSO_URL=
FIREBASE_SAML_CERTIFICATE=
```
