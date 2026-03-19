import WidgetKit
import SwiftUI

struct BabyEntry: TimelineEntry {
    let date: Date
    let feedText: String
    let sleepText: String
    let nappyText: String
}

struct CradlProvider: TimelineProvider {
    func placeholder(in context: Context) -> BabyEntry {
        BabyEntry(date: Date(), feedText: "🍼 Fed 1h ago", sleepText: "😴 Slept 1h 20m", nappyText: "🧷 Nappy 30m ago")
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyEntry>) -> Void) {
        let entry = readEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func readEntry() -> BabyEntry {
        let defaults = UserDefaults(suiteName: "group.com.cradl.app") ?? UserDefaults.standard
        let feed = defaults.string(forKey: "widget_feed_text") ?? "🍼 No feeds yet"
        let sleep = defaults.string(forKey: "widget_sleep_text") ?? "😴 No sleeps yet"
        let nappy = defaults.string(forKey: "widget_nappy_text") ?? "🧷 No nappies yet"
        return BabyEntry(date: Date(), feedText: feed, sleepText: sleep, nappyText: nappy)
    }
}

struct CradlWidgetEntryView: View {
    var entry: BabyEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image("CradlMark")
                .resizable()
                .scaledToFit()
                .frame(height: 20)

            Text(entry.feedText)
                .font(.system(size: 12))
                .foregroundColor(Color(red: 0.35, green: 0.29, blue: 0.29))
            Text(entry.sleepText)
                .font(.system(size: 12))
                .foregroundColor(Color(red: 0.35, green: 0.29, blue: 0.29))
            Text(entry.nappyText)
                .font(.system(size: 12))
                .foregroundColor(Color(red: 0.35, green: 0.29, blue: 0.29))

            if family != .systemSmall {
                Spacer()
                HStack(spacing: 6) {
                    Link(destination: URL(string: "cradl://action/feed")!) {
                        Text("Feed")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.83, green: 0.38, blue: 0.29))
                            .cornerRadius(8)
                    }
                    Link(destination: URL(string: "cradl://action/sleep")!) {
                        Text("Sleep")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.29, green: 0.48, blue: 0.71))
                            .cornerRadius(8)
                    }
                    Link(destination: URL(string: "cradl://action/pee")!) {
                        Text("Nappy")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.29, green: 0.54, blue: 0.29))
                            .cornerRadius(8)
                    }
                }
            }
        }
        .padding(12)
        .containerBackground(for: .widget) {
            Color(red: 1, green: 0.98, blue: 0.96)
        }
    }
}

@main
struct CradlWidgetBundle: WidgetBundle {
    var body: some Widget {
        CradlStatusWidget()
    }
}

struct CradlStatusWidget: Widget {
    let kind: String = "CradlWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CradlProvider()) { entry in
            CradlWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Cradl")
        .description("Quick view of baby's last feed, sleep, and nappy.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
