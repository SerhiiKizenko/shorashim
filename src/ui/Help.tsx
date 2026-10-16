import { Card, Screen } from './components'
import { HebrewText } from './hebrew'

export function Help() {
  return (
    <Screen title="How to study" back="/">
      <div className="flex flex-col gap-4 pt-2 pb-6">
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Start with «Today»</h2>
          <p className="text-ink-muted">Reviews come first, then new items in book order — as many as «New items per day» allows, counted per calendar day: reopening «Today» later the same day brings only what is due. Then up to ten single verb forms, mixed across verbs and tenses you already know. Have time left? «10 more new» on the finish screen; the bars above it show what is coming in the next two weeks.</p>
          <p className="text-ink-muted">Due dates are spread a little (a word due in 7 days may come in 5 to 9), onto the lightest day, so a whole vocabulary page does not land on one morning. After a break, when more is due than «Reviews per day», «Today» catches up: the oldest first, no new items until the pile is down.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">How a word is asked</h2>
          <p className="text-ink-muted">A new word, or one you got wrong, is shown in Hebrew and you pick its meaning out of four. Once you have it, it flips: the meaning is shown and you type the Hebrew. «Hint» gives the root (for a verb) or the first letter, then half the word; an answer after a hint counts as «Hard». From the fourth level on the answer is shown without vowel points, as Hebrew is printed outside textbooks — tap to see them.</p>
          <p className="text-ink-muted">A wrong answer says what kind of mistake it was — a final letter, a missing or extra ו/י, one letter swapped, the beginning (the person prefix), the ending, or a different word — and marks the letters. Weak spots counts them over the last 30 days.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Type Hebrew without vowel points</h2>
          <p className="text-ink-muted">
            The app checks the spelling, and the points are shown on reveal. Type the everyday spelling (<HebrewText size="sm">דיבר</HebrewText>, not <HebrewText size="sm">דבר</HebrewText>); the book's pointed form stripped of its points is also accepted. A final letter in the wrong form (<HebrewText size="sm">כ/ך מ/ם נ/ן פ/ף צ/ץ</HebrewText>) counts as a mistake, and the feedback says so.
          </p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Hebrew keyboard</h2>
          <p className="text-ink-muted"><b className="text-ink">Android (Gboard):</b> Settings → System → Languages & input → On-screen keyboard → Gboard → Languages → add Hebrew. Switch with the globe key or by holding the space bar.</p>
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
          <p><span className="rounded-full bg-bad px-2 py-0.5 text-sm text-on-accent">Again</span> — back after 4–6 items in this session (it must then pass twice), and it stays due until you get it right in a later session. Only that first answer counts for the schedule; the re-passes are rehearsal.</p>
          <p><span className="rounded-full bg-warn px-2 py-0.5 text-sm text-ink">Hard</span> — stays at its level and returns on that level's schedule; an item still at the bottom comes back tomorrow, not the same day.</p>
          <p><span className="rounded-full bg-ok px-2 py-0.5 text-sm text-on-accent">Good</span> — one level up, seen less often: after 1, 3, 7, 14, 30 and then every 60 days. Nothing ever leaves the rotation.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Other modes</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li><b className="text-ink">Verbs</b> — grids, single forms, «from root» (only the root, the binyan and the tense are given: build the form from the pattern) and «which form is this?» for the tenses in focus.</li>
            <li><b className="text-ink">Units</b> — browse any unit: vocabulary, grammar with the book's explanation, exercises with the answer key, texts with audio.</li>
            <li><b className="text-ink">Weak spots</b> — what you got wrong and have not yet got right twice since (plus single grid cells that keep failing). A new word answered Good once is young, not weak. Items that failed eight times or more are listed under «Ask the teacher».</li>
            <li><b className="text-ink">Listen</b> — the book's recordings next to their page.</li>
          </ul>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Marks on records</h2>
          <p className="text-ink-muted">«Draft» — transcribed but not yet checked against the page. «Generated» — a verb form that follows the book's pattern but is not printed in the book; confirm it with the teacher. Every record cites its page.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">The seven dots</h2>
          <p className="text-ink-muted">Home shows the last seven days, today last: a dot for each day you answered something. A missed day is just a grey dot that drops out after a week — there is no streak to lose.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Keep your progress</h2>
          <p className="text-ink-muted">Progress lives in Chrome on this phone; the app installed from Chrome (⋮ → «Add to Home screen») shares it. Make a «Backup» in Settings once a week: it opens the share sheet — save the file to Drive or Files. On a new phone, «Restore from file» brings it back; the app shows what the file holds before replacing anything.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Updates</h2>
          <p className="text-ink-muted">New builds install by themselves. If one arrives while you are in a drill, the app finishes the drill first and reloads when you return to the Home screen.</p>
        </Card>
      </div>
    </Screen>
  )
}
