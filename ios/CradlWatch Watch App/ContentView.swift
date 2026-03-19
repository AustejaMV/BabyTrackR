import SwiftUI

struct ContentView: View {
    @StateObject private var dataStore = WatchDataStore()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    Image("CradlMark")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 24)

                    StatusCard(emoji: "🍼", title: "Last feed", detail: dataStore.feedText, color: Color(red: 0.83, green: 0.38, blue: 0.29))
                    StatusCard(emoji: "😴", title: "Last sleep", detail: dataStore.sleepText, color: Color(red: 0.29, green: 0.48, blue: 0.71))
                    StatusCard(emoji: "🧷", title: "Last nappy", detail: dataStore.nappyText, color: Color(red: 0.29, green: 0.54, blue: 0.29))

                    Divider().padding(.vertical, 4)

                    Text("Quick log")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.gray)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    HStack(spacing: 8) {
                        QuickLogButton(emoji: "🍼", label: "Feed", color: Color(red: 0.83, green: 0.38, blue: 0.29)) {
                            dataStore.logFeed()
                        }
                        QuickLogButton(emoji: "😴", label: "Sleep", color: Color(red: 0.29, green: 0.48, blue: 0.71)) {
                            dataStore.logSleep()
                        }
                        QuickLogButton(emoji: "🧷", label: "Nappy", color: Color(red: 0.29, green: 0.54, blue: 0.29)) {
                            dataStore.logNappy()
                        }
                    }

                    if let confirmMessage = dataStore.confirmMessage {
                        Text(confirmMessage)
                            .font(.system(size: 12))
                            .foregroundColor(.green)
                            .transition(.opacity)
                    }
                }
                .padding(.horizontal, 8)
            }
        }
        .onAppear { dataStore.refresh() }
    }
}

struct StatusCard: View {
    let emoji: String
    let title: String
    let detail: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Text(emoji)
                .font(.system(size: 20))
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.primary)
                Text(detail)
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(8)
        .background(color.opacity(0.1))
        .cornerRadius(10)
    }
}

struct QuickLogButton: View {
    let emoji: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(emoji).font(.system(size: 18))
                Text(label).font(.system(size: 9, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(color.opacity(0.15))
            .cornerRadius(10)
        }
        .buttonStyle(.plain)
    }
}
