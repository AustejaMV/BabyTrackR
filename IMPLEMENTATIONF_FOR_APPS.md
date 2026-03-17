Here it is — one giant prompt covering the complete Capacitor + native watch + native widget stack.

---

> "You are working on Cradl, a baby tracking app. The existing codebase is a React + Vite + TypeScript web app. The goal of this prompt is to add Capacitor for iOS and Android app distribution, a Swift WidgetKit + WatchKit extension for iOS, and a Kotlin Glance widget + Wear OS module for Android. The React web app code is never modified except where explicitly instructed. All business logic, utilities, storage, and UI stay in React.
>
> Read the entire existing codebase before starting. Work through each section in order. After completing each section, add a checklist item to `IMPLEMENTATION_SUMMARY.md` marked [DONE] if tests pass or [PARTIAL] with notes if not.
>
> ═══════════════════════════════════════
> SECTION 1 — CAPACITOR SETUP
> ═══════════════════════════════════════
>
> Install Capacitor and all required plugins in a single npm install command: `@capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/preferences @capacitor/push-notifications @capacitor/camera @capacitor/filesystem @capacitor/share @capacitor/haptics @capacitor/app @capacitor/device @capacitor/network @capacitor/local-notifications @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor-community/http`.
>
> Run `npx cap init Cradl app.cradl --web-dir dist`. Run `npx cap add android` and `npx cap add ios`.
>
> Create `capacitor.config.ts`:
> ```typescript
> import { CapacitorConfig } from '@capacitor/cli';
> const config: CapacitorConfig = {
>   appId: 'app.cradl',
>   appName: 'Cradl',
>   webDir: 'dist',
>   server: { androidScheme: 'https' },
>   plugins: {
>     SplashScreen: {
>       launchShowDuration: 2000,
>       backgroundColor: '#fffbf5',
>       showSpinner: false,
>       androidSplashResourceName: 'splash',
>       iosSplashResourceName: 'Splash'
>     },
>     PushNotifications: {
>       presentationOptions: ['badge', 'sound', 'alert']
>     },
>     LocalNotifications: {
>       smallIcon: 'ic_notification',
>       iconColor: '#ff8c69'
>     }
>   }
> };
> export default config;
> ```
>
> In `package.json` scripts, update the build script to: `"build": "vite build && npx cap sync"`. This ensures every build syncs to both native platforms automatically.
>
> ═══════════════════════════════════════
> SECTION 2 — STORAGE MIGRATION
> ═══════════════════════════════════════
>
> Create `src/storage/capacitorStorage.ts`. This is the single storage abstraction used throughout the app. It uses `@capacitor/preferences` which falls back to `localStorage` automatically on web — no platform checks needed anywhere in the app code.
>
> Export `storage` object with these async methods: `get(key: string): Promise<string | null>`, `set(key: string, value: string): Promise<void>`, `remove(key: string): Promise<void>`, `clear(): Promise<void>`. Each method calls the corresponding `Preferences` method from `@capacitor/preferences`. All methods wrap in try/catch — on error, log to `console.error` with the key name and return null/undefined rather than throwing. Guard: `key` must be a non-empty string — throw `new Error('Storage key must be non-empty')` synchronously if violated.
>
> Export typed helpers: `storageGetJSON<T>(key: string): Promise<T | null>` — calls `storage.get`, parses JSON, returns null on parse error. `storageSetJSON(key: string, value: unknown): Promise<void>` — stringifies and calls `storage.set`. Guard: if `JSON.stringify` throws, log error and do not write.
>
> Create `src/storage/keys.ts`: export `STORAGE_KEYS` as a const object containing every storage key used in the existing codebase as typed constants. Search for all string literals matching `'babytrackr-'` and `'cradl-'` patterns in the codebase and add each as a key. Example: `FEEDING_HISTORY: 'babytrackr-feedingHistory'`. Every key in the app must be in this object — no hardcoded strings anywhere.
>
> Migrate every existing `localStorage.getItem`, `localStorage.setItem`, `localStorage.removeItem` call in the codebase to use the new async storage functions. Since the storage is now async, update all calling code to be async/await. This is a mechanical find-and-replace — the logic does not change, only the async wrapper. Update all storage utility files (feedingStorage.ts, sleepStorage.ts, diaperStorage.ts etc) to import from `src/storage/capacitorStorage.ts` and use async/await throughout.
>
> ═══════════════════════════════════════
> SECTION 3 — THE NATIVE BRIDGE PLUGIN
> ═══════════════════════════════════════
>
> This is the single plugin that connects the React app to all native watch and widget functionality. It is called once after every log save — that single call updates everything: iOS widget, iOS Watch, Android widget, Android Watch.
>
> Create `src/plugins/NativeBridge.ts`:
> ```typescript
> import { registerPlugin } from '@capacitor/core';
>
> export interface WidgetState {
>   lastFeedTime: string | null;
>   lastFeedSide: string | null;
>   nextFeedEta: string | null;
>   napWindowStatus: 'open' | 'approaching' | 'closed' | 'unknown';
>   napWindowOpensAt: string | null;
>   napWindowClosesAt: string | null;
>   awakeMinutes: number | null;
>   lastDiaperTime: string | null;
>   lastDiaperType: string | null;
>   diapersToday: number;
>   feedsToday: number;
>   sleepToday: string | null;
>   babyName: string | null;
>   updatedAt: string;
> }
>
> export interface NativeBridgePlugin {
>   updateWidgetState(options: { state: string }): Promise<void>;
>   refreshWidget(): Promise<void>;
>   getPendingWidgetLogs(): Promise<{ logs: string }>;
>   clearPendingWidgetLogs(): Promise<void>;
> }
>
> export const NativeBridge = registerPlugin<NativeBridgePlugin>(
>   'NativeBridge',
>   {
>     web: {
>       async updateWidgetState() {},
>       async refreshWidget() {},
>       async getPendingWidgetLogs() { return { logs: '[]' }; },
>       async clearPendingWidgetLogs() {}
>     }
>   }
> );
> ```
>
> The `web` fallback object means the plugin calls are no-ops on the web platform — no errors thrown, no platform checks needed in calling code.
>
> Create `src/utils/nativeBridge.ts`: export `syncNativeState(allHistory: AllHistory, babyProfile: BabyProfile): Promise<void>`. This function: computes the `WidgetState` from existing utility functions (calls `getSweetSpotPrediction`, reads last feed/sleep/diaper from history, computes today's counts), calls `NativeBridge.updateWidgetState({ state: JSON.stringify(widgetState) })`. Guard: wrap entire function in try/catch — native bridge failures must never crash the app or block a log save. Log errors to console only.
>
> Export `setupWidgetLogSync(): void`. This sets up a listener using `App.addListener('appStateChange', handler)`. When `isActive` becomes true (app comes to foreground): calls `NativeBridge.getPendingWidgetLogs()`, parses the JSON array, for each log entry calls the appropriate existing save function (`saveFeedEntry`, `saveDiaperEntry` etc), then calls `NativeBridge.clearPendingWidgetLogs()`. Guard: if parsing fails, call `clearPendingWidgetLogs()` anyway to prevent accumulation of bad data. Guard: only process logs with a valid `source: 'widget'` field — ignore any malformed entries.
>
> Call `syncNativeState()` at the end of every log save handler throughout the existing app. Call `setupWidgetLogSync()` once in the app root component's `useEffect` on mount.
>
> ═══════════════════════════════════════
> SECTION 4 — iOS SWIFT: NATIVE BRIDGE PLUGIN
> ═══════════════════════════════════════
>
> Create `ios/App/App/NativeBridgePlugin.swift`. This file implements the Capacitor plugin that the React code calls.
>
> ```swift
> import Capacitor
> import WidgetKit
> import WatchConnectivity
>
> @objc(NativeBridgePlugin)
> public class NativeBridgePlugin: CAPPlugin {
>
>     private let appGroupId = "group.app.cradl"
>
>     @objc func updateWidgetState(_ call: CAPPluginCall) {
>         guard let stateString = call.getString("state"),
>               let stateData = stateString.data(using: .utf8) else {
>             call.reject("Invalid state data")
>             return
>         }
>
>         // Write to App Group UserDefaults (readable by Widget and Watch extensions)
>         let defaults = UserDefaults(suiteName: appGroupId)
>         defaults?.set(stateData, forKey: "widget_state")
>         defaults?.synchronize()
>
>         // Reload all WidgetKit timelines
>         if #available(iOS 14.0, *) {
>             WidgetCenter.shared.reloadAllTimelines()
>         }
>
>         // Send to Apple Watch if reachable
>         if WCSession.isSupported() {
>             let session = WCSession.default
>             if session.isPaired && session.isWatchAppInstalled {
>                 // Update application context (persists even if watch is not reachable)
>                 try? session.updateApplicationContext(["widget_state": stateString])
>
>                 // Also send as message if reachable (immediate delivery)
>                 if session.isReachable {
>                     session.sendMessage(
>                         ["widget_state": stateString],
>                         replyHandler: nil,
>                         errorHandler: { error in
>                             print("Watch send error: \(error)")
>                         }
>                     )
>                 }
>             }
>         }
>
>         call.resolve()
>     }
>
>     @objc func refreshWidget(_ call: CAPPluginCall) {
>         if #available(iOS 14.0, *) {
>             WidgetCenter.shared.reloadAllTimelines()
>         }
>         call.resolve()
>     }
>
>     @objc func getPendingWidgetLogs(_ call: CAPPluginCall) {
>         let defaults = UserDefaults(suiteName: appGroupId)
>         let logs = defaults?.string(forKey: "pending_widget_logs") ?? "[]"
>         call.resolve(["logs": logs])
>     }
>
>     @objc func clearPendingWidgetLogs(_ call: CAPPluginCall) {
>         let defaults = UserDefaults(suiteName: appGroupId)
>         defaults?.set("[]", forKey: "pending_widget_logs")
>         defaults?.synchronize()
>         call.resolve()
>     }
> }
> ```
>
> Create `ios/App/App/NativeBridgePlugin.m` (Objective-C bridge file required by Capacitor):
> ```objc
> #import <Capacitor/Capacitor.h>
> CAP_PLUGIN(NativeBridgePlugin, "NativeBridge",
>     CAP_PLUGIN_METHOD(updateWidgetState, CAPPluginReturnPromise);
>     CAP_PLUGIN_METHOD(refreshWidget, CAPPluginReturnPromise);
>     CAP_PLUGIN_METHOD(getPendingWidgetLogs, CAPPluginReturnPromise);
>     CAP_PLUGIN_METHOD(clearPendingWidgetLogs, CAPPluginReturnPromise);
> )
> ```
>
> In Xcode: open `ios/App/App.xcworkspace`. Select the App target. Go to Signing & Capabilities. Add the App Groups capability. Add group `group.app.cradl`. This must be done in Xcode — it cannot be done from the command line. The App Group is what allows the widget and watch extensions to read the same UserDefaults as the main app.
>
> ═══════════════════════════════════════
> SECTION 5 — iOS SWIFT: WIDGETKIT EXTENSION
> ═══════════════════════════════════════
>
> In Xcode: File > New > Target > Widget Extension. Name: `CradlWidget`. Include Live Activity: No. Include Configuration App Intent: No. This creates `ios/CradlWidget/` directory.
>
> Add the App Group `group.app.cradl` to the CradlWidget target's capabilities in Xcode.
>
> Create `ios/CradlWidget/WidgetState.swift`:
> ```swift
> import Foundation
>
> struct WidgetState: Codable {
>     let lastFeedTime: String?
>     let lastFeedSide: String?
>     let nextFeedEta: String?
>     let napWindowStatus: String
>     let napWindowOpensAt: String?
>     let napWindowClosesAt: String?
>     let awakeMinutes: Int?
>     let lastDiaperTime: String?
>     let lastDiaperType: String?
>     let diapersToday: Int
>     let feedsToday: Int
>     let sleepToday: String?
>     let babyName: String?
>     let updatedAt: String
>
>     static func load() -> WidgetState? {
>         guard let defaults = UserDefaults(suiteName: "group.app.cradl"),
>               let data = defaults.data(forKey: "widget_state") else {
>             return nil
>         }
>         return try? JSONDecoder().decode(WidgetState.self, from: data)
>     }
>
>     static var placeholder: WidgetState {
>         WidgetState(
>             lastFeedTime: nil, lastFeedSide: nil, nextFeedEta: nil,
>             napWindowStatus: "unknown", napWindowOpensAt: nil,
>             napWindowClosesAt: nil, awakeMinutes: nil,
>             lastDiaperTime: nil, lastDiaperType: nil,
>             diapersToday: 0, feedsToday: 0, sleepToday: nil,
>             babyName: "Baby", updatedAt: ""
>         )
>     }
>
>     func timeAgo(_ isoString: String?) -> String {
>         guard let str = isoString,
>               let date = ISO8601DateFormatter().date(from: str) else {
>             return "—"
>         }
>         let minutes = Int(-date.timeIntervalSinceNow / 60)
>         if minutes < 1 { return "just now" }
>         if minutes < 60 { return "\(minutes)m ago" }
>         let hours = minutes / 60
>         let mins = minutes % 60
>         if mins == 0 { return "\(hours)h ago" }
>         return "\(hours)h \(mins)m ago"
>     }
>
>     var napWindowText: String {
>         switch napWindowStatus {
>         case "open": return "Nap window open"
>         case "approaching":
>             if let opens = napWindowOpensAt,
>                let date = ISO8601DateFormatter().date(from: opens) {
>                 let mins = Int(date.timeIntervalSinceNow / 60)
>                 return "Nap in ~\(mins)m"
>             }
>             return "Nap window soon"
>         case "closed": return "Past nap window"
>         default: return "Log sleep to predict naps"
>         }
>     }
> }
> ```
>
> Create `ios/CradlWidget/CradlWidgetBundle.swift`:
> ```swift
> import WidgetKit
> import SwiftUI
>
> @main
> struct CradlWidgetBundle: WidgetBundle {
>     var body: some Widget {
>         CradlSmallWidget()
>         CradlMediumWidget()
>         CradlLockScreenWidget()
>     }
> }
> ```
>
> Create `ios/CradlWidget/CradlWidgetViews.swift`. Implement all three widget sizes:
>
> ```swift
> import WidgetKit
> import SwiftUI
>
> // MARK: - Timeline Provider
> struct CradlProvider: TimelineProvider {
>     func placeholder(in context: Context) -> CradlEntry {
>         CradlEntry(date: Date(), state: .placeholder)
>     }
>
>     func getSnapshot(in context: Context, completion: @escaping (CradlEntry) -> Void) {
>         completion(CradlEntry(date: Date(), state: WidgetState.load() ?? .placeholder))
>     }
>
>     func getTimeline(in context: Context, completion: @escaping (Timeline<CradlEntry>) -> Void) {
>         let entry = CradlEntry(date: Date(), state: WidgetState.load() ?? .placeholder)
>         // Refresh every 5 minutes as fallback (app pushes updates proactively)
>         let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
>         let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
>         completion(timeline)
>     }
> }
>
> struct CradlEntry: TimelineEntry {
>     let date: Date
>     let state: WidgetState
> }
>
> // MARK: - Colours (hardcoded — widgets cannot use asset catalogues dynamically)
> extension Color {
>     static let cradlCream = Color(red: 1.0, green: 0.984, blue: 0.961)
>     static let cradlText = Color(red: 0.239, green: 0.173, blue: 0.173)
>     static let cradlMuted = Color(red: 0.604, green: 0.502, blue: 0.502)
>     static let cradlCoral = Color(red: 1.0, green: 0.549, blue: 0.412)
>     static let cradlBlue = Color(red: 0.478, green: 0.702, blue: 0.831)
>     static let cradlGreen = Color(red: 0.549, green: 0.737, blue: 0.486)
>     static let cradlAmber = Color(red: 0.961, green: 0.651, blue: 0.137)
> }
>
> // MARK: - Small Widget (2x2)
> struct SmallWidgetView: View {
>     let state: WidgetState
>
>     var body: some View {
>         VStack(alignment: .leading, spacing: 4) {
>             Text(state.babyName ?? "Baby")
>                 .font(.system(size: 13, weight: .medium))
>                 .foregroundColor(.cradlText)
>
>             Spacer()
>
>             // Feed row
>             HStack(spacing: 5) {
>                 Circle().fill(Color.cradlCoral).frame(width: 7, height: 7)
>                 Text(state.timeAgo(state.lastFeedTime))
>                     .font(.system(size: 11))
>                     .foregroundColor(.cradlMuted)
>             }
>
>             // Nap row
>             HStack(spacing: 5) {
>                 Circle()
>                     .fill(napColour)
>                     .frame(width: 7, height: 7)
>                 Text(state.napWindowText)
>                     .font(.system(size: 11))
>                     .foregroundColor(.cradlMuted)
>             }
>
>             // Diaper row
>             HStack(spacing: 5) {
>                 Circle().fill(Color.cradlGreen).frame(width: 7, height: 7)
>                 Text(state.timeAgo(state.lastDiaperTime))
>                     .font(.system(size: 11))
>                     .foregroundColor(.cradlMuted)
>             }
>         }
>         .padding(12)
>         .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
>         .background(Color.cradlCream)
>         .widgetURL(URL(string: "cradl://home"))
>     }
>
>     var napColour: Color {
>         switch state.napWindowStatus {
>         case "open": return .cradlGreen
>         case "approaching": return .cradlAmber
>         case "closed": return .cradlCoral
>         default: return .cradlMuted
>         }
>     }
> }
>
> // MARK: - Medium Widget (4x2) with action buttons
> struct MediumWidgetView: View {
>     let state: WidgetState
>
>     var body: some View {
>         HStack(spacing: 0) {
>             // Left: stats
>             VStack(alignment: .leading, spacing: 6) {
>                 Text(state.babyName ?? "Baby")
>                     .font(.system(size: 14, weight: .medium))
>                     .foregroundColor(.cradlText)
>
>                 Spacer()
>
>                 statRow(colour: .cradlCoral,
>                         label: "Fed",
>                         value: state.timeAgo(state.lastFeedTime))
>                 statRow(colour: napColour,
>                         label: "Nap",
>                         value: state.napWindowText)
>                 statRow(colour: .cradlGreen,
>                         label: "Nappy",
>                         value: state.timeAgo(state.lastDiaperTime))
>             }
>             .padding(12)
>             .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
>
>             // Divider
>             Rectangle()
>                 .fill(Color.cradlMuted.opacity(0.2))
>                 .frame(width: 1)
>                 .padding(.vertical, 12)
>
>             // Right: action buttons
>             VStack(spacing: 8) {
>                 actionButton(label: "Feed",
>                              colour: .cradlCoral,
>                              url: "cradl://open-drawer?type=feed")
>                 actionButton(label: "Sleep",
>                              colour: .cradlBlue,
>                              url: "cradl://open-drawer?type=sleep")
>                 actionButton(label: "Nappy",
>                              colour: .cradlGreen,
>                              url: "cradl://open-drawer?type=diaper")
>             }
>             .padding(10)
>             .frame(width: 90)
>         }
>         .background(Color.cradlCream)
>     }
>
>     func statRow(colour: Color, label: String, value: String) -> some View {
>         HStack(spacing: 6) {
>             Circle().fill(colour).frame(width: 7, height: 7)
>             Text(label)
>                 .font(.system(size: 10))
>                 .foregroundColor(.cradlMuted)
>                 .frame(width: 32, alignment: .leading)
>             Text(value)
>                 .font(.system(size: 11))
>                 .foregroundColor(.cradlText)
>         }
>     }
>
>     func actionButton(label: String, colour: Color, url: String) -> some View {
>         Link(destination: URL(string: url)!) {
>             Text(label)
>                 .font(.system(size: 12, weight: .medium))
>                 .foregroundColor(.white)
>                 .frame(maxWidth: .infinity)
>                 .padding(.vertical, 8)
>                 .background(colour)
>                 .cornerRadius(10)
>         }
>     }
>
>     var napColour: Color {
>         switch state.napWindowStatus {
>         case "open": return .cradlGreen
>         case "approaching": return .cradlAmber
>         default: return .cradlMuted
>         }
>     }
> }
>
> // MARK: - Lock Screen Widget (accessoryRectangular)
> struct LockScreenWidgetView: View {
>     let state: WidgetState
>
>     var body: some View {
>         VStack(alignment: .leading, spacing: 2) {
>             Text(state.babyName ?? "Baby")
>                 .font(.system(size: 12, weight: .semibold))
>             HStack(spacing: 8) {
>                 Label(state.timeAgo(state.lastFeedTime),
>                       systemImage: "drop.fill")
>                     .font(.system(size: 10))
>                 Label(state.napWindowText,
>                       systemImage: "moon.fill")
>                     .font(.system(size: 10))
>             }
>             .foregroundColor(.secondary)
>         }
>         .widgetURL(URL(string: "cradl://home"))
>     }
> }
>
> // MARK: - Widget Declarations
> struct CradlSmallWidget: Widget {
>     let kind = "CradlSmallWidget"
>     var body: some WidgetConfiguration {
>         StaticConfiguration(kind: kind, provider: CradlProvider()) { entry in
>             SmallWidgetView(state: entry.state)
>         }
>         .configurationDisplayName("Cradl")
>         .description("Last feed, nap window, and last nappy at a glance.")
>         .supportedFamilies([.systemSmall])
>     }
> }
>
> struct CradlMediumWidget: Widget {
>     let kind = "CradlMediumWidget"
>     var body: some WidgetConfiguration {
>         StaticConfiguration(kind: kind, provider: CradlProvider()) { entry in
>             MediumWidgetView(state: entry.state)
>         }
>         .configurationDisplayName("Cradl — Quick Log")
>         .description("See today's summary and log directly from your home screen.")
>         .supportedFamilies([.systemMedium])
>     }
> }
>
> struct CradlLockScreenWidget: Widget {
>     let kind = "CradlLockScreenWidget"
>     var body: some WidgetConfiguration {
>         StaticConfiguration(kind: kind, provider: CradlProvider()) { entry in
>             LockScreenWidgetView(state: entry.state)
>         }
>         .configurationDisplayName("Cradl — Lock Screen")
>         .description("See last feed and nap window on your lock screen.")
>         .supportedFamilies([.accessoryRectangular, .accessoryCircular])
>     }
> }
> ```
>
> ═══════════════════════════════════════
> SECTION 6 — iOS SWIFT: WATCHKIT EXTENSION
> ═══════════════════════════════════════
>
> In Xcode: File > New > Target > Watch App. Name: `CradlWatch`. Include Notification Scene: No. This creates `ios/CradlWatch/`. Add App Group `group.app.cradl` to the CradlWatch target.
>
> Create `ios/CradlWatch/CradlWatchApp.swift`:
> ```swift
> import SwiftUI
> import WatchConnectivity
>
> @main
> struct CradlWatchApp: App {
>     @StateObject private var store = WatchStore()
>
>     var body: some Scene {
>         WindowGroup {
>             ContentView()
>                 .environmentObject(store)
>                 .onAppear { store.activate() }
>         }
>     }
> }
>
> class WatchStore: NSObject, ObservableObject, WCSessionDelegate {
>     @Published var state: WidgetState = .placeholder
>
>     func activate() {
>         if WCSession.isSupported() {
>             WCSession.default.delegate = self
>             WCSession.default.activate()
>         }
>         // Also try loading from App Group directly
>         // (works when watch and phone share the same App Group)
>         loadFromAppGroup()
>     }
>
>     private func loadFromAppGroup() {
>         guard let defaults = UserDefaults(suiteName: "group.app.cradl"),
>               let data = defaults.data(forKey: "widget_state"),
>               let loaded = try? JSONDecoder().decode(WidgetState.self, from: data) else {
>             return
>         }
>         DispatchQueue.main.async { self.state = loaded }
>     }
>
>     // WCSession delegate — receives updates from phone
>     func session(_ session: WCSession,
>                  didReceiveApplicationContext applicationContext: [String: Any]) {
>         guard let stateString = applicationContext["widget_state"] as? String,
>               let data = stateString.data(using: .utf8),
>               let loaded = try? JSONDecoder().decode(WidgetState.self, from: data) else {
>             return
>         }
>         DispatchQueue.main.async { self.state = loaded }
>     }
>
>     func session(_ session: WCSession,
>                  didReceiveMessage message: [String: Any]) {
>         session(session, didReceiveApplicationContext: message)
>     }
>
>     func session(_ session: WCSession,
>                  activationDidCompleteWith state: WCSessionActivationState,
>                  error: Error?) {}
> }
> ```
>
> Create `ios/CradlWatch/ContentView.swift`:
> ```swift
> import SwiftUI
>
> struct ContentView: View {
>     @EnvironmentObject var store: WatchStore
>
>     var body: some View {
>         ScrollView {
>             VStack(alignment: .leading, spacing: 12) {
>
>                 // Baby name header
>                 Text(store.state.babyName ?? "Baby")
>                     .font(.headline)
>                     .foregroundColor(.white)
>
>                 Divider()
>
>                 // Feed row
>                 WatchInfoRow(
>                     colour: Color(red: 1.0, green: 0.596, blue: 0.439),
>                     icon: "drop.fill",
>                     label: "Last fed",
>                     value: store.state.timeAgo(store.state.lastFeedTime)
>                 )
>
>                 // Nap row
>                 WatchInfoRow(
>                     colour: napColour,
>                     icon: "moon.fill",
>                     label: "Nap",
>                     value: store.state.napWindowText
>                 )
>
>                 // Diaper row
>                 WatchInfoRow(
>                     colour: Color(red: 0.549, green: 0.737, blue: 0.486),
>                     icon: "circle.fill",
>                     label: "Last nappy",
>                     value: store.state.timeAgo(store.state.lastDiaperTime)
>                 )
>
>                 Divider()
>
>                 // Action buttons — open phone app to specific drawer
>                 Text("Log on phone")
>                     .font(.caption2)
>                     .foregroundColor(.secondary)
>
>                 HStack(spacing: 8) {
>                     WatchActionButton(
>                         label: "Feed",
>                         colour: Color(red: 1.0, green: 0.596, blue: 0.439),
>                         url: "cradl://open-drawer?type=feed"
>                     )
>                     WatchActionButton(
>                         label: "Nappy",
>                         colour: Color(red: 0.549, green: 0.737, blue: 0.486),
>                         url: "cradl://open-drawer?type=diaper"
>                     )
>                 }
>
>                 WatchActionButton(
>                     label: "Sleep",
>                     colour: Color(red: 0.478, green: 0.702, blue: 0.831),
>                     url: "cradl://open-drawer?type=sleep"
>                 )
>             }
>             .padding()
>         }
>         .background(Color.black)
>     }
>
>     var napColour: Color {
>         switch store.state.napWindowStatus {
>         case "open": return Color(red: 0.549, green: 0.737, blue: 0.486)
>         case "approaching": return Color(red: 0.961, green: 0.651, blue: 0.137)
>         default: return Color.secondary
>         }
>     }
> }
>
> struct WatchInfoRow: View {
>     let colour: Color
>     let icon: String
>     let label: String
>     let value: String
>
>     var body: some View {
>         HStack(spacing: 8) {
>             Image(systemName: icon)
>                 .foregroundColor(colour)
>                 .frame(width: 16)
>             VStack(alignment: .leading, spacing: 1) {
>                 Text(label)
>                     .font(.caption2)
>                     .foregroundColor(.secondary)
>                 Text(value)
>                     .font(.caption)
>                     .foregroundColor(.white)
>             }
>         }
>     }
> }
>
> struct WatchActionButton: View {
>     let label: String
>     let colour: Color
>     let url: String
>
>     var body: some View {
>         // Opens the Cradl iPhone app to the correct drawer
>         // WKExtension.shared().openSystemURL handles phone app opening on watchOS
>         Button(action: {
>             if let url = URL(string: url) {
>                 WKExtension.shared().openSystemURL(url)
>             }
>         }) {
>             Text(label)
>                 .font(.system(size: 13, weight: .medium))
>                 .foregroundColor(.white)
>                 .frame(maxWidth: .infinity)
>                 .padding(.vertical, 8)
>                 .background(colour)
>                 .cornerRadius(8)
>         }
>         .buttonStyle(.plain)
>     }
> }
> ```
>
> Copy `ios/CradlWidget/WidgetState.swift` to `ios/CradlWatch/WidgetState.swift` — both targets need the same model. Add a shared Swift Package or use a shared group in Xcode to avoid duplication — create a new Group called `Shared` in the Xcode project, move `WidgetState.swift` there, and add it to all three targets (App, CradlWidget, CradlWatch) via Target Membership in the File Inspector.
>
> ═══════════════════════════════════════
> SECTION 7 — ANDROID KOTLIN: NATIVE BRIDGE PLUGIN
> ═══════════════════════════════════════
>
> Create `android/app/src/main/java/app/cradl/NativeBridgePlugin.kt`:
> ```kotlin
> package app.cradl
>
> import android.appwidget.AppWidgetManager
> import android.content.ComponentName
> import android.content.Context
> import com.getcapacitor.Plugin
> import com.getcapacitor.PluginCall
> import com.getcapacitor.PluginMethod
> import com.getcapacitor.annotation.CapacitorPlugin
>
> @CapacitorPlugin(name = "NativeBridge")
> class NativeBridgePlugin : Plugin() {
>
>     @PluginMethod
>     fun updateWidgetState(call: PluginCall) {
>         val stateJson = call.getString("state") ?: run {
>             call.reject("Missing state")
>             return
>         }
>
>         // Write to SharedPreferences — readable by widget and Wear OS module
>         context.getSharedPreferences("cradl_widget", Context.MODE_PRIVATE)
>             .edit()
>             .putString("widget_state", stateJson)
>             .apply()
>
>         // Refresh all Cradl widgets immediately
>         refreshWidgetInternal()
>
>         call.resolve()
>     }
>
>     @PluginMethod
>     fun refreshWidget(call: PluginCall) {
>         refreshWidgetInternal()
>         call.resolve()
>     }
>
>     @PluginMethod
>     fun getPendingWidgetLogs(call: PluginCall) {
>         val prefs = context.getSharedPreferences("cradl_widget", Context.MODE_PRIVATE)
>         val logs = prefs.getString("pending_widget_logs", "[]") ?: "[]"
>         call.resolve(com.getcapacitor.JSObject().apply { put("logs", logs) })
>     }
>
>     @PluginMethod
>     fun clearPendingWidgetLogs(call: PluginCall) {
>         context.getSharedPreferences("cradl_widget", Context.MODE_PRIVATE)
>             .edit()
>             .putString("pending_widget_logs", "[]")
>             .apply()
>         call.resolve()
>     }
>
>     private fun refreshWidgetInternal() {
>         val manager = AppWidgetManager.getInstance(context)
>         val ids = manager.getAppWidgetIds(
>             ComponentName(context, CradlWidgetReceiver::class.java)
>         )
>         if (ids.isNotEmpty()) {
>             val intent = android.content.Intent(context, CradlWidgetReceiver::class.java).apply {
>                 action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
>                 putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
>             }
>             context.sendBroadcast(intent)
>         }
>     }
> }
> ```
>
> Register in `android/app/src/main/java/app/cradl/MainActivity.kt`:
> ```kotlin
> class MainActivity : BridgeActivity() {
>     override fun onCreate(savedInstanceState: android.os.Bundle?) {
>         super.onCreate(savedInstanceState)
>         registerPlugin(NativeBridgePlugin::class.java)
>     }
> }
> ```
>
> ═══════════════════════════════════════
> SECTION 8 — ANDROID KOTLIN: GLANCE WIDGET
> ═══════════════════════════════════════
>
> Add to `android/app/build.gradle` dependencies:
> ```gradle
> implementation 'androidx.glance:glance-appwidget:1.0.0'
> implementation 'androidx.glance:glance-material3:1.0.0'
> implementation 'androidx.work:work-runtime-ktx:2.9.0'
> implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'
> implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
> ```
>
> Create `android/app/src/main/java/app/cradl/WidgetState.kt`:
> ```kotlin
> package app.cradl
>
> import android.content.Context
> import kotlinx.serialization.Serializable
> import kotlinx.serialization.json.Json
> import java.time.Instant
> import java.time.temporal.ChronoUnit
>
> @Serializable
> data class WidgetState(
>     val lastFeedTime: String? = null,
>     val lastFeedSide: String? = null,
>     val nextFeedEta: String? = null,
>     val napWindowStatus: String = "unknown",
>     val napWindowOpensAt: String? = null,
>     val napWindowClosesAt: String? = null,
>     val awakeMinutes: Int? = null,
>     val lastDiaperTime: String? = null,
>     val lastDiaperType: String? = null,
>     val diapersToday: Int = 0,
>     val feedsToday: Int = 0,
>     val sleepToday: String? = null,
>     val babyName: String? = null,
>     val updatedAt: String = ""
> ) {
>     companion object {
>         private val json = Json { ignoreUnknownKeys = true }
>
>         fun load(context: Context): WidgetState {
>             val prefs = context.getSharedPreferences(
>                 "cradl_widget", Context.MODE_PRIVATE
>             )
>             val stateJson = prefs.getString("widget_state", null)
>                 ?: return WidgetState(babyName = "Baby")
>             return try {
>                 json.decodeFromString(stateJson)
>             } catch (e: Exception) {
>                 WidgetState(babyName = "Baby")
>             }
>         }
>     }
>
>     fun timeAgo(isoString: String?): String {
>         if (isoString == null) return "—"
>         return try {
>             val instant = Instant.parse(isoString)
>             val minutes = ChronoUnit.MINUTES.between(instant, Instant.now()).toInt()
>             when {
>                 minutes < 1 -> "just now"
>                 minutes < 60 -> "${minutes}m ago"
>                 else -> {
>                     val h = minutes / 60
>                     val m = minutes % 60
>                     if (m == 0) "${h}h ago" else "${h}h ${m}m ago"
>                 }
>             }
>         } catch (e: Exception) { "—" }
>     }
>
>     val napWindowText: String get() = when (napWindowStatus) {
>         "open" -> "Nap window open"
>         "approaching" -> napWindowOpensAt?.let {
>             try {
>                 val mins = ChronoUnit.MINUTES.between(
>                     Instant.now(), Instant.parse(it)
>                 ).toInt()
>                 "Nap in ~${mins}m"
>             } catch (e: Exception) { "Nap window soon" }
>         } ?: "Nap window soon"
>         "closed" -> "Past nap window"
>         else -> "Log sleep to predict naps"
>     }
> }
> ```
>
> Create `android/app/src/main/java/app/cradl/CradlWidget.kt`:
> ```kotlin
> package app.cradl
>
> import android.content.Context
> import androidx.compose.runtime.Composable
> import androidx.compose.ui.graphics.Color
> import androidx.compose.ui.unit.dp
> import androidx.compose.ui.unit.sp
> import androidx.glance.*
> import androidx.glance.action.actionStartActivity
> import androidx.glance.appwidget.*
> import androidx.glance.appwidget.action.actionStartActivity
> import androidx.glance.layout.*
> import androidx.glance.text.*
> import android.content.Intent
> import android.net.Uri
>
> // Cradl colour palette
> private val Cream = Color(0xFFFFFBF5)
> private val TextDark = Color(0xFF3D2C2C)
> private val Muted = Color(0xFF9A8080)
> private val Coral = Color(0xFFFF8C69)
> private val Blue = Color(0xFF7AB3D4)
> private val Green = Color(0xFF8CBC7C)
> private val Amber = Color(0xFFF5A623)
>
> class CradlWidget : GlanceAppWidget() {
>
>     override suspend fun provideGlance(context: Context, id: GlanceId) {
>         val state = WidgetState.load(context)
>         provideContent { CradlWidgetContent(state, context) }
>     }
> }
>
> @Composable
> fun CradlWidgetContent(state: WidgetState, context: Context) {
>     val size = LocalSize.current
>     val isMedium = size.width > 200.dp
>
>     if (isMedium) {
>         MediumWidget(state, context)
>     } else {
>         SmallWidget(state)
>     }
> }
>
> @Composable
> fun SmallWidget(state: WidgetState) {
>     Column(
>         modifier = GlanceModifier
>             .fillMaxSize()
>             .background(Cream)
>             .padding(12.dp)
>             .clickable(onClick = actionStartActivity<MainActivity>()),
>         verticalAlignment = Alignment.Top
>     ) {
>         Text(
>             state.babyName ?: "Baby",
>             style = TextStyle(
>                 fontSize = 13.sp,
>                 fontWeight = FontWeight.Medium,
>                 color = ColorProvider(TextDark)
>             )
>         )
>         Spacer(GlanceModifier.defaultWeight())
>         StatRow(colour = Coral,  value = state.timeAgo(state.lastFeedTime))
>         Spacer(GlanceModifier.height(4.dp))
>         StatRow(colour = napColour(state), value = state.napWindowText)
>         Spacer(GlanceModifier.height(4.dp))
>         StatRow(colour = Green,  value = state.timeAgo(state.lastDiaperTime))
>     }
> }
>
> @Composable
> fun MediumWidget(state: WidgetState, context: Context) {
>     Row(
>         modifier = GlanceModifier
>             .fillMaxSize()
>             .background(Cream)
>     ) {
>         // Left: stats
>         Column(
>             modifier = GlanceModifier
>                 .defaultWeight()
>                 .fillMaxHeight()
>                 .padding(12.dp),
>             verticalAlignment = Alignment.Top
>         ) {
>             Text(
>                 state.babyName ?: "Baby",
>                 style = TextStyle(
>                     fontSize = 14.sp,
>                     fontWeight = FontWeight.Medium,
>                     color = ColorProvider(TextDark)
>                 )
>             )
>             Spacer(GlanceModifier.defaultWeight())
>             LabelledRow("Fed",   Coral,             state.timeAgo(state.lastFeedTime))
>             Spacer(GlanceModifier.height(4.dp))
>             LabelledRow("Nap",   napColour(state),  state.napWindowText)
>             Spacer(GlanceModifier.height(4.dp))
>             LabelledRow("Nappy", Green,             state.timeAgo(state.lastDiaperTime))
>         }
>
>         // Right: action buttons
>         Column(
>             modifier = GlanceModifier
>                 .width(88.dp)
>                 .fillMaxHeight()
>                 .padding(8.dp),
>             verticalAlignment = Alignment.CenterVertically
>         ) {
>             ActionButton("Feed",  Coral, "cradl://open-drawer?type=feed",  context)
>             Spacer(GlanceModifier.height(6.dp))
>             ActionButton("Sleep", Blue,  "cradl://open-drawer?type=sleep", context)
>             Spacer(GlanceModifier.height(6.dp))
>             ActionButton("Nappy", Green, "cradl://open-drawer?type=diaper",context)
>         }
>     }
> }
>
> @Composable
> fun StatRow(colour: Color, value: String) {
>     Row(verticalAlignment = Alignment.CenterVertically) {
>         Box(
>             modifier = GlanceModifier
>                 .size(7.dp)
>                 .background(colour)
>                 .cornerRadius(4.dp)
>         ) {}
>         Spacer(GlanceModifier.width(6.dp))
>         Text(value, style = TextStyle(fontSize = 11.sp, color = ColorProvider(Muted)))
>     }
> }
>
> @Composable
> fun LabelledRow(label: String, colour: Color, value: String) {
>     Row(verticalAlignment = Alignment.CenterVertically) {
>         Box(GlanceModifier.size(7.dp).background(colour).cornerRadius(4.dp)) {}
>         Spacer(GlanceModifier.width(5.dp))
>         Text(label, style = TextStyle(fontSize = 10.sp, color = ColorProvider(Muted)),
>              modifier = GlanceModifier.width(32.dp))
>         Text(value, style = TextStyle(fontSize = 11.sp, color = ColorProvider(TextDark)))
>     }
> }
>
> @Composable
> fun ActionButton(label: String, colour: Color, deepLink: String, context: Context) {
>     val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
>         flags = Intent.FLAG_ACTIVITY_NEW_TASK
>     }
>     Box(
>         modifier = GlanceModifier
>             .fillMaxWidth()
>             .background(colour)
>             .cornerRadius(10.dp)
>             .padding(vertical = 7.dp)
>             .clickable(actionStartActivity(intent)),
>         contentAlignment = Alignment.Center
>     ) {
>         Text(label, style = TextStyle(
>             fontSize = 12.sp,
>             fontWeight = FontWeight.Medium,
>             color = ColorProvider(Color.White)
>         ))
>     }
> }
>
> fun napColour(state: WidgetState): Color = when (state.napWindowStatus) {
>     "open" -> Green
>     "approaching" -> Amber
>     "closed" -> Coral
>     else -> Muted
> }
>
> class CradlWidgetReceiver : GlanceAppWidgetReceiver() {
>     override val glanceAppWidget = CradlWidget()
> }
> ```
>
> Create `android/app/src/main/java/app/cradl/SupabaseSyncWorker.kt`:
> ```kotlin
> package app.cradl
>
> import android.content.Context
> import androidx.work.*
> import kotlinx.coroutines.Dispatchers
> import kotlinx.coroutines.withContext
> import kotlinx.serialization.json.Json
> import java.net.HttpURLConnection
> import java.net.URL
>
> class SupabaseSyncWorker(
>     context: Context,
>     params: WorkerParameters
> ) : CoroutineWorker(context, params) {
>
>     override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
>         val prefs = applicationContext.getSharedPreferences(
>             "cradl_widget", Context.MODE_PRIVATE
>         )
>         val logsJson = prefs.getString("pending_widget_logs", "[]") ?: "[]"
>         val logs = try {
>             Json.decodeFromString<List<Map<String, String>>>(logsJson)
>         } catch (e: Exception) {
>             prefs.edit().putString("pending_widget_logs", "[]").apply()
>             return@withContext Result.success()
>         }
>
>         if (logs.isEmpty()) return@withContext Result.success()
>
>         val supabaseUrl = BuildConfig.SUPABASE_URL
>         val supabaseKey = BuildConfig.SUPABASE_ANON_KEY
>
>         val remaining = logs.toMutableList()
>         for (log in logs) {
>             try {
>                 val url = URL("$supabaseUrl/functions/v1/server/logs")
>                 val conn = (url.openConnection() as HttpURLConnection).apply {
>                     requestMethod = "POST"
>                     setRequestProperty("Content-Type", "application/json")
>                     setRequestProperty("Authorization", "Bearer $supabaseKey")
>                     doOutput = true
>                 }
>                 conn.outputStream.use { os ->
>                     os.write(Json.encodeToString(
>                         kotlinx.serialization.serializer<Map<String, String>>(), log
>                     ).toByteArray())
>                 }
>                 val code = conn.responseCode
>                 conn.disconnect()
>                 if (code in 200..299) {
>                     remaining.remove(log)
>                 }
>             } catch (e: Exception) {
>                 // Leave in remaining list for retry
>             }
>         }
>
>         prefs.edit()
>             .putString("pending_widget_logs", Json.encodeToString(remaining))
>             .apply()
>
>         if (remaining.isNotEmpty()) Result.retry() else Result.success()
>     }
> }
> ```
>
> Create `android/app/src/main/res/xml/cradl_widget_info.xml`:
> ```xml
> <?xml version="1.0" encoding="utf-8"?>
> <appwidget-provider
>     xmlns:android="http://schemas.android.com/apk/res/android"
>     android:minWidth="180dp"
>     android:minHeight="110dp"
>     android:targetCellWidth="3"
>     android:targetCellHeight="2"
>     android:updatePeriodMillis="1800000"
>     android:initialLayout="@layout/widget_loading"
>     android:widgetCategory="home_screen"
>     android:description="@string/widget_description"
>     android:previewLayout="@layout/widget_loading" />
> ```
>
> Create `android/app/src/main/res/layout/widget_loading.xml`:
> ```xml
> <?xml version="1.0" encoding="utf-8"?>
> <LinearLayout
>     xmlns:android="http://schemas.android.com/apk/res/android"
>     android:layout_width="match_parent"
>     android:layout_height="match_parent"
>     android:background="#FFFBF5"
>     android:gravity="center"
>     android:padding="12dp">
>     <TextView
>         android:layout_width="wrap_content"
>         android:layout_height="wrap_content"
>         android:text="Cradl"
>         android:textColor="#3D2C2C"
>         android:textSize="14sp" />
> </LinearLayout>
> ```
>
> Add to `android/app/src/main/AndroidManifest.xml` inside `<application>`:
> ```xml
> <receiver
>     android:name=".CradlWidgetReceiver"
>     android:exported="true">
>     <intent-filter>
>         <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
>     </intent-filter>
>     <meta-data
>         android:name="android.appwidget.provider"
>         android:resource="@xml/cradl_widget_info"/>
> </receiver>
> ```
>
> ═══════════════════════════════════════
> SECTION 9 — ANDROID KOTLIN: WEAR OS MODULE
> ═══════════════════════════════════════
>
> Create `wear/` directory at the same level as `android/`. Create `wear/build.gradle`:
> ```gradle
> plugins {
>     id 'com.android.application'
>     id 'org.jetbrains.kotlin.android'
>     id 'org.jetbrains.kotlin.plugin.serialization'
> }
> android {
>     compileSdk 34
>     defaultConfig {
>         applicationId "app.cradl.wear"
>         minSdk 26
>         targetSdk 34
>         versionCode 1
>         versionName "1.0.0"
>     }
>     buildFeatures { compose true }
>     composeOptions {
>         kotlinCompilerExtensionVersion '1.5.4'
>     }
> }
> dependencies {
>     implementation 'androidx.wear.compose:compose-material:1.3.0'
>     implementation 'androidx.wear.compose:compose-foundation:1.3.0'
>     implementation 'androidx.activity:activity-compose:1.8.0'
>     implementation 'com.google.android.gms:play-services-wearable:18.1.0'
>     implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'
>     implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3'
> }
> ```
>
> Add `include ':wear'` to `settings.gradle`.
>
> Create `wear/src/main/java/app/cradl/wear/WearActivity.kt`:
> ```kotlin
> package app.cradl.wear
>
> import android.content.Intent
> import android.net.Uri
> import android.os.Bundle
> import androidx.activity.ComponentActivity
> import androidx.activity.compose.setContent
> import androidx.compose.foundation.background
> import androidx.compose.foundation.layout.*
> import androidx.compose.runtime.*
> import androidx.compose.ui.Alignment
> import androidx.compose.ui.Modifier
> import androidx.compose.ui.graphics.Color
> import androidx.compose.ui.text.font.FontWeight
> import androidx.compose.ui.unit.dp
> import androidx.compose.ui.unit.sp
> import androidx.wear.compose.material.*
> import com.google.android.gms.wearable.*
> import kotlinx.coroutines.*
> import kotlinx.serialization.json.Json
>
> class WearActivity : ComponentActivity(), DataClient.OnDataChangedListener {
>
>     private var widgetState by mutableStateOf(WidgetState())
>
>     override fun onCreate(savedInstanceState: Bundle?) {
>         super.onCreate(savedInstanceState)
>         loadStateFromDataLayer()
>         setContent {
>             WearApp(
>                 state = widgetState,
>                 onAction = { deepLink -> openPhoneApp(deepLink) }
>             )
>         }
>     }
>
>     override fun onResume() {
>         super.onResume()
>         Wearable.getDataClient(this).addListener(this)
>         loadStateFromDataLayer()
>     }
>
>     override fun onPause() {
>         super.onPause()
>         Wearable.getDataClient(this).removeListener(this)
>     }
>
>     override fun onDataChanged(events: DataEventBuffer) {
>         for (event in events) {
>             if (event.type == DataEvent.TYPE_CHANGED &&
>                 event.dataItem.uri.path == "/widget_state") {
>                 val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
>                 val json = dataMap.getString("state") ?: continue
>                 try {
>                     widgetState = Json { ignoreUnknownKeys = true }
>                         .decodeFromString(json)
>                 } catch (e: Exception) { /* ignore */ }
>             }
>         }
>     }
>
>     private fun loadStateFromDataLayer() {
>         CoroutineScope(Dispatchers.IO).launch {
>             try {
>                 val items = Tasks.await(
>                     Wearable.getDataClient(this@WearActivity)
>                         .getDataItems(Uri.parse("wear://*/widget_state"))
>                 )
>                 items.forEach { item ->
>                     val dataMap = DataMapItem.fromDataItem(item).dataMap
>                     val json = dataMap.getString("state") ?: return@forEach
>                     try {
>                         widgetState = Json { ignoreUnknownKeys = true }
>                             .decodeFromString(json)
>                     } catch (e: Exception) { /* ignore */ }
>                 }
>                 items.release()
>             } catch (e: Exception) { /* ignore */ }
>         }
>     }
>
>     private fun openPhoneApp(deepLink: String) {
>         // Opens the Cradl phone app via Wearable Intent
>         val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
>         startActivity(intent)
>     }
> }
>
> @Composable
> fun WearApp(state: WidgetState, onAction: (String) -> Unit) {
>     val scrollState = rememberScrollState()
>
>     Scaffold(
>         timeText = { TimeText() },
>         vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) }
>     ) {
>         ScalingLazyColumn(
>             modifier = Modifier.fillMaxSize(),
>             contentPadding = PaddingValues(top = 24.dp, bottom = 16.dp, start = 8.dp, end = 8.dp),
>             verticalArrangement = Arrangement.spacedBy(6.dp)
>         ) {
>             item {
>                 Text(
>                     state.babyName ?: "Baby",
>                     style = MaterialTheme.typography.title2,
>                     color = Color.White
>                 )
>             }
>             item { WearInfoChip("Fed",   state.timeAgo(state.lastFeedTime),   Color(0xFFFF8C69)) }
>             item { WearInfoChip("Nap",   state.napWindowText,                  napColour(state)) }
>             item { WearInfoChip("Nappy", state.timeAgo(state.lastDiaperTime), Color(0xFF8CBC7C)) }
>             item { Spacer(Modifier.height(4.dp)) }
>             item {
>                 Text("Log on phone", fontSize = 10.sp,
>                      color = Color.Gray,
>                      modifier = Modifier.fillMaxWidth(),
>                      textAlign = androidx.compose.ui.text.style.TextAlign.Center)
>             }
>             item {
>                 Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
>                     WearActionButton("Feed",  Color(0xFFFF8C69),
>                         "cradl://open-drawer?type=feed",  onAction,
>                         Modifier.weight(1f))
>                     WearActionButton("Nappy", Color(0xFF8CBC7C),
>                         "cradl://open-drawer?type=diaper", onAction,
>                         Modifier.weight(1f))
>                 }
>             }
>             item {
>                 WearActionButton("Sleep", Color(0xFF7AB3D4),
>                     "cradl://open-drawer?type=sleep", onAction,
>                     Modifier.fillMaxWidth())
>             }
>         }
>     }
> }
>
> @Composable
> fun WearInfoChip(label: String, value: String, colour: Color) {
>     Chip(
>         modifier = Modifier.fillMaxWidth(),
>         onClick = {},
>         colors = ChipDefaults.chipColors(backgroundColor = Color(0xFF1A1A2E)),
>         label = {
>             Row(verticalAlignment = Alignment.CenterVertically) {
>                 Box(Modifier.size(7.dp).background(colour, shape = androidx.compose.foundation.shape.CircleShape))
>                 Spacer(Modifier.width(6.dp))
>                 Text(label, fontSize = 11.sp, color = Color(0xFF9A8080),
>                      modifier = Modifier.width(36.dp))
>                 Text(value, fontSize = 12.sp, color = Color.White)
>             }
>         }
>     )
> }
>
> @Composable
> fun WearActionButton(
>     label: String, colour: Color, deepLink: String,
>     onAction: (String) -> Unit, modifier: Modifier = Modifier
> ) {
>     Button(
>         modifier = modifier,
>         onClick = { onAction(deepLink) },
>         colors = ButtonDefaults.buttonColors(backgroundColor = colour)
>     ) {
>         Text(label, fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Medium)
>     }
> }
>
> fun napColour(state: WidgetState): Color = when (state.napWindowStatus) {
>     "open" -> Color(0xFF8CBC7C)
>     "approaching" -> Color(0xFFF5A623)
>     "closed" -> Color(0xFFFF8C69)
>     else -> Color(0xFF9A8080)
> }
> ```
>
> Copy `WidgetState.kt` to `wear/src/main/java/app/cradl/wear/WidgetState.kt` (change package name). Create `wear/src/main/AndroidManifest.xml` with `uses-feature android.hardware.type.watch`, the WearActivity as main launcher activity, and `meta-data` for `com.google.android.wearable.standalone` set to false (this is a companion app, not standalone).
>
> In the main `android/app` module, add a `WearDataSyncService` that uses the Wearable Data Layer API to sync widget state to the Wear OS app whenever NativeBridgePlugin.updateWidgetState is called. Add to NativeBridgePlugin.kt after writing to SharedPreferences:
> ```kotlin
> // Sync to Wear OS via Data Layer API
> val putDataReq = PutDataMapRequest.create("/widget_state").apply {
>     dataMap.putString("state", stateJson)
>     dataMap.putLong("timestamp", System.currentTimeMillis())
> }.asPutDataRequest().setUrgent()
> Wearable.getDataClient(context).putDataItem(putDataReq)
> ```
>
> ═══════════════════════════════════════
> SECTION 10 — DEEP LINK HANDLING
> ═══════════════════════════════════════
>
> In the React app, create `src/utils/deepLinkHandler.ts`. Import `App` from `@capacitor/app`. Export `setupDeepLinks(openDrawerCallback: (type: string) => void): void`. Sets up `App.addListener('appUrlOpen', handler)`. Parses the URL. Handles: `cradl://open-drawer?type=feed` → calls `openDrawerCallback('feed')`. Same for sleep, diaper, tummy, bottle, pump. `cradl://home` → navigates to home (call `window.location.hash = '#/'` or your router's navigate function). `cradl://join/[shortcode]` → navigate to the group join flow. `cradl://auth/callback` → handle OAuth callback. Guard: ignore unknown URL schemes. Guard: only handle `cradl://` scheme — log and ignore anything else.
>
> Call `setupDeepLinks` in the app root component with a callback that sets a piece of state `pendingDrawer`. The HomeScreen reads `pendingDrawer` in a `useEffect` and opens the corresponding drawer, then clears `pendingDrawer`.
>
> In `android/app/src/main/AndroidManifest.xml` add to MainActivity intent-filters:
> ```xml
> <intent-filter android:autoVerify="true">
>     <action android:name="android.intent.action.VIEW"/>
>     <category android:name="android.intent.category.DEFAULT"/>
>     <category android:name="android.intent.category.BROWSABLE"/>
>     <data android:scheme="cradl"/>
> </intent-filter>
> <intent-filter android:autoVerify="true">
>     <action android:name="android.intent.action.VIEW"/>
>     <category android:name="android.intent.category.DEFAULT"/>
>     <category android:name="android.intent.category.BROWSABLE"/>
>     <data android:scheme="https" android:host="cradl.app" android:pathPrefix="/join"/>
> </intent-filter>
> ```
>
> In `ios/App/App/Info.plist` add:
> ```xml
> <key>CFBundleURLTypes</key>
> <array>
>     <dict>
>         <key>CFBundleURLSchemes</key>
>         <array>
>             <string>cradl</string>
>         </array>
>     </dict>
> </array>
> ```
>
> ═══════════════════════════════════════
> SECTION 11 — BUILD CONFIGURATION
> ═══════════════════════════════════════
>
> Create `.env.example` with all required variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVENUECAT_APPLE_KEY`, `VITE_REVENUECAT_GOOGLE_KEY`, `VITE_GOOGLE_CLIENT_ID`.
>
> In `android/app/build.gradle`, add `buildConfigField` entries reading from `gradle.properties` (which reads from environment): `buildConfigField 'String', 'SUPABASE_URL', '"${SUPABASE_URL}"'`. Same for `SUPABASE_ANON_KEY`. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `android/gradle.properties` reading from environment variables. The SupabaseSyncWorker reads `BuildConfig.SUPABASE_URL` — this is how it gets the URL without hardcoding.
>
> Add `npx cap sync` to run after `vite build` in `package.json`. Add scripts: `"android": "npx cap run android"`, `"ios": "npx cap run ios"`, `"build:android": "npm run build && cd android && ./gradlew assembleRelease"`.
>
> ═══════════════════════════════════════
> SECTION 12 — TESTING CHECKLIST
> ═══════════════════════════════════════
>
> After all sections are complete, verify each of the following manually and mark in IMPLEMENTATION_SUMMARY.md:
>
> Web: app still works at localhost:5173 with all features. No console errors.
>
> Android: `npx cap run android` launches the app in emulator. The app displays correctly in the WebView. Logging a feed calls `syncNativeState` without errors. Widget appears in the Android widget picker. Widget displays baby name and last feed time. Tapping 'Feed' button on medium widget opens the app to the feed drawer. Background sync: kill the app, log a diaper via the widget action button, reopen the app — the diaper appears in today's timeline.
>
> iOS: `npx cap run ios` launches the app in simulator. Widget appears in the iOS widget gallery. Small widget shows correct data after a log. Medium widget's Feed button opens the app to the feed drawer. Lock screen widget visible on lock screen. Watch app builds without errors.
>
> Deep links: `adb shell am start -d 'cradl://open-drawer?type=feed' -a android.intent.action.VIEW` opens the app and triggers the feed drawer. On iOS: `xcrun simctl openurl booted 'cradl://open-drawer?type=feed'` does the same.
>
> Storage: close the app, reopen — all logged data persists. Data syncs to Supabase when signed in and online. Offline indicator appears when network is disabled. Pending logs sync when network is restored.
>
> Native bridge no-op on web: call `NativeBridge.updateWidgetState({ state: '{}' })` from browser console — no error thrown, returns silently."