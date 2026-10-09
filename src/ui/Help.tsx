import { Card, Screen } from './components'
import { HebrewText } from './hebrew'

export function Help() {
  return (
    <Screen title="How to study" back="/">
      <div className="flex flex-col gap-4 pt-2 pb-6">
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Start with «Today»</h2>
          <p className="text-ink-muted">Reviews come first, then new items in book order — as many as «New items per day» allows. Have time left? «10 more new» on the finish screen.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Type Hebrew without vowel points</h2>
          <p className="text-ink-muted">
            The app checks the spelling, and the points are shown on reveal. Type the everyday spelling (<HebrewText size="sm">דיבר</HebrewText>, not <HebrewText size="sm">דבר</HebrewText>); the book's pointed form stripped of its points is also accepted. A final letter in the wrong form (<HebrewText size="sm">כ/ך מ/ם נ/ן פ/ף צ/ץ</HebrewText>) counts as a mistake, and the feedback says so.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Hebrew keyboard</h2>
          <p className="text-ink-muted"><b className="text-ink">iPhone:</b> Settings → General → Keyboard → Keyboards → Add New Keyboard → Hebrew. Switch with the globe key.</p>
          <p className="text-ink-muted"><b className="text-ink">Mac:</b> System Settings → Keyboard → Input Sources → + → Hebrew. Switch with ⌃ Space or the input menu in the menu bar.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Paradigm grids</h2>
          <p className="text-ink-muted">The teacher's sheet: infinitive and root are given, you fill the nine cells (<HebrewText size="sm">אני אתה את אנחנו אתם אתן הוא היא הם-הן</HebrewText>). «Check» marks each cell; wrong cells are retried before the grid ends, and a grid with mistakes comes back sooner.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Tense focus</h2>
          <p className="text-ink-muted">Pick the tenses you are drilling now (the class starts with the future). Vocabulary is not affected. Progress is kept per verb and tense, so switching the focus never loses anything.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">What the grades do</h2>
          <p><span className="rounded-full bg-bad px-2 py-0.5 text-sm text-on-accent">Again</span> — back after 4–6 items in this session, and again tomorrow.</p>
          <p><span className="rounded-full bg-warn px-2 py-0.5 text-sm text-ink">Hard</span> — stays at its level and returns on that level's schedule.</p>
          <p><span className="rounded-full bg-ok px-2 py-0.5 text-sm text-on-accent">Good</span> — one level up, seen less often: after 1, 3, 7, 14, 30 and then every 60 days. Nothing ever leaves the rotation.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Other modes</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li><b className="text-ink">Verbs</b> — grids, single forms and «which form is this?» for the tenses in focus.</li>
            <li><b className="text-ink">Units</b> — browse any unit: vocabulary, grammar with the book's explanation, exercises with the answer key, texts with audio.</li>
            <li><b className="text-ink">Weak spots</b> — what keeps failing, including single grid cells.</li>
            <li><b className="text-ink">Listen</b> — the book's recordings next to their page.</li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Marks on records</h2>
          <p className="text-ink-muted">«Draft» — transcribed but not yet checked against the page. «Generated» — a verb form that follows the book's pattern but is not printed in the book; confirm it with the teacher. Every record cites its page.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Keep your progress</h2>
          <p className="text-ink-muted">Progress lives only on this device. Add the app to the Home Screen (Safari: Share → «Add to Home Screen») and make a «Backup» in Settings once a week.</p>
        </Card>
      </div>
    </Screen>
  )
}
