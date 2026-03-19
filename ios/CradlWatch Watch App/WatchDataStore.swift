import SwiftUI
import WatchConnectivity

class WatchDataStore: NSObject, ObservableObject, WCSessionDelegate {
    @Published var feedText: String = "No feeds yet"
    @Published var sleepText: String = "No sleeps yet"
    @Published var nappyText: String = "No nappies yet"
    @Published var confirmMessage: String? = nil

    private var wcSession: WCSession?

    override init() {
        super.init()
        if WCSession.isSupported() {
            wcSession = WCSession.default
            wcSession?.delegate = self
            wcSession?.activate()
        }
    }

    func refresh() {
        let defaults = UserDefaults(suiteName: "group.com.cradl.app") ?? UserDefaults.standard
        feedText = defaults.string(forKey: "widget_feed_text")?.replacingOccurrences(of: "🍼 ", with: "") ?? "No feeds yet"
        sleepText = defaults.string(forKey: "widget_sleep_text")?.replacingOccurrences(of: "😴 ", with: "") ?? "No sleeps yet"
        nappyText = defaults.string(forKey: "widget_nappy_text")?.replacingOccurrences(of: "🧷 ", with: "") ?? "No nappies yet"
    }

    func logFeed() { sendAction("feed") }
    func logSleep() { sendAction("sleep") }
    func logNappy() { sendAction("pee") }

    private func sendAction(_ action: String) {
        guard let session = wcSession, session.isReachable else {
            showConfirm("Open Cradl on your phone to log")
            return
        }
        session.sendMessage(["action": action], replyHandler: { reply in
            DispatchQueue.main.async {
                self.showConfirm(reply["message"] as? String ?? "Logged!")
                self.refresh()
            }
        }, errorHandler: { _ in
            DispatchQueue.main.async {
                self.showConfirm("Open Cradl on your phone to log")
            }
        })
    }

    private func showConfirm(_ message: String) {
        confirmMessage = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.confirmMessage = nil
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.refresh() }
    }
}
